import type { ColorRgba } from "./types";

export const withOpacity = (
    color: ColorRgba,
    opacity: number,
): [number, number, number, number] => [
    color[0],
    color[1],
    color[2],
    color[3] * opacity,
];

export const nextPowerOfTwo = (value: number) => 2 ** Math.ceil(Math.log2(value));

export const concatenateFloat32Arrays = (
    first: Float32Array,
    second: Float32Array,
) => {
    if (first.length === 0) return second;
    if (second.length === 0) return first;

    const output = new Float32Array(first.length + second.length);
    output.set(first, 0);
    output.set(second, first.length);
    return output;
};
