import type { RectPx } from "../characterRenderModel";
import {
    CHARACTER_IMAGE_OUTLINE_RADIUS_PX,
} from "./constants";
import type { UvTransform } from "./types";

export type ImageEffectOffsetPx = {
    x: number,
    y: number,
};

export const characterImageEffectRectPx = (
    rectPx: RectPx,
    radiusPx = CHARACTER_IMAGE_OUTLINE_RADIUS_PX,
    offsetPx: ImageEffectOffsetPx = {
        x: 0,
        y: 0,
    },
): RectPx => {
    const leftMarginPx = radiusPx + Math.max(0, -offsetPx.x);
    const rightMarginPx = radiusPx + Math.max(0, offsetPx.x);
    const topMarginPx = radiusPx + Math.max(0, -offsetPx.y);
    const bottomMarginPx = radiusPx + Math.max(0, offsetPx.y);

    return {
        x: rectPx.x - leftMarginPx,
        y: rectPx.y - topMarginPx,
        width: rectPx.width + leftMarginPx + rightMarginPx,
        height: rectPx.height + topMarginPx + bottomMarginPx,
    };
};

export const characterImageEffectUvTransform = (
    rectPx: RectPx,
    effectRectPx = characterImageEffectRectPx(rectPx),
    flipX = false,
): UvTransform => {
    const widthScale = effectRectPx.width / rectPx.width;
    const heightScale = effectRectPx.height / rectPx.height;
    const xOffset = (effectRectPx.x - rectPx.x) / rectPx.width;
    const yOffset = (effectRectPx.y - rectPx.y) / rectPx.height;

    return [
        flipX ? -widthScale : widthScale,
        heightScale,
        flipX ? 1 - xOffset : xOffset,
        yOffset,
    ];
};
