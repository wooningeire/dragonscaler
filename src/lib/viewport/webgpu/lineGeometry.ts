import type {
    CharacterMeasurementRenderItem,
    CharacterRenderFrame,
    CharacterRenderItem,
    RectPx,
} from "../characterRenderModel";
import type { Point } from "$lib/types/Point";
import { sampleBaselinePath } from "$lib/util/baselineGeometry";
import {
    BASELINE_BLACK_COLOR,
    BASELINE_WHITE_COLOR,
    CENTER_FILL_COLOR,
    CENTER_OUTLINE_COLOR,
    GRIDLINE_LIGHT_COLOR,
    GRIDLINE_STRONG_COLOR,
    MEASUREMENT_RED_COLOR,
    MEASUREMENT_RED_OUTLINE_COLOR,
    SHOULDER_MARK_COLOR,
    SHOULDER_MARK_OUTLINE_COLOR,
} from "./constants";
import type { ColorRgba } from "./types";
import { withOpacity } from "./utils";

export const buildGridLineVertices = (frame: CharacterRenderFrame) => {
    const vertices: number[] = [];

    for (const gridline of frame.gridlines) {
        const weightPx = gridline.weight === "origin" ? 4 : 2;
        const color = gridline.weight === "light"
            ? GRIDLINE_LIGHT_COLOR
            : GRIDLINE_STRONG_COLOR;

        if (gridline.orientation === "x") {
            appendRect(
                vertices,
                frame,
                {
                    x: gridline.offsetPx - weightPx * 0.5,
                    y: 0,
                    width: weightPx,
                    height: frame.heightPx,
                },
                color,
            );
        } else {
            appendRect(
                vertices,
                frame,
                {
                    x: 0,
                    y: gridline.offsetPx - weightPx * 0.5,
                    width: frame.widthPx,
                    height: weightPx,
                },
                color,
            );
        }
    }

    return new Float32Array(vertices);
};

export const buildCharacterLineVertices = (frame: CharacterRenderFrame) => {
    const vertices: number[] = [];

    for (const item of frame.items) {
        for (const measurement of item.measurementLines) {
            if (measurement.points.length < 2) continue;

            const outlineColor = measurement.isReference
                ? BASELINE_WHITE_COLOR
                : MEASUREMENT_RED_OUTLINE_COLOR;
            const fillColor = measurement.isReference
                ? BASELINE_BLACK_COLOR
                : MEASUREMENT_RED_COLOR;

            appendMeasurementStroke(
                vertices,
                frame,
                item,
                measurement,
                item.rectPx.height * 0.01,
                withOpacity(outlineColor, item.baselineOpacity),
            );
            appendMeasurementStroke(
                vertices,
                frame,
                item,
                measurement,
                item.rectPx.height * 0.003,
                withOpacity(fillColor, item.baselineOpacity),
            );
        }

        if (item.shoulderY !== null) {
            appendShoulderGuide(
                vertices,
                frame,
                item,
                item.shoulderY,
            );
        }

        if (item.editing) {
            appendAnchorControl(vertices, frame, item);
        }
    }

    return new Float32Array(vertices);
};

const appendMeasurementStroke = (
    vertices: number[],
    frame: CharacterRenderFrame,
    item: CharacterRenderItem,
    measurement: CharacterMeasurementRenderItem,
    thicknessPx: number,
    color: ColorRgba,
) => {
    const points = sampleBaselinePath(measurement.points);

    for (let index = 1; index < points.length; index++) {
        const start = baselinePointToScreenPx(item, points[index - 1]);
        const end = baselinePointToScreenPx(item, points[index]);
        appendLineSegment(
            vertices,
            frame,
            start,
            end,
            thicknessPx,
            color,
        );
    }
};

