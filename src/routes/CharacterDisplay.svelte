<script lang="ts">
import type { Character } from "../lib/types/Character.svelte";

let {
    character,
    x,
    y,
}: {
    character: Character,
    x: number,
    y: number,
} = $props();

const pathD = $derived.by(() => {
    if (character.referenceCurve.points.length === 0) return "";

    let pathD = `M${character.referenceCurve.points[0].x},${character.referenceCurve.points[0].y}`;

    for (let i = 1; i < character.referenceCurve.points.length; i++) {
        pathD += `L${character.referenceCurve.points[i].x},${character.referenceCurve.points[i].y}`;
    }

    return pathD;
});
</script>

<div
    class="character-display"
    style:--x={x}
    style:--y={y}
    style:--height={character.referenceCurve.scaleFac}
>
    <img
        src={character.imageSrc}
        alt={character.name}
    />

    <svg viewBox="0 0 {character.aspectRatio} 1">
        <path
            d={pathD}
            stroke="#000"
            stroke-width="0.01"
            stroke-linecap="round"
        />
    </svg>
</div>

<style lang="scss">
.character-display {
    position: absolute;
    left: calc(var(--x) * var(--scale) * 1px);
    display: grid;

    > * {
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