import { untrack } from "svelte";
import { Character } from "./Character.svelte";

export class CharacterManager {
    characters = $state<Character[]>([]);
    characterBeingEdited = $state<Character | null>(null);

    offsetsX = $derived.by(() => {
        const offsets: number[] = [0];

        for (let i = 1; i < this.characters.length; i++) {
            offsets.push(offsets[i - 1] + this.characters[i - 1].actualWidth);
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

    beginNewCharacter() {
        const newCharacter = new Character();
        this.addCharacter(newCharacter);
        this.characterBeingEdited = newCharacter;
    }
}