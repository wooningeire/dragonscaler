import type { CharacterRenderFrame, RectPx } from "../characterRenderModel";
import {
    GPU_BUFFER_USAGE,
    QUAD_UNIFORM_BYTE_COUNT,
    QUAD_UNIFORM_FLOAT_COUNT,
    QUAD_VERTEX_COUNT,
} from "./constants";
import type {
    ColorRgba,
    QuadEffectParams,
    QuadDrawOptions,
    QuadUniformResource,
    TextureResource,
    UvTransform,
} from "./types";

const defaultUvTransform = (flipX: boolean): UvTransform => [
    flipX ? -1 : 1,
    1,
    flipX ? 1 : 0,
    0,
];

const defaultEffectParams = (radiusPx: number): QuadEffectParams => [
    radiusPx,
    0,
    0,
    0,
];

export class WebGpuQuadRenderer {
    private readonly uniforms: QuadUniformResource[] = [];

    constructor(
        private readonly device: GPUDevice,
        private readonly pipeline: GPURenderPipeline,
    ) {}

    destroy() {
        for (const uniform of this.uniforms) {
            uniform.buffer.destroy();
        }
    }

    drawTextureQuad(
        pass: GPURenderPassEncoder,
        quadIndex: number,
        frame: CharacterRenderFrame,
        rectPx: RectPx,
        texture: TextureResource,
        tint: ColorRgba,
        options: QuadDrawOptions = {},
    ) {
        const uniform = this.writeQuadUniform(
            quadIndex,
            frame,
            rectPx,
            tint,
            options,
        );

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, uniform.bindGroup);
        pass.setBindGroup(1, texture.bindGroup);
        pass.draw(QUAD_VERTEX_COUNT);
        return quadIndex + 1;
    }

    private writeQuadUniform(
        index: number,
        frame: CharacterRenderFrame,
        rectPx: RectPx,
        tint: ColorRgba,
        options: QuadDrawOptions,
    ) {
        const uniform = this.getQuadUniform(index);
        const data = new Float32Array(QUAD_UNIFORM_FLOAT_COUNT);
        const uvTransform = options.uvTransform
            ?? defaultUvTransform(options.flipX ?? false);
        data[0] = frame.widthPx;
        data[1] = frame.heightPx;
        data[4] = rectPx.x;
        data[5] = rectPx.y;
        data[6] = rectPx.width;
        data[7] = rectPx.height;
        data[8] = tint[0];
        data[9] = tint[1];
        data[10] = tint[2];
        data[11] = tint[3];
        data[12] = uvTransform[0];
        data[13] = uvTransform[1];
        data[14] = uvTransform[2];
        data[15] = uvTransform[3];
        const effect = options.effect
            ?? defaultEffectParams(options.shadowRadiusPx ?? 0);
        data[16] = effect[0];
        data[17] = effect[1];
        data[18] = effect[2];
        data[19] = effect[3];

        this.device.queue.writeBuffer(
            uniform.buffer,
            0,
            data,
        );

        return uniform;
    }

    private getQuadUniform(index: number) {
        while (this.uniforms.length <= index) {
            const buffer = this.device.createBuffer({
                size: QUAD_UNIFORM_BYTE_COUNT,
                usage:
                    GPU_BUFFER_USAGE.uniform
                    | GPU_BUFFER_USAGE.copyDst,
            });
            const bindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer,
                        },
                    },
                ],
            });

            this.uniforms.push({
                buffer,
                bindGroup,
            });
        }

        return this.uniforms[index];
    }
}
