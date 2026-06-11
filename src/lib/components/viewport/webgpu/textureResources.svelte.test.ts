import { afterEach, describe, expect, test, vi } from "vitest";
import { CharacterImage } from "$lib/types/CharacterImage.svelte";
import { WebGpuTextureResources } from "./textureResources";
import type { TextTextureSpec } from "./types";

type MockTexture = {
    destroy: ReturnType<typeof vi.fn>,
    createView: ReturnType<typeof vi.fn>,
};

type MockBitmap = {
    width: number,
    height: number,
    close: ReturnType<typeof vi.fn>,
};

const makeBitmap = (
    width = 16,
    height = 16,
) => ({
    width,
    height,
    close: vi.fn(),
}) as MockBitmap;

const makeImage = () => new CharacterImage({
    src: "test.png",
    file: new File(["test"], "test.png"),
    dimensions: {
        width: 16,
        height: 16,
    },
});

const makeTextSpec = (cacheKey: string): TextTextureSpec => ({
    cacheKey,
    widthPx: 12,
    heightPx: 8,
    draw: vi.fn(),
});

const mockCanvasContext = () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((contextId: string) => {
        if (contextId !== "2d") return null;

        return {
            scale: vi.fn(),
        } as unknown as CanvasRenderingContext2D;
    });
};

const makeTextureResources = () => {
    const textures: MockTexture[] = [];
    const device = {
        createTexture: vi.fn(() => {
            const texture = {
                destroy: vi.fn(),
                createView: vi.fn(() => ({})),
            };
            textures.push(texture);
            return texture;
        }),
        createBindGroup: vi.fn(() => ({})),
        queue: {
            copyExternalImageToTexture: vi.fn(),
            writeTexture: vi.fn(),
        },
    } as unknown as GPUDevice;
    const pipeline = {
        getBindGroupLayout: vi.fn(() => ({})),
    } as unknown as GPURenderPipeline;

    return {
        resources: new WebGpuTextureResources(
            device,
            pipeline,
            {} as GPUSampler,
            1,
        ),
        textures,
    };
};

describe("WebGpuTextureResources", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    test("destroys cached character and text textures on teardown", async () => {
        mockCanvasContext();

        const bitmap = makeBitmap();
        vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));

        const {
            resources,
            textures,
        } = makeTextureResources();

        const characterTexture = await resources.getCharacterTextureResource(makeImage());
        const textTexture = await resources.getTextTexture(makeTextSpec("label"));

        expect(characterTexture.texture).toBe(textures[1]);
        expect(textTexture.texture).toBe(textures[2]);

        resources.destroy();
        resources.destroy();

        expect(bitmap.close).toHaveBeenCalledTimes(1);
        expect(textures).toHaveLength(3);
        for (const texture of textures) {
            expect(texture.destroy).toHaveBeenCalledTimes(1);
        }
    });

    test("destroys text textures evicted from the bounded cache", async () => {
        mockCanvasContext();

        const {
            resources,
        } = makeTextureResources();
        const firstTextTexture = await resources.getTextTexture(makeTextSpec("text-0"));

        for (let index = 1; index <= 256; index++) {
            await resources.getTextTexture(makeTextSpec(`text-${index}`));
        }

        expect(firstTextTexture.texture.destroy).toHaveBeenCalledTimes(1);

        resources.destroy();
        expect(firstTextTexture.texture.destroy).toHaveBeenCalledTimes(1);
    });

    test("does not create a character texture after teardown wins an image decode race", async () => {
        let resolveBitmap: (bitmap: ImageBitmap) => void = () => {};
        vi.stubGlobal("createImageBitmap", vi.fn(() => new Promise<ImageBitmap>(resolve => {
            resolveBitmap = resolve;
        })));

        const bitmap = makeBitmap();
        const {
            resources,
            textures,
        } = makeTextureResources();

        const texturePromise = resources.getCharacterTextureResource(makeImage());
        resources.destroy();
        resolveBitmap(bitmap as unknown as ImageBitmap);

        await expect(texturePromise).rejects.toThrow("destroyed");
        expect(bitmap.close).toHaveBeenCalledTimes(1);
        expect(textures).toHaveLength(1);
        expect(textures[0].destroy).toHaveBeenCalledTimes(1);
    });
});
