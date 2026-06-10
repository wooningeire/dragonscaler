import type { CharacterImage } from "$lib/types/CharacterImage.svelte";
import type {
    CharacterRenderFrame,
    CharacterRenderItem,
    GridlineRenderItem,
    RectPx,
} from "./characterRenderModel";
import type { Point } from "$lib/types/Point";
import { sampleBaselinePath } from "$lib/util/baselineGeometry";


export type WebGpuRendererStatus =
    | "initializing"
    | "ready"
    | "unavailable";

type TextureResource = {
    texture: GPUTexture,
    bindGroup: GPUBindGroup,
    widthPx: number,
    heightPx: number,
};

type QuadUniformResource = {
    buffer: GPUBuffer,
    bindGroup: GPUBindGroup,
};

type TextTextureSpec = {
    cacheKey: string,
    widthPx: number,
    heightPx: number,
    draw: (context: CanvasRenderingContext2D) => void | Promise<void>,
};

type LineVertexRange = {
    firstVertex: number,
    vertexCount: number,
};

type AvatarRectPx = {
    x: number,
    y: number,
    size: number,
};

type TextureSizePx = {
    widthPx: number,
    heightPx: number,
};

const QUAD_VERTEX_COUNT = 6;
const QUAD_UNIFORM_FLOAT_COUNT = 12;
const QUAD_UNIFORM_BYTE_COUNT = QUAD_UNIFORM_FLOAT_COUNT * Float32Array.BYTES_PER_ELEMENT;
const LINE_VERTEX_FLOAT_COUNT = 6;
const LINE_VERTEX_BYTE_COUNT = LINE_VERTEX_FLOAT_COUNT * Float32Array.BYTES_PER_ELEMENT;
const GPU_SHADER_STAGE = {
    vertex: 0x1,
    fragment: 0x2,
} as const;
const GPU_TEXTURE_USAGE = {
    copyDst: 0x02,
    textureBinding: 0x04,
    renderAttachment: 0x10,
} as const;
const GPU_BUFFER_USAGE = {
    copyDst: 0x0008,
    vertex: 0x0020,
    uniform: 0x0040,
} as const;
const PLACEHOLDER_COLOR = [0.9, 0.9, 0.9, 1] as const;
const IMAGE_TINT = [1, 1, 1, 1] as const;
const GRIDLINE_LIGHT_COLOR = [0.76, 0.84, 0.68, 1] as const;
const GRIDLINE_STRONG_COLOR = [0.62, 0.75, 0.58, 1] as const;
const GRIDLINE_LABEL_COLOR = "rgba(52, 74, 47, 0.86)";
const BASELINE_WHITE_COLOR = [1, 1, 1, 1] as const;
const BASELINE_BLACK_COLOR = [0, 0, 0, 1] as const;
const CENTER_OUTLINE_COLOR = [1, 1, 1, 1] as const;
const CENTER_FILL_COLOR = [0, 0, 0, 1] as const;
const VIEWPORT_FONT_FAMILY = "\"Belanosima\", sans-serif";
const GRIDLINE_LABEL_FONT_SIZE_PX = 14;
const CHARACTER_NAME_FONT_SIZE_PX = 24;
const CHARACTER_OWNER_FONT_SIZE_PX = 13;
const GRIDLINE_LABEL_FONT = `${GRIDLINE_LABEL_FONT_SIZE_PX}px ${VIEWPORT_FONT_FAMILY}`;
const CHARACTER_NAME_FONT = `${CHARACTER_NAME_FONT_SIZE_PX}px ${VIEWPORT_FONT_FAMILY}`;
const CHARACTER_OWNER_FONT = `${CHARACTER_OWNER_FONT_SIZE_PX}px ${VIEWPORT_FONT_FAMILY}`;
const TEXT_TEXTURE_FONTS = [
    GRIDLINE_LABEL_FONT,
    CHARACTER_NAME_FONT,
    CHARACTER_OWNER_FONT,
] as const;
const NAMEPLATE_MIN_WIDTH_PX = 180;
const NAMEPLATE_PADDING_PX = 16;
const NAMEPLATE_NAME_TOP_PX = 14;
const NAMEPLATE_OWNER_TOP_GAP_PX = 4;
const NAMEPLATE_OWNER_AVATAR_SIZE_PX = 24;
const NAMEPLATE_OWNER_TEXT_GAP_PX = 4;
const NAMEPLATE_OWNER_ROW_GAP_PX = 6;
const NAMEPLATE_OWNER_TEXT_OFFSET_Y_PX = 5;
const NAMEPLATE_WORLD_SCALE_TARGET_PX = 256;
const NAMEPLATE_BG_COLOR = "rgba(232, 248, 224, 0.78)";
const NAMEPLATE_NAME_COLOR = "rgba(20, 34, 19, 0.95)";
const NAMEPLATE_OWNER_COLOR = "rgba(47, 71, 43, 0.9)";
const NAMEPLATE_AVATAR_PLACEHOLDER_COLOR = "rgba(196, 214, 201, 1)";
const NAMEPLATE_AVATAR_RING_COLOR = "rgba(255, 255, 255, 0.72)";
const TRANSPARENT_CLEAR_COLOR = {
    r: 0,
    g: 0,
    b: 0,
    a: 0,
};

