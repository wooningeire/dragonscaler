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

    test("requires an explicit method before pixel input controls sizing", () => {
        const defaultMethod = new Baseline({pixelMeasurementPx: 420});
        const explicitPixelMethod = new Baseline({
            referenceSizingMethod: "pixel_measurement",
            pixelMeasurementPx: 420,
        });

        expect(defaultMethod.referenceSizingMethod).toBe("measurement_line");
        expect(defaultMethod.pixelMeasurementPx).toBe(420);
        expect(explicitPixelMethod.referenceSizingMethod).toBe("pixel_measurement");
    });
});
