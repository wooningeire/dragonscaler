import type { Character } from "$lib/types/Character.svelte";
import type { CharacterImage } from "$lib/types/CharacterImage.svelte";
import type { IdentitySummary } from "$lib/types/Identity";
import type { Point } from "$lib/types/Point";
import {
    characterProjectionMetrics,
    projectViewportYMeters,
    unprojectViewportYMeters,
} from "$lib/util/viewportProjection";


export type RectPx = {
    x: number,
    y: number,
    width: number,
    height: number,
};

export type CharacterRenderItem = {
    character: Character,
    image: CharacterImage | null,
    flippedHorizontally: boolean,
    name: string,
    owners: IdentitySummary[],
    rectPx: RectPx,
    measurementLines: CharacterMeasurementRenderItem[],
    /** @deprecated Use measurementLines. */
    baselinePoints: Point[],
    shoulderY: number | null,
    nameplateReferenceHeightPx: number,
    aspect: number,
    opacity: number,
    baselineOpacity: number,
    labelOpacity: number,
    mutedByEditMode: boolean,
    editing: boolean,
};

export type CharacterMeasurementRenderItem = {
    measurementId: string,
    points: Point[],
    isReference: boolean,
    isToShoulder: boolean,
};

export type GridlineRenderItem = {
    orientation: "x" | "y",
    offsetPx: number,
    coordMeters: number,
    weight: "light" | "strong" | "origin",
};

export type CharacterRenderFrame = {
    widthPx: number,
    heightPx: number,
    gridlineStepMeters: number,
    gridlinesOnTop: boolean,
    gridlines: GridlineRenderItem[],
    items: CharacterRenderItem[],
};

export type CharacterProjectionOverride = {
    character: Character,
    projectedHeightMeters: number,
    centerXMeters: number,
    centerProjectedYMeters: number,
};

export type CharacterRenderCamera = {
    posMetersX: number,
    posMetersY: number,
    scalePxPerMeter: number,
    viewportPositionPx: Point,
};

export type BaselinePreview = {
    character: Character,
    points: Point[],
} | null;

export type ShoulderPreview = {
    character: Character,
    y: number,
} | null;

type ProjectedMetersRange = {
    bottom: number,
    top: number,
};

type LogGridlineCandidate = {
    coordMeters: number,
    projectedYMeters: number,
};

type OffsetLogGridlineCandidate = LogGridlineCandidate & {
    offsetPx: number,
};

const EDIT_MUTED_OPACITY = 0.3333333;
const BASELINE_OPACITY = 0.3333333;
const LABEL_TARGET_SCALE_PX = 96;
const TARGET_GRIDLINE_STEP_PX = 144;
const LOG_GRIDLINE_EPSILON = 1e-4;
const LOG_GRIDLINE_MAGNITUDE_FACTOR = 4;
const LOG_GRIDLINE_MIN_GAP_PX = TARGET_GRIDLINE_STEP_PX / 3;
const MAX_LOG_GRIDLINE_CANDIDATES_PER_SIGN = 256;
const MAX_LOG_PROJECTED_MAGNITUDE = Math.log(Number.MAX_VALUE);

