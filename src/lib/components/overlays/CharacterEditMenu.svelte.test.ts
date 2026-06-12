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
        width: 2,
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

        const {container} = render(CharacterEditMenu);

        expect(screen.getByRole("radiogroup", {name: "Reference curve mode"})).toBeVisible();
        expect(screen.getByRole("radio", {name: "Curve"})).toBeChecked();
        expect(container.querySelector(".baseline-mode-control radio-group-button-highlight")).not.toBeNull();

        await fireEvent.click(screen.getByRole("radio", {name: "Line"}));

        expect(store.characterManager.baselineEditMode).toBe("line");
        expect(screen.getByRole("radio", {name: "Line"})).toBeChecked();
    });

    test("switches the reference measurement display between meters and feet", async () => {
        const character = makeCharacter();
        character.baseline.targetLength = 1;
        store.characterManager.selectedCharacter = character;
        store.characterManager.editingCharacter = character;

        render(CharacterEditMenu);

        expect(screen.getByText("Reference curve")).toBeVisible();
        expect(screen.getByRole("radiogroup", {name: "Measurement unit"})).toBeVisible();
        expect(screen.getByRole("radio", {name: "m"})).toBeChecked();

        await fireEvent.click(screen.getByRole("radio", {name: "ft"}));

        expect(character.baseline.measurementUnit).toBe("ft");
        expect(screen.getByRole("radio", {name: "ft"})).toBeChecked();
        expect(screen.getByText("3.281")).toBeVisible();
    });

    test("flips the image and mirrors existing reference geometry", async () => {
        const character = makeCharacter();
        character.anchor = {
            x: 0.25,
            y: 0.1,
        };
        character.baseline.points = [
            {x: 0.25, y: 0.1},
            {x: 1.5, y: 0.9},
        ];
        store.characterManager.selectedCharacter = character;
        store.characterManager.editingCharacter = character;

        render(CharacterEditMenu);

        await fireEvent.click(screen.getByRole("button", {name: "Flip"}));

        expect(character.image?.flippedHorizontally).toBe(true);
        expect(character.anchor).toEqual({
            x: 0.75,
            y: 0.1,
        });
        expect(character.baseline.points).toEqual([
            {x: 1.75, y: 0.1},
            {x: 0.5, y: 0.9},
        ]);
        expect(screen.getByRole("button", {name: "Flip"})).toHaveAttribute("aria-pressed", "true");
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
