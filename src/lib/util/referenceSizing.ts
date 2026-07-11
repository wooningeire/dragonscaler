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
): ReferenceSizingMethod => (
    value !== null
    && value !== undefined
    && isReferenceSizingMethod(value)
        ? value
        : DEFAULT_REFERENCE_SIZING_METHOD
);

export const pixelMeasurementImageLength = (
    pixelMeasurementPx: number | null,
    imageHeightPx: number | null,
) => {
    if (
        pixelMeasurementPx === null
        || imageHeightPx === null
        || pixelMeasurementPx <= 0
        || imageHeightPx <= 0
    ) {
        return null;
    }

    return pixelMeasurementPx / imageHeightPx;
};

export const formatPixelMeasurementValue = (pixelMeasurementPx: number | null) => {
    if (pixelMeasurementPx === null || !Number.isFinite(pixelMeasurementPx)) return "";

    return Number(pixelMeasurementPx.toFixed(3)).toString();
};
