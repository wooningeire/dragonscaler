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

export class WebGpuTextureResources {
    private readonly imageTextureCache = new WeakMap<CharacterImage, Promise<TextureResource>>();
    private readonly textTextureCache = new Map<string, Promise<TextureResource>>();
    private readonly avatarBitmapCache = new Map<string, Promise<ImageBitmap | null>>();
    private readonly placeholderTexture: TextureResource;

    constructor(
        private readonly device: GPUDevice,
        private readonly quadPipeline: GPURenderPipeline,
        private readonly sampler: GPUSampler,
        private readonly pixelRatio: number,
    ) {
        this.placeholderTexture = this.createSolidTexture(PLACEHOLDER_COLOR);
    }

    destroy() {
        this.placeholderTexture.texture.destroy();

        for (const avatarBitmapPromise of this.avatarBitmapCache.values()) {
            void avatarBitmapPromise.then(bitmap => bitmap?.close());
        }

        this.avatarBitmapCache.clear();
    }

    async getCharacterTextureResource(image: CharacterImage | null) {
        if (image === null) return this.placeholderTexture;

        const cachedTexture = this.imageTextureCache.get(image);
        if (cachedTexture !== undefined) return cachedTexture;

        const texturePromise = this.createImageTextureResource(image).catch(() => {
            return this.placeholderTexture;
        });
        this.imageTextureCache.set(image, texturePromise);
        return texturePromise;
    }

    getAvatarBitmap(avatarUrl: string | null) {
        if (avatarUrl === null) return Promise.resolve(null);

        const cachedBitmap = this.avatarBitmapCache.get(avatarUrl);
        if (cachedBitmap !== undefined) return cachedBitmap;

        const bitmapPromise = fetch(avatarUrl)
            .then(response => {
                if (!response.ok) throw new Error("avatar image request failed");

                return response.blob();
            })
            .then(blob => createImageBitmap(blob))
            .catch(() => null);

        this.avatarBitmapCache.set(avatarUrl, bitmapPromise);
        return bitmapPromise;
    }

    getTextTexture(spec: TextTextureSpec) {
        const cachedTexture = this.textTextureCache.get(spec.cacheKey);
        if (cachedTexture !== undefined) return cachedTexture;

        const texturePromise = this.createTextTextureResource(spec);
        this.textTextureCache.set(spec.cacheKey, texturePromise);
        return texturePromise;
    }

    private async createImageTextureResource(image: CharacterImage) {
        const bitmap = await createImageBitmap(image.file);
        const texture = this.createTextureFromBitmap(bitmap);
        bitmap.close();
        return texture;
    }

    private async createTextTextureResource(spec: TextTextureSpec) {
        const canvas = document.createElement("canvas");
        const widthPx = Math.max(1, Math.ceil(spec.widthPx * this.pixelRatio));
        const heightPx = Math.max(1, Math.ceil(spec.heightPx * this.pixelRatio));
        canvas.width = widthPx;
        canvas.height = heightPx;
        const context = canvas.getContext("2d");
        if (context === null) throw new Error("2d canvas context is unavailable");

        context.scale(this.pixelRatio, this.pixelRatio);
        await spec.draw(context);

        return this.createTextureFromCanvas(
            canvas,
            spec.widthPx,
            spec.heightPx,
        );
    }

    private createTextureFromBitmap(bitmap: ImageBitmap): TextureResource {
        const texture = this.device.createTexture({
            size: {
                width: bitmap.width,
                height: bitmap.height,
            },
            format: "rgba8unorm",
            usage:
                GPU_TEXTURE_USAGE.textureBinding
                | GPU_TEXTURE_USAGE.copyDst
                | GPU_TEXTURE_USAGE.renderAttachment,
        });

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
        const texture = this.device.createTexture({
            size: {
                width: canvas.width,
                height: canvas.height,
            },
            format: "rgba8unorm",
            usage:
                GPU_TEXTURE_USAGE.textureBinding
                | GPU_TEXTURE_USAGE.copyDst
                | GPU_TEXTURE_USAGE.renderAttachment,
        });

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
        const texture = this.device.createTexture({
            size: {
                width: 1,
                height: 1,
            },
            format: "rgba8unorm",
            usage:
                GPU_TEXTURE_USAGE.textureBinding
                | GPU_TEXTURE_USAGE.copyDst,
        });
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
