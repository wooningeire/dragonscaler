import { describe, expect, test } from "vitest";
import { Baseline } from "$lib/types/Baseline.svelte";
import { Character } from "$lib/types/Character.svelte";
import { buildCharacterRenderFrame } from "../characterRenderModel";
import {
    BASELINE_BLACK_COLOR,
    BASELINE_WHITE_COLOR,
    MEASUREMENT_RED_COLOR,
    MEASUREMENT_RED_OUTLINE_COLOR,
} from "./constants";
import { buildCharacterLineVertices } from "./lineGeometry";


type Rgb = readonly [number, number, number];

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

const renderCharacterLines = (
    character: Character,
    selectedCharacter: Character | null,
) => buildCharacterLineVertices(buildCharacterRenderFrame({
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
    editingCharacter: null,
}));

const vertexColors = (vertices: Float32Array): Rgb[] => Array.from(
    {length: vertices.length / 6},
    (_, index) => [
        vertices[index * 6 + 2],
        vertices[index * 6 + 3],
        vertices[index * 6 + 4],
    ],
);

const expectOnlyColors = (
    actualColors: Rgb[],
    expectedColors: readonly (readonly number[])[],
) => {
    expect(actualColors.length).toBeGreaterThan(0);
    expect(actualColors.every(actual => expectedColors.some(expected => (
        actual.every((channel, index) => Math.abs(channel - expected[index]) < 1e-6)
    )))).toBe(true);

    for (const expected of expectedColors) {
        expect(actualColors.some(actual => actual.every((channel, index) => (
            Math.abs(channel - expected[index]) < 1e-6
        )))).toBe(true);
    }
};


describe("measurement line geometry", () => {
    test("renders the reference measurement in black and white", () => {
        const character = makeCharacter();
        const colors = vertexColors(renderCharacterLines(character, null));

        expectOnlyColors(
            colors,
            [
                BASELINE_WHITE_COLOR,
                BASELINE_BLACK_COLOR,
            ],
        );
    });

    test("renders every non-reference measurement stroke in red", () => {
        const character = makeCharacter();
        const ordinaryMeasurement = character.addMeasurement();

        character.baseline.referenceSizingMethod = "pixel_measurement";
        character.baseline.pixelMeasurementPx = 100;
        ordinaryMeasurement.points = [
            {x: 0.25, y: 0.25},
            {x: 0.75, y: 0.75},
        ];

        const colors = vertexColors(renderCharacterLines(character, character));

        expectOnlyColors(
            colors,
            [
                MEASUREMENT_RED_OUTLINE_COLOR,
                MEASUREMENT_RED_COLOR,
            ],
        );
    });
});
