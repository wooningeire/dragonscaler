import { describe, expect, test } from "vitest";
import { Baseline } from "$lib/types/Baseline.svelte";
import { Character } from "$lib/types/Character.svelte";
import { buildCharacterRenderFrame } from "./characterRenderModel";


const makeCharacter = () => new Character({
    name: "Measured",
    imageDimensions: {
        width: 100,
        height: 100,
    },
    baseline: new Baseline({
        id: "reference",
        targetLength: 1,
        points: [
            {x: 0.5, y: 0},
            {x: 0.5, y: 1},
        ],
    }),
});

const renderCharacter = (
    character: Character,
    {
        selectedCharacter = null,
        editingCharacter = null,
        activeMeasurementId = null,
        previewPoints = null,
    }: {
        selectedCharacter?: Character | null,
        editingCharacter?: Character | null,
        activeMeasurementId?: string | null,
        previewPoints?: {x: number, y: number}[] | null,
    } = {},
) => buildCharacterRenderFrame({
    characters: [character],
    positionsX: [0],
    camera: {
        posMetersX: 0,
        posMetersY: 0,
        scalePxPerMeter: 100,
        viewportPositionPx: {
            x: 400,
            y: 300,
        },
    },
    widthPx: 800,
    heightPx: 600,
    selectedCharacter,
    editingCharacter,
    activeMeasurementId,
    baselinePreview: previewPoints === null
        ? null
        : {
            character,
            points: previewPoints,
        },
});

const renderedMeasurementIds = (character: Character, options: Parameters<typeof renderCharacter>[1]) => (
    renderCharacter(character, options).items[0].measurementLines.map(line => line.measurementId)
);


describe("character measurement render state", () => {
    test("keeps only the reference and shoulder measurements visible after deselection", () => {
        const character = makeCharacter();
        const shoulderMeasurement = character.addMeasurement();
        const ordinaryMeasurement = character.addMeasurement();

        character.setShoulderMeasurement(shoulderMeasurement);

        expect(renderedMeasurementIds(character, {})).toEqual([
            character.referenceMeasurementId,
            shoulderMeasurement.id,
        ]);
        expect(renderedMeasurementIds(character, {
            selectedCharacter: character,
        })).toEqual([
            character.referenceMeasurementId,
            shoulderMeasurement.id,
            ordinaryMeasurement.id,
        ]);
        expect(renderedMeasurementIds(character, {
            editingCharacter: character,
        })).toEqual([
            character.referenceMeasurementId,
            shoulderMeasurement.id,
            ordinaryMeasurement.id,
        ]);
    });

    test("renders a measurement that is both reference and shoulder only once", () => {
        const character = makeCharacter();

        character.setShoulderMeasurement(character.baseline);

        expect(renderedMeasurementIds(character, {})).toEqual([
            character.referenceMeasurementId,
        ]);
    });

    test("applies the live preview only to the active measurement", () => {
        const character = makeCharacter();
        const ordinaryMeasurement = character.addMeasurement();
        const previewPoints = [
            {x: 0.25, y: 0.25},
            {x: 0.75, y: 0.75},
        ];
        const frame = renderCharacter(
            character,
            {
                editingCharacter: character,
                activeMeasurementId: ordinaryMeasurement.id,
                previewPoints,
            },
        );
        const referenceLine = frame.items[0].measurementLines.find(line => line.isReference);
        const ordinaryLine = frame.items[0].measurementLines.find(line => (
            line.measurementId === ordinaryMeasurement.id
        ));

        expect(referenceLine?.points).toBe(character.baseline.points);
        expect(frame.items[0].baselinePoints).toBe(character.baseline.points);
        expect(ordinaryLine?.points).toBe(previewPoints);
    });
});
