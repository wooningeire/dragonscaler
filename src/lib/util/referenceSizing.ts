export type ReferenceSizingMethod = "measurement_line" | "pixel_measurement";

export const DEFAULT_REFERENCE_SIZING_METHOD: ReferenceSizingMethod = "measurement_line";

export const referenceSizingMethods: {
    id: ReferenceSizingMethod,
    label: string,
}[] = [
    {
        id: "measurement_line",
        label: "Draw a measurement line",
    },
    {
        id: "pixel_measurement",
        label: "Give a pixel measurement",
    },
];

export const isReferenceSizingMethod = (value: string): value is ReferenceSizingMethod => (
    referenceSizingMethods.some(method => method.id === value)
);

export const normalizeReferenceSizingMethod = (
    value: string | null | undefined,
    pixelMeasurementPx: number | null = null,
): ReferenceSizingMethod => (
    value !== null
    && value !== undefined
    && isReferenceSizingMethod(value)
        ? value
        : isPositiveFinite(pixelMeasurementPx)
            ? "pixel_measurement"
            : DEFAULT_REFERENCE_SIZING_METHOD
);

export const pixelMeasurementImageLength = (
    pixelMeasurementPx: number | null,
    imageHeightPx: number | null,
) => {
    if (
        !isPositiveFinite(pixelMeasurementPx)
        || !isPositiveFinite(imageHeightPx)
    ) {
        return null;
    }

    const imageLength = pixelMeasurementPx / imageHeightPx;

    return isPositiveFinite(imageLength) ? imageLength : null;
};

export const formatPixelMeasurementValue = (pixelMeasurementPx: number | null) => {
    if (pixelMeasurementPx === null || !Number.isFinite(pixelMeasurementPx)) return "";

    return Number(pixelMeasurementPx.toFixed(3)).toString();
};

const isPositiveFinite = (value: number | null): value is number => (
    value !== null
    && Number.isFinite(value)
    && value > 0
);
