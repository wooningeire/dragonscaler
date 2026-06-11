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
    test("spaces left edges without reading character anchor points", () => {
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

        expect(computeCharacterPositionsX(characters, 0)).toEqual([
            0,
            0,
            0,
        ]);
        expect(computeCharacterPositionsX(characters, 1)).toEqual([
            0,
            2,
            3,
        ]);
        expect(computeCharacterPositionsX(characters, 0.5)).toEqual([
            0,
            1,
            1.5,
        ]);

        characters[0].anchor.x = 1;
        characters[1].anchor.x = 0;
        characters[2].anchor.x = 0.25;

        expect(computeCharacterPositionsX(characters, 0.5)).toEqual([
            0,
            1,
            1.5,
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
            0,
            1,
            3,
        ]);
    });
});