export const buildCharacterRenderFrame = ({
    characters,
    positionsX,
    camera,
    widthPx,
    heightPx,
    editingCharacter,
    selectedCharacter = null,
    activeMeasurementId = null,
    baselinePreview = null,
    shoulderPreview = null,
    projectionOverride = null,
    logPerspective = false,
    gridlinesOnTop = false,
}: {
    characters: Character[],
    positionsX: number[],
    camera: CharacterRenderCamera,
    widthPx: number,
    heightPx: number,
    editingCharacter: Character | null,
    selectedCharacter?: Character | null,
    activeMeasurementId?: string | null,
    baselinePreview?: BaselinePreview,
    shoulderPreview?: ShoulderPreview,
    projectionOverride?: CharacterProjectionOverride | null,
    logPerspective?: boolean,
    gridlinesOnTop?: boolean,
}): CharacterRenderFrame => {
    const gridlineStepMeters = 2 ** Math.round(-Math.log2(camera.scalePxPerMeter / TARGET_GRIDLINE_STEP_PX));
    const gridlines = buildGridlines({
        camera,
        widthPx,
        heightPx,
        gridlineStepMeters,
        logPerspective,
    });
    const projectedCameraYMeters = projectViewportYMeters(
        camera.posMetersY,
        logPerspective,
    );
    const screenYMetersAsPx = (yMeters: number) => (
        camera.viewportPositionPx.y
        - (
            projectViewportYMeters(
                yMeters,
                logPerspective,
            ) - projectedCameraYMeters
        ) * camera.scalePxPerMeter
    );
    const items = characters.map((character, index) => {
        const projectionMetrics = characterProjectionMetrics(
            character,
            logPerspective,
        );
        const projectedHeightMeters = projectionOverride?.character === character
            ? projectionOverride.projectedHeightMeters
            : projectionMetrics.height;
        const height = projectedHeightMeters * camera.scalePxPerMeter;
        const anchorY = screenYMetersAsPx(0);
        const width = projectedHeightMeters * character.aspect * camera.scalePxPerMeter;
        const centerPx = projectionOverride?.character === character
            ? {
                x: camera.viewportPositionPx.x
                    + (projectionOverride.centerXMeters - camera.posMetersX) * camera.scalePxPerMeter,
                y: camera.viewportPositionPx.y
                    - (projectionOverride.centerProjectedYMeters - projectedCameraYMeters) * camera.scalePxPerMeter,
            }
            : null;
        const mutedByEditMode = editingCharacter !== null && editingCharacter !== character;
        const editing = editingCharacter === character;
        const selected = selectedCharacter === character;
        const showAllMeasurements = editing || selected;
        const previewMeasurementId = activeMeasurementId ?? character.referenceMeasurementId;
        const measurementLines = character.measurements
            .filter(measurement => (
                showAllMeasurements
                || measurement.id === character.referenceMeasurementId
                || measurement.id === character.shoulderMeasurementId
            ))
            .map(measurement => {
                const isReference = measurement.id === character.referenceMeasurementId;
                const isActivePreview = baselinePreview?.character === character
                    && measurement.id === previewMeasurementId;

                return {
                    measurementId: measurement.id,
                    points: isReference && measurement.referenceSizingMethod === "pixel_measurement"
                        ? []
                        : isActivePreview
                            ? baselinePreview.points
                            : measurement.points,
                    isReference,
                    isToShoulder: measurement.id === character.shoulderMeasurementId,
                };
            });
        const referenceMeasurementLine = measurementLines.find(line => line.isReference);
        const nameplateShoulderY = (
            editing
            && shoulderPreview?.character === character
        )
            ? shoulderPreview.y
            : character.validShoulderY;
        const opacity = mutedByEditMode ? EDIT_MUTED_OPACITY : 1;
        const nameplateReferenceHeightPx = nameplateShoulderY === null
            ? height
            : height * (nameplateShoulderY - character.anchor.y);
        const labelOpacity = Math.exp(
            -((Math.log(nameplateReferenceHeightPx / LABEL_TARGET_SCALE_PX)) ** 2),
        );

        return {
            character,
            image: character.image,
            flippedHorizontally: character.image?.flippedHorizontally ?? false,
            name: character.name,
            owners: character.ownerIdentities,
            rectPx: {
                x: centerPx === null ? (
                    camera.viewportPositionPx.x + (positionsX[index] - camera.posMetersX) * camera.scalePxPerMeter
                ) : centerPx.x - width * 0.5,
                y: centerPx === null ? (
                    anchorY - (1 - character.anchor.y) * height
                ) : centerPx.y - height * 0.5,
                width,
                height,
            },
            measurementLines,
            baselinePoints: referenceMeasurementLine?.points ?? [],
            aspect: character.aspect,
            shoulderY: editing ? nameplateShoulderY : null,
            nameplateReferenceHeightPx,
            opacity,
            baselineOpacity: BASELINE_OPACITY * opacity,
            labelOpacity,
            mutedByEditMode,
            editing,
        };
    });

    return {
        widthPx,
        heightPx,
        gridlineStepMeters,
        gridlinesOnTop,
        gridlines,
        items: items.toReversed(),
    };
};

const buildGridlines = ({
    camera,
    widthPx,
    heightPx,
    gridlineStepMeters,
    logPerspective,
}: {
    camera: CharacterRenderCamera,
    widthPx: number,
    heightPx: number,
    gridlineStepMeters: number,
    logPerspective: boolean,
}) => {
    const gridlines: GridlineRenderItem[] = [];
    appendVerticalGridlines(
        gridlines,
        {
            camera,
            widthPx,
            heightPx,
            gridlineStepMeters,
        },
    );

    if (logPerspective) {
        appendLogHorizontalGridlines(
            gridlines,
            {
                camera,
                heightPx,
                gridlineStepMeters,
            },
        );
        return gridlines;
    }

    appendLinearHorizontalGridlines(
        gridlines,
        {
            camera,
            heightPx,
            gridlineStepMeters,
        },
    );

    return gridlines;
};

