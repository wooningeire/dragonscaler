import { describe, expect, test, vi } from "vitest";
import {
    GPU_SHADER_STAGE,
} from "./constants";
import { createWebGpuPipelines } from "./pipelines";


const makeDevice = () => ({
    createBindGroupLayout: vi.fn(descriptor => ({
        descriptor,
    })),
    createPipelineLayout: vi.fn(descriptor => ({
        descriptor,
    })),
    createRenderPipeline: vi.fn(descriptor => ({
        descriptor,
    })),
    createShaderModule: vi.fn(descriptor => ({
        descriptor,
    })),
}) as unknown as GPUDevice;


describe("createWebGpuPipelines", () => {
    test("makes quad uniforms visible to effect fragment shaders", () => {
        const device = makeDevice();

        createWebGpuPipelines(
            device,
            "bgra8unorm",
        );

        expect(device.createBindGroupLayout).toHaveBeenCalledWith({
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
        expect(device.createRenderPipeline).toHaveBeenCalledWith(expect.objectContaining({
            fragment: expect.objectContaining({
                entryPoint: "outlineFragment",
            }),
        }));
        expect(device.createRenderPipeline).toHaveBeenCalledWith(expect.objectContaining({
            fragment: expect.objectContaining({
                entryPoint: "dropShadowFragment",
            }),
        }));
    });
});
