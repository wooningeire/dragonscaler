import { computeShoulderAltitudeMeters } from "./shoulderAltitude";


type CharacterProjectionInput = {
    scaleFac: number,
    aspect: number,
    shoulderY?: number | null,
    anchor: {
        y: number,
    },
};

export const projectViewportYMeters = (
    yMeters: number,
    logPerspective: boolean,
) => {
    if (!logPerspective) return yMeters;

    return Math.sign(yMeters) * Math.log1p(Math.abs(yMeters));
};

export const unprojectViewportYMeters = (
    projectedYMeters: number,
    logPerspective: boolean,
) => {
    if (!logPerspective) return projectedYMeters;

    return Math.sign(projectedYMeters) * Math.expm1(Math.abs(projectedYMeters));
};

export const viewportProjectionScaleAtMeters = (
    yMeters: number,
    logPerspective: boolean,
) => {
    if (!logPerspective) return 1;

    return 1 / (Math.abs(yMeters) + 1);
};

export const projectedViewportHeightMeters = (
    heightMeters: number,
    anchorY: number,
    logPerspective: boolean,
) => {
    const topMeters = (1 - anchorY) * heightMeters;
    const bottomMeters = -anchorY * heightMeters;

    return projectViewportYMeters(
        topMeters,
        logPerspective,
    ) - projectViewportYMeters(
        bottomMeters,
        logPerspective,
    );
};

export const characterProjectionMetrics = (
    character: CharacterProjectionInput,
    logPerspective: boolean,
    imageHeightMeters = character.scaleFac,
) => {
    if (!logPerspective) {
        return {
            height: imageHeightMeters,
            width: imageHeightMeters * character.aspect,
        };
    }

    const shoulderAltitudeMeters = computeShoulderAltitudeMeters({
        shoulderY: character.shoulderY ?? null,
        groundY: character.anchor.y,
        imageHeightMeters,
    });
    const height = shoulderAltitudeMeters === null
        ? projectedViewportHeightMeters(
            imageHeightMeters,
            character.anchor.y,
            true,
        )
        : imageHeightMeters * projectViewportYMeters(
            shoulderAltitudeMeters,
            true,
        ) / shoulderAltitudeMeters;

    return {
        height,
        width: height * character.aspect,
    };
};

export const characterViewportWidthForProjection = (
    character: CharacterProjectionInput,
    logPerspective: boolean,
) => characterProjectionMetrics(
    character,
    logPerspective,
).width;
