<script lang="ts">
import type { Camera2d } from "./Camera2d.svelte";
import { GridlineWeight, type Gridline } from "./Gridline";

const {
    camera,
}: {
    camera: Camera2d,
} = $props();

const gridlineStepMeters = $derived(2 ** Math.round(-Math.log2(camera.scalePxPerMeter / 144)));

const gridlinesX = $derived.by(() => {
    let xMeters = Math.floor(camera.screenBoundsMeters.left / gridlineStepMeters) * gridlineStepMeters;
    const out: Gridline[] = [];
    do {
        out.push({
            offsetPx: camera.xMetersAsScreenPx(xMeters),
            coordMeters: xMeters,
            weight: GridlineWeight.Light,
        });
        xMeters += gridlineStepMeters;
    } while (xMeters < camera.screenBoundsMeters.right);
    return out;
});

const gridlinesY = $derived.by(() => {
    let yMeters = Math.floor(camera.screenBoundsMeters.bottom / gridlineStepMeters) * gridlineStepMeters;
    const out: Gridline[] = [];
    do {
        out.push({
            offsetPx: camera.yMetersAsScreenPx(yMeters),
            coordMeters: yMeters,
            weight: Math.abs(yMeters) < 1e-4 ? GridlineWeight.Origin : GridlineWeight.Strong,
        });
        yMeters += gridlineStepMeters;
    } while (yMeters < camera.screenBoundsMeters.top);
    return out;
});
</script>

<div class="dynamic-grid">
    {#each gridlinesX as gridline}
        <div
            class="gridline x"
            style:--offset="{gridline.offsetPx}px"
        ></div>
    {/each}

    {#each gridlinesY as gridline}
        <div
            class="gridline y"
            class:origin={gridline.weight === GridlineWeight.Origin}
            style:--offset="{gridline.offsetPx}px"
        ></div>

        {#if gridline.weight !== GridlineWeight.Light}
            <div
                class="gridline-label-y"
                style:--offset="{gridline.offsetPx}px"
            >{gridline.coordMeters} m</div>
        {/if}
    {/each}
</div>

<style lang="scss">
.dynamic-grid {
    position: relative;
}

.gridline {
    position: absolute;
    width: 100%;
    height: 100%;

    background: oklch(0.9 0.06 130);

    --stroke-weight: 2px;

    &.origin {
        background: oklch(0.7 0.08 150);

        --stroke-weight: 4px;
    }

    &.x {
        left: var(--offset);
        width: var(--stroke-weight);

        transform: translateX(-50%);
    }

    &.y {
        bottom: var(--offset);
        height: var(--stroke-weight);

        transform: translateY(50%);
    }
}

.gridline-label-y {
    padding: 0.5rem;
    position: absolute;
    bottom: var(--offset);

}
</style>