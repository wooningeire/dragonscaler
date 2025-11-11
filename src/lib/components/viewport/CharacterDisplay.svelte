<script lang="ts">
    import type { Character } from "$lib/types/Character.svelte";
import type { ReferenceCurve } from "$lib/types/ReferenceCurve.svelte";
import ReferenceCurveView from "./ReferenceCurveView.svelte";

let {
    character,
    x,
    y,
}: {
    character: Character,
    x: number,
    y: number,
} = $props();

</script>

<div
    class="character-display"
    style:--x={x}
    style:--y={y}
    style:--height={character.referenceCurve.scaleFac}
>
    {#if character.image !== null}
        <img
            src={character.image.src}
            alt={character.name}
        />
    {:else}
        <div class="image-placeholder"></div>
    {/if}

    <ReferenceCurveView
        referenceCurve={character.referenceCurve}
        aspectRatio={character.aspect}
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
    > img,
    > .image-placeholder {
        height: calc(var(--height) * var(--scale) * 1px);
    }
}

.image-placeholder {
    background: oklch(0.9 0 0);
}
</style>