import { Character } from "./Character.svelte";
import type { IdentitySummary } from "./Identity";
import {
    DEFAULT_BASELINE_EDIT_MODE,
    isBaselineEditMode,
    type BaselineEditMode,
} from "$lib/util/baselineGeometry";

const BASELINE_EDIT_MODE_STORAGE_KEY = "dragonscaler:baseline-edit-mode";

type CharacterSpacingInput = {
    viewportWidth: number,
};

export const computeCharacterPositionsX = (
    characters: CharacterSpacingInput[],
    spacingFac: number,
) => {
    const positions: number[] = [];
    let currentStackedX = 0;

    for (const character of characters) {
        positions.push(currentStackedX * spacingFac);

        currentStackedX += character.viewportWidth;
    }

    return positions;
};

export class CharacterManager {
    characters = $state<Character[]>([]);
    selectedCharacter = $state<Character | null>(null);
    editingCharacter = $state<Character | null>(null);
    baselineEditMode: BaselineEditMode = $state(readBaselineEditMode());

    // 0 spacing: left-aligned by image left edge; 1 spacing: one after another.
    spacingFac = $state(0);

    positionsX = $derived.by(() => computeCharacterPositionsX(
        this.characters,
        this.spacingFac,
    ));
    
    constructor() {
        $effect.root(() => {
            $effect(() => {
                this.characters.sort((a, b) => a.baseline.scaleFac - b.baseline.scaleFac);
            });

            $effect(() => {
                writeBaselineEditMode(this.baselineEditMode);
            });
        });
    }

    addCharacter = (character: Character) => {
        this.characters.push(character);
    };

    selectCharacter = (character: Character) => {
        this.selectedCharacter = character;
    };

    editCharacter = (character: Character) => {
        this.selectCharacter(character);
        this.editingCharacter = character;
    };

    stopEditingCharacter = () => {
        this.editingCharacter = null;
    };

    setBaselineEditMode = (baselineEditMode: BaselineEditMode) => {
        this.baselineEditMode = baselineEditMode;
    };

    beginNewCharacter = (ownerIdentity: IdentitySummary) => {
        const newCharacter = new Character({
            ownerIdentities: [ownerIdentity],
            uploaded: false,
        });
        this.addCharacter(newCharacter);
        this.editCharacter(newCharacter);
    };
}

const readBaselineEditMode = (): BaselineEditMode => {
    try {
        if (typeof localStorage === "undefined") return DEFAULT_BASELINE_EDIT_MODE;

        const storedValue = localStorage.getItem(BASELINE_EDIT_MODE_STORAGE_KEY);
        if (storedValue === null) return DEFAULT_BASELINE_EDIT_MODE;

        return isBaselineEditMode(storedValue)
            ? storedValue
            : DEFAULT_BASELINE_EDIT_MODE;
    } catch {
        return DEFAULT_BASELINE_EDIT_MODE;
    }
};

const writeBaselineEditMode = (baselineEditMode: BaselineEditMode) => {
    try {
        if (typeof localStorage === "undefined") return;

        localStorage.setItem(
            BASELINE_EDIT_MODE_STORAGE_KEY,
            baselineEditMode,
        );
    } catch {
        // Storage can be unavailable in private contexts; the in-memory mode still works.
    }
};
