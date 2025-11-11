<script lang="ts">
import { CharacterManager } from "$lib/types/CharacterManager.svelte";
import CharacterDisplay from "./CharacterDisplay.svelte";

const {
    characterManager,
}: {
    characterManager: CharacterManager,
} = $props();

const PX_PER_M = 144;
</script>

<div
    class="character-viewport"
    style:--scale={PX_PER_M}
>
    <div
        class="viewport"
    >
        {#each characterManager.characters as character, i}
            <CharacterDisplay
                {character}
                x={characterManager.offsetsX[i]}
                y={0}
            />
        {/each}
    </div>
</div>

<style lang="scss">
.character-viewport {
    grid-area: 1/1;

    display: grid;
    place-items: stretch;

    overflow: hidden;

    background:
        repeating-linear-gradient(
            to right,
            oklch(0.95 0.04 120) 0,
            oklch(0.95 0.04 120) 1px,
            oklch(0 0 0 / 0) 1px,
            oklch(0 0 0 / 0) calc(var(--scale) * 1px),
        ),
        repeating-linear-gradient(
            to bottom,
            oklch(0.95 0.04 120) 0,
            oklch(0.95 0.04 120) 1px,
            oklch(0 0 0 / 0) 1px,
            oklch(0 0 0 / 0) calc(var(--scale) * 1px),
        );
}

.viewport {
    position: relative;
}
</style>