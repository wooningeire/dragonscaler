import { describe, expect, test } from "vitest";
import {
    buildBaselinePoints,
    clampBaselinePoint,
    computeBaselineArcLength,
    pointsToPathD,
    sampleBaselinePath,
} from "./baselineGeometry";
import type { Point } from "$lib/types/Point";

const points: Point[] = [
    {
        x: 0,
        y: 0,
    },
    {
        x: 0.5,
        y: 0.8,
    },
    {
        x: 1,
        y: 0.1,
    },
    {
        x: 1.4,
        y: 0.9,
    },
];

describe("baselineGeometry", () => {
    test("builds altitude references from character ground to the latest pointer altitude", () => {
        expect(buildBaselinePoints(
            "altitude",
            points,
            {groundY: 0.25},
        )).toEqual([
            {
                x: 1.4,
                y: 0.25,
            },
            {
                x: 1.4,
                y: 0.9,
            },
        ]);
    });

    test("does not let altitude references measure below ground", () => {
        expect(buildBaselinePoints(
            "altitude",
            [
                {
                    x: 0.5,
                    y: 0.3,
                },
            ],
            {groundY: 0.6},
        )).toEqual([
            {
                x: 0.5,
                y: 0.6,
            },
            {
                x: 0.5,
                y: 0.6,
            },
        ]);
    });

    test("builds straight line references from first to latest pointer point", () => {
        expect(buildBaselinePoints("line", points)).toEqual([
            {
                x: 0,
                y: 0,
            },
            {
                x: 1.4,
                y: 0.9,
            },
        ]);
    });

    test("keeps curve references as compact B-spline control points", () => {
        expect(buildBaselinePoints("curve", points)).toEqual(points);
        expect(pointsToPathD(points)).toContain("C");
    });

    test("samples multi-point references as a smooth B-spline path", () => {
        const sampledPoints = sampleBaselinePath(points);

        expect(sampledPoints.length).toBeGreaterThan(points.length);
        expect(sampledPoints[0]).toEqual(points[0]);
        expect(sampledPoints[sampledPoints.length - 1]).toEqual(points[points.length - 1]);
        expect(sampledPoints.some(point => (
            !points.some(rawPoint => rawPoint.x === point.x && rawPoint.y === point.y)
        ))).toBe(true);
    });

    test("measures two-point references as direct distance", () => {
        expect(computeBaselineArcLength([
            {
                x: 0,
                y: 0,
            },
            {
                x: 3,
                y: 4,
            },
        ])).toBe(5);
    });

    test("clamps pointer coordinates into the normalized reference plane", () => {
        expect(clampBaselinePoint(
            {
                x: 3,
                y: -1,
            },
            2,
        )).toEqual({
            x: 2,
            y: 0,
        });
    });
});
