import { describe, expect, test } from "vitest";
import { Baseline } from "./Baseline.svelte";

describe("Baseline", () => {
    test("uses measurement-line sizing by default", () => {
        const baseline = new Baseline({
            points: [
                {x: 0.5, y: 0},
                {x: 0.5, y: 1},
            ],
        });

        expect(baseline.referenceSizingMethod).toBe("measurement_line");
        expect(baseline.arcLength).toBe(1);
    });

    test("preserves authored pixel fields when cloning and copying", () => {
        const source = new Baseline({
            referenceSizingMethod: "pixel_measurement",
            pixelMeasurementPx: 420,
        });
        const clone = source.clone();
        const target = new Baseline();

        target.copy(source);

        expect(clone).toMatchObject({
            referenceSizingMethod: "pixel_measurement",
            pixelMeasurementPx: 420,
        });
        expect(target).toMatchObject({
            referenceSizingMethod: "pixel_measurement",
            pixelMeasurementPx: 420,
        });
    });

    test("infers legacy pixel sizing without overriding an explicit method", () => {
        const inferred = new Baseline({pixelMeasurementPx: 420});
        const explicit = new Baseline({
            referenceSizingMethod: "measurement_line",
            pixelMeasurementPx: 420,
        });

        expect(inferred.referenceSizingMethod).toBe("pixel_measurement");
        expect(explicit.referenceSizingMethod).toBe("measurement_line");
    });
});
