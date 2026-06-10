import { describe, expect, test } from "vitest";
import { Baseline } from "./Baseline.svelte";
import { Character } from "./Character.svelte";
import { centeredCameraPositionForCharacter } from "./Store.svelte";


const makeCharacter = () => new Character({
    anchor: {
        x: 0.25,
        y: 0,
    },
    baseline: new Baseline({
        targetLength: 10,
        points: [
            {x: 0.5, y: 0},
            {x: 0.5, y: 1},
        ],
    }),
});

describe("centeredCameraPositionForCharacter", () => {
    test("targets the character image center instead of the baseline anchor", () => {
        const position = centeredCameraPositionForCharacter({
            character: makeCharacter(),
            positionX: 100,
            viewportDimsPx: {
                width: 1000,
                height: 1000,
            },
            viewportInsetsPx: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            },
        });

        expect(position.x).toBeCloseTo(105);
        expect(position.x).not.toBeCloseTo(102.5);
        expect(position.y).toBeCloseTo(5);
    });

    test("centers the selected image in the viewport area above the bottom dock", () => {
        const position = centeredCameraPositionForCharacter({
            character: makeCharacter(),
            positionX: 100,
            viewportDimsPx: {
                width: 1000,
                height: 1000,
            },
            viewportInsetsPx: {
                top: 0,
                right: 0,
                bottom: 400,
                left: 0,
            },
        });

        expect(position.scalePxPerMeter).toBeCloseTo(40);
        expect(position.y).toBeCloseTo(0);
    });
});
