import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
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

describe("CharacterViewport", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        store.characterManager.characters = [];
        store.characterManager.selectedCharacter = null;
        store.characterManager.editingCharacter = null;
        store.characterManager.spacingFac = 0;
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

    test("retargets selected-character centering only after reference curve changes", async () => {
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

        const setPosMetersXWithEase = vi.spyOn(
            store.camera,
            "setPosMetersXWithEase",
        ).mockImplementation(() => {});
        const setPosMetersYWithEase = vi.spyOn(
            store.camera,
            "setPosMetersYWithEase",
        ).mockImplementation(() => {});
        const setScalePxPerMeterWithEase = vi.spyOn(
            store.camera,
            "setScalePxPerMeterWithEase",
        ).mockImplementation(() => {});

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
    });
});
