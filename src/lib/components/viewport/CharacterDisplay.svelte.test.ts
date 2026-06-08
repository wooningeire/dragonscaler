import { describe, expect, test, beforeEach } from "vitest";
import { render } from "@testing-library/svelte";
import CharacterDisplay from "./CharacterDisplay.svelte";
import { Character } from "$lib/types/Character.svelte";
import { store } from "$lib/types/Store.svelte";


const makeCharacter = (name: string) => new Character({
    name,
    uploaded: true,
});


describe("CharacterDisplay", () => {
    beforeEach(() => {
        store.characterManager.selectedCharacter = null;
        store.characterManager.editingCharacter = null;
    });

    test("other characters are muted during edit mode", () => {
        const character = makeCharacter("Scale Wing");
        const editingCharacter = makeCharacter("Editing");
        store.characterManager.editingCharacter = editingCharacter;

        const {container} = render(CharacterDisplay, {
            props: {
                character,
                x: 0,
                y: 0,
            },
        });

        expect(container.querySelector(".character-display")).toHaveClass("edit-muted");
    });

    test("the edited character stays interactive during edit mode", () => {
        const character = makeCharacter("Scale Wing");
        store.characterManager.editingCharacter = character;

        const {container} = render(CharacterDisplay, {
            props: {
                character,
                x: 0,
                y: 0,
            },
        });

        expect(container.querySelector(".character-display")).not.toHaveClass("edit-muted");
    });
});
