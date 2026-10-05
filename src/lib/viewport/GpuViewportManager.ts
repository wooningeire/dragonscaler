import { onDestroy, onMount } from "svelte";
import type { CharacterRenderFrame } from "./characterRenderModel";
import {
    LINE_VERTEX_FLOAT_COUNT,
    TRANSPARENT_CLEAR_COLOR,
} from "./webgpu/constants";
import { drawFrameContent } from "./webgpu/frameContentRenderer";
import {
    buildCharacterLineVertices,
    buildGridLineVertices,
} from "./webgpu/lineGeometry";
import { WebGpuLineRenderer } from "./webgpu/lineRenderer";
import {
    characterLabelTextSpec,
    gridlineTextSpec,
    loadTextFonts,
} from "./webgpu/nameplateLayout";
import {
    createWebGpuPipelines,
    type WebGpuPipelines,
} from "./webgpu/pipelines";
import { GpuQuadPipelineManager } from "./webgpu/GpuQuadPipelineManager";
import { WebGpuTextureResources } from "./webgpu/textureResources";
import type { LineVertexRange } from "./webgpu/types";

export {
    characterLabelPanelRectPx,
    characterLabelRectPx,
    characterLabelScale,
    characterLabelTextureSizePx,
} from "./webgpu/nameplateLayout";
export {
    drawCharacterImageQuads,
    drawFrameContent,
} from "./webgpu/frameContentRenderer";
export type { TextureSizePx } from "./webgpu/types";

export type WebGpuRendererStatus =
    | "initializing"
    | "ready"
    | "unavailable";

export class GpuViewportManager {
    private readonly canvas: HTMLCanvasElement;
    private readonly device: GPUDevice;
    private readonly context: GPUCanvasContext;
    private readonly format: GPUTextureFormat;
    private readonly quadRenderer: GpuQuadPipelineManager;
    private readonly gridQuadRenderer: GpuQuadPipelineManager;
    private readonly outlineQuadRenderer: GpuQuadPipelineManager;
    private readonly dropShadowQuadRenderer: GpuQuadPipelineManager;
    private readonly gridLineRenderer: WebGpuLineRenderer;
    private readonly lineRenderer: WebGpuLineRenderer;
    private readonly textureResources: WebGpuTextureResources;
    private latestFrame: CharacterRenderFrame | null = null;
    private renderLoopRunning = false;
    private configuredWidthPx = 0;
    private configuredHeightPx = 0;
    private destroyed = false;

    private constructor({
        canvas,
        device,
        format,
        context,
        quadRenderer,
        gridQuadRenderer,
        outlineQuadRenderer,
        dropShadowQuadRenderer,
        gridLineRenderer,
        lineRenderer,
        textureResources,
    }: {
        canvas: HTMLCanvasElement,
        device: GPUDevice,
        format: GPUTextureFormat,
        context: GPUCanvasContext,
        quadRenderer: GpuQuadPipelineManager,
        gridQuadRenderer: GpuQuadPipelineManager,
        outlineQuadRenderer: GpuQuadPipelineManager,
        dropShadowQuadRenderer: GpuQuadPipelineManager,
        gridLineRenderer: WebGpuLineRenderer,
        lineRenderer: WebGpuLineRenderer,
        textureResources: WebGpuTextureResources,
    }) {
        this.canvas = canvas;
        this.device = device;
        this.format = format;
        this.context = context;
        this.quadRenderer = quadRenderer;
        this.gridQuadRenderer = gridQuadRenderer;
        this.outlineQuadRenderer = outlineQuadRenderer;
        this.dropShadowQuadRenderer = dropShadowQuadRenderer;
        this.gridLineRenderer = gridLineRenderer;
        this.lineRenderer = lineRenderer;
        this.textureResources = textureResources;
    }

    static mount({
        getCanvas,
    }: {
        getCanvas: () => HTMLCanvasElement,
    }): Promise<GpuViewportManager> {
        return new Promise(resolve => {
            let renderer: GpuViewportManager | null = null;

            onMount(async () => {
                const canvas = getCanvas();
                if (navigator.gpu === undefined) return null;

                const adapter = await navigator.gpu.requestAdapter();
                if (adapter === null) return null;


                const context = canvas.getContext("webgpu") as GPUCanvasContext | null;
                if (context === null) return null;

                const device = await adapter.requestDevice();

                const format = navigator.gpu.getPreferredCanvasFormat();

                const sampler = device.createSampler({
                    magFilter: "linear",
                    minFilter: "linear",
                });
                const pipelines = createWebGpuPipelines(
                    device,
                    format,
                );
                const quadRenderer = new GpuQuadPipelineManager(
                    device,
                    pipelines.quadPipeline,
                );
                const gridQuadRenderer = new GpuQuadPipelineManager(
                    device,
                    pipelines.gridQuadPipeline,
                );
                const outlineQuadRenderer = new GpuQuadPipelineManager(
                    device,
                    pipelines.outlineQuadPipeline,
                );
                const dropShadowQuadRenderer = new GpuQuadPipelineManager(
                    device,
                    pipelines.dropShadowQuadPipeline,
                );
                const gridLineRenderer = new WebGpuLineRenderer(
                    device,
                    pipelines.gridLinePipeline,
                );
                const lineRenderer = new WebGpuLineRenderer(
                    device,
                    pipelines.linePipeline,
                );
                const textureResources = new WebGpuTextureResources(
                    device,
                    pipelines.quadPipeline,
                    sampler,
                    devicePixelRatio,
                );

                await loadTextFonts();

                renderer = new GpuViewportManager({
                    canvas,
                    device,
                    format,
                    context,
                    quadRenderer,
                    gridQuadRenderer,
                    outlineQuadRenderer,
                    dropShadowQuadRenderer,
                    gridLineRenderer,
                    lineRenderer,
                    textureResources,
                });

                resolve(renderer);

            });

            onDestroy(() => {
                renderer?.destroy();
            });
        });
    }

