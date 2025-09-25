<script lang="ts">
import type { Character } from "./Character.svelte";

let {
    character,
    x,
    y,
    referenceScale,
}: {
    character: Character,
    x: number,
    y: number,
    referenceScale: number,
} = $props();
</script>

<div
    class="character-display"
    style:--reference-scale={referenceScale}
    style:--x={x}
    style:--y={y}
    style:--height={character.referenceCurve.scaleFac}
>
    <img
        src={character.imageSrc}
        alt={character.name}
    />
</div>

<style lang="scss">
.character-display {
    position: absolute;

    left: calc(var(--x) * var(--reference-scale) * 1px);

    --el-height: calc(var(--height) * var(--reference-scale) * 1px);

    &,
    > img {
        height: var(--el-height);
    }
}
</style>