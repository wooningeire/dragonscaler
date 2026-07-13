import { beforeEach, describe, expect, test } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { Baseline } from "$lib/types/Baseline.svelte";
import { Character } from "$lib/types/Character.svelte";
import { store } from "$lib/types/Store.svelte";
import CharacterMeasurements from "./CharacterMeasurements.svelte";

const makeCharacter = () => {
    const reference = new Baseline({
        id: "reference",
        points: [
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.5},
        ],
        targetLength: 2,
        descriptor: "body reference",
    });
    const shoulder = new Baseline({
        id: "shoulder",
        points: [
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.25},
        ],
        descriptor: "to shoulder",
    });

    return new Character({
        measurements: [
            reference,
            shoulder,
        ],
        referenceMeasurementId: reference.id,
        shoulderMeasurementId: shoulder.id,
    });
};

describe("CharacterMeasurements", () => {
    beforeEach(() => {
        store.characterManager.activeMeasurementId = null;
        store.characterManager.setShoulderMarkingActive(false);
        store.characterManager.setBaselineEditMode("curve");
    });

    test("shows an authored reference value and computed non-reference values", () => {
        const character = makeCharacter();

        render(CharacterMeasurements, {character});

        expect(screen.getByRole("radio", {name: "Use body reference as reference"})).toBeChecked();
        expect(screen.getByRole("radio", {name: "Use to shoulder as shoulder measurement"})).toBeChecked();
        expect(screen.getByRole("radio", {name: "Use body reference as shoulder measurement"})).not.toBeChecked();
        expect(screen.getByRole("radio", {name: "Use to shoulder as reference"})).not.toBeChecked();
        expect(screen.getByRole("textbox", {name: "body reference value"})).toHaveTextContent("2");
        expect(screen.getByRole("textbox", {name: "body reference value"})).toHaveAttribute(
            "aria-readonly",
            "false",
        );
        expect(screen.getByRole("textbox", {name: "to shoulder value"})).toHaveTextContent("1");
        expect(screen.getByRole("textbox", {name: "to shoulder value"})).toHaveAttribute(
            "aria-readonly",
            "true",
        );
        expect(screen.getByRole("radiogroup", {name: "Measurement unit"})).toBeVisible();
        expect(screen.getByRole("radiogroup", {name: "Redraw measurement as"})).toBeVisible();
        expect(screen.getByRole("radio", {name: "Altitude"})).not.toBeChecked();
        expect(screen.getByRole("radio", {name: "Line"})).not.toBeChecked();
        expect(screen.getByRole("radio", {name: "Curve"})).toBeChecked();
        expect(screen.getByRole("radio", {name: "Pixel count"})).not.toBeChecked();
        expect(screen.getByRole("radio", {name: "Pixel count"})).toBeEnabled();
    });

    test("only enables pixel count while editing the reference measurement", async () => {
        const character = makeCharacter();
        store.characterManager.setActiveMeasurementId("shoulder");

        const {container} = render(CharacterMeasurements, {character});
        const referenceRow = container.querySelector<HTMLElement>(
            "[data-measurement-id=\"reference\"]",
        );
        const shoulderRow = container.querySelector<HTMLElement>(
            "[data-measurement-id=\"shoulder\"]",
        );
        if (referenceRow === null || shoulderRow === null) {
            throw new Error("missing measurement rows");
        }

        const editLineButton = (row: HTMLElement) => Array.from(
            row.querySelectorAll<HTMLButtonElement>("button"),
        ).find(button => button.textContent?.trim() === "Edit line");
        const referenceEditButton = editLineButton(referenceRow);
        const shoulderEditButton = editLineButton(shoulderRow);
        if (referenceEditButton === undefined || shoulderEditButton === undefined) {
            throw new Error("missing edit line buttons");
        }

        const pixelCount = screen.getByRole("radio", {name: "Pixel count"});
        const computedValue = screen.getByRole("textbox", {name: "to shoulder value"});

        expect(pixelCount).toBeDisabled();
        expect(screen.getByRole("radio", {name: "Curve"})).toBeChecked();
        expect(computedValue).toHaveAttribute("aria-readonly", "true");
        expect(computedValue).not.toHaveAttribute("aria-disabled");

        await fireEvent.click(referenceEditButton);

        expect(store.characterManager.activeMeasurementId).toBe("reference");
        expect(pixelCount).toBeEnabled();

        await fireEvent.click(pixelCount);

        expect(character.baseline.referenceSizingMethod).toBe("pixel_measurement");
        expect(pixelCount).toBeChecked();
        expect(screen.getByRole("textbox", {name: "Reference pixel count"})).toBeVisible();

        await fireEvent.click(shoulderEditButton);

        expect(store.characterManager.activeMeasurementId).toBe("shoulder");
        expect(pixelCount).toBeDisabled();
        expect(screen.getByRole("radio", {name: "Curve"})).toBeChecked();
        expect(screen.queryByRole("textbox", {name: "Reference pixel count"})).toBeNull();

        await fireEvent.click(screen.getByRole("radio", {name: "Altitude"}));

        expect(character.baseline.referenceSizingMethod).toBe("pixel_measurement");
        expect(store.characterManager.baselineEditMode).toBe("altitude");

        await fireEvent.click(referenceEditButton);

        expect(pixelCount).toBeEnabled();
        expect(pixelCount).toBeChecked();
        expect(screen.getByRole("textbox", {name: "Reference pixel count"})).toBeVisible();
    });

    test("uses the same controls for every measurement row", () => {
        const character = makeCharacter();

        const {container} = render(CharacterMeasurements, {character});
        const rows = Array.from(container.querySelectorAll<HTMLElement>(".measurement-row"));

        expect(rows).toHaveLength(2);
        for (const row of rows) {
            expect(row.querySelector(".measurement-label [role=\"textbox\"]")).not.toBeNull();
            expect(row.querySelector(".measurement-value [role=\"textbox\"]")).not.toBeNull();
            expect(row.querySelectorAll("input[type=\"radio\"]")).toHaveLength(2);
            expect(Array.from(row.querySelectorAll("button")).map(button => (
                button.textContent?.trim()
            ))).toEqual([
                "Edit line",
                "Remove",
            ]);
            expect(row.querySelector(".measurement-controls")).toBeNull();
        }

        expect(container.querySelectorAll(".measurement-controls")).toHaveLength(1);
        expect(screen.queryByRole("button", {name: "Mark shoulder"})).toBeNull();
        expect(screen.queryByRole("button", {name: "Clear shoulder"})).toBeNull();
    });

    test("moves reference and shoulder roles independently", async () => {
        const character = makeCharacter();

        render(CharacterMeasurements, {character});

        await fireEvent.click(screen.getByRole("radio", {name: "Use to shoulder as reference"}));

        expect(character.referenceMeasurementId).toBe("shoulder");
        expect(character.shoulderMeasurementId).toBe("shoulder");
        expect(character.scaleFac).toBe(4);
        expect(screen.getByRole("textbox", {name: "body reference value"})).toHaveTextContent("2");
        expect(screen.getByRole("textbox", {name: "body reference value"})).toHaveAttribute(
            "aria-readonly",
            "true",
        );

        await fireEvent.click(screen.getByRole("radio", {name: "Use body reference as shoulder measurement"}));

        expect(character.referenceMeasurementId).toBe("shoulder");
        expect(character.shoulderMeasurementId).toBe("reference");
    });

    test("adds, selects, and removes a measurement without losing the reference", async () => {
        const character = makeCharacter();

        render(CharacterMeasurements, {character});

        await fireEvent.click(screen.getByRole("button", {name: "Add measurement"}));

        expect(character.measurements).toHaveLength(3);
        const addedMeasurement = character.measurements[2];
        expect(store.characterManager.activeMeasurementId).toBe(addedMeasurement.id);

        const addedRow = document.querySelector<HTMLElement>(
            `[data-measurement-id="${addedMeasurement.id}"]`,
        );
        if (addedRow === null) throw new Error("missing added measurement row");

        await fireEvent.click(
            Array.from(addedRow.querySelectorAll("button"))
                .find(button => button.textContent?.trim() === "Remove")!,
        );

        await waitFor(() => expect(character.measurements).toHaveLength(2));
        expect(character.referenceMeasurementId).toBe("reference");
    });
});
