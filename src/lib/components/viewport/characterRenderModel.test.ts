import { describe, expect, test } from "vitest";
import { Character } from "$lib/types/Character.svelte";
import { Baseline } from "$lib/types/Baseline.svelte";
import { CharacterImage } from "$lib/types/CharacterImage.svelte";
import { buildCharacterRenderFrame } from "./characterRenderModel";
import {
    characterLabelPanelRectPx,
    characterLabelRectPx,
    characterLabelScale,
    characterLabelTextureSizePx,
} from "./WebGpuViewportRenderer";


const makeCharacter = (name: string, heightMeters: number) => new Character({
    name,
    baseline: new Baseline({
        targetLength: heightMeters,
        points: [
            {x: 0.5, y: 0},
            {x: 0.5, y: 1},
        ],
    }),
    anchor: {
        x: 0.5,
        y: 0,
    },
});

const makeImage = (flippedHorizontally = false) => new CharacterImage({
    src: "test.png",
    file: new File([""], "test.png"),
    dimensions: {
        width: 1,
        height: 1,
    },
    flippedHorizontally,
});

describe("buildCharacterRenderFrame", () => {
    test("builds reverse draw order and pixel rects for the WebGPU viewport", () => {
        const shortCharacter = makeCharacter("Short", 1);
        const tallCharacter = makeCharacter("Tall", 2);

        const frame = buildCharacterRenderFrame({
            characters: [
                shortCharacter,
                tallCharacter,
            ],
            positionsX: [
                -0.5,
                0,
            ],
            camera: {
                posMetersX: 0,
                posMetersY: 0,
                scalePxPerMeter: 100,
                viewportPositionPx: {
                    x: 400,
                    y: 300,
                },
            },
            widthPx: 800,
            heightPx: 600,
            editingCharacter: null,
        });

        expect(frame.items.map(item => item.character.name)).toEqual([
            "Tall",
            "Short",
        ]);
        expect(frame.items[0].rectPx).toEqual({
            x: 400,
            y: 100,
            width: 200,
            height: 200,
        });
        expect(frame.items[1].rectPx).toEqual({
            x: 350,
            y: 200,
            width: 100,
            height: 100,
        });
        expect(frame.gridlineStepMeters).toBe(2);
        expect(frame.gridlines.some(gridline => (
            gridline.orientation === "y"
            && gridline.weight === "origin"
        ))).toBe(true);
    });

    test("keeps nameplates fixed in world space while screen geometry scales", () => {
        const character = makeCharacter("World Space", 1);

        const buildFrameWithScale = (scalePxPerMeter: number) => buildCharacterRenderFrame({
            characters: [character],
            positionsX: [0],
            camera: {
                posMetersX: 0,
                posMetersY: 0,
                scalePxPerMeter,
                viewportPositionPx: {
                    x: 400,
                    y: 300,
                },
            },
            widthPx: 800,
            heightPx: 600,
            editingCharacter: null,
        });

        const smallerFrame = buildFrameWithScale(220);
        const largerFrame = buildFrameWithScale(300);

        expect(smallerFrame.items[0].rectPx.height).toBe(220);
        expect(largerFrame.items[0].rectPx.height).toBe(300);
        expect(characterLabelScale(smallerFrame.items[0])).toBeCloseTo(220 / 256);
        expect(characterLabelScale(largerFrame.items[0])).toBeCloseTo(300 / 256);
        expect(characterLabelScale(largerFrame.items[0])).toBeGreaterThan(characterLabelScale(smallerFrame.items[0]));
        expect(
            characterLabelScale(smallerFrame.items[0]) / smallerFrame.items[0].rectPx.height,
        ).toBeCloseTo(
            characterLabelScale(largerFrame.items[0]) / largerFrame.items[0].rectPx.height,
        );
    });

    test("right-aligns nameplates to the character image", () => {
        const character = makeCharacter("Right Aligned", 2);
        const frame = buildCharacterRenderFrame({
            characters: [character],
            positionsX: [0],
            camera: {
                posMetersX: 0,
                posMetersY: 0,
                scalePxPerMeter: 100,
                viewportPositionPx: {
                    x: 400,
                    y: 300,
                },
            },
            widthPx: 800,
            heightPx: 600,
            editingCharacter: null,
        });
        const item = frame.items[0];
        const labelRect = characterLabelRectPx(
            item,
            characterLabelTextureSizePx(item),
            1,
        );
        const panelRect = characterLabelPanelRectPx(item, 1);

        expect(labelRect.width).toBeGreaterThan(panelRect.width);
        expect(panelRect.x + panelRect.width).toBeCloseTo(
            item.rectPx.x + item.rectPx.width,
            0,
        );
        expect(panelRect.y).toBeCloseTo(
            item.rectPx.y
            + item.rectPx.height
            + 8 * characterLabelScale(item),
            0,
        );
    });

    test("projects character heights and horizontal gridlines logarithmically", () => {
        const character = makeCharacter("Large", 3);
        const frame = buildCharacterRenderFrame({
            characters: [character],
            positionsX: [-Math.log1p(3)],
            camera: {
                posMetersX: 0,
                posMetersY: 0,
                scalePxPerMeter: 100,
                viewportPositionPx: {
                    x: 400,
                    y: 300,
                },
            },
            widthPx: 800,
            heightPx: 600,
            editingCharacter: null,
            logPerspective: true,
        });
        const twoMeterGridline = frame.gridlines.find(gridline => (
            gridline.orientation === "y"
            && Math.abs(gridline.coordMeters - 2) < 1e-6
        ));

        expect(frame.items[0].rectPx).toEqual({
            x: 400 - Math.log1p(3) * 100,
            y: 300 - Math.log1p(3) * 100,
            width: Math.log1p(3) * 100,
            height: Math.log1p(3) * 100,
        });
        expect(twoMeterGridline?.offsetPx).toBeCloseTo(300 - Math.log1p(2) * 100);
    });

    test("keeps a nonzero character anchor on world y zero in logarithmic projection", () => {
        const character = makeCharacter("Offset Anchor", 4);
        character.anchor = {
            x: 0.5,
            y: 0.25,
        };

        const frame = buildCharacterRenderFrame({
            characters: [character],
            positionsX: [0],
            camera: {
                posMetersX: 0,
                posMetersY: 0,
                scalePxPerMeter: 100,
                viewportPositionPx: {
                    x: 400,
                    y: 300,
                },
            },
            widthPx: 800,
            heightPx: 600,
            editingCharacter: null,
            logPerspective: true,
        });
        const item = frame.items[0];
        const anchorYPx = item.rectPx.y + (1 - character.anchor.y) * item.rectPx.height;

        expect(item.rectPx.height).toBeCloseTo((Math.log1p(3) + Math.log1p(1)) * 100);
        expect(anchorYPx).toBeCloseTo(300);
    });

    test("keeps logarithmic gridline steps stable while panning vertically", () => {
        const buildFrameAtY = (posMetersY: number) => buildCharacterRenderFrame({
            characters: [],
            positionsX: [],
            camera: {
                posMetersX: 0,
                posMetersY,
                scalePxPerMeter: 40,
                viewportPositionPx: {
                    x: 400,
                    y: 300,
                },
            },
            widthPx: 800,
            heightPx: 600,
            editingCharacter: null,
            logPerspective: true,
        });
        const originFrame = buildFrameAtY(0);
        const pannedFrame = buildFrameAtY(4);
        const fourMeterGridline = pannedFrame.gridlines.find(gridline => (
            gridline.orientation === "y"
            && Math.abs(gridline.coordMeters - 4) < 1e-6
        ));

        expect(originFrame.gridlineStepMeters).toBe(4);
        expect(pannedFrame.gridlineStepMeters).toBe(4);
        expect(fourMeterGridline?.offsetPx).toBeCloseTo(300);
    });

    test("keeps zoomed-out logarithmic grid generation bounded", () => {
        const frame = buildCharacterRenderFrame({
            characters: [],
            positionsX: [],
            camera: {
                posMetersX: 0,
                posMetersY: 0,
                scalePxPerMeter: 0.1,
                viewportPositionPx: {
                    x: 400,
                    y: 300,
                },
            },
            widthPx: 800,
            heightPx: 600,
            editingCharacter: null,
            logPerspective: true,
        });
        const horizontalGridlines = frame.gridlines.filter(gridline => gridline.orientation === "y");

        expect(frame.gridlineStepMeters).toBe(1024);
        expect(horizontalGridlines.length).toBeLessThanOrEqual(8);
        expect(frame.gridlines.every(gridline => Number.isFinite(gridline.offsetPx))).toBe(true);
    });

    test("uses compact nameplate textures for short labels", () => {
        const character = makeCharacter("A", 1);
        const frame = buildCharacterRenderFrame({
            characters: [character],
            positionsX: [0],
            camera: {
                posMetersX: 0,
                posMetersY: 0,
                scalePxPerMeter: 256,
                viewportPositionPx: {
                    x: 400,
                    y: 300,
                },
            },
            widthPx: 800,
            heightPx: 600,
            editingCharacter: null,
        });

        expect(characterLabelTextureSizePx(frame.items[0])).toEqual({
            widthPx: 140,
            heightPx: 68,
        });
    });

    test("mutes non-edited characters before the canvas render", () => {
        const idleCharacter = makeCharacter("Idle", 1);
        const editedCharacter = makeCharacter("Edited", 1);

        const frame = buildCharacterRenderFrame({
            characters: [
                idleCharacter,
                editedCharacter,
            ],
            positionsX: [
                0,
                1,
            ],
            camera: {
                posMetersX: 0,
                posMetersY: 0,
                scalePxPerMeter: 100,
                viewportPositionPx: {
                    x: 400,
                    y: 300,
                },
            },
            widthPx: 800,
            heightPx: 600,
            editingCharacter: editedCharacter,
        });

        const idleItem = frame.items.find(item => item.character === idleCharacter);
        const editedItem = frame.items.find(item => item.character === editedCharacter);

        expect(idleItem?.mutedByEditMode).toBe(true);
        expect(idleItem?.opacity).toBeCloseTo(0.3333333);
        expect(editedItem?.editing).toBe(true);
        expect(editedItem?.opacity).toBe(1);
    });

    test("uses the active baseline preview for the edited character", () => {
        const character = makeCharacter("Edited", 1);
        const previewPoints = [
            {x: 0.25, y: 0},
            {x: 0.75, y: 1},
        ];

        const frame = buildCharacterRenderFrame({
            characters: [character],
            positionsX: [0],
            camera: {
                posMetersX: 0,
                posMetersY: 0,
                scalePxPerMeter: 100,
                viewportPositionPx: {
                    x: 400,
                    y: 300,
                },
            },
            widthPx: 800,
            heightPx: 600,
            editingCharacter: character,
            baselinePreview: {
                character,
                points: previewPoints,
            },
        });

        expect(frame.items[0].baselinePoints).toBe(previewPoints);
    });

    test("passes image flip state to render items", () => {
        const character = makeCharacter("Flipped", 1);
        character.image = makeImage(true);

        const frame = buildCharacterRenderFrame({
            characters: [character],
            positionsX: [0],
            camera: {
                posMetersX: 0,
                posMetersY: 0,
                scalePxPerMeter: 100,
                viewportPositionPx: {
                    x: 400,
                    y: 300,
                },
            },
            widthPx: 800,
            heightPx: 600,
            editingCharacter: null,
        });

        expect(frame.items[0].flippedHorizontally).toBe(true);
    });
});
