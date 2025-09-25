export class NewCharacter {
    image: {
        src: string,
        dimensions: {
            width: number,
            height: number,
        },
    } | null = $state.raw(null);

    name = $state("");
    points = $state.raw([
        {x: 0, y: 0},
        {x: 0, y: 1},
    ]);
    targetLength = $state(1);
    descriptor = $state("");
}

let newCharacter = $state<NewCharacter | null>(null);

export const currentNewCharacter = () => newCharacter;

export const beginNewCharacter = () => {
    newCharacter = new NewCharacter();
};

export const deleteNewCharacter = () => {
    newCharacter = null;
};