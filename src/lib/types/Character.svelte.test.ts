import { describe, expect, test } from "vitest";
import { Baseline } from "./Baseline.svelte";
import { Character } from "./Character.svelte";
import { CharacterImage } from "./CharacterImage.svelte";

const characterImage = (width: number, height: number) => new CharacterImage({
    src: "test.png",
    file: new File([], "test.png"),
    dimensions: {width, height},
});

describe("Character", () => {
    test("uses the drawn measurement line for scale by default", () => {
        const character = new Character({
            imageDimensions: {width: 600, height: 600},
            baseline: new Baseline({
                targetLength: 2,
                points: [
                    {x: 0.5, y: 0},
                    {x: 0.5, y: 1},
                ],
            }),
        });

        expect(character.referenceImageLength).toBe(1);
        expect(character.scaleFac).toBe(2);
        expect(character.viewportWidth).toBe(2);
    });

    test("derives pixel sizing from placeholder image dimensions", () => {
        const character = new Character({
            imageDimensions: {width: 900, height: 600},
            baseline: new Baseline({
                targetLength: 2,
                referenceSizingMethod: "pixel_measurement",
                pixelMeasurementPx: 300,
            }),
        });

        expect(character.pixelMeasurementImageLength).toBe(0.5);
        expect(character.referenceImageLength).toBe(0.5);
        expect(character.scaleFac).toBe(4);
        expect(character.aspect).toBe(1.5);
        expect(character.viewportWidth).toBe(6);
    });

    test("switches from placeholder dimensions to the loaded image frame", () => {
        const character = new Character({
            imageDimensions: {width: 900, height: 600},
            baseline: new Baseline({
                referenceSizingMethod: "pixel_measurement",
                pixelMeasurementPx: 200,
            }),
        });

        expect(character.pixelMeasurementImageLength).toBeCloseTo(1 / 3);
        expect(character.aspect).toBe(1.5);

        character.image = characterImage(800, 400);

        expect(character.pixelMeasurementImageLength).toBe(0.5);
        expect(character.aspect).toBe(2);
    });

    test("preserves image dimensions and pixel sizing when cloning and copying", () => {
        const source = new Character({
            imageDimensions: {width: 900, height: 600},
            baseline: new Baseline({
                referenceSizingMethod: "pixel_measurement",
                pixelMeasurementPx: 300,
            }),
        });
        const clone = source.clone();
        const target = new Character();

        target.copy(source);

        expect(clone.imageDimensions).toEqual({width: 900, height: 600});
        expect(clone.imageDimensions).not.toBe(source.imageDimensions);
        expect(clone.baseline).not.toBe(source.baseline);
        expect(clone.pixelMeasurementImageLength).toBe(0.5);
        expect(target.imageDimensions).toEqual({width: 900, height: 600});
        expect(target.pixelMeasurementImageLength).toBe(0.5);
    });
});
