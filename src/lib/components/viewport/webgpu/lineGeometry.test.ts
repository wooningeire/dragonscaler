import { describe, expect, test } from "vitest";
import { Character } from "$lib/types/Character.svelte";
import { Baseline } from "$lib/types/Baseline.svelte";
import { buildCharacterRenderFrame } from "../characterRenderModel";
import { buildCharacterLineVertices } from "./lineGeometry";


const buildFrame = (shoulderY: number | null) => {
    const character = new Character({
        imageDimensions: {
            width: 100,
            height: 100,
        },
        shoulderY,
        baseline: new Baseline({
            targetLength: 1,
            referenceSizingMethod: "pixel_measurement",
            pixelMeasurementPx: 100,
        }),
    });

    return buildCharacterRenderFrame({
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
        editingCharacter: character,
    });
};


describe("buildCharacterLineVertices", () => {
    test("encodes the shoulder guide at the marked image altitude", () => {
        const unmarkedVertices = buildCharacterLineVertices(buildFrame(null));
        const markedVertices = buildCharacterLineVertices(buildFrame(0.5));
        const shoulderVertices = Array.from(markedVertices.slice(
            0,
            2 * 6 * 6,
        ));
        const vertices = Array.from(
            {length: shoulderVertices.length / 6},
            (_, index) => shoulderVertices.slice(
                index * 6,
                index * 6 + 6,
            ),
        );
        const xCoords = vertices.map(vertex => vertex[0]);
        const yCoords = vertices.map(vertex => vertex[1]);

        expect(markedVertices.length - unmarkedVertices.length).toBe(2 * 6 * 6);
        expect(Array.from(markedVertices.slice(shoulderVertices.length))).toEqual(
            Array.from(unmarkedVertices),
        );
        expect(Math.min(...xCoords)).toBeCloseTo(0);
        expect(Math.max(...xCoords)).toBeCloseTo(0.25);
        expect((Math.min(...yCoords) + Math.max(...yCoords)) * 0.5).toBeCloseTo(1 / 6);
        expect(vertices.slice(0, 6).every(vertex => (
            vertex[2] === 0
            && vertex[3] === 0
            && vertex[4] === 0
        ))).toBe(true);
        expect(vertices.slice(6).every(vertex => (
            vertex[2] === 1
            && Math.abs(vertex[3] - 0.65) < 1e-6
            && Math.abs(vertex[4] - 0.15) < 1e-6
        ))).toBe(true);
        expect(vertices.every(vertex => Math.abs(vertex[5] - 1 / 3) < 1e-6)).toBe(true);
    });
});