const quadShaderCode = /* wgsl */`
struct QuadParams {
    canvasSizePx: vec2f,
    _padding0: vec2f,
    rectPx: vec4f,
    tint: vec4f,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) tint: vec4f,
};

@group(0) @binding(0) var<uniform> params: QuadParams;
@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var textureSource: texture_2d<f32>;

@vertex
fn vertex(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    let quad = array<vec2f, 6>(
        vec2f(0, 0),
        vec2f(1, 0),
        vec2f(0, 1),
        vec2f(0, 1),
        vec2f(1, 0),
        vec2f(1, 1),
    );

    let uv = quad[vertexIndex];
    let positionPx = params.rectPx.xy + uv * params.rectPx.zw;
    let clipPosition = vec2f(
        positionPx.x / params.canvasSizePx.x * 2 - 1,
        1 - positionPx.y / params.canvasSizePx.y * 2,
    );

    var output: VertexOutput;
    output.position = vec4f(clipPosition, 0, 1);
    output.uv = uv;
    output.tint = params.tint;
    return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
    return textureSample(textureSource, textureSampler, input.uv) * input.tint;
}
`;

const lineShaderCode = /* wgsl */`
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};

@vertex
fn vertex(
    @location(0) position: vec2f,
    @location(1) color: vec4f,
) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(position, 0, 1);
    output.color = color;
    return output;
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4f {
    return input.color;
}
`;