const appendVerticalGridlines = (
    gridlines: GridlineRenderItem[],
    {
        camera,
        widthPx,
        gridlineStepMeters,
    }: {
        camera: CharacterRenderCamera,
        widthPx: number,
        heightPx: number,
        gridlineStepMeters: number,
    },
) => {
    const boundsMeters = {
        left: camera.posMetersX - widthPx * 0.5 / camera.scalePxPerMeter,
        right: camera.posMetersX + widthPx * 0.5 / camera.scalePxPerMeter,
    };

    let xMeters = Math.floor(boundsMeters.left / gridlineStepMeters) * gridlineStepMeters;
    while (xMeters < boundsMeters.right) {
        gridlines.push({
            orientation: "x",
            offsetPx: camera.viewportPositionPx.x + (xMeters - camera.posMetersX) * camera.scalePxPerMeter,
            coordMeters: xMeters,
            weight: "light",
        });
        xMeters += gridlineStepMeters;
    }
};

const appendLinearHorizontalGridlines = (
    gridlines: GridlineRenderItem[],
    {
        camera,
        heightPx,
        gridlineStepMeters,
    }: {
        camera: CharacterRenderCamera,
        heightPx: number,
        gridlineStepMeters: number,
    },
) => {
    const projectedCameraYMeters = projectViewportYMeters(
        camera.posMetersY,
        false,
    );
    const boundsMeters = {
        bottom: unprojectViewportYMeters(
            projectedCameraYMeters - heightPx * 0.5 / camera.scalePxPerMeter,
            false,
        ),
        top: unprojectViewportYMeters(
            projectedCameraYMeters + heightPx * 0.5 / camera.scalePxPerMeter,
            false,
        ),
    };

    let yMeters = Math.floor(boundsMeters.bottom / gridlineStepMeters) * gridlineStepMeters;
    while (yMeters < boundsMeters.top) {
        gridlines.push({
            orientation: "y",
            offsetPx: camera.viewportPositionPx.y - (
                projectViewportYMeters(
                    yMeters,
                    false,
                ) - projectedCameraYMeters
            ) * camera.scalePxPerMeter,
            coordMeters: yMeters,
            weight: Math.abs(yMeters) < 1e-4 ? "origin" : "strong",
        });
        yMeters += gridlineStepMeters;
    }
};

const appendLogHorizontalGridlines = (
    gridlines: GridlineRenderItem[],
    {
        camera,
        heightPx,
        gridlineStepMeters,
    }: {
        camera: CharacterRenderCamera,
        heightPx: number,
        gridlineStepMeters: number,
    },
) => {
    const projectedCameraYMeters = projectViewportYMeters(
        camera.posMetersY,
        true,
    );
    const boundsProjectedMeters = {
        bottom: projectedCameraYMeters - heightPx * 0.5 / camera.scalePxPerMeter,
        top: projectedCameraYMeters + heightPx * 0.5 / camera.scalePxPerMeter,
    };
    // Log gridlines are labeled in physical meters, but stepping every physical
    // meter can explode after unprojecting a wide log-space viewport.
    const gridlineCandidates = logHorizontalGridlineCandidates({
        boundsProjectedMeters,
        gridlineStepMeters,
        scalePxPerMeter: camera.scalePxPerMeter,
    })
        .map(candidate => ({
            ...candidate,
            offsetPx: camera.viewportPositionPx.y - (
                candidate.projectedYMeters - projectedCameraYMeters
            ) * camera.scalePxPerMeter,
        }))
        .sort((a, b) => (
            Math.abs(a.projectedYMeters - projectedCameraYMeters)
            - Math.abs(b.projectedYMeters - projectedCameraYMeters)
        ));
    const acceptedGridlines: OffsetLogGridlineCandidate[] = [];

    for (const candidate of gridlineCandidates) {
        const hasNearbyGridline = acceptedGridlines.some(accepted => (
            Math.abs(accepted.offsetPx - candidate.offsetPx) < LOG_GRIDLINE_MIN_GAP_PX
        ));
        if (hasNearbyGridline) continue;

        acceptedGridlines.push(candidate);
    }

    acceptedGridlines
        .sort((a, b) => a.offsetPx - b.offsetPx)
        .forEach(candidate => {
            gridlines.push({
                orientation: "y",
                offsetPx: candidate.offsetPx,
                coordMeters: candidate.coordMeters,
                weight: Math.abs(candidate.coordMeters) < LOG_GRIDLINE_EPSILON ? "origin" : "strong",
            });
        });
};

