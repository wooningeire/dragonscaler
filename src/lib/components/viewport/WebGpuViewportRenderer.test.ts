import { describe, expect, test, vi } from "vitest";
import type { CharacterImage } from "$lib/types/CharacterImage.svelte";
import type {
    CharacterRenderFrame,
    CharacterRenderItem,
} from "./characterRenderModel";
import {
    drawCharacterImageQuads,
} from "./WebGpuViewportRenderer";
import type { WebGpuQuadRenderer } from "./webgpu/quadRenderer";
import type { TextureResource } from "./webgpu/types";


const makeItem = (name: string): CharacterRenderItem => ({
    character: {} as CharacterRenderItem["character"],
    image: {} as CharacterImage,
    flippedHorizontally: false,
    name,
    owners: [],
    rectPx: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
    },
    baselinePoints: [],
    aspect: 1,
    opacity: 1,
    baselineOpacity: 1,
    labelOpacity: 1,
    mutedByEditMode: false,
    editing: false,
});

const makeTexture = (name: string) => ({
    texture: {} as GPUTexture,
    bindGroup: {} as GPUBindGroup,
    widthPx: 1,
    heightPx: 1,
    name,
}) as TextureResource & {
    name: string,
};

const makeRenderer = (
    kind: string,
    calls: string[],
) => ({
    drawTextureQuad: vi.fn((
        _pass,
        quadIndex,
        _frame,
        _rectPx,
        texture,
    ) => {
        calls.push(`${kind}:${texture.name}`);
        return quadIndex + 1;
    }),
}) as unknown as WebGpuQuadRenderer;


describe("drawCharacterImageQuads", () => {
    test("draws each shadow immediately before its character image", () => {
        const calls: string[] = [];
        const frame = {
            widthPx: 800,
            heightPx: 600,
            gridlineStepMeters: 1,
            gridlines: [],
            items: [
                makeItem("behind"),
                makeItem("front"),
            ],
        } satisfies CharacterRenderFrame;
        const result = drawCharacterImageQuads({
            pass: {} as GPURenderPassEncoder,
            frame,
            characterTextures: [
                makeTexture("behind"),
                makeTexture("front"),
            ],
            quadRenderer: makeRenderer(
                "image",
                calls,
            ),
            shadowQuadRenderer: makeRenderer(
                "shadow",
                calls,
            ),
            quadIndex: 0,
            shadowQuadIndex: 0,
        });

        expect(calls).toEqual([
            "shadow:behind",
            "image:behind",
            "shadow:front",
            "image:front",
        ]);
        expect(result).toEqual({
            quadIndex: 2,
            shadowQuadIndex: 2,
        });
    });
});
