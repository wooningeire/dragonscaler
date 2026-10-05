import { GPU_BUFFER_USAGE } from "./constants";
import type { LineVertexRange } from "./types";
import { nextPowerOfTwo } from "./utils";

export class WebGpuLineRenderer {
    private buffer: GPUBuffer | null = null;
    private bufferByteCapacity = 0;

    constructor(
        private readonly device: GPUDevice,
        private readonly pipeline: GPURenderPipeline,
    ) {}

    destroy() {
        this.buffer?.destroy();
    }

    writeVertices(vertices: Float32Array) {
        const requiredByteCount = vertices.byteLength;
        if (requiredByteCount === 0) return;

        if (
            this.buffer === null
            || this.bufferByteCapacity < requiredByteCount
        ) {
            this.buffer?.destroy();
            this.bufferByteCapacity = nextPowerOfTwo(requiredByteCount);
            this.buffer = this.device.createBuffer({
                size: this.bufferByteCapacity,
                usage:
                    GPU_BUFFER_USAGE.vertex
                    | GPU_BUFFER_USAGE.copyDst,
            });
        }

        this.device.queue.writeBuffer(
            this.buffer,
            0,
            vertices,
        );
    }

    drawRange(
        pass: GPURenderPassEncoder,
        range: LineVertexRange,
    ) {
        if (this.buffer === null || range.vertexCount === 0) return;

        pass.setPipeline(this.pipeline);
        pass.setVertexBuffer(0, this.buffer);
        pass.draw(
            range.vertexCount,
            1,
            range.firstVertex,
        );
    }
}
