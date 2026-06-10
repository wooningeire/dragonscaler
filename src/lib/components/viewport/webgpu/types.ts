export type ColorRgba = readonly [number, number, number, number];

export type TextureSizePx = {
    widthPx: number,
    heightPx: number,
};

export type TextureResource = TextureSizePx & {
    texture: GPUTexture,
    bindGroup: GPUBindGroup,
};

export type QuadUniformResource = {
    buffer: GPUBuffer,
    bindGroup: GPUBindGroup,
};

export type TextTextureSpec = TextureSizePx & {
    cacheKey: string,
    draw: (context: CanvasRenderingContext2D) => void | Promise<void>,
};

export type LineVertexRange = {
    firstVertex: number,
    vertexCount: number,
};
