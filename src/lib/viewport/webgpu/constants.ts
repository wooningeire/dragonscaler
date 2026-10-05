import type { ColorRgba } from "./types";

export const QUAD_VERTEX_COUNT = 6;
export const QUAD_UNIFORM_FLOAT_COUNT = 20;
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
export const CHARACTER_IMAGE_OUTLINE_COLOR = [1, 1, 1, 0.74] as const satisfies ColorRgba;
export const CHARACTER_IMAGE_OUTLINE_RADIUS_PX = 2;
export const CHARACTER_IMAGE_DROP_SHADOW_MULTIPLIER = [0.36, 0.38, 0.34, 0.82] as const satisfies ColorRgba;
export const CHARACTER_IMAGE_DROP_SHADOW_RADIUS_PX = 16;
export const CHARACTER_IMAGE_DROP_SHADOW_OFFSET_X_PX = 0;
export const CHARACTER_IMAGE_DROP_SHADOW_OFFSET_Y_PX = 0;
export const GRIDLINE_LIGHT_COLOR = [0.76, 0.84, 0.68, 0.22] as const satisfies ColorRgba;
export const GRIDLINE_STRONG_COLOR = [0.62, 0.75, 0.58, 0.36] as const satisfies ColorRgba;
export const BASELINE_WHITE_COLOR = [1, 1, 1, 1] as const satisfies ColorRgba;
export const BASELINE_BLACK_COLOR = [0, 0, 0, 1] as const satisfies ColorRgba;
export const MEASUREMENT_RED_OUTLINE_COLOR = [0.48, 0.02, 0.04, 1] as const satisfies ColorRgba;
export const MEASUREMENT_RED_COLOR = [1, 0.08, 0.12, 1] as const satisfies ColorRgba;
export const SHOULDER_MARK_OUTLINE_COLOR = [0, 0, 0, 1] as const satisfies ColorRgba;
export const SHOULDER_MARK_COLOR = [1, 0.65, 0.15, 1] as const satisfies ColorRgba;
export const CENTER_OUTLINE_COLOR = [1, 1, 1, 1] as const satisfies ColorRgba;
export const CENTER_FILL_COLOR = [0, 0, 0, 1] as const satisfies ColorRgba;

export const TRANSPARENT_CLEAR_COLOR = {
    r: 0,
    g: 0,
    b: 0,
    a: 0,
};
