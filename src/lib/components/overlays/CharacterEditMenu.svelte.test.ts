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

        expect(screen.getByText("Reference length")).toBeVisible();
        expect(screen.getByRole("radiogroup", {name: "Measurement unit"})).toBeVisible();
        expect(screen.getByRole("radio", {name: "m"})).toBeChecked();

        await fireEvent.click(screen.getByRole("radio", {name: "ft"}));

        expect(character.baseline.measurementUnit).toBe("ft");
        expect(screen.getByRole("radio", {name: "ft"})).toBeChecked();
        expect(screen.getByText("3.281")).toBeVisible();
    });

    test("records pixel sizing and keeps the reference label editable", async () => {
        const character = makeCharacter();
        store.characterManager.selectedCharacter = character;
        store.characterManager.editingCharacter = character;

        const {container} = render(CharacterEditMenu);

        expect(screen.getByRole("radiogroup", {name: "Reference sizing method"})).toBeVisible();
        expect(screen.getByRole("radio", {name: "Draw a measurement line"})).toBeChecked();

        await fireEvent.click(screen.getByRole("radio", {name: "Give a pixel measurement"}));

        expect(character.baseline.referenceSizingMethod).toBe("pixel_measurement");
        expect(screen.queryByRole("radiogroup", {name: "Reference curve mode"})).toBeNull();

        const labelInput = container.querySelector<HTMLElement>(
            ".reference-label-input [contenteditable]",
        );
        if (labelInput === null) throw new Error("missing reference label input");

        labelInput.textContent = "reference human";
        await fireEvent.input(labelInput);
        await fireEvent.blur(labelInput);

        expect(character.baseline.descriptor).toBe("reference human");

        const pixelInput = screen
            .getByText("Pixel measurement")
            .closest("label")
            ?.querySelector("[contenteditable]");
        if (pixelInput === null || pixelInput === undefined) throw new Error("missing pixel input");

        pixelInput.textContent = "150";
        await fireEvent.input(pixelInput);
        await fireEvent.blur(pixelInput);

        expect(character.baseline.pixelMeasurementPx).toBe(150);
        expect(character.pixelMeasurementImageLength).toBe(150);
        expect(container.querySelector(".pixel-measurement-row")).not.toBeNull();
    });

    test("enables pixel sizing when the image arrives after the measurement", async () => {
        const character = new Character({
            name: "Pret",
            uploaded: false,
        });
        const image = makeImage();
        vi.spyOn(CharacterImage, "fromFile").mockResolvedValue(image);
        store.characterManager.selectedCharacter = character;
        store.characterManager.editingCharacter = character;

        const {container} = render(CharacterEditMenu);

        await fireEvent.click(screen.getByRole("radio", {name: "Give a pixel measurement"}));

        const pixelInput = screen
            .getByText("Pixel measurement")
            .closest("label")
            ?.querySelector("[contenteditable]");
        if (pixelInput === null || pixelInput === undefined) throw new Error("missing pixel input");

        pixelInput.textContent = "150";
        await fireEvent.input(pixelInput);
        await fireEvent.blur(pixelInput);

        expect(character.pixelMeasurementImageLength).toBeNull();
        expect(screen.getByRole("button", {name: "Create"})).toBeDisabled();

        const fileInput = container.querySelector<HTMLInputElement>("input[type=\"file\"]");
        if (fileInput === null) throw new Error("missing file input");

        Object.defineProperty(
            fileInput,
            "files",
            {
                configurable: true,
                value: [image.file],
            },
        );
        await fireEvent.input(fileInput);

        await waitFor(() => {
            expect(character.image).toBe(image);
            expect(character.pixelMeasurementImageLength).toBe(150);
            expect(screen.getByRole("button", {name: "Create"})).toBeEnabled();
        });
    });

    test("keeps the current image usable when a replacement fails", async () => {
        const previousImage = new CharacterImage({
            src: "blob:previous",
            file: new File(["previous"], "previous.png", {type: "image/png"}),
            dimensions: {
                width: 2,
                height: 1,
            },
            hasObjectUrl: true,
        });
        const character = new Character({
            id: "character-1",
            image: previousImage,
            name: "Pret",
            uploaded: true,
        });
        const loadError = new Error("Invalid image.");
        vi.spyOn(CharacterImage, "fromFile").mockRejectedValue(loadError);
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
        store.characterManager.selectedCharacter = character;
        store.characterManager.editingCharacter = character;

        const {container} = render(CharacterEditMenu);
        const fileInput = container.querySelector<HTMLInputElement>("input[type=\"file\"]");
        if (fileInput === null) throw new Error("missing file input");

        Object.defineProperty(
            fileInput,
            "files",
            {
                configurable: true,
                value: [new File(["invalid"], "invalid.png", {type: "image/png"})],
            },
        );
        await fireEvent.input(fileInput);

        await waitFor(() => expect(consoleError).toHaveBeenCalledWith(loadError));

        expect(character.image).toBe(previousImage);
        expect(revokeObjectUrl).not.toHaveBeenCalled();
        expect(screen.getByRole("button", {name: "Update"})).toBeEnabled();
        expect(screen.getByRole("button", {name: "Cancel"})).toBeEnabled();
        expect(screen.getByRole("button", {name: "Flip"})).toBeEnabled();
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
