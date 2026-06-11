import { describe, expect, test } from "vitest";
import {
    formatMeasurementValue,
    isMeasurementUnit,
    measurementUnitToMeters,
    metersToMeasurementUnit,
    normalizeMeasurementUnit,
} from "./measurementUnits";

describe("measurementUnits", () => {
    test("keeps meters unchanged", () => {
        expect(metersToMeasurementUnit(
            2,
            "m",
        )).toBe(2);
        expect(measurementUnitToMeters(
            2,
            "m",
        )).toBe(2);
    });

    test("converts feet to the persisted meter value", () => {
        expect(metersToMeasurementUnit(
            0.3048,
            "ft",
        )).toBe(1);
        expect(measurementUnitToMeters(
            1,
            "ft",
        )).toBe(0.3048);
    });

    test("formats feet without leaking conversion noise into the editor", () => {
        expect(formatMeasurementValue(
            1,
            "ft",
        )).toBe("3.281");
    });

    test("recognizes supported unit ids", () => {
        expect(isMeasurementUnit("m")).toBe(true);
        expect(isMeasurementUnit("ft")).toBe(true);
        expect(isMeasurementUnit("cm")).toBe(false);
    });

    test("normalizes missing or invalid persisted unit ids to meters", () => {
        expect(normalizeMeasurementUnit("ft")).toBe("ft");
        expect(normalizeMeasurementUnit(undefined)).toBe("m");
        expect(normalizeMeasurementUnit("cm")).toBe("m");
    });
});
