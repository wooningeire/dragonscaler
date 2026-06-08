import { Character } from "./Character.svelte";
import type { IdentitySummary } from "./Identity";

export class CharacterManager {
    characters = $state<Character[]>([]);
    selectedCharacter = $state<Character | null>(null);
    editingCharacter = $state<Character | null>(null);

            
    // 0 spacing: aligned by center (at x=0) -> pos = -centerOffset
    // 1 spacing: stacked side-by-side -> pos = currentStackX
    overlapFac = $state(0);

    positionsX = $derived.by(() => {
        const positions: number[] = [];
        let currentStackedX = 0;

        for (const character of this.characters) {
            const centeredX = -character.center.x * character.viewportWidth;
            const stackedX = currentStackedX;

            positions.push(centeredX + (stackedX - centeredX) * this.overlapFac);

            currentStackedX += character.viewportWidth;
        }

        return positions;
    });
    
    constructor() {
        $effect.root(() => {
            $effect(() => {
                this.characters.sort((a, b) => a.baseline.scaleFac - b.baseline.scaleFac);
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

    beginNewCharacter = (ownerIdentity: IdentitySummary) => {
        const newCharacter = new Character({
            ownerIdentities: [ownerIdentity],
            uploaded: false,
        });
        this.addCharacter(newCharacter);
        this.editCharacter(newCharacter);
    };
}
