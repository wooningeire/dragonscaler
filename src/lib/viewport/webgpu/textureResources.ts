import type { CharacterImage } from "$lib/types/CharacterImage.svelte";
import {
    GPU_TEXTURE_USAGE,
    PLACEHOLDER_COLOR,
} from "./constants";
import type {
    ColorRgba,
    TextTextureSpec,
    TextureResource,
} from "./types";

type TextureCacheEntry = {
    promise: Promise<TextureResource>,
};

const TEXT_TEXTURE_CACHE_LIMIT = 256;

export class WebGpuTextureResources {
    private imageTextureCache = new WeakMap<CharacterImage, Promise<TextureResource>>();
    private readonly textTextureCache = new Map<string, TextureCacheEntry>();
    private readonly avatarBitmapCache = new Map<string, Promise<ImageBitmap | null>>();
    private readonly textures = new Set<GPUTexture>();
    private readonly placeholderTexture: TextureResource;
    private destroyed = false;

    constructor(
        private readonly device: GPUDevice,
        private readonly quadPipeline: GPURenderPipeline,
        private readonly sampler: GPUSampler,
        private readonly pixelRatio: number,
    ) {
        this.placeholderTexture = this.createSolidTexture(PLACEHOLDER_COLOR);
    }

    destroy() {
        if (this.destroyed) return;

        this.destroyed = true;
        this.imageTextureCache = new WeakMap();
        this.textTextureCache.clear();

        for (const avatarBitmapPromise of this.avatarBitmapCache.values()) {
            void avatarBitmapPromise.then(bitmap => bitmap?.close());
        }

        this.avatarBitmapCache.clear();

        for (const texture of this.textures) {
            texture.destroy();
        }

        this.textures.clear();
    }

    async getCharacterTextureResource(image: CharacterImage | null) {
        this.assertActive();

        if (image === null) return this.placeholderTexture;

        const cachedTexture = this.imageTextureCache.get(image);
        if (cachedTexture !== undefined) return cachedTexture;

        const texturePromise = this.createImageTextureResource(image).catch(() => {
            if (this.destroyed) {
                throw new Error("WebGPU texture resources have been destroyed");
            }

            return this.placeholderTexture;
        });
        this.imageTextureCache.set(image, texturePromise);
        return texturePromise;
    }

    getAvatarBitmap(avatarUrl: string | null) {
        if (this.destroyed) return Promise.resolve(null);
        if (avatarUrl === null) return Promise.resolve(null);

        const cachedBitmap = this.avatarBitmapCache.get(avatarUrl);
        if (cachedBitmap !== undefined) return cachedBitmap;

        const bitmapPromise = fetch(avatarUrl)
            .then(response => {
                if (!response.ok) throw new Error("avatar image request failed");

                return response.blob();
            })
            .then(blob => createImageBitmap(blob))
            .then(bitmap => {
                if (!this.destroyed) return bitmap;

                bitmap.close();
                return null;
            })
            .catch(() => null);

        this.avatarBitmapCache.set(avatarUrl, bitmapPromise);
        return bitmapPromise;
    }

    getTextTexture(spec: TextTextureSpec) {
        this.assertActive();

        const cachedTexture = this.textTextureCache.get(spec.cacheKey);
        if (cachedTexture !== undefined) {
            this.textTextureCache.delete(spec.cacheKey);
            this.textTextureCache.set(spec.cacheKey, cachedTexture);
            return cachedTexture.promise;
        }

        const entry: TextureCacheEntry = {
            promise: this.createTextTextureResource(spec),
        };

        this.textTextureCache.set(spec.cacheKey, entry);
        this.evictStaleTextTextures();

        return entry.promise;
    }

    private async createImageTextureResource(image: CharacterImage) {
        this.assertActive();

        const bitmap = await createImageBitmap(image.file);

        try {
            this.assertActive();
            return this.createTextureFromBitmap(bitmap);
        } finally {
            bitmap.close();
        }
    }