    render(frame: CharacterRenderFrame) {
        if (this.destroyed) return;

        this.latestFrame = frame;
        this.queueLatestFrame();
    }

    destroy() {
        this.destroyed = true;
        this.latestFrame = null;
        this.gridLineRenderer?.destroy();
        this.lineRenderer?.destroy();
        this.quadRenderer?.destroy();
        this.gridQuadRenderer?.destroy();
        this.outlineQuadRenderer?.destroy();
        this.dropShadowQuadRenderer?.destroy();
        this.textureResources?.destroy();
        this.unconfigureContext();
        this.device?.destroy();
        this.configuredWidthPx = 0;
        this.configuredHeightPx = 0;
    }

    private queueLatestFrame() {
        if (this.renderLoopRunning) return;
        if (this.latestFrame === null) return;

        this.renderLoopRunning = true;
        void this.drawQueuedFrames();
    }

    private async drawQueuedFrames() {
        while (!this.destroyed && this.latestFrame !== null) {
            const frame = this.latestFrame;
            this.latestFrame = null;

            try {
                await this.draw(frame);
            } catch (error) {
                if (!this.destroyed) throw error;
            }
        }

        this.renderLoopRunning = false;
    }

    private async draw(frame: CharacterRenderFrame) {
        if (this.destroyed) return;

        if (frame.widthPx <= 0 || frame.heightPx <= 0) return;

        this.configure(frame.widthPx, frame.heightPx);

        const textureResources = this.textureResources;
        const quadRenderer = this.quadRenderer;
        const gridQuadRenderer = this.gridQuadRenderer;
        const outlineQuadRenderer = this.outlineQuadRenderer;
        const dropShadowQuadRenderer = this.dropShadowQuadRenderer;
        const gridLineRenderer = this.gridLineRenderer;
        const lineRenderer = this.lineRenderer;
        const characterTextures = await Promise.all(
            frame.items.map(item => textureResources.getCharacterTextureResource(item.image)),
        );
        const gridLabelTextures = await Promise.all(
            frame.gridlines
                .filter(gridline => gridline.orientation === "y" && gridline.weight !== "light")
                .map(gridline => textureResources.getTextTexture(gridlineTextSpec(gridline))),
        );
        const characterLabelTextures = await Promise.all(
            frame.items.map(item => {
                if (item.labelOpacity < 0.02) return Promise.resolve(null);

                return textureResources.getTextTexture(characterLabelTextSpec(
                    item,
                    avatarUrl => textureResources.getAvatarBitmap(avatarUrl),
                ));
            }),
        );

        if (this.destroyed) return;

        const gridLineVertices = buildGridLineVertices(frame);
        const characterLineVertices = buildCharacterLineVertices(frame);
        const gridLineRange: LineVertexRange = {
            firstVertex: 0,
            vertexCount: gridLineVertices.length / LINE_VERTEX_FLOAT_COUNT,
        };
        const characterLineRange: LineVertexRange = {
            firstVertex: 0,
            vertexCount: characterLineVertices.length / LINE_VERTEX_FLOAT_COUNT,
        };
        if (gridLineVertices.length > 0) {
            gridLineRenderer.writeVertices(gridLineVertices);
        }
        if (characterLineVertices.length > 0) {
            lineRenderer.writeVertices(characterLineVertices);
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
        let outlineQuadIndex = 0;
        let dropShadowQuadIndex = 0;

        ({
            quadIndex,
            outlineQuadIndex,
            dropShadowQuadIndex,
        } = drawFrameContent({
            pass,
            frame,
            characterTextures,
            gridLabelTextures,
            characterLabelTextures,
            quadRenderer,
            gridQuadRenderer,
            outlineQuadRenderer,
            dropShadowQuadRenderer,
            gridLineRenderer,
            lineRenderer,
            gridLineRange,
            characterLineRange,
            pixelRatio: devicePixelRatio,
            quadIndex,
            outlineQuadIndex,
            dropShadowQuadIndex,
        }));

        pass.end();
        this.device.queue.submit([encoder.finish()]);
    }

    private configure(widthPx: number, heightPx: number) {
        const canvasWidthPx = Math.max(1, Math.round(widthPx * devicePixelRatio));
        const canvasHeightPx = Math.max(1, Math.round(heightPx * devicePixelRatio));

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

    private unconfigureContext() {
        const context = this.context as (
            GPUCanvasContext
            & {
                unconfigure?: () => void,
            }
        ) | null;

        context?.unconfigure?.();
    }
}