const logHorizontalGridlineCandidates = ({
    boundsProjectedMeters,
    gridlineStepMeters,
    scalePxPerMeter,
}: {
    boundsProjectedMeters: ProjectedMetersRange,
    gridlineStepMeters: number,
    scalePxPerMeter: number,
}) => {
    const candidates: LogGridlineCandidate[] = [];

    if (
        boundsProjectedMeters.bottom <= 0
        && 0 < boundsProjectedMeters.top
    ) {
        candidates.push({
            coordMeters: 0,
            projectedYMeters: 0,
        });
    }

    appendSignedLogGridlineCandidates(
        candidates,
        {
            boundsProjectedMeters,
            gridlineStepMeters,
            scalePxPerMeter,
            sign: 1,
        },
    );
    appendSignedLogGridlineCandidates(
        candidates,
        {
            boundsProjectedMeters,
            gridlineStepMeters,
            scalePxPerMeter,
            sign: -1,
        },
    );

    return candidates;
};

const appendSignedLogGridlineCandidates = (
    candidates: LogGridlineCandidate[],
    {
        boundsProjectedMeters,
        gridlineStepMeters,
        scalePxPerMeter,
        sign,
    }: {
        boundsProjectedMeters: ProjectedMetersRange,
        gridlineStepMeters: number,
        scalePxPerMeter: number,
        sign: 1 | -1,
    },
) => {
    const visibleProjectedMagnitudes = sign > 0
        ? {
            min: Math.max(
                boundsProjectedMeters.bottom,
                0,
            ),
            max: Math.max(
                boundsProjectedMeters.top,
                0,
            ),
        }
        : {
            min: Math.max(
                -boundsProjectedMeters.top,
                0,
            ),
            max: Math.max(
                -boundsProjectedMeters.bottom,
                0,
            ),
        };

    if (visibleProjectedMagnitudes.max <= 0) return;

    const logBase = Math.log(Math.max(
        gridlineStepMeters,
        Number.MIN_VALUE,
    ));
    const logFactor = Math.log(LOG_GRIDLINE_MAGNITUDE_FACTOR);
    const exponentAtProjectedMagnitude = (projectedMagnitude: number) => (
        (projectedMagnitude - logBase) / logFactor
    );
    const minProjectedMagnitude = Math.max(
        visibleProjectedMagnitudes.min,
        0,
    );
    const maxProjectedMagnitude = Math.min(
        visibleProjectedMagnitudes.max,
        MAX_LOG_PROJECTED_MAGNITUDE,
    );

    if (maxProjectedMagnitude <= 0) return;

    const exponentStart = Math.max(
        0,
        Math.floor(exponentAtProjectedMagnitude(minProjectedMagnitude)) - 2,
    );
    const exponentEnd = Math.max(
        exponentStart,
        Math.ceil(exponentAtProjectedMagnitude(maxProjectedMagnitude)) + 2,
    );
    const exponentStep = Math.max(
        1,
        Math.ceil(LOG_GRIDLINE_MIN_GAP_PX / (
            logFactor
            * Math.max(
                scalePxPerMeter,
                Number.MIN_VALUE,
            )
        )),
    );
    const centerExponent = Math.max(
        0,
        Math.round(exponentAtProjectedMagnitude((
            minProjectedMagnitude
            + maxProjectedMagnitude
        ) * 0.5)),
    );
    const exponents = new Set([
        exponentStart,
        centerExponent,
        exponentEnd,
    ]);
    let exponentCount = 0;

    for (
        let exponent = exponentStart;
        exponent <= exponentEnd && exponentCount < MAX_LOG_GRIDLINE_CANDIDATES_PER_SIGN;
        exponent += exponentStep
    ) {
        exponents.add(exponent);
        exponentCount += 1;
    }

    Array.from(exponents)
        .sort((a, b) => a - b)
        .forEach(exponent => {
            const magnitudeLog = logBase + exponent * logFactor;
            if (magnitudeLog > MAX_LOG_PROJECTED_MAGNITUDE) return;

            const coordMeters = sign * Math.exp(magnitudeLog);
            const projectedYMeters = projectViewportYMeters(
                coordMeters,
                true,
            );

            if (
                projectedYMeters < boundsProjectedMeters.bottom
                || boundsProjectedMeters.top <= projectedYMeters
            ) {
                return;
            }

            candidates.push({
                coordMeters,
                projectedYMeters,
            });
        });
};
