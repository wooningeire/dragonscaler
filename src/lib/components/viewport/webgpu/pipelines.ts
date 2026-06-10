import {
    GPU_SHADER_STAGE,
    LINE_VERTEX_BYTE_COUNT,
} from "./constants";
import lineShaderCode from "./shaders/line.wgsl?raw";
import quadShaderCode from "./shaders/quad.wgsl?raw";

export type WebGpuPipelines = {
    quadPipeline: GPURenderPipeline,
    linePipeline: GPURenderPipeline,
};

const alphaBlend: GPUBlendState = {
    color: {
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha",
    },
    alpha: {
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha",
    },
};

export const createWebGpuPipelines = (
    device: GPUDevice,
    format: GPUTextureFormat,
): WebGpuPipelines => {
    const quadBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPU_SHADER_STAGE.vertex,
                buffer: {
                    type: "uniform",
                },
            },
        ],
    });
    const textureBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPU_SHADER_STAGE.fragment,
                sampler: {
                    type: "filtering",
                },
            },
            {
                binding: 1,
                visibility: GPU_SHADER_STAGE.fragment,
                texture: {
                    sampleType: "float",
                },
            },
        ],
    });
    const quadModule = device.createShaderModule({
        code: quadShaderCode,
    });
    const lineModule = device.createShaderModule({
        code: lineShaderCode,
    });

    return {
        quadPipeline: device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [
                    quadBindGroupLayout,
                    textureBindGroupLayout,
                ],
            }),
            vertex: {
                module: quadModule,
                entryPoint: "vertex",
            },
            fragment: {
                module: quadModule,
                entryPoint: "fragment",
                targets: [
                    {
                        format,
                        blend: alphaBlend,
                    },
                ],
            },
            primitive: {
                topology: "triangle-list",
            },
        }),
        linePipeline: device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: lineModule,
                entryPoint: "vertex",
                buffers: [
                    {
                        arrayStride: LINE_VERTEX_BYTE_COUNT,
                        attributes: [
                            {
                                shaderLocation: 0,
                                offset: 0,
                                format: "float32x2",
                            },
                            {
                                shaderLocation: 1,
                                offset: 2 * Float32Array.BYTES_PER_ELEMENT,
                                format: "float32x4",
                            },
                        ],
                    },
                ],
            },
            fragment: {
                module: lineModule,
                entryPoint: "fragment",
                targets: [
                    {
                        format,
                        blend: alphaBlend,
                    },
                ],
            },
            primitive: {
                topology: "triangle-list",
            },
        }),
    };
};
