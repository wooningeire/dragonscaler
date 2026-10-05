<script lang="ts">
import { onDestroy, onMount } from "svelte";
import type { CharacterRenderFrame } from "./characterRenderModel";
import {
    GpuViewportManager,
    type WebGpuRendererStatus,
} from "./GpuViewportManager";

let {
    frame,
}: {
    frame: CharacterRenderFrame,
} = $props();

let canvas: HTMLCanvasElement = $state()!;
let manager: GpuViewportManager | null = $state(null);

GpuViewportManager.mount({
    getCanvas: () => canvas,
})
    .then(result => manager = result);


$effect(() => {
    manager?.render(frame);
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
