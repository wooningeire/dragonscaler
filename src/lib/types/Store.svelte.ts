import { CharacterManager } from "./CharacterManager.svelte";
import { DatabaseStore } from "./DatabaseStore.svelte";

/**
 * Storage for global application state.
 */
export class Store {
    readonly characterManager = new CharacterManager();
    readonly databaseStore = new DatabaseStore();

    async loadCharacters() {
        this.characterManager.characters = await this.databaseStore.loadCharacterData();
    }
}

export const store = new Store();