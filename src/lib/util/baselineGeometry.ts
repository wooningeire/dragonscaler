import type { Point } from "$lib/types/Point";

export type BaselineEditMode = "altitude" | "line" | "curve";

export const DEFAULT_BASELINE_EDIT_MODE: BaselineEditMode = "curve";

export const baselineEditModes: {
    id: BaselineEditMode,
    label: string,
}[] = [
    {
        id: "altitude",
        label: "Altitude",
    },
    {
        id: "line",
        label: "Line",
    },
    {
        id: "curve",
        label: "Curve",
    },
];

const BSPLINE_SAMPLES_PER_SEGMENT = 8;
const MIN_CURVE_POINT_DISTANCE = 0.002;

type CubicBezierSegment = {
    start: Point,
    control1: Point,
    control2: Point,
    end: Point,
};

type BaselineBuildOptions = {
    groundY?: number,
};

export const isBaselineEditMode = (value: string): value is BaselineEditMode => (
    baselineEditModes.some(mode => mode.id === value)
);

export const clampBaselinePoint = (point: Point, aspect: number): Point => ({
    x: clamp(point.x, 0, aspect),
    y: clamp(point.y, 0, 1),
});

export const buildBaselinePoints = (
    editMode: BaselineEditMode,
    rawPoints: readonly Point[],
    {
        groundY = 0,
    }: BaselineBuildOptions = {},
): Point[] => {
    if (rawPoints.length === 0) return [];

    const firstPoint = rawPoints[0];
    const lastPoint = rawPoints[rawPoints.length - 1];
    const clampedGroundY = clamp(groundY, 0, 1);

    if (editMode === "altitude") {
        return [
            {
                x: lastPoint.x,
                y: clampedGroundY,
            },
            {
                x: lastPoint.x,
                y: Math.max(lastPoint.y, clampedGroundY),
            },
        ];
    }

    if (editMode === "line") {
        return [
            clonePoint(firstPoint),
            clonePoint(lastPoint),
        ];
    }

    return compactCurvePoints(rawPoints);
};

export const pointsToPathD = (points: readonly Point[]) => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M${formatCoordinate(points[0].x)},${formatCoordinate(points[0].y)}`;
    if (points.length === 2) {
        return `M${formatCoordinate(points[0].x)},${formatCoordinate(points[0].y)}L${formatCoordinate(points[1].x)},${formatCoordinate(points[1].y)}`;
    }

    const segments = cubicBezierSegmentsFromBSpline(points);
    if (segments.length === 0) return "";

    const firstSegment = segments[0];
    let d = `M${formatCoordinate(firstSegment.start.x)},${formatCoordinate(firstSegment.start.y)}`;

    for (const segment of segments) {
        d += `C${formatCoordinate(segment.control1.x)},${formatCoordinate(segment.control1.y)} `;
        d += `${formatCoordinate(segment.control2.x)},${formatCoordinate(segment.control2.y)} `;
        d += `${formatCoordinate(segment.end.x)},${formatCoordinate(segment.end.y)}`;
    }

    return d;
};

export const computeBaselineArcLength = (points: readonly Point[]) => {
    const sampledPoints = sampleBaselinePath(points);
    let length = 0;

    for (let i = 0; i < sampledPoints.length - 1; i++) {
        length += Math.hypot(
            sampledPoints[i + 1].x - sampledPoints[i].x,
            sampledPoints[i + 1].y - sampledPoints[i].y,
        );
    }

    return length;
};

export const sampleBaselinePath = (points: readonly Point[]): Point[] => {
    if (points.length <= 2) return points.map(clonePoint);

    const segments = cubicBezierSegmentsFromBSpline(points);
    if (segments.length === 0) return [];

    const sampledPoints: Point[] = [];

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
        const segment = segments[segmentIndex];

        for (let step = 0; step < BSPLINE_SAMPLES_PER_SEGMENT; step++) {
            if (segmentIndex > 0 && step === 0) continue;

            sampledPoints.push(sampleCubicBezier(
                segment,
                step / BSPLINE_SAMPLES_PER_SEGMENT,
            ));
        }
    }

    sampledPoints.push(clonePoint(points[points.length - 1]));
    return sampledPoints;
};

const cubicBezierSegmentsFromBSpline = (points: readonly Point[]): CubicBezierSegment[] => {
    const curvePoints = compactCurvePoints(points);
    if (curvePoints.length < 3) return [];

    const firstPoint = curvePoints[0];
    const lastPoint = curvePoints[curvePoints.length - 1];
    const paddedPoints = [
        firstPoint,
        firstPoint,
        ...curvePoints,
        lastPoint,
        lastPoint,
    ];
    const segments: CubicBezierSegment[] = [];

    for (let i = 0; i < paddedPoints.length - 3; i++) {
        const p0 = paddedPoints[i];
        const p1 = paddedPoints[i + 1];
        const p2 = paddedPoints[i + 2];
        const p3 = paddedPoints[i + 3];

        segments.push({
            start: weightedPoint(
                [1, 4, 1],
                [p0, p1, p2],
            ),
            control1: weightedPoint(
                [4, 2],
                [p1, p2],
            ),
            control2: weightedPoint(
                [2, 4],
                [p1, p2],
            ),
            end: weightedPoint(
                [1, 4, 1],
                [p1, p2, p3],
            ),
        });
    }

    return segments;
};

const sampleCubicBezier = (segment: CubicBezierSegment, t: number): Point => {
    const inverseT = 1 - t;
    const inverseT2 = inverseT * inverseT;
    const t2 = t * t;

    return {
        x: (
            inverseT2 * inverseT * segment.start.x
            + 3 * inverseT2 * t * segment.control1.x
            + 3 * inverseT * t2 * segment.control2.x
            + t2 * t * segment.end.x
        ),
        y: (
            inverseT2 * inverseT * segment.start.y
            + 3 * inverseT2 * t * segment.control1.y
            + 3 * inverseT * t2 * segment.control2.y
            + t2 * t * segment.end.y
        ),
    };
};

const compactCurvePoints = (points: readonly Point[]): Point[] => {
    const compactedPoints: Point[] = [];

    for (const point of points) {
        const previousPoint = compactedPoints[compactedPoints.length - 1];

        if (
            previousPoint === undefined
            || distance(previousPoint, point) >= MIN_CURVE_POINT_DISTANCE
        ) {
            compactedPoints.push(clonePoint(point));
        }
    }

    const finalPoint = points[points.length - 1];
    const compactedFinalPoint = compactedPoints[compactedPoints.length - 1];

    if (
        finalPoint !== undefined
        && compactedFinalPoint !== undefined
        && distance(compactedFinalPoint, finalPoint) > 0
    ) {
        compactedPoints.push(clonePoint(finalPoint));
    }

    return compactedPoints;
};

const weightedPoint = (
    weights: readonly number[],
    points: readonly Point[],
): Point => {
    const weightTotal = weights.reduce((total, weight) => total + weight, 0);
    let x = 0;
    let y = 0;

    for (let i = 0; i < weights.length; i++) {
        x += points[i].x * weights[i];
        y += points[i].y * weights[i];
    }

    return {
        x: x / weightTotal,
        y: y / weightTotal,
    };
};

const distance = (a: Point, b: Point) => Math.hypot(
    a.x - b.x,
    a.y - b.y,
);

const clonePoint = (point: Point): Point => ({
    x: point.x,
    y: point.y,
});

const clamp = (value: number, min: number, max: number) => Math.min(
    Math.max(value, min),
    max,
);

const formatCoordinate = (value: number) => Number(value.toFixed(6)).toString();
