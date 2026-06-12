import { describe, expect, test } from "vitest";
import {
    CHARACTER_IMAGE_SHADOW_RADIUS_PX,
} from "./constants";
import {
    characterImageShadowRectPx,
    characterImageShadowUvTransform,
} from "./imageShadow";


describe("character image shadow geometry", () => {
    test("expands the character image rect without moving its center", () => {
        const rect = {
            x: 100,
            y: 80,
            width: 200,
            height: 120,
        };
        const shadowRect = characterImageShadowRectPx(rect);

        expect(shadowRect).toEqual({
            x: 100 - CHARACTER_IMAGE_SHADOW_RADIUS_PX,
            y: 80 - CHARACTER_IMAGE_SHADOW_RADIUS_PX,
            width: 200 + CHARACTER_IMAGE_SHADOW_RADIUS_PX * 2,
            height: 120 + CHARACTER_IMAGE_SHADOW_RADIUS_PX * 2,
        });
        expect(shadowRect.x + shadowRect.width / 2).toBe(rect.x + rect.width / 2);
        expect(shadowRect.y + shadowRect.height / 2).toBe(rect.y + rect.height / 2);
    });

    test("maps the expanded shadow quad back to the unshifted image UVs", () => {
        const rect = {
            x: 0,
            y: 0,
            width: 200,
            height: 100,
        };

        const uvTransform = characterImageShadowUvTransform(rect);
        const flippedUvTransform = characterImageShadowUvTransform(
            rect,
            CHARACTER_IMAGE_SHADOW_RADIUS_PX,
            true,
        );

        expect(uvTransform[0]).toBeCloseTo(1.24);
        expect(uvTransform[1]).toBeCloseTo(1.48);
        expect(uvTransform[2]).toBeCloseTo(-0.12);
        expect(uvTransform[3]).toBeCloseTo(-0.24);
        expect(flippedUvTransform[0]).toBeCloseTo(-1.24);
        expect(flippedUvTransform[1]).toBeCloseTo(1.48);
        expect(flippedUvTransform[2]).toBeCloseTo(1.12);
        expect(flippedUvTransform[3]).toBeCloseTo(-0.24);
    });
});
