import {
    GPU_SHADER_STAGE,
    LINE_VERTEX_BYTE_COUNT,
} from "./constants";
import lineShaderCode from "./shaders/line.wgsl?raw";
import quadShaderCode from "./shaders/quad.wgsl?raw";

export type WebGpuPipelines = {
    quadPipeline: GPURenderPipeline,
    shadowQuadPipeline: GPURenderPipeline,
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

const additiveBlend: GPUBlendState = {
    color: {
        srcFactor: "src-alpha",
        dstFactor: "one",
    },
    alpha: {
        srcFactor: "one",
        dstFactor: "one-minus-src-alpha",
    },
};

const createQuadPipeline = ({
    device,
    format,
    module,
    bindGroupLayouts,
    fragmentEntryPoint,
    blend,
}: {
    device: GPUDevice,
    format: GPUTextureFormat,
    module: GPUShaderModule,
    bindGroupLayouts: GPUBindGroupLayout[],
    fragmentEntryPoint: string,
    blend: GPUBlendState,
}) => device.createRenderPipeline({
    layout: device.createPipelineLayout({
        bindGroupLayouts,
    }),
    vertex: {
        module,
        entryPoint: "vertex",
    },
    fragment: {
        module,
        entryPoint: fragmentEntryPoint,
        targets: [
            {
                format,
                blend,
            },
        ],
    },
    primitive: {
        topology: "triangle-list",
    },
});

export const createWebGpuPipelines = (
    device: GPUDevice,
    format: GPUTextureFormat,
): WebGpuPipelines => {
    const quadBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility:
                    GPU_SHADER_STAGE.vertex
                    | GPU_SHADER_STAGE.fragment,
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
    const quadBindGroupLayouts = [
        quadBindGroupLayout,
        textureBindGroupLayout,
    ];

    return {
        quadPipeline: createQuadPipeline({
            device,
            format,
            module: quadModule,
            bindGroupLayouts: quadBindGroupLayouts,
            fragmentEntryPoint: "fragment",
            blend: alphaBlend,
        }),
        shadowQuadPipeline: createQuadPipeline({
            device,
            format,
            module: quadModule,
            bindGroupLayouts: quadBindGroupLayouts,
            fragmentEntryPoint: "shadowFragment",
            blend: additiveBlend,
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
