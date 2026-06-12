import { describe, expect, test, vi } from "vitest";
import type { CharacterRenderFrame } from "../characterRenderModel";
import {
    QUAD_UNIFORM_BYTE_COUNT,
} from "./constants";
import { WebGpuQuadRenderer } from "./quadRenderer";
import type { TextureResource } from "./types";


const makeFrame = (): CharacterRenderFrame => ({
    widthPx: 800,
    heightPx: 600,
    gridlineStepMeters: 1,
    gridlines: [],
    items: [],
});

const makeTexture = (): TextureResource => ({
    texture: {} as GPUTexture,
    bindGroup: {} as GPUBindGroup,
    widthPx: 1,
    heightPx: 1,
});

const makeRenderer = () => {
    const device = {
        createBuffer: vi.fn(() => ({
            destroy: vi.fn(),
        })),
        createBindGroup: vi.fn(() => ({})),
        queue: {
            writeBuffer: vi.fn(),
        },
    } as unknown as GPUDevice;
    const pipeline = {
        getBindGroupLayout: vi.fn(() => ({})),
    } as unknown as GPURenderPipeline;
    const pass = {
        setPipeline: vi.fn(),
        setBindGroup: vi.fn(),
        draw: vi.fn(),
    } as unknown as GPURenderPassEncoder;

    return {
        device,
        pass,
        pipeline,
        renderer: new WebGpuQuadRenderer(
            device,
            pipeline,
        ),
    };
};

const latestUniformData = (device: GPUDevice) => {
    const writeBuffer = vi.mocked(device.queue.writeBuffer);
    const data = writeBuffer.mock.calls.at(-1)?.[2];
    if (!(data instanceof Float32Array)) throw new Error("missing quad uniform data");

    return data;
};


describe("WebGpuQuadRenderer", () => {
    test("writes the default flipped texture UV transform", () => {
        const {
            device,
            pass,
            renderer,
        } = makeRenderer();

        renderer.drawTextureQuad(
            pass,
            0,
            makeFrame(),
            {
                x: 10,
                y: 20,
                width: 30,
                height: 40,
            },
            makeTexture(),
            [1, 1, 1, 1],
            {
                flipX: true,
            },
        );

        const data = latestUniformData(device);
        expect(data[0]).toBe(800);
        expect(data[1]).toBe(600);
        expect(data[4]).toBe(10);
        expect(data[5]).toBe(20);
        expect(data[6]).toBe(30);
        expect(data[7]).toBe(40);
        expect(data[12]).toBe(-1);
        expect(data[13]).toBe(1);
        expect(data[14]).toBe(1);
        expect(data[15]).toBe(0);
        expect(data[16]).toBe(0);
        expect(device.createBuffer).toHaveBeenCalledWith({
            size: QUAD_UNIFORM_BYTE_COUNT,
            usage: expect.any(Number),
        });
    });

    test("writes custom shadow UV transform and radius effect params", () => {
        const {
            device,
            pass,
            renderer,
        } = makeRenderer();

        renderer.drawTextureQuad(
            pass,
            0,
            makeFrame(),
            {
                x: 0,
                y: 0,
                width: 100,
                height: 80,
            },
            makeTexture(),
            [1, 1, 1, 0.56],
            {
                shadowRadiusPx: 24,
                uvTransform: [
                    1.48,
                    1.6,
                    -0.24,
                    -0.3,
                ],
            },
        );

        const data = latestUniformData(device);
        expect(data[8]).toBeCloseTo(1);
        expect(data[9]).toBeCloseTo(1);
        expect(data[10]).toBeCloseTo(1);
        expect(data[11]).toBeCloseTo(0.56);
        expect(data[12]).toBeCloseTo(1.48);
        expect(data[13]).toBeCloseTo(1.6);
        expect(data[14]).toBeCloseTo(-0.24);
        expect(data[15]).toBeCloseTo(-0.3);
        expect(data[16]).toBe(24);
    });
});
