import { Character } from "./Character.svelte";
import type { IdentitySummary } from "./Identity";
import {
    DEFAULT_BASELINE_EDIT_MODE,
    isBaselineEditMode,
    type BaselineEditMode,
} from "$lib/util/baselineGeometry";
import { characterViewportWidthForProjection } from "$lib/util/viewportProjection";

const BASELINE_EDIT_MODE_STORAGE_KEY = "dragonscaler:baseline-edit-mode";

type CharacterSpacingInput = Pick<
    Character,
    "anchor" | "aspect" | "scaleFac" | "shoulderY"
>;

export const computeCharacterPositionsX = (
    characters: CharacterSpacingInput[],
    spacingFac: number,
    logPerspective = false,
) => {
    const positions: number[] = [];
    let currentRightEdgeX = 0;

    for (const [
        index,
        character,
    ] of characters.entries()) {
        const characterWidth = characterViewportWidthForProjection(
            character,
            logPerspective,
        );

        if (index > 0) {
            currentRightEdgeX += characterWidth * spacingFac;
        }

        positions.push(currentRightEdgeX - characterWidth);
    }

    return positions;
};

export const compareCharactersBySortingAltitude = (
    a: Character,
    b: Character,
) => a.sortingAltitude - b.sortingAltitude;

export class CharacterManager {
    characters = $state<Character[]>([]);
    selectedCharacter = $state<Character | null>(null);
    editingCharacter = $state<Character | null>(null);
    baselineEditMode: BaselineEditMode = $state(readBaselineEditMode());
    shoulderMarkingActive = $state(false);

    // 0 spacing: right-aligned by image right edge; 1 spacing: one after another.
    spacingFac = $state(1/3);

    logPerspective = $state(false);

    displayCharacters = $derived.by(() => (
        this.characters.toSorted(compareCharactersBySortingAltitude)
    ));

    positionsX = $derived.by(() => computeCharacterPositionsX(
        this.displayCharacters,
        this.spacingFac,
        this.logPerspective,
    ));
    
    constructor() {
        $effect.root(() => {
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
        this.shoulderMarkingActive = false;
    };

    stopEditingCharacter = () => {
        this.editingCharacter = null;
        this.shoulderMarkingActive = false;
    };

    removeCharacter = (character: Character) => {
        const characterIndex = this.characters.indexOf(character);

        if (characterIndex >= 0) {
            this.characters.splice(
                characterIndex,
                1,
            );
        }

        if (this.selectedCharacter === character) {
            this.selectedCharacter = null;
        }

        if (this.editingCharacter === character) {
            this.editingCharacter = null;
            this.shoulderMarkingActive = false;
        }
    };

    setBaselineEditMode = (baselineEditMode: BaselineEditMode) => {
        this.baselineEditMode = baselineEditMode;
    };

    setShoulderMarkingActive = (active: boolean) => {
        this.shoulderMarkingActive = active;
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
