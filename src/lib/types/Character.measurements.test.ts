import { describe, expect, test } from "vitest";
import { Baseline } from "./Baseline.svelte";
import { Character } from "./Character.svelte";

const makeMeasuredCharacter = () => {
    const reference = new Baseline({
        id: "reference",
        points: [
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.5},
        ],
        targetLength: 2,
        measurementUnit: "m",
    });
    const secondary = new Baseline({
        id: "secondary",
        points: [
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.25},
        ],
    });

    return {
        character: new Character({
            measurements: [
                reference,
                secondary,
            ],
            referenceMeasurementId: reference.id,
        }),
        reference,
        secondary,
    };
};

describe("Character measurements", () => {
    test("computes non-reference values from the reference scale", () => {
        const {
            character,
            reference,
            secondary,
        } = makeMeasuredCharacter();

        expect(character.scaleFac).toBe(4);
        expect(character.measurementLengthMeters(reference)).toBe(2);
        expect(character.measurementLengthMeters(secondary)).toBe(1);

        secondary.points = [
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.75},
        ];

        expect(character.measurementLengthMeters(secondary)).toBe(3);
    });

    test("moves roles independently and preserves scale when the reference changes", () => {
        const {
            character,
            reference,
            secondary,
        } = makeMeasuredCharacter();

        character.setShoulderMeasurement(secondary);
        character.setReferenceMeasurement(secondary);

        expect(character.referenceMeasurementId).toBe(secondary.id);
        expect(character.shoulderMeasurementId).toBe(secondary.id);
        expect(secondary.targetLength).toBe(1);
        expect(character.scaleFac).toBe(4);
        expect(character.measurementLengthMeters(reference)).toBe(2);

        character.setShoulderMeasurement(reference);

        expect(character.referenceMeasurementId).toBe(secondary.id);
        expect(character.shoulderMeasurementId).toBe(reference.id);
    });

    test("derives shoulder height from the shoulder measurement terminal point", () => {
        const {
            character,
            secondary,
        } = makeMeasuredCharacter();

        character.setShoulderMeasurement(secondary);

        expect(character.validShoulderY).toBe(0.25);
        expect(character.shoulderAltitude).toBe(1);

        character.shoulderY = 0.75;

        expect(secondary.points).toEqual([
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.75},
        ]);
        expect(character.shoulderAltitude).toBe(3);
    });

    test("clones and copies ordered measurements and role ids", () => {
        const {
            character,
            secondary,
        } = makeMeasuredCharacter();
        character.setShoulderMeasurement(secondary);

        const clone = character.clone();
        const target = new Character();
        target.copy(character);

        for (const result of [clone, target]) {
            expect(result.measurements.map(measurement => measurement.id)).toEqual([
                "reference",
                "secondary",
            ]);
            expect(result.referenceMeasurementId).toBe("reference");
            expect(result.shoulderMeasurementId).toBe("secondary");
            expect(result.measurements[0]).not.toBe(character.measurements[0]);
        }
    });
});