export class WebGpuViewportRenderer {
    private adapter: GPUAdapter | null = null;
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private format: GPUTextureFormat | null = null;
    private quadPipeline: GPURenderPipeline | null = null;
    private linePipeline: GPURenderPipeline | null = null;
    private sampler: GPUSampler | null = null;
    private placeholderTexture: TextureResource | null = null;
    private lineVertexBuffer: GPUBuffer | null = null;
    private lineVertexBufferByteCapacity = 0;
    private readonly imageTextureCache = new WeakMap<CharacterImage, Promise<TextureResource>>();
    private readonly textTextureCache = new Map<string, Promise<TextureResource>>();
    private readonly avatarBitmapCache = new Map<string, Promise<ImageBitmap | null>>();
    private readonly quadUniforms: QuadUniformResource[] = [];
    private latestFrame: CharacterRenderFrame | null = null;
    private renderLoopRunning = false;
    private status: WebGpuRendererStatus = "initializing";
    private configuredWidthPx = 0;
    private configuredHeightPx = 0;
    private readonly pixelRatio = window.devicePixelRatio || 1;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly onStatusChange: (status: WebGpuRendererStatus) => void = () => {},
    ) {}

    async initialize() {
        this.setStatus("initializing");

        if (!("gpu" in navigator)) {
            this.setStatus("unavailable");
            return;
        }

        try {
            this.adapter = await navigator.gpu.requestAdapter();
        } catch {
            this.setStatus("unavailable");
            return;
        }

        if (this.adapter === null) {
            this.setStatus("unavailable");
            return;
        }

        try {
            this.device = await this.adapter.requestDevice();
        } catch {
            this.setStatus("unavailable");
            return;
        }

        this.context = this.canvas.getContext("webgpu") as GPUCanvasContext | null;
        if (this.context === null) {
            this.setStatus("unavailable");
            return;
        }

        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });

        const quadBindGroupLayout = this.device.createBindGroupLayout({
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
        const textureBindGroupLayout = this.device.createBindGroupLayout({
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

        this.quadPipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [
                    quadBindGroupLayout,
                    textureBindGroupLayout,
                ],
            }),
            vertex: {
                module: this.device.createShaderModule({
                    code: quadShaderCode,
                }),
                entryPoint: "vertex",
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: quadShaderCode,
                }),
                entryPoint: "fragment",
                targets: [
                    {
                        format: this.format,
                        blend: {
                            color: {
                                srcFactor: "src-alpha",
                                dstFactor: "one-minus-src-alpha",
                            },
                            alpha: {
                                srcFactor: "one",
                                dstFactor: "one-minus-src-alpha",
                            },
                        },
                    },
                ],
            },
            primitive: {
                topology: "triangle-list",
            },
        });

        this.linePipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.device.createShaderModule({
                    code: lineShaderCode,
                }),
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
                module: this.device.createShaderModule({
                    code: lineShaderCode,
                }),
                entryPoint: "fragment",
                targets: [
                    {
                        format: this.format,
                        blend: {
                            color: {
                                srcFactor: "src-alpha",
                                dstFactor: "one-minus-src-alpha",
                            },
                            alpha: {
                                srcFactor: "one",
                                dstFactor: "one-minus-src-alpha",
                            },
                        },
                    },
                ],
            },
            primitive: {
                topology: "triangle-list",
            },
        });

        this.placeholderTexture = this.createSolidTexture(PLACEHOLDER_COLOR);
        await this.loadTextFonts();
        this.setStatus("ready");
        this.queueLatestFrame();
    }

    render(frame: CharacterRenderFrame) {
        this.latestFrame = frame;
        this.queueLatestFrame();
    }

    destroy() {
        this.lineVertexBuffer?.destroy();
        this.placeholderTexture?.texture.destroy();

        for (const uniform of this.quadUniforms) {
            uniform.buffer.destroy();
        }

        for (const avatarBitmapPromise of this.avatarBitmapCache.values()) {
            void avatarBitmapPromise.then(bitmap => bitmap?.close());
        }

        this.avatarBitmapCache.clear();
        this.latestFrame = null;
    }

    private queueLatestFrame() {
        if (this.renderLoopRunning) return;
        if (this.latestFrame === null) return;
        if (this.status !== "ready") return;

        this.renderLoopRunning = true;
        void this.drawQueuedFrames();
    }

    private async drawQueuedFrames() {
        while (this.latestFrame !== null) {
            const frame = this.latestFrame;
            this.latestFrame = null;
            await this.draw(frame);
        }

        this.renderLoopRunning = false;
    }

    private async draw(frame: CharacterRenderFrame) {
        if (
            this.device === null
            || this.context === null
            || this.format === null
            || this.quadPipeline === null
            || this.linePipeline === null
            || this.placeholderTexture === null
        ) {
            return;
        }

        if (frame.widthPx <= 0 || frame.heightPx <= 0) return;

        this.configure(frame.widthPx, frame.heightPx);

        const characterTextures = await Promise.all(
            frame.items.map(item => this.getCharacterTextureResource(item.image)),
        );
        const gridLabelTextures = await Promise.all(
            frame.gridlines
                .filter(gridline => gridline.orientation === "y" && gridline.weight !== "light")
                .map(gridline => this.getTextTexture(this.gridlineTextSpec(gridline))),
        );
        const characterLabelTextures = await Promise.all(
            frame.items.map(item => {
                if (item.labelOpacity < 0.02) return Promise.resolve(null);

                return this.getTextTexture(this.characterLabelTextSpec(item));
            }),
        );
        const gridLineVertices = this.buildGridLineVertices(frame);
        const characterLineVertices = this.buildCharacterLineVertices(frame);
        const gridLineRange: LineVertexRange = {
            firstVertex: 0,
            vertexCount: gridLineVertices.length / LINE_VERTEX_FLOAT_COUNT,
        };
        const characterLineRange: LineVertexRange = {
            firstVertex: gridLineRange.vertexCount,
            vertexCount: characterLineVertices.length / LINE_VERTEX_FLOAT_COUNT,
        };
        const lineVertices = concatenateFloat32Arrays(
            gridLineVertices,
            characterLineVertices,
        );

        // WebGPU consumes buffer contents when submitted, not when the draw is encoded.
        // Keep all line geometry in one frame-stable upload so later line draws cannot corrupt the grid.
        if (lineVertices.length > 0) {
            this.writeLineVertices(lineVertices);
        }

        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: TRANSPARENT_CLEAR_COLOR,
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
        });
        let quadIndex = 0;

        this.drawLineRange(
            pass,
            gridLineRange,
        );

        let gridLabelIndex = 0;
        for (const gridline of frame.gridlines) {
            if (gridline.orientation !== "y" || gridline.weight === "light") continue;

            const texture = gridLabelTextures[gridLabelIndex];
            gridLabelIndex += 1;
            quadIndex = this.drawTextureQuad(
                pass,
                quadIndex,
                frame,
                {
                    x: 8,
                    y: gridline.offsetPx + 8,
                    width: texture.widthPx,
                    height: texture.heightPx,
                },
                texture,
                IMAGE_TINT,
            );
        }

        for (let index = 0; index < frame.items.length; index++) {
            const item = frame.items[index];
            quadIndex = this.drawTextureQuad(
                pass,
                quadIndex,
                frame,
                item.rectPx,
                characterTextures[index],
                item.image === null
                    ? withOpacity(PLACEHOLDER_COLOR, item.opacity)
                    : withOpacity(IMAGE_TINT, item.opacity),
            );
        }

        this.drawLineRange(
            pass,
            characterLineRange,
        );

        for (let index = 0; index < frame.items.length; index++) {
            const item = frame.items[index];
            if (item.labelOpacity < 0.02) continue;

            const texture = characterLabelTextures[index];
            if (texture === null) continue;

            quadIndex = this.drawTextureQuad(
                pass,
                quadIndex,
                frame,
                characterLabelRectPx(
                    item,
                    texture,
                    this.pixelRatio,
                ),
                texture,
                withOpacity(IMAGE_TINT, item.labelOpacity),
            );
        }

        pass.end();
        this.device.queue.submit([encoder.finish()]);
    }

    private configure(widthPx: number, heightPx: number) {
        if (this.device === null || this.context === null || this.format === null) return;

        const canvasWidthPx = Math.max(1, Math.round(widthPx * this.pixelRatio));
        const canvasHeightPx = Math.max(1, Math.round(heightPx * this.pixelRatio));

        if (
            this.configuredWidthPx === canvasWidthPx
            && this.configuredHeightPx === canvasHeightPx
        ) {
            return;
        }

        this.canvas.width = canvasWidthPx;
        this.canvas.height = canvasHeightPx;
        this.configuredWidthPx = canvasWidthPx;
        this.configuredHeightPx = canvasHeightPx;

        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "premultiplied",
        });
    }

    private async getCharacterTextureResource(image: CharacterImage | null) {
        if (this.placeholderTexture === null) throw new Error("renderer is not initialized");
        if (image === null) return this.placeholderTexture;

        const cachedTexture = this.imageTextureCache.get(image);
        if (cachedTexture !== undefined) return cachedTexture;

        const texturePromise = this.createImageTextureResource(image).catch(() => {
            if (this.placeholderTexture === null) throw new Error("renderer is not initialized");
            return this.placeholderTexture;
        });
        this.imageTextureCache.set(image, texturePromise);
        return texturePromise;
    }

    private async createImageTextureResource(image: CharacterImage) {
        if (this.device === null) throw new Error("renderer is not initialized");

        const bitmap = await createImageBitmap(image.file);
        const texture = this.createTextureFromBitmap(bitmap);
        bitmap.close();
        return texture;
    }

    private getAvatarBitmap(avatarUrl: string | null) {
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

    private getTextTexture(spec: TextTextureSpec) {
        const cachedTexture = this.textTextureCache.get(spec.cacheKey);
        if (cachedTexture !== undefined) return cachedTexture;

        const texturePromise = this.createTextTextureResource(spec);
        this.textTextureCache.set(spec.cacheKey, texturePromise);
        return texturePromise;
    }

    private async createTextTextureResource(spec: TextTextureSpec) {
        if (this.device === null) throw new Error("renderer is not initialized");

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
        if (this.device === null) throw new Error("renderer is not initialized");

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
        if (this.device === null) throw new Error("renderer is not initialized");

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

    private createSolidTexture(color: readonly [number, number, number, number]) {
        if (this.device === null) throw new Error("renderer is not initialized");

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
        if (this.device === null || this.quadPipeline === null || this.sampler === null) {
            throw new Error("renderer is not initialized");
        }

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

    private drawTextureQuad(
        pass: GPURenderPassEncoder,
        quadIndex: number,
        frame: CharacterRenderFrame,
        rectPx: RectPx,
        texture: TextureResource,
        tint: readonly [number, number, number, number],
    ) {
        if (this.quadPipeline === null) throw new Error("renderer is not initialized");

        const uniform = this.writeQuadUniform(
            quadIndex,
            frame,
            rectPx,
            tint,
        );

        pass.setPipeline(this.quadPipeline);
        pass.setBindGroup(0, uniform.bindGroup);
        pass.setBindGroup(1, texture.bindGroup);
        pass.draw(QUAD_VERTEX_COUNT);
        return quadIndex + 1;
    }

    private writeQuadUniform(
        index: number,
        frame: CharacterRenderFrame,
        rectPx: RectPx,
        tint: readonly [number, number, number, number],
    ) {
        if (this.device === null || this.quadPipeline === null) {
            throw new Error("renderer is not initialized");
        }

        const uniform = this.getQuadUniform(index);
        const data = new Float32Array(QUAD_UNIFORM_FLOAT_COUNT);
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

        this.device.queue.writeBuffer(
            uniform.buffer,
            0,
            data,
        );

        return uniform;
    }

    private getQuadUniform(index: number) {
        if (this.device === null || this.quadPipeline === null) {
            throw new Error("renderer is not initialized");
        }

        while (this.quadUniforms.length <= index) {
            const buffer = this.device.createBuffer({
                size: QUAD_UNIFORM_BYTE_COUNT,
                usage:
                    GPU_BUFFER_USAGE.uniform
                    | GPU_BUFFER_USAGE.copyDst,
            });
            const bindGroup = this.device.createBindGroup({
                layout: this.quadPipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer,
                        },
                    },
                ],
            });

            this.quadUniforms.push({
                buffer,
                bindGroup,
            });
        }

        return this.quadUniforms[index];
    }

    private buildGridLineVertices(frame: CharacterRenderFrame) {
        const vertices: number[] = [];

        for (const gridline of frame.gridlines) {
            const weightPx = gridline.weight === "origin" ? 4 : 2;
            const color = gridline.weight === "light"
                ? GRIDLINE_LIGHT_COLOR
                : GRIDLINE_STRONG_COLOR;

            if (gridline.orientation === "x") {
                appendRect(
                    vertices,
                    frame,
                    {
                        x: gridline.offsetPx - weightPx * 0.5,
                        y: 0,
                        width: weightPx,
                        height: frame.heightPx,
                    },
                    color,
                );
            } else {
                appendRect(
                    vertices,
                    frame,
                    {
                        x: 0,
                        y: gridline.offsetPx - weightPx * 0.5,
                        width: frame.widthPx,
                        height: weightPx,
                    },
                    color,
                );
            }
        }

        return new Float32Array(vertices);
    }

    private buildCharacterLineVertices(frame: CharacterRenderFrame) {
        const vertices: number[] = [];

        for (const item of frame.items) {
            if (item.baselinePoints.length >= 2) {
                appendBaselineStroke(
                    vertices,
                    frame,
                    item,
                    item.rectPx.height * 0.01,
                    withOpacity(BASELINE_WHITE_COLOR, item.baselineOpacity),
                );
                appendBaselineStroke(
                    vertices,
                    frame,
                    item,
                    item.rectPx.height * 0.003,
                    withOpacity(BASELINE_BLACK_COLOR, item.baselineOpacity),
                );
            }

            if (item.editing) {
                appendAnchorControl(vertices, frame, item);
            }
        }

        return new Float32Array(vertices);
    }

    private drawLineRange(
        pass: GPURenderPassEncoder,
        range: LineVertexRange,
    ) {
        if (
            this.linePipeline === null
            || this.lineVertexBuffer === null
            || range.vertexCount === 0
        ) {
            return;
        }

        pass.setPipeline(this.linePipeline);
        pass.setVertexBuffer(0, this.lineVertexBuffer);
        pass.draw(
            range.vertexCount,
            1,
            range.firstVertex,
        );
    }

    private writeLineVertices(vertices: Float32Array) {
        if (this.device === null) return;

        const requiredByteCount = vertices.byteLength;
        if (requiredByteCount === 0) return;

        if (
            this.lineVertexBuffer === null
            || this.lineVertexBufferByteCapacity < requiredByteCount
        ) {
            this.lineVertexBuffer?.destroy();
            this.lineVertexBufferByteCapacity = nextPowerOfTwo(requiredByteCount);
            this.lineVertexBuffer = this.device.createBuffer({
                size: this.lineVertexBufferByteCapacity,
                usage:
                    GPU_BUFFER_USAGE.vertex
                    | GPU_BUFFER_USAGE.copyDst,
            });
        }

        this.device.queue.writeBuffer(
            this.lineVertexBuffer,
            0,
            vertices,
        );
    }

    private async loadTextFonts() {
        if (!("fonts" in document)) return;

        const fonts = document.fonts;

        try {
            // Canvas text textures are static. Wait before caching them so the first draw
            // does not permanently bake browser fallback fonts into the nameplates.
            await Promise.all([
                ...TEXT_TEXTURE_FONTS.map(font => fonts.load(font)),
                fonts.ready,
            ]);
        } catch {
            // Font loading failure should not block the chart from rendering.
        }
    }

    private gridlineTextSpec(gridline: GridlineRenderItem): TextTextureSpec {
        const text = `${formatMeters(gridline.coordMeters)} m`;
        const widthPx = Math.max(
            48,
            Math.ceil(measureTextWidthPx(GRIDLINE_LABEL_FONT, text)) + 16,
        );
        const heightPx = 28;

        return {
            cacheKey: `grid:${text}`,
            widthPx,
            heightPx,
            draw: context => {
                context.font = GRIDLINE_LABEL_FONT;
                context.fillStyle = GRIDLINE_LABEL_COLOR;
                context.textBaseline = "top";
                context.fillText(text, 8, 6);
            },
        };
    }

    private characterLabelTextSpec(item: CharacterRenderItem): TextTextureSpec {
        const scale = characterLabelScale(item);
        const nameFont = fontWithSize(CHARACTER_NAME_FONT_SIZE_PX * scale);
        const ownerFont = fontWithSize(CHARACTER_OWNER_FONT_SIZE_PX * scale);
        const owners = item.owners.filter(owner => (
            owner.name !== ""
            || owner.avatarUrl !== null
        ));
        const name = item.name === "" ? "unnamed character" : item.name;
        const textKey = JSON.stringify({
            name,
            owners: owners.map(owner => ({
                name: owner.name,
                avatarUrl: owner.avatarUrl,
            })),
            scale,
        });
        const paddingPx = NAMEPLATE_PADDING_PX * scale;
        const nameWidthPx = measureTextWidthPx(nameFont, name);
        const ownerWidthPx = Math.max(
            ...owners.map(owner => (
                (NAMEPLATE_OWNER_AVATAR_SIZE_PX + NAMEPLATE_OWNER_TEXT_GAP_PX) * scale
                + measureTextWidthPx(ownerFont, owner.name)
            )),
            0,
        );
        const widthPx = Math.max(
            Math.ceil(NAMEPLATE_MIN_WIDTH_PX * scale),
            Math.ceil(Math.max(nameWidthPx, ownerWidthPx) + paddingPx * 2),
        );
        const ownerHeightPx = owners.length === 0
            ? 0
            : (
                NAMEPLATE_OWNER_TOP_GAP_PX
                + owners.length * NAMEPLATE_OWNER_AVATAR_SIZE_PX
                + (owners.length - 1) * NAMEPLATE_OWNER_ROW_GAP_PX
            ) * scale;
        const heightPx = Math.ceil(
            (
                NAMEPLATE_NAME_TOP_PX
                + CHARACTER_NAME_FONT_SIZE_PX
                + NAMEPLATE_PADDING_PX
            ) * scale
            + ownerHeightPx,
        );

        return {
            cacheKey: `character-label:${textKey}`,
            widthPx,
            heightPx,
            draw: async context => {
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = "high";

                context.fillStyle = NAMEPLATE_BG_COLOR;
                context.fillRect(0, 0, widthPx, heightPx);

                context.fillStyle = NAMEPLATE_NAME_COLOR;
                context.textBaseline = "top";
                context.font = nameFont;
                context.fillText(
                    name,
                    NAMEPLATE_PADDING_PX * scale,
                    NAMEPLATE_NAME_TOP_PX * scale,
                );

                if (owners.length === 0) return;

                context.font = ownerFont;
                context.fillStyle = NAMEPLATE_OWNER_COLOR;

                for (let index = 0; index < owners.length; index++) {
                    const owner = owners[index];
                    const ownerY = (
                        NAMEPLATE_NAME_TOP_PX
                        + CHARACTER_NAME_FONT_SIZE_PX
                        + NAMEPLATE_OWNER_TOP_GAP_PX
                        + index * (NAMEPLATE_OWNER_AVATAR_SIZE_PX + NAMEPLATE_OWNER_ROW_GAP_PX)
                    ) * scale;
                    const avatarSizePx = NAMEPLATE_OWNER_AVATAR_SIZE_PX * scale;

                    await drawOwnerAvatar(
                        context,
                        await this.getAvatarBitmap(owner.avatarUrl),
                        {
                            x: NAMEPLATE_PADDING_PX * scale,
                            y: ownerY,
                            size: avatarSizePx,
                        },
                    );

                    context.fillText(
                        owner.name,
                        (NAMEPLATE_PADDING_PX + NAMEPLATE_OWNER_AVATAR_SIZE_PX + NAMEPLATE_OWNER_TEXT_GAP_PX) * scale,
                        ownerY + NAMEPLATE_OWNER_TEXT_OFFSET_Y_PX * scale,
                    );
                }
            },
        };
    }

    private setStatus(status: WebGpuRendererStatus) {
        this.status = status;
        this.onStatusChange(status);
    }
}

