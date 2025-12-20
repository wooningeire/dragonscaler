import PocketBase, { type RecordModel } from "pocketbase";
import { Character } from "./Character.svelte";
import { PUBLIC__POCKETBASE_URL } from "$env/static/public";
import { CharacterImage } from "./CharacterImage.svelte";
import { ReferenceCurve } from "./ReferenceCurve.svelte";

export class DatabaseStore {
    private readonly pb: PocketBase;

    constructor() {
        this.pb = new PocketBase(PUBLIC__POCKETBASE_URL);
    }

    async loadCharacterData() {
        const loadResult = await this.pb.collection("dragonscaler_character_data").getList();
        return loadResult.items;
    }

    convertCharacterData(characterData: RecordModel) {
        const imageUrl = `${PUBLIC__POCKETBASE_URL}/api/files/dragonscaler_character_data/${characterData.id}/${characterData.image}`;

        const character = new Character({
            id: characterData.id,
            image: null,
            name: characterData.name,
            center: characterData.center_point,
            referenceCurve: new ReferenceCurve({
                points: characterData.reference_curve_points,
            }),
        });

        CharacterImage.fromUrl(imageUrl, characterData.image)
            .then(image => character.image = image)
            .catch(error => console.error(error));
            
        return character;
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
}