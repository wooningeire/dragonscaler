export type MeasurementUnit = "m" | "ft";

export const DEFAULT_MEASUREMENT_UNIT: MeasurementUnit = "m";

export const measurementUnits: {
    id: MeasurementUnit,
    label: string,
}[] = [
    {
        id: "m",
        label: "m",
    },
    {
        id: "ft",
        label: "ft",
    },
];

const METERS_PER_FOOT = 0.3048;
const DISPLAY_DECIMAL_PLACES = 3;

export const isMeasurementUnit = (value: string): value is MeasurementUnit => (
    measurementUnits.some(unit => unit.id === value)
);

export const normalizeMeasurementUnit = (
    value: string | null | undefined,
): MeasurementUnit => (
    value !== null
    && value !== undefined
    && isMeasurementUnit(value)
        ? value
        : DEFAULT_MEASUREMENT_UNIT
);

export const metersToMeasurementUnit = (
    meters: number,
    measurementUnit: MeasurementUnit,
) => (
    measurementUnit === "ft"
        ? meters / METERS_PER_FOOT
        : meters
);

export const measurementUnitToMeters = (
    value: number,
    measurementUnit: MeasurementUnit,
) => (
    measurementUnit === "ft"
        ? value * METERS_PER_FOOT
        : value
);

export const formatMeasurementValue = (
    meters: number,
    measurementUnit: MeasurementUnit,
) => {
    const value = metersToMeasurementUnit(
        meters,
        measurementUnit,
    );

    if (!Number.isFinite(value)) return "";

    return Number(value.toFixed(DISPLAY_DECIMAL_PLACES)).toString();
};