const appendBaselineStroke = (
    vertices: number[],
    frame: CharacterRenderFrame,
    item: CharacterRenderItem,
    thicknessPx: number,
    color: readonly [number, number, number, number],
) => {
    const points = sampleBaselinePath(item.baselinePoints);

    for (let index = 1; index < points.length; index++) {
        const start = baselinePointToScreenPx(item, points[index - 1]);
        const end = baselinePointToScreenPx(item, points[index]);
        appendLineSegment(
            vertices,
            frame,
            start,
            end,
            thicknessPx,
            color,
        );
    }
};

const appendAnchorControl = (
    vertices: number[],
    frame: CharacterRenderFrame,
    item: CharacterRenderItem,
) => {
    const anchor = characterAnchorToScreenPx(item);

    appendRect(
        vertices,
        frame,
        {
            x: anchor.x - 6,
            y: anchor.y - 6,
            width: 12,
            height: 12,
        },
        CENTER_OUTLINE_COLOR,
    );
    appendRect(
        vertices,
        frame,
        {
            x: anchor.x - 4,
            y: anchor.y - 4,
            width: 8,
            height: 8,
        },
        CENTER_FILL_COLOR,
    );
};

const characterAnchorToScreenPx = (item: CharacterRenderItem): Point => ({
    x: item.rectPx.x + item.character.anchor.x * item.rectPx.width,
    y: item.rectPx.y + (1 - item.character.anchor.y) * item.rectPx.height,
});

