import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import CharacterEditMenu from "./CharacterEditMenu.svelte";
import { Character } from "$lib/types/Character.svelte";
import { CharacterImage } from "$lib/types/CharacterImage.svelte";
import { store } from "$lib/types/Store.svelte";


const makeImage = () => new CharacterImage({
    src: "data:image/png;base64,",
    file: new File([""], "character.png", {type: "image/png"}),
    dimensions: {
        width: 1,
        height: 1,
    },
});

const makeCharacter = () => new Character({
    id: "character-1",
    image: makeImage(),
    name: "Pret",
    uploaded: true,
});


describe("CharacterEditMenu", () => {
    beforeEach(() => {
        store.characterManager.characters = [];
        store.characterManager.selectedCharacter = null;
        store.characterManager.editingCharacter = null;
        store.characterManager.setBaselineEditMode("curve");
        vi.restoreAllMocks();
    });

    test("exits edit mode after updating a character", async () => {
        const character = makeCharacter();
        store.characterManager.selectedCharacter = character;
        store.characterManager.editingCharacter = character;
        const updateCharacter = vi
            .spyOn(store.databaseStore, "updateCharacter")
            .mockResolvedValue({} as Awaited<ReturnType<typeof store.databaseStore.updateCharacter>>);

        render(CharacterEditMenu);

        await fireEvent.click(screen.getByRole("button", {name: "Update"}));

        await waitFor(() => {
            expect(updateCharacter).toHaveBeenCalledWith(character);
            expect(store.characterManager.editingCharacter).toBeNull();
        });
        expect(store.characterManager.selectedCharacter).toBe(character);
    });

    test("changes the reference curve editing mode", async () => {
        const character = makeCharacter();
        store.characterManager.selectedCharacter = character;
        store.characterManager.editingCharacter = character;

        render(CharacterEditMenu);

        await fireEvent.click(screen.getByRole("button", {name: "Line"}));

        expect(store.characterManager.baselineEditMode).toBe("line");
        expect(screen.getByRole("button", {name: "Line"})).toHaveAttribute("aria-pressed", "true");
    });

    test("deletes an uploaded character from the database and local manager", async () => {
        const character = makeCharacter();
        store.characterManager.characters = [character];
        store.characterManager.selectedCharacter = character;
        store.characterManager.editingCharacter = character;
        const deleteCharacter = vi
            .spyOn(store.databaseStore, "deleteCharacter")
            .mockResolvedValue();

        render(CharacterEditMenu);

        await fireEvent.click(screen.getByRole("button", {name: "Delete"}));

        await waitFor(() => {
            expect(deleteCharacter).toHaveBeenCalledWith(character);
            expect(store.characterManager.characters).toEqual([]);
            expect(store.characterManager.selectedCharacter).toBeNull();
            expect(store.characterManager.editingCharacter).toBeNull();
        });
    });
});