    private async createTextTextureResource(spec: TextTextureSpec) {
        this.assertActive();

        const canvas = document.createElement("canvas");
        const widthPx = Math.max(1, Math.ceil(spec.widthPx * this.pixelRatio));
        const heightPx = Math.max(1, Math.ceil(spec.heightPx * this.pixelRatio));
        canvas.width = widthPx;
        canvas.height = heightPx;
        const context = canvas.getContext("2d");
        if (context === null) throw new Error("2d canvas context is unavailable");

        context.scale(this.pixelRatio, this.pixelRatio);
        await spec.draw(context);
        this.assertActive();

        return this.createTextureFromCanvas(
            canvas,
            spec.widthPx,
            spec.heightPx,
        );
    }

    private createTextureFromBitmap(bitmap: ImageBitmap): TextureResource {
        this.assertActive();

        const texture = this.trackTexture(this.device.createTexture({
            size: {
                width: bitmap.width,
                height: bitmap.height,
            },
            format: "rgba8unorm",
            usage:
                GPU_TEXTURE_USAGE.textureBinding
                | GPU_TEXTURE_USAGE.copyDst
                | GPU_TEXTURE_USAGE.renderAttachment,
        }));

        this.device.queue.copyExternalImageToTexture(
            {
                source: bitmap,
            },
            {
                texture,
            },
            {
                width: bitmap.width,
                height: bitmap.height,
            },
        );

        return {
            texture,
            bindGroup: this.createTextureBindGroup(texture),
            widthPx: bitmap.width / this.pixelRatio,
            heightPx: bitmap.height / this.pixelRatio,
        };
    }

    private createTextureFromCanvas(
        canvas: HTMLCanvasElement,
        widthPx: number,
        heightPx: number,
    ): TextureResource {
        this.assertActive();

        const texture = this.trackTexture(this.device.createTexture({
            size: {
                width: canvas.width,
                height: canvas.height,
            },
            format: "rgba8unorm",
            usage:
                GPU_TEXTURE_USAGE.textureBinding
                | GPU_TEXTURE_USAGE.copyDst
                | GPU_TEXTURE_USAGE.renderAttachment,
        }));

        this.device.queue.copyExternalImageToTexture(
            {
                source: canvas,
            },
            {
                texture,
            },
            {
                width: canvas.width,
                height: canvas.height,
            },
        );

        return {
            texture,
            bindGroup: this.createTextureBindGroup(texture),
            widthPx,
            heightPx,
        };
    }

    private createSolidTexture(color: ColorRgba) {
        const texture = this.trackTexture(this.device.createTexture({
            size: {
                width: 1,
                height: 1,
            },
            format: "rgba8unorm",
            usage:
                GPU_TEXTURE_USAGE.textureBinding
                | GPU_TEXTURE_USAGE.copyDst,
        }));
        this.device.queue.writeTexture(
            {
                texture,
            },
            new Uint8Array(color.map(channel => Math.round(channel * 255))),
            {
                bytesPerRow: 4,
            },
            {
                width: 1,
                height: 1,
            },
        );

        return {
            texture,
            bindGroup: this.createTextureBindGroup(texture),
            widthPx: 1,
            heightPx: 1,
        };
    }

    private evictStaleTextTextures() {
        // Panning and zooming change label cache keys continuously; bounded LRU eviction
        // keeps canvas text textures from growing for the lifetime of the page.
        while (this.textTextureCache.size > TEXT_TEXTURE_CACHE_LIMIT) {
            const staleEntry = this.textTextureCache.entries().next();
            if (staleEntry.done) return;

            const [cacheKey, entry] = staleEntry.value;
            this.textTextureCache.delete(cacheKey);
            void entry.promise.then(
                resource => this.destroyTextureResource(resource),
                () => {},
            );
        }
    }

    private destroyTextureResource(resource: TextureResource) {
        if (!this.textures.delete(resource.texture)) return;

        resource.texture.destroy();
    }

    private trackTexture(texture: GPUTexture) {
        if (this.destroyed) {
            texture.destroy();
            throw new Error("WebGPU texture resources have been destroyed");
        }

        this.textures.add(texture);
        return texture;
    }

    private assertActive() {
        if (!this.destroyed) return;

        throw new Error("WebGPU texture resources have been destroyed");
    }

    private createTextureBindGroup(texture: GPUTexture) {
        return this.device.createBindGroup({
            layout: this.quadPipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: this.sampler,
                },
                {
                    binding: 1,
                    resource: texture.createView(),
                },
            ],
        });
    }
}
