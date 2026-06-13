type CharacterProjectionInput = {
    viewportWidth: number,
    baseline?: {
        scaleFac: number,
    },
    aspect?: number,
    anchor?: {
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

export const characterViewportWidthForProjection = (
    character: CharacterProjectionInput,
    logPerspective: boolean,
) => {
    if (
        !logPerspective
        || character.baseline === undefined
        || character.aspect === undefined
        || character.anchor === undefined
    ) {
        return character.viewportWidth;
    }

    return projectedViewportHeightMeters(
        character.baseline.scaleFac,
        character.anchor.y,
        logPerspective,
    ) * character.aspect;
};