const appendShoulderGuide = (
    vertices: number[],
    frame: CharacterRenderFrame,
    item: CharacterRenderItem,
    shoulderY: number,
) => {
    const y = item.rectPx.y + (1 - shoulderY) * item.rectPx.height;
    const start = {
        x: item.rectPx.x,
        y,
    };
    const end = {
        x: item.rectPx.x + item.rectPx.width,
        y,
    };

    appendLineSegment(
        vertices,
        frame,
        start,
        end,
        item.rectPx.height * 0.01,
        withOpacity(
            SHOULDER_MARK_OUTLINE_COLOR,
            item.baselineOpacity,
        ),
    );
    appendLineSegment(
        vertices,
        frame,
        start,
        end,
        item.rectPx.height * 0.003,
        withOpacity(
            SHOULDER_MARK_COLOR,
            item.baselineOpacity,
        ),
    );
};

const appendAnchorControl = (
    vertices: number[],
    frame: CharacterRenderFrame,
    item: CharacterRenderItem,
) => {
    const anchor = characterAnchorToScreenPx(item);

    appendRect(
        vertices,
        frame,
        {
            x: anchor.x - 6,
            y: anchor.y - 6,
            width: 12,
            height: 12,
        },
        CENTER_OUTLINE_COLOR,
    );
    appendRect(
        vertices,
        frame,
        {
            x: anchor.x - 4,
            y: anchor.y - 4,
            width: 8,
            height: 8,
        },
        CENTER_FILL_COLOR,
    );
};

const characterAnchorToScreenPx = (item: CharacterRenderItem): Point => ({
    x: item.rectPx.x + item.character.anchor.x * item.rectPx.width,
    y: item.rectPx.y + (1 - item.character.anchor.y) * item.rectPx.height,
});

const baselinePointToScreenPx = (
    item: CharacterRenderItem,
    point: Point,
): Point => ({
    x: item.rectPx.x + point.x / item.aspect * item.rectPx.width,
    y: item.rectPx.y + (1 - point.y) * item.rectPx.height,
});

const appendLineSegment = (
    vertices: number[],
    frame: CharacterRenderFrame,
    start: Point,
    end: Point,
    thicknessPx: number,
    color: ColorRgba,
) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;

    const normalX = -dy / length * thicknessPx * 0.5;
    const normalY = dx / length * thicknessPx * 0.5;
    const p0 = {x: start.x + normalX, y: start.y + normalY};
    const p1 = {x: start.x - normalX, y: start.y - normalY};
    const p2 = {x: end.x + normalX, y: end.y + normalY};
    const p3 = {x: end.x - normalX, y: end.y - normalY};

    appendTriangleQuad(
        vertices,
        frame,
        p0,
        p1,
        p2,
        p3,
        color,
    );
};

const appendRect = (
    vertices: number[],
    frame: CharacterRenderFrame,
    rect: RectPx,
    color: ColorRgba,
) => {
    const p0 = {x: rect.x, y: rect.y};
    const p1 = {x: rect.x, y: rect.y + rect.height};
    const p2 = {x: rect.x + rect.width, y: rect.y};
    const p3 = {x: rect.x + rect.width, y: rect.y + rect.height};

    appendTriangleQuad(
        vertices,
        frame,
        p0,
        p1,
        p2,
        p3,
        color,
    );
};

const appendTriangleQuad = (
    vertices: number[],
    frame: CharacterRenderFrame,
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    color: ColorRgba,
) => {
    appendLineVertex(vertices, frame, p0, color);
    appendLineVertex(vertices, frame, p1, color);
    appendLineVertex(vertices, frame, p2, color);
    appendLineVertex(vertices, frame, p2, color);
    appendLineVertex(vertices, frame, p1, color);
    appendLineVertex(vertices, frame, p3, color);
};

const appendLineVertex = (
    vertices: number[],
    frame: CharacterRenderFrame,
    point: Point,
    color: ColorRgba,
) => {
    vertices.push(
        point.x / frame.widthPx * 2 - 1,
        1 - point.y / frame.heightPx * 2,
        color[0],
        color[1],
        color[2],
        color[3],
    );
};
