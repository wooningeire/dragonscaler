import { describe, expect, test } from "vitest";
import {
    CHARACTER_IMAGE_DROP_SHADOW_OFFSET_X_PX,
    CHARACTER_IMAGE_DROP_SHADOW_OFFSET_Y_PX,
    CHARACTER_IMAGE_DROP_SHADOW_RADIUS_PX,
    CHARACTER_IMAGE_OUTLINE_RADIUS_PX,
} from "./constants";
import {
    characterImageEffectRectPx,
    characterImageEffectUvTransform,
} from "./imageShadow";


describe("character image effect geometry", () => {
    test("expands the outline rect without moving its center", () => {
        const rect = {
            x: 100,
            y: 80,
            width: 200,
            height: 120,
        };
        const outlineRect = characterImageEffectRectPx(
            rect,
            CHARACTER_IMAGE_OUTLINE_RADIUS_PX,
        );

        expect(outlineRect).toEqual({
            x: 100 - CHARACTER_IMAGE_OUTLINE_RADIUS_PX,
            y: 80 - CHARACTER_IMAGE_OUTLINE_RADIUS_PX,
            width: 200 + CHARACTER_IMAGE_OUTLINE_RADIUS_PX * 2,
            height: 120 + CHARACTER_IMAGE_OUTLINE_RADIUS_PX * 2,
        });
        expect(outlineRect.x + outlineRect.width / 2).toBe(rect.x + rect.width / 2);
        expect(outlineRect.y + outlineRect.height / 2).toBe(rect.y + rect.height / 2);
    });

    test("expands the drop shadow rect toward its offset", () => {
        const rect = {
            x: 100,
            y: 80,
            width: 200,
            height: 120,
        };
        const shadowRect = characterImageEffectRectPx(
            rect,
            CHARACTER_IMAGE_DROP_SHADOW_RADIUS_PX,
            {
                x: CHARACTER_IMAGE_DROP_SHADOW_OFFSET_X_PX,
                y: CHARACTER_IMAGE_DROP_SHADOW_OFFSET_Y_PX,
            },
        );

        expect(shadowRect).toEqual({
            x: 100 - CHARACTER_IMAGE_DROP_SHADOW_RADIUS_PX,
            y: 80 - CHARACTER_IMAGE_DROP_SHADOW_RADIUS_PX,
            width:
                200
                + CHARACTER_IMAGE_DROP_SHADOW_RADIUS_PX * 2
                + CHARACTER_IMAGE_DROP_SHADOW_OFFSET_X_PX,
            height:
                120
                + CHARACTER_IMAGE_DROP_SHADOW_RADIUS_PX * 2
                + CHARACTER_IMAGE_DROP_SHADOW_OFFSET_Y_PX,
        });
    });

    test("maps expanded effect quads back to the unshifted image UVs", () => {
        const rect = {
            x: 0,
            y: 0,
            width: 200,
            height: 100,
        };
        const outlineRect = characterImageEffectRectPx(
            rect,
            CHARACTER_IMAGE_OUTLINE_RADIUS_PX,
        );
        const dropShadowRect = characterImageEffectRectPx(
            rect,
            CHARACTER_IMAGE_DROP_SHADOW_RADIUS_PX,
            {
                x: CHARACTER_IMAGE_DROP_SHADOW_OFFSET_X_PX,
                y: CHARACTER_IMAGE_DROP_SHADOW_OFFSET_Y_PX,
            },
        );

        const outlineUvTransform = characterImageEffectUvTransform(
            rect,
            outlineRect,
        );
        const flippedDropShadowUvTransform = characterImageEffectUvTransform(
            rect,
            dropShadowRect,
            true,
        );

        expect(outlineUvTransform[0]).toBeCloseTo(1.1);
        expect(outlineUvTransform[1]).toBeCloseTo(1.2);
        expect(outlineUvTransform[2]).toBeCloseTo(-0.05);
        expect(outlineUvTransform[3]).toBeCloseTo(-0.1);
        expect(flippedDropShadowUvTransform[0]).toBeCloseTo(-1.39);
        expect(flippedDropShadowUvTransform[1]).toBeCloseTo(1.82);
        expect(flippedDropShadowUvTransform[2]).toBeCloseTo(1.17);
        expect(flippedDropShadowUvTransform[3]).toBeCloseTo(-0.34);
    });
});
