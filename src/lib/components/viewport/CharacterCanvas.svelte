<script lang="ts">
import { onDestroy, onMount } from "svelte";
import type { CharacterRenderFrame } from "./characterRenderModel";
import {
    WebGpuViewportRenderer,
    type WebGpuRendererStatus,
} from "./WebGpuViewportRenderer";

let {
    frame,
}: {
    frame: CharacterRenderFrame,
} = $props();

let canvas: HTMLCanvasElement = $state()!;
let renderer: WebGpuViewportRenderer | null = null;
let rendererStatus: WebGpuRendererStatus = $state("initializing");

onMount(() => {
    renderer = new WebGpuViewportRenderer(
        canvas,
        status => rendererStatus = status,
    );
    void renderer.initialize();
});

onDestroy(() => {
    renderer?.destroy();
    renderer = null;
});

$effect(() => {
    renderer?.render(frame);
});
</script>

<canvas
    bind:this={canvas}
    data-renderer="webgpu"
    data-webgpu-status={rendererStatus}
></canvas>

<style lang="scss">
canvas {
    width: 100%;
    height: 100%;

    pointer-events: none;
}
</style>
