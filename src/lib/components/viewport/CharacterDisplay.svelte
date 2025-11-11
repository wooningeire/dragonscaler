<script lang="ts">
import type { ReferenceCurve } from "$lib/types/ReferenceCurve.svelte";
import type { Character } from "../../types/Character.svelte";
import ReferenceCurveView from "./ReferenceCurveView.svelte";

let {
    referenceCurve,
    imageSrc,
    name,
    aspectRatio,
    x,
    y,
}: {
    referenceCurve: ReferenceCurve,
    imageSrc: string,
    name: string,
    aspectRatio: number,
    x: number,
    y: number,
} = $props();
</script>

<div
    class="character-display"
    style:--x={x}
    style:--y={y}
    style:--height={referenceCurve.scaleFac}
>
    <img
        src={imageSrc}
        alt={name}
    />

    <ReferenceCurveView
        {referenceCurve}
        {aspectRatio}
    />
</div>

<style lang="scss">
.character-display {
    position: absolute;
    left: calc(var(--x) * var(--scale) * 1px);
    display: grid;

    > :global(*) {
        grid-area: 1/1;
    }

    &,
    > img {
        height: calc(var(--height) * var(--scale) * 1px);
    }
}

svg {
    overflow: visible;
}
</style>