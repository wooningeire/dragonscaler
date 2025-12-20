import { CharacterManager } from "./CharacterManager.svelte";
import { DatabaseStore } from "./DatabaseStore";
import {Character} from "./Character.svelte";
import { ReferenceCurve } from "./ReferenceCurve.svelte";

/**
 * Storage for global application state.
 */
export class Store {
    readonly characterManager = new CharacterManager();
    readonly databaseStore = new DatabaseStore();

    async loadCharacters() {
        const characterData = await this.databaseStore.loadCharacterData();
        console.log(characterData);
        this.characterManager.characters = characterData.map(characterData => this.databaseStore.convertCharacterData(characterData));
    }
}

export const store = new Store();