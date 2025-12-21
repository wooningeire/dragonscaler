import { untrack } from "svelte";
import { Character } from "./Character.svelte";

export class CharacterManager {
    characters = $state<Character[]>([]);
    selectedCharacter = $state<Character | null>(null);

    overlapFac = $state(0.5);

    offsetsX = $derived.by(() => {
        const offsets: number[] = [0];

        for (let i = 1; i < this.characters.length; i++) {
            offsets.push(offsets[i - 1] + this.characters[i - 1].viewportWidth);
        }

        return offsets;
    });

    addCharacter(character: Character) {
        this.characters.push(character);

        $effect.root(() => {
            $effect(() => {
                void character.referenceCurve.scaleFac;
                untrack(() => this.characters.sort((a, b) => a.referenceCurve.scaleFac - b.referenceCurve.scaleFac));
            });
        });
    }

    beginNewCharacter(owner: {id: string, name: string, avatarUrl: string}) {
        const newCharacter = new Character({
            owner,
            uploaded: false,
        });
        this.addCharacter(newCharacter);
        this.selectedCharacter = newCharacter;
    }
}