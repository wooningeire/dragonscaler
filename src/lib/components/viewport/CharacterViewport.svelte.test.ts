import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import CharacterViewport from "./CharacterViewport.svelte";
import { Character } from "$lib/types/Character.svelte";
import { Baseline } from "$lib/types/Baseline.svelte";
import { CharacterImage } from "$lib/types/CharacterImage.svelte";
import { store } from "$lib/types/Store.svelte";


const makeCharacter = (index: number) => new Character({
    name: `Character ${index}`,
    baseline: new Baseline({
        targetLength: index + 1,
        points: [
            {x: 0.5, y: 0},
            {x: 0.5, y: 1},
        ],
    }),
    uploaded: true,
});

const makeImage = (
    width: number,
    height: number,
) => new CharacterImage({
    src: `test-${width}x${height}.png`,
    file: new File([""], `test-${width}x${height}.png`),
    dimensions: {
        width,
        height,
    },
});

const mockViewportRect = (
    width: number,
    height: number,
) => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON: () => ({}),
    });
};

const mockCameraRetargeting = () => ({
    setPosMetersXWithEase: vi.spyOn(
        store.camera,
        "setPosMetersXWithEase",
    ).mockImplementation(() => {}),
    setPosMetersYWithEase: vi.spyOn(
        store.camera,
        "setPosMetersYWithEase",
    ).mockImplementation(() => {}),
    setScalePxPerMeterWithEase: vi.spyOn(
        store.camera,
        "setScalePxPerMeterWithEase",
    ).mockImplementation(() => {}),
});

const renderedCharacterHeight = () => {
    const browserWindow = window as typeof window & {
        __dragonscalerViewportDebug?: {
            renderFrame: {
                items: {rectPx: {height: number}}[],
            },
        },
    };

    return browserWindow.__dragonscalerViewportDebug
        ?.renderFrame.items[0]?.rectPx.height ?? null;
};


