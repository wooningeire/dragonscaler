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
let renderer: WebGpuViewportRenderer | null = $state(null);

WebGpuViewportRenderer.mount({
    getCanvas: () => canvas,
})
    .then(result => renderer = result);


$effect(() => {
    renderer?.render(frame);
});
</script>

<canvas bind:this={canvas}></canvas>

<style lang="scss">
canvas {
    width: 100%;
    height: 100%;

    pointer-events: none;
}
</style>