const baselinePointToScreenPx = (
    item: CharacterRenderItem,
    point: Point,
): Point => ({
    x: item.rectPx.x + point.x / item.aspect * item.rectPx.width,
    y: item.rectPx.y + (1 - point.y) * item.rectPx.height,
});

const appendLineSegment = (
    vertices: number[],
    frame: CharacterRenderFrame,
    start: Point,
    end: Point,
    thicknessPx: number,
    color: readonly [number, number, number, number],
) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;

    const normalX = -dy / length * thicknessPx * 0.5;
    const normalY = dx / length * thicknessPx * 0.5;
    const p0 = {x: start.x + normalX, y: start.y + normalY};
    const p1 = {x: start.x - normalX, y: start.y - normalY};
    const p2 = {x: end.x + normalX, y: end.y + normalY};
    const p3 = {x: end.x - normalX, y: end.y - normalY};

    appendTriangleQuad(
        vertices,
        frame,
        p0,
        p1,
        p2,
        p3,
        color,
    );
};

const appendRect = (
    vertices: number[],
    frame: CharacterRenderFrame,
    rect: RectPx,
    color: readonly [number, number, number, number],
) => {
    const p0 = {x: rect.x, y: rect.y};
    const p1 = {x: rect.x, y: rect.y + rect.height};
    const p2 = {x: rect.x + rect.width, y: rect.y};
    const p3 = {x: rect.x + rect.width, y: rect.y + rect.height};

    appendTriangleQuad(
        vertices,
        frame,
        p0,
        p1,
        p2,
        p3,
        color,
    );
};

