import type { RectPx } from "../characterRenderModel";
import {
    CHARACTER_IMAGE_SHADOW_RADIUS_PX,
} from "./constants";
import type { UvTransform } from "./types";

export const characterImageShadowRectPx = (
    rectPx: RectPx,
    radiusPx = CHARACTER_IMAGE_SHADOW_RADIUS_PX,
): RectPx => ({
    x: rectPx.x - radiusPx,
    y: rectPx.y - radiusPx,
    width: rectPx.width + radiusPx * 2,
    height: rectPx.height + radiusPx * 2,
});

export const characterImageShadowUvTransform = (
    rectPx: RectPx,
    radiusPx = CHARACTER_IMAGE_SHADOW_RADIUS_PX,
    flipX = false,
): UvTransform => {
    const widthScale = (rectPx.width + radiusPx * 2) / rectPx.width;
    const heightScale = (rectPx.height + radiusPx * 2) / rectPx.height;
    const xMargin = radiusPx / rectPx.width;
    const yMargin = radiusPx / rectPx.height;

    return [
        flipX ? -widthScale : widthScale,
        heightScale,
        flipX ? 1 + xMargin : -xMargin,
        -yMargin,
    ];
};
