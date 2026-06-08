import { CharacterManager } from "./CharacterManager.svelte";
import { DatabaseStore } from "./DatabaseStore.svelte";
import { Camera2d } from "./Camera2d.svelte";


const CENTER_PADDING_FAC = 1.5;
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

    async beginNewCharacter() {
        this.characterManager.beginNewCharacter(await this.databaseStore.createOwnerIdentityObject());
    }

    centeredCameraPosition(index: number) {
        return {
            x: this.characterManager.positionsX[index] + this.characterManager.characters[index].center.x * this.characterManager.characters[index].viewportWidth,
            y: (1 - this.characterManager.characters[index].center.y) * this.characterManager.characters[index].baseline.scaleFac / 2,
            scalePxPerMeter: Math.min(
                this.camera.viewportDimsPx.height / (this.characterManager.characters[index].baseline.scaleFac * CENTER_PADDING_FAC),
                this.camera.viewportDimsPx.width / (this.characterManager.characters[index].viewportWidth * CENTER_PADDING_FAC),
            ),
        };
    }
}

export const store = new Store();
