import { describe, expect, test } from "vitest";
import { computeCharacterPositionsX } from "./CharacterManager.svelte";


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
});
