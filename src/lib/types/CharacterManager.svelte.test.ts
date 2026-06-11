import { describe, expect, test } from "vitest";
import {
    CharacterManager,
    computeCharacterPositionsX,
} from "./CharacterManager.svelte";
import { Baseline } from "./Baseline.svelte";
import { Character } from "./Character.svelte";


const makeCharacter = (
    name: string,
    targetLength: number,
) => new Character({
    name,
    baseline: new Baseline({
        targetLength,
        points: [
            {x: 0.5, y: 0},
            {x: 0.5, y: 1},
        ],
    }),
});


describe("computeCharacterPositionsX", () => {
    test("spaces right edges without reading character anchor points", () => {
        const characters = [
            {
                viewportWidth: 2,
                anchor: {
                    x: 0,
                    y: 0,
                },
            },
            {
                viewportWidth: 1,
                anchor: {
                    x: 0.5,
                    y: 0,
                },
            },
            {
                viewportWidth: 3,
                anchor: {
                    x: 1,
                    y: 0,
                },
            },
        ];
        const rightEdgesForSpacing = (spacingFac: number) => computeCharacterPositionsX(
            characters,
            spacingFac,
        ).map((
            positionX,
            index,
        ) => positionX + characters[index].viewportWidth);

        expect(computeCharacterPositionsX(characters, 0)).toEqual([
            -2,
            -1,
            -3,
        ]);
        expect(rightEdgesForSpacing(0)).toEqual([
            0,
            0,
            0,
        ]);
        expect(computeCharacterPositionsX(characters, 1)).toEqual([
            -2,
            0,
            1,
        ]);
        expect(rightEdgesForSpacing(1)).toEqual([
            0,
            1,
            4,
        ]);
        expect(computeCharacterPositionsX(characters, 0.5)).toEqual([
            -2,
            -0.5,
            -1,
        ]);
        expect(rightEdgesForSpacing(0.5)).toEqual([
            0,
            0.5,
            2,
        ]);

        characters[0].anchor.x = 1;
        characters[1].anchor.x = 0;
        characters[2].anchor.x = 0.25;

        expect(computeCharacterPositionsX(characters, 0.5)).toEqual([
            -2,
            -0.5,
            -1,
        ]);
    });

    test("derives sorted display characters without mutating the source array", () => {
        const tall = makeCharacter(
            "Tall",
            3,
        );
        const short = makeCharacter(
            "Short",
            1,
        );
        const middle = makeCharacter(
            "Middle",
            2,
        );
        const manager = new CharacterManager();

        manager.characters = [
            tall,
            short,
            middle,
        ];
        manager.spacingFac = 1;

        expect(manager.characters).toEqual([
            tall,
            short,
            middle,
        ]);
        expect(manager.displayCharacters).toEqual([
            short,
            middle,
            tall,
        ]);
        expect(manager.positionsX).toEqual([
            -1,
            0,
            2,
        ]);
    });

    test("removes characters and clears matching selection/edit state", () => {
        const removed = makeCharacter(
            "Removed",
            1,
        );
        const remaining = makeCharacter(
            "Remaining",
            2,
        );
        const manager = new CharacterManager();

        manager.characters = [
            removed,
            remaining,
        ];
        manager.selectedCharacter = removed;
        manager.editingCharacter = removed;

        manager.removeCharacter(removed);

        expect(manager.characters).toEqual([remaining]);
        expect(manager.selectedCharacter).toBeNull();
        expect(manager.editingCharacter).toBeNull();
    });
});
