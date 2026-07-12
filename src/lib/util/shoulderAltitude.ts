export const normalizeShoulderY = ({
    shoulderY,
    groundY,
}: {
    shoulderY: unknown,
    groundY: number,
}) => {
    if (
        typeof shoulderY !== "number"
        || !Number.isFinite(shoulderY)
        || shoulderY <= 0
        || shoulderY > 1
        || !Number.isFinite(groundY)
        || groundY < 0
        || groundY >= 1
        || shoulderY <= groundY
    ) {
        return null;
    }

    return shoulderY;
};


export const computeShoulderAltitudeMeters = ({
    shoulderY,
    groundY,
    imageHeightMeters,
}: {
    shoulderY: number | null,
    groundY: number,
    imageHeightMeters: number,
}) => {
    const normalizedShoulderY = normalizeShoulderY({
        shoulderY,
        groundY,
    });

    if (
        normalizedShoulderY === null
        || !Number.isFinite(imageHeightMeters)
        || imageHeightMeters <= 0
    ) {
        return null;
    }

    const altitudeMeters = (normalizedShoulderY - groundY) * imageHeightMeters;

    return Number.isFinite(altitudeMeters) && altitudeMeters > 0
        ? altitudeMeters
        : null;
};
