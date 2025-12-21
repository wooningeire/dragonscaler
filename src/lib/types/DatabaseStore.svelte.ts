import PocketBase, { type RecordModel, type AuthRecord, type RecordAuthResponse } from "pocketbase";
import { Character } from "./Character.svelte";
import { PUBLIC__POCKETBASE_URL } from "$env/static/public";
import { CharacterImage } from "./CharacterImage.svelte";
import { ReferenceCurve } from "./ReferenceCurve.svelte";
import { SvelteMap } from "svelte/reactivity";


export class DatabaseStore {
    private readonly pb: PocketBase;
    authResult = $state<RecordAuthResponse<RecordModel> | null>(null);


    constructor() {
        this.pb = new PocketBase(PUBLIC__POCKETBASE_URL);
    }

    async loadCharacterData() {
        const characterDataResult = await this.pb.collection("dragonscaler_character_data").getList();


        const characterPromises: Promise<Character>[] = [];

        const seenUsers = new Map<string, Promise<RecordModel>>();
        for (const characterData of characterDataResult.items) {
            characterPromises.push((async () => {
                const characterImageUrl = `${PUBLIC__POCKETBASE_URL}/api/files/dragonscaler_character_data/${characterData.id}/${characterData.image}`;

                
                if (!seenUsers.has(characterData.owner_id)) {
                    seenUsers.set(characterData.owner_id, this.pb.collection("users").getOne(characterData.owner_id));
                }
                const owner = await seenUsers.get(characterData.owner_id)!;
                const ownerAvatarImageUrl = `${PUBLIC__POCKETBASE_URL}/api/files/users/${owner.id}/${owner.avatar}`;


                const character = new Character({
                    id: characterData.id,
                    image: null,
                    name: characterData.name,
                    center: characterData.center_point,
                    referenceCurve: new ReferenceCurve({
                        points: characterData.reference_curve_points,
                    }),
                    owner: {
                        name: owner.username,
                        avatarUrl: ownerAvatarImageUrl,
                    },
                });

                CharacterImage.fromUrl(characterImageUrl, characterData.image)
                    .then(image => character.image = image)
                    .catch(error => console.error(error));


                return character;
            })());
        }

        return Promise.all(characterPromises);
    }

    async createCharacter(character: Character) {
        return await this.pb.collection("dragonscaler_character_data").create({
            name: character.name,
            image: character.image?.file,
            center_point: character.center,
            reference_curve_points: character.referenceCurve.points,
        });
    }

    async updateCharacter(character: Character) {
        if (character.id === null) throw new Error("character has no id");

        return await this.pb.collection("dragonscaler_character_data").update(character.id, {
            name: character.name,
            image: character.image?.file,
            center_point: character.center,
            reference_curve_points: character.referenceCurve.points,
        });
    }

    async promptDiscordLogin() {
        const authResult = await this.pb.collection("users").authWithOAuth2({
            provider: "discord",
            scopes: ["identify"],
        });

        this.authResult = authResult;

        // pocketbase doesn't set avatar correctly
        const avatarUrl = authResult.meta!.avatarUrl;
        fetch(avatarUrl)
            .then(async response => {
                this.pb.collection("users").update(authResult.record.id, {
                    avatar: new File([await response.blob()], new URL(avatarUrl).pathname.slice(avatarUrl.lastIndexOf("/"))),
                });
            })
            .catch(error => console.error(error));

        return authResult;
    }

    logout() {
        this.pb.authStore.clear();

        this.authResult = null;
    }
}