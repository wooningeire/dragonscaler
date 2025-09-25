<script lang="ts">
import type { Character } from "./Character.svelte";
import CharacterDisplay from "./CharacterDisplay.svelte";

let {
    characters,
}: {
    characters: Character[],
} = $props();


const PX_PER_M = 144;

const offsets = $derived.by(() => {
    const offsets: number[] = [0];

    for (let i = 1; i < characters.length; i++) {
        offsets.push(offsets[i - 1] + characters[i - 1].actualWidth);
    }

    return offsets;
});
</script>

<div class="character-viewer">
    <div
        class="viewport"
        style:--scale="{PX_PER_M}px"
    >
        {#each characters as character, i}
            <CharacterDisplay
                {character}
                x={offsets[i]}
                y={0}
                referenceScale={PX_PER_M}
            />
        {/each}
    </div>
</div>

<style lang="scss">
.character-viewer {
    grid-area: 1/1;

    display: grid;
    place-items: stretch;

    overflow: hidden;
}

.viewport {
    position: relative;

    background:
        repeating-linear-gradient(
            to right,
            oklch(0.95 0.04 120) 0,
            oklch(0.95 0.04 120) 1px,
            oklch(0 0 0 / 0) 1px,
            oklch(0 0 0 / 0) var(--scale),
        ),
        repeating-linear-gradient(
            to bottom,
            oklch(0.95 0.04 120) 0,
            oklch(0.95 0.04 120) 1px,
            oklch(0 0 0 / 0) 1px,
            oklch(0 0 0 / 0) var(--scale),
        );
}
</style>