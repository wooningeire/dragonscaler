import { CharacterManager } from "./CharacterManager.svelte";
import { DatabaseStore } from "./DatabaseStore.svelte";
import { Camera2d } from "./Camera2d.svelte";
import type { Character } from "./Character.svelte";


const FOCUS_PADDING_FAC = 1.5;

type ViewportDimsPx = {
    width: number,
    height: number,
};

type ViewportInsetsPx = {
    top: number,
    right: number,
    bottom: number,
    left: number,
};

export type CenteredCameraPosition = {
    x: number,
    y: number,
    scalePxPerMeter: number,
};

export const centeredCameraPositionForCharacter = ({
    character,
    positionX,
    viewportDimsPx,
    viewportInsetsPx,
}: {
    character: Character,
    positionX: number,
    viewportDimsPx: ViewportDimsPx,
    viewportInsetsPx: ViewportInsetsPx,
}): CenteredCameraPosition => {
    const widthMeters = character.viewportWidth;
    const heightMeters = character.baseline.scaleFac;
    const centerXMeters = widthMeters * 0.5;
    const centerYMeters = (0.5 - character.anchor.y) * heightMeters;
    const focusWidthPx = Math.max(
        1,
        viewportDimsPx.width - viewportInsetsPx.left - viewportInsetsPx.right,
    );
    const focusHeightPx = Math.max(
        1,
        viewportDimsPx.height - viewportInsetsPx.top - viewportInsetsPx.bottom,
    );
    const focusOffsetPx = {
        x: (viewportInsetsPx.left - viewportInsetsPx.right) * 0.5,
        y: (viewportInsetsPx.top - viewportInsetsPx.bottom) * 0.5,
    };
    const requiredWidthMeters = Math.max(
        0.001,
        widthMeters,
    );
    const requiredHeightMeters = Math.max(
        0.001,
        heightMeters,
    );
    const scalePxPerMeter = Math.min(
        focusHeightPx / (requiredHeightMeters * FOCUS_PADDING_FAC),
        focusWidthPx / (requiredWidthMeters * FOCUS_PADDING_FAC),
    );

    return {
        x: positionX + centerXMeters - focusOffsetPx.x / scalePxPerMeter,
        y: centerYMeters + focusOffsetPx.y / scalePxPerMeter,
        scalePxPerMeter,
    };
};

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
        return centeredCameraPositionForCharacter({
            character: this.characterManager.displayCharacters[index],
            positionX: this.characterManager.positionsX[index],
            viewportDimsPx: this.camera.viewportDimsPx,
            viewportInsetsPx: this.camera.viewportInsetsPx,
        });
    }
}

export const store = new Store();