const appendTriangleQuad = (
    vertices: number[],
    frame: CharacterRenderFrame,
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    color: readonly [number, number, number, number],
) => {
    appendLineVertex(vertices, frame, p0, color);
    appendLineVertex(vertices, frame, p1, color);
    appendLineVertex(vertices, frame, p2, color);
    appendLineVertex(vertices, frame, p2, color);
    appendLineVertex(vertices, frame, p1, color);
    appendLineVertex(vertices, frame, p3, color);
};

const appendLineVertex = (
    vertices: number[],
    frame: CharacterRenderFrame,
    point: Point,
    color: readonly [number, number, number, number],
) => {
    vertices.push(
        point.x / frame.widthPx * 2 - 1,
        1 - point.y / frame.heightPx * 2,
        color[0],
        color[1],
        color[2],
        color[3],
    );
};

const withOpacity = (
    color: readonly [number, number, number, number],
    opacity: number,
): [number, number, number, number] => [
    color[0],
    color[1],
    color[2],
    color[3] * opacity,
];

const nextPowerOfTwo = (value: number) => 2 ** Math.ceil(Math.log2(value));

const formatMeters = (value: number) => Number(value.toFixed(4)).toString();

export const characterLabelScale = (item: CharacterRenderItem) => (
    item.rectPx.height / NAMEPLATE_WORLD_SCALE_TARGET_PX
);

