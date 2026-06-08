import PocketBase, { type RecordModel, type AuthRecord } from "pocketbase";
import { Character } from "./Character.svelte";
import { Collections, type CharacterRecord, type BaselineRecord, type UserRecord } from "./PocketBaseTypes";
import { CharacterImage } from "./CharacterImage.svelte";
import { Baseline } from "./Baseline.svelte";
import { getPocketbaseFileUrl, pocketbaseUrl } from "$lib/util/pocketbase";


export class DatabaseStore {
    private readonly pb: PocketBase;
    userRecord = $state<AuthRecord>(null);


    constructor() {
        this.pb = new PocketBase(pocketbaseUrl);
    }

    loadUserRecord() {
        this.pb.authStore.loadFromCookie(document.cookie);
        this.userRecord = this.pb.authStore.record;
    }

    async loadCharacterData() {
        const characterDataResultPromise = this.pb.collection(Collections.Characters).getFullList<CharacterRecord>();
        const baselinesResultPromise = this.pb.collection(Collections.Baselines).getFullList<BaselineRecord>();

        const [characterDataResult, baselinesResult] = await Promise.all([characterDataResultPromise, baselinesResultPromise]);

        const baselinesMap = new Map<string, BaselineRecord>();
        for (const baseline of baselinesResult) {
            if (!baseline.is_default || baselinesMap.has(baseline.character_id)) continue;

            baselinesMap.set(baseline.character_id, baseline);
        }

        const characterPromises: Promise<Character>[] = [];

        const seenUsers = new Map<string, Promise<RecordModel>>();
        for (const characterData of characterDataResult) {
            const baseline = baselinesMap.get(characterData.id);

            characterPromises.push((async () => {
                const characterImageUrl = getPocketbaseFileUrl({
                    collection: Collections.Characters,
                    recordId: characterData.id,
                    filename: characterData.image,
                });

                
                if (!seenUsers.has(characterData.owner_id)) {
                    seenUsers.set(characterData.owner_id, this.pb.collection(Collections.Users).getOne<UserRecord>(characterData.owner_id));
                }
                const owner = await seenUsers.get(characterData.owner_id)!;
                const ownerAvatarImageUrl = getPocketbaseFileUrl({
                    collection: Collections.Users,
                    recordId: owner.id,
                    filename: owner.avatar,
                });


                const character = new Character({
                    id: characterData.id,
                    image: null,
                    name: characterData.name,
                    center: characterData.center_point,
                    baseline: new Baseline({
                        id: baseline?.id ?? null,
                        points: baseline?.points,
                        descriptor: baseline?.descriptor,
                        targetLength: baseline?.length_meters,
                    }),
                    owner: {
                        id: owner.id,
                        name: owner.username,
                        avatarUrl: ownerAvatarImageUrl,
                    },
                    uploaded: true,
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
        const charRecord = await this.pb.collection(Collections.Characters).create({
            name: character.name,
            image: character.image?.file,
            center_point: character.center,
            owner_id: character.owner?.id,
        });

        const baselineRecord = await this.pb.collection(Collections.Baselines).create({
            character_id: charRecord.id,
            is_default: true,
            points: character.baseline.points,
            descriptor: character.baseline.descriptor,
            length_meters: character.baseline.targetLength,
        });
        
        character.baseline.id = baselineRecord.id;

        return charRecord;
    }

    async updateCharacter(character: Character) {
        if (character.id === null) throw new Error("character has no id");

        const updateCharPromise = this.pb.collection(Collections.Characters).update(character.id, {
            name: character.name,
            image: character.image?.file,
            center_point: character.center,
        });

        let updateBaselinePromise: Promise<unknown>;

        if (character.baseline.id !== null) {
            updateBaselinePromise = this.pb.collection(Collections.Baselines).update(character.baseline.id, {
                points: character.baseline.points,
                descriptor: character.baseline.descriptor,
                length_meters: character.baseline.targetLength,
            });
        } else {
            updateBaselinePromise = this.pb.collection(Collections.Baselines).create({
                character_id: character.id,
                is_default: true,
                points: character.baseline.points,
                descriptor: character.baseline.descriptor,
                length_meters: character.baseline.targetLength,
            }).then(record => {
                character.baseline.id = record.id;
                return record;
            });
        }

        return await Promise.all([updateCharPromise, updateBaselinePromise]);
    }

    async promptDiscordLogin() {
        const authResult = await this.pb.collection("users").authWithOAuth2({
            provider: "discord",
            scopes: ["identify"],
        });

        this.userRecord = authResult.record;

        // pocketbase doesn't set avatar correctly
        const avatarUrl = authResult.meta!.avatarUrl;
        fetch(avatarUrl)
            .then(async response => {
                this.pb.collection("users").update(authResult.record.id, {
                    avatar: new File([await response.blob()], new URL(avatarUrl).pathname.slice(avatarUrl.lastIndexOf("/"))),
                });

                this.userRecord = await this.pb.collection("users").getOne(authResult.record.id);
            })
            .catch(error => console.error(error));

        return authResult;
    }

    logout() {
        this.pb.authStore.clear();

        this.userRecord = null;
    }

    createOwnerObject() {
        if (this.userRecord === null) throw new Error("not authenticated");

        return {
            id: this.userRecord.id,
            name: this.userRecord.username,
            avatarUrl: getPocketbaseFileUrl({
                collection: Collections.Users,
                recordId: this.userRecord.id,
                filename: this.userRecord.avatar,
            }),
        };
    }
}
