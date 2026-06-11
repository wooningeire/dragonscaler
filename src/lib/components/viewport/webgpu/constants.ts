import type { ColorRgba } from "./types";

export const QUAD_VERTEX_COUNT = 6;
export const QUAD_UNIFORM_FLOAT_COUNT = 16;
export const QUAD_UNIFORM_BYTE_COUNT = QUAD_UNIFORM_FLOAT_COUNT * Float32Array.BYTES_PER_ELEMENT;

export const LINE_VERTEX_FLOAT_COUNT = 6;
export const LINE_VERTEX_BYTE_COUNT = LINE_VERTEX_FLOAT_COUNT * Float32Array.BYTES_PER_ELEMENT;

export const GPU_SHADER_STAGE = {
    vertex: 0x1,
    fragment: 0x2,
} as const;

export const GPU_TEXTURE_USAGE = {
    copyDst: 0x02,
    textureBinding: 0x04,
    renderAttachment: 0x10,
} as const;

export const GPU_BUFFER_USAGE = {
    copyDst: 0x0008,
    vertex: 0x0020,
    uniform: 0x0040,
} as const;

export const PLACEHOLDER_COLOR = [0.9, 0.9, 0.9, 1] as const satisfies ColorRgba;
export const IMAGE_TINT = [1, 1, 1, 1] as const satisfies ColorRgba;
export const GRIDLINE_LIGHT_COLOR = [0.76, 0.84, 0.68, 1] as const satisfies ColorRgba;
export const GRIDLINE_STRONG_COLOR = [0.62, 0.75, 0.58, 1] as const satisfies ColorRgba;
export const BASELINE_WHITE_COLOR = [1, 1, 1, 1] as const satisfies ColorRgba;
export const BASELINE_BLACK_COLOR = [0, 0, 0, 1] as const satisfies ColorRgba;
export const CENTER_OUTLINE_COLOR = [1, 1, 1, 1] as const satisfies ColorRgba;
export const CENTER_FILL_COLOR = [0, 0, 0, 1] as const satisfies ColorRgba;

export const TRANSPARENT_CLEAR_COLOR = {
    r: 0,
    g: 0,
    b: 0,
    a: 0,
};
