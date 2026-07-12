import { describe, expect, test, vi } from "vitest";
import type { CharacterImage } from "$lib/types/CharacterImage.svelte";
import type {
    CharacterRenderFrame,
    CharacterRenderItem,
} from "./characterRenderModel";
import {
    drawFrameContent,
    drawCharacterImageQuads,
} from "./WebGpuViewportRenderer";
import type { WebGpuQuadRenderer } from "./webgpu/quadRenderer";
import type {
    LineVertexRange,
    TextureResource,
} from "./webgpu/types";


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
    shoulderY: null,
    nameplateReferenceHeightPx: 100,
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

const makeLineRenderer = (
    kind: string,
    calls: string[],
) => ({
    drawRange: vi.fn((
        _pass: GPURenderPassEncoder,
        range: LineVertexRange,
    ) => {
        calls.push(`${kind}:${range.firstVertex}`);
    }),
}) as unknown as Parameters<typeof drawFrameContent>[0]["lineRenderer"];


describe("drawCharacterImageQuads", () => {
    test("draws each drop shadow behind its outline and character image", () => {
        const calls: string[] = [];
        const frame = {
            widthPx: 800,
            heightPx: 600,
            gridlineStepMeters: 1,
            gridlinesOnTop: false,
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
            outlineQuadRenderer: makeRenderer(
                "outline",
                calls,
            ),
            dropShadowQuadRenderer: makeRenderer(
                "drop-shadow",
                calls,
            ),
            quadIndex: 0,
            outlineQuadIndex: 0,
            dropShadowQuadIndex: 0,
        });

        expect(calls).toEqual([
            "drop-shadow:behind",
            "outline:behind",
            "image:behind",
            "drop-shadow:front",
            "outline:front",
            "image:front",
        ]);
        expect(result).toEqual({
            quadIndex: 2,
            outlineQuadIndex: 2,
            dropShadowQuadIndex: 2,
        });
    });

    test("moves gridlines above character images when requested", () => {
        const drawFrame = (gridlinesOnTop: boolean) => {
            const calls: string[] = [];
            const frame = {
                widthPx: 800,
                heightPx: 600,
                gridlineStepMeters: 1,
                gridlinesOnTop,
                gridlines: [
                    {
                        orientation: "y",
                        offsetPx: 300,
                        coordMeters: 0,
                        weight: "origin",
                    },
                ],
                items: [makeItem("character")],
            } satisfies CharacterRenderFrame;

            drawFrameContent({
                pass: {} as GPURenderPassEncoder,
                frame,
                characterTextures: [makeTexture("character")],
                gridLabelTextures: [makeTexture("grid-label")],
                characterLabelTextures: [null],
                quadRenderer: makeRenderer(
                    "image",
                    calls,
                ),
                gridQuadRenderer: makeRenderer(
                    "grid-label",
                    calls,
                ),
                outlineQuadRenderer: makeRenderer(
                    "outline",
                    calls,
                ),
                dropShadowQuadRenderer: makeRenderer(
                    "drop-shadow",
                    calls,
                ),
                gridLineRenderer: makeLineRenderer(
                    "grid-line",
                    calls,
                ),
                lineRenderer: makeLineRenderer(
                    "character-line",
                    calls,
                ),
                gridLineRange: {
                    firstVertex: 0,
                    vertexCount: 6,
                },
                characterLineRange: {
                    firstVertex: 0,
                    vertexCount: 6,
                },
                pixelRatio: 1,
                quadIndex: 0,
                outlineQuadIndex: 0,
                dropShadowQuadIndex: 0,
            });

            return calls;
        };

        expect(drawFrame(false)).toEqual([
            "grid-line:0",
            "grid-label:grid-label",
            "drop-shadow:character",
            "outline:character",
            "image:character",
            "character-line:0",
        ]);
        expect(drawFrame(true)).toEqual([
            "drop-shadow:character",
            "outline:character",
            "image:character",
            "grid-line:0",
            "grid-label:grid-label",
            "character-line:0",
        ]);
    });
});