describe("CharacterViewport", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        store.characterManager.characters = [];
        store.characterManager.selectedCharacter = null;
        store.characterManager.editingCharacter = null;
        store.characterManager.spacingFac = 0;
        store.characterManager.logPerspective = false;
        store.characterManager.shoulderMarkingActive = false;
        store.camera.viewportDimsPx = {
            width: 800,
            height: 600,
        };
        store.camera.viewportPositionPx = {
            x: 400,
            y: 300,
        };
        store.camera.viewportInsetsPx = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        };
    });

    test("keeps the whole viewport display on one WebGPU canvas", () => {
        store.characterManager.characters = Array.from(
            {length: 6},
            (_, index) => makeCharacter(index),
        );

        const {container} = render(CharacterViewport);
        const viewport = container.querySelector(".character-viewport");
        const viewportChildren = Array.from(viewport?.children ?? []);

        expect(viewport?.querySelectorAll("canvas[data-renderer=\"webgpu\"]")).toHaveLength(1);
        expect(viewportChildren).toHaveLength(1);
        expect(viewport?.querySelectorAll("img")).toHaveLength(0);
        expect(viewport?.querySelectorAll("svg")).toHaveLength(0);
        expect(viewport?.querySelectorAll(".dynamic-grid")).toHaveLength(0);
        expect(viewport?.querySelectorAll(".character-overlay")).toHaveLength(0);
    });

    test("retargets selected-character centering only after effective geometry changes", async () => {
        mockViewportRect(
            1000,
            1000,
        );

        const character = makeCharacter(1);
        character.anchor = {
            x: 0.5,
            y: 0,
        };
        character.image = makeImage(
            100,
            100,
        );
        store.characterManager.characters = [character];
        store.characterManager.selectedCharacter = character;

        const {
            setPosMetersXWithEase,
            setPosMetersYWithEase,
            setScalePxPerMeterWithEase,
        } = mockCameraRetargeting();

        render(CharacterViewport);

        await waitFor(() => expect(setPosMetersXWithEase).toHaveBeenCalledWith(-1));
        setPosMetersXWithEase.mockClear();
        setPosMetersYWithEase.mockClear();
        setScalePxPerMeterWithEase.mockClear();

        store.characterManager.spacingFac = 1;
        await tick();

        expect(setPosMetersXWithEase).not.toHaveBeenCalled();
        expect(setPosMetersYWithEase).not.toHaveBeenCalled();
        expect(setScalePxPerMeterWithEase).not.toHaveBeenCalled();

        character.anchor = {
            x: 0.25,
            y: 0.2,
        };
        await tick();

        expect(setPosMetersXWithEase).not.toHaveBeenCalled();
        expect(setPosMetersYWithEase).not.toHaveBeenCalled();
        expect(setScalePxPerMeterWithEase).not.toHaveBeenCalled();

        character.image = makeImage(
            200,
            100,
        );
        await tick();

        expect(setPosMetersXWithEase).not.toHaveBeenCalled();
        expect(setPosMetersYWithEase).not.toHaveBeenCalled();
        expect(setScalePxPerMeterWithEase).not.toHaveBeenCalled();

        character.baseline.targetLength = 4;
        await waitFor(() => expect(setPosMetersXWithEase).toHaveBeenCalledWith(-4));

        setPosMetersXWithEase.mockClear();
        character.baseline.points = [
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.5},
        ];

        await waitFor(() => expect(setPosMetersXWithEase).toHaveBeenCalledWith(-8));
        setPosMetersXWithEase.mockClear();
        setPosMetersYWithEase.mockClear();
        setScalePxPerMeterWithEase.mockClear();

        character.shoulderY = 0.75;

        await waitFor(() => expect(setPosMetersXWithEase).toHaveBeenCalled());
        expect(character.scaleFac).toBe(8);
    });


    test("eases the focused logarithmic image through a shoulder change", async () => {
        mockViewportRect(
            1000,
            1000,
        );

        const character = makeCharacter(3);
        store.characterManager.characters = [character];
        store.characterManager.selectedCharacter = character;
        store.characterManager.logPerspective = true;
        store.camera.setScalePxPerMeter(100);
        await tick();

        mockCameraRetargeting();
        render(CharacterViewport);

        const initialHeight = Math.log1p(4) * 100;
        const markedHeight = 4 * Math.log1p(1) * 100;

        await waitFor(() => expect(renderedCharacterHeight()).toBeCloseTo(
            initialHeight,
        ));

        character.shoulderY = 0.25;
        await tick();

        const transitionHeight = renderedCharacterHeight();
        if (transitionHeight === null) {
            throw new Error("missing focused character render geometry");
        }

        expect(
            Math.abs(transitionHeight - initialHeight),
        ).toBeLessThan(
            Math.abs(markedHeight - initialHeight) * 0.5,
        );
        await waitFor(
            () => expect(renderedCharacterHeight()).toBeCloseTo(
                markedHeight,
            ),
            {
                timeout: 1_000,
            },
        );
    });

    test("keyboard marking reaches the image top when the anchor is near it", async () => {
        mockViewportRect(
            1000,
            1000,
        );

        const character = makeCharacter(1);
        character.anchor = {
            x: 0.5,
            y: 0.9995,
        };
        store.characterManager.characters = [character];
        store.characterManager.selectedCharacter = character;
        store.characterManager.editingCharacter = character;
        store.characterManager.shoulderMarkingActive = true;

        mockCameraRetargeting();
        const {getByRole} = render(CharacterViewport);
        const viewport = getByRole("application");

        await fireEvent.keyDown(
            viewport,
            {key: "Home"},
        );

        expect(character.shoulderY).toBe(1);
    });

    test("ignores inactive pixel-mode data but retargets after its effective scale changes", async () => {
        mockViewportRect(
            1000,
            1000,
        );

        const character = new Character({
            imageDimensions: {
                width: 100,
                height: 100,
            },
            baseline: new Baseline({
                targetLength: 2,
                referenceSizingMethod: "pixel_measurement",
                pixelMeasurementPx: 50,
                points: [
                    {x: 0.5, y: 0},
                    {x: 0.5, y: 1},
                ],
            }),
            uploaded: true,
        });
        store.characterManager.characters = [character];
        store.characterManager.selectedCharacter = character;

        const {
            setPosMetersXWithEase,
            setPosMetersYWithEase,
            setScalePxPerMeterWithEase,
        } = mockCameraRetargeting();

        render(CharacterViewport);

        await waitFor(() => expect(setScalePxPerMeterWithEase).toHaveBeenCalled());
        setPosMetersXWithEase.mockClear();
        setPosMetersYWithEase.mockClear();
        setScalePxPerMeterWithEase.mockClear();

        character.baseline.points = [
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.25},
        ];
        character.imageDimensions = {
            width: 200,
            height: 100,
        };
        await tick();

        expect(character.scaleFac).toBe(4);
        expect(setPosMetersXWithEase).not.toHaveBeenCalled();
        expect(setPosMetersYWithEase).not.toHaveBeenCalled();
        expect(setScalePxPerMeterWithEase).not.toHaveBeenCalled();

        character.baseline.pixelMeasurementPx = 25;

        await waitFor(() => expect(setScalePxPerMeterWithEase).toHaveBeenCalled());
        expect(character.scaleFac).toBe(8);
    });
});