export const characterLabelRectPx = (
    item: CharacterRenderItem,
    texture: TextureSizePx,
    pixelRatio: number,
): RectPx => {
    const scale = characterLabelScale(item);
    const imageRightPx = item.rectPx.x + item.rectPx.width;

    return {
        x: alignDevicePx(imageRightPx - texture.widthPx, pixelRatio),
        y: alignDevicePx(
            item.rectPx.y + item.rectPx.height + 8 * scale,
            pixelRatio,
        ),
        width: texture.widthPx,
        height: texture.heightPx,
    };
};

const fontWithSize = (sizePx: number) => `${Math.max(1, sizePx)}px ${VIEWPORT_FONT_FAMILY}`;

const alignDevicePx = (
    value: number,
    pixelRatio: number,
) => Math.round(value * pixelRatio) / pixelRatio;

const drawOwnerAvatar = async (
    context: CanvasRenderingContext2D,
    bitmap: ImageBitmap | null,
    rect: AvatarRectPx,
) => {
    const radius = rect.size * 0.5;
    const centerX = rect.x + radius;
    const centerY = rect.y + radius;

    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.clip();

    if (bitmap === null) {
        context.fillStyle = NAMEPLATE_AVATAR_PLACEHOLDER_COLOR;
        context.fillRect(rect.x, rect.y, rect.size, rect.size);
    } else {
        const sourceSize = Math.min(bitmap.width, bitmap.height);
        const sourceX = (bitmap.width - sourceSize) * 0.5;
        const sourceY = (bitmap.height - sourceSize) * 0.5;

        context.drawImage(
            bitmap,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            rect.x,
            rect.y,
            rect.size,
            rect.size,
        );
    }

    context.restore();

    context.strokeStyle = NAMEPLATE_AVATAR_RING_COLOR;
    context.lineWidth = Math.max(1, rect.size / 18);
    context.beginPath();
    context.arc(centerX, centerY, radius - context.lineWidth * 0.5, 0, Math.PI * 2);
    context.stroke();
};

let textMeasureContext: CanvasRenderingContext2D | null = null;

const measureTextWidthPx = (
    font: string,
    text: string,
) => {
    if (textMeasureContext === null) {
        const canvas = document.createElement("canvas");
        textMeasureContext = canvas.getContext("2d");
    }

    if (textMeasureContext === null) return text.length * 16;

    textMeasureContext.font = font;
    return textMeasureContext.measureText(text).width;
};

const concatenateFloat32Arrays = (
    first: Float32Array,
    second: Float32Array,
) => {
    if (first.length === 0) return second;
    if (second.length === 0) return first;

    const output = new Float32Array(first.length + second.length);
    output.set(first, 0);
    output.set(second, first.length);
    return output;
};
