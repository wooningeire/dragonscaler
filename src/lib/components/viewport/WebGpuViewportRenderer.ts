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
import { WebGpuQuadRenderer } from "./webgpu/quadRenderer";
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

export class WebGpuViewportRenderer {
    private adapter: GPUAdapter | null = null;
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private format: GPUTextureFormat | null = null;
    private pipelines: WebGpuPipelines | null = null;
    private sampler: GPUSampler | null = null;
    private quadRenderer: WebGpuQuadRenderer | null = null;
    private gridQuadRenderer: WebGpuQuadRenderer | null = null;
    private outlineQuadRenderer: WebGpuQuadRenderer | null = null;
    private dropShadowQuadRenderer: WebGpuQuadRenderer | null = null;
    private gridLineRenderer: WebGpuLineRenderer | null = null;
    private lineRenderer: WebGpuLineRenderer | null = null;
    private textureResources: WebGpuTextureResources | null = null;
    private latestFrame: CharacterRenderFrame | null = null;
    private renderLoopRunning = false;
    private status: WebGpuRendererStatus = "initializing";
    private configuredWidthPx = 0;
    private configuredHeightPx = 0;
    private readonly pixelRatio = window.devicePixelRatio || 1;
    private destroyed = false;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly onStatusChange: (status: WebGpuRendererStatus) => void = () => {},
    ) {}

    async initialize() {
        if (this.destroyed) return;

        this.setStatus("initializing");

        if (!("gpu" in navigator)) {
            this.setStatus("unavailable");
            return;
        }

        let adapter: GPUAdapter | null = null;
        try {
            adapter = await navigator.gpu.requestAdapter();
        } catch {
            this.setStatus("unavailable");
            return;
        }

        if (this.destroyed) return;

        this.adapter = adapter;
        if (this.adapter === null) {
            this.setStatus("unavailable");
            return;
        }

        let device: GPUDevice | null = null;
        try {
            device = await this.adapter.requestDevice();
        } catch {
            this.setStatus("unavailable");
            return;
        }

        if (this.destroyed) {
            device.destroy();
            return;
        }

        this.device = device;
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
        this.pipelines = createWebGpuPipelines(
            this.device,
            this.format,
        );
        this.quadRenderer = new WebGpuQuadRenderer(
            this.device,
            this.pipelines.quadPipeline,
        );
        this.gridQuadRenderer = new WebGpuQuadRenderer(
            this.device,
            this.pipelines.gridQuadPipeline,
        );
        this.outlineQuadRenderer = new WebGpuQuadRenderer(
            this.device,
            this.pipelines.outlineQuadPipeline,
        );
        this.dropShadowQuadRenderer = new WebGpuQuadRenderer(
            this.device,
            this.pipelines.dropShadowQuadPipeline,
        );
        this.gridLineRenderer = new WebGpuLineRenderer(
            this.device,
            this.pipelines.gridLinePipeline,
        );
        this.lineRenderer = new WebGpuLineRenderer(
            this.device,
            this.pipelines.linePipeline,
        );
        this.textureResources = new WebGpuTextureResources(
            this.device,
            this.pipelines.quadPipeline,
            this.sampler,
            this.pixelRatio,
        );

        await loadTextFonts();
        if (this.destroyed) return;

        this.setStatus("ready");
        this.queueLatestFrame();
    }

    render(frame: CharacterRenderFrame) {
        if (this.destroyed) return;

        this.latestFrame = frame;
        this.queueLatestFrame();
    }

    destroy() {
        if (this.destroyed) return;

        this.destroyed = true;
        this.status = "unavailable";
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
        this.adapter = null;
        this.device = null;
        this.context = null;
        this.format = null;
        this.pipelines = null;
        this.sampler = null;
        this.quadRenderer = null;
        this.gridQuadRenderer = null;
        this.outlineQuadRenderer = null;
        this.dropShadowQuadRenderer = null;
        this.gridLineRenderer = null;
        this.lineRenderer = null;
        this.textureResources = null;
        this.configuredWidthPx = 0;
        this.configuredHeightPx = 0;
    }

    private queueLatestFrame() {
        if (this.renderLoopRunning) return;
        if (this.latestFrame === null) return;
        if (this.status !== "ready") return;

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

        if (
            this.device === null
            || this.context === null
            || this.format === null
            || this.quadRenderer === null
            || this.gridQuadRenderer === null
            || this.outlineQuadRenderer === null
            || this.dropShadowQuadRenderer === null
            || this.gridLineRenderer === null
            || this.lineRenderer === null
            || this.textureResources === null
        ) {
            return;
        }

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
            pixelRatio: this.pixelRatio,
            quadIndex,
            outlineQuadIndex,
            dropShadowQuadIndex,
        }));

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

    private unconfigureContext() {
        const context = this.context as (
            GPUCanvasContext
            & {
                unconfigure?: () => void,
            }
        ) | null;

        context?.unconfigure?.();
    }

    private setStatus(status: WebGpuRendererStatus) {
        if (this.destroyed) return;

        this.status = status;
        this.onStatusChange(status);
    }
}
