import { CharacterManager } from "./CharacterManager.svelte";
import { DatabaseStore } from "./DatabaseStore.svelte";
import { Camera2d } from "./Camera2d.svelte";

/**
 * Storage for global application state.
 */
export class Store {
    readonly characterManager = new CharacterManager();
    readonly databaseStore = new DatabaseStore();
    readonly camera = new Camera2d();

    async loadCharacters() {
        this.characterManager.characters = await this.databaseStore.loadCharacterData();
    }

    beginNewCharacter() {
        this.characterManager.beginNewCharacter(this.databaseStore.createOwnerObject());
    }
}

export const store = new Store();