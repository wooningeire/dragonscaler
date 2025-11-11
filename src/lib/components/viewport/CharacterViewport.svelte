<script lang="ts">
import { CharacterManager } from "$lib/types/CharacterManager.svelte";
    import Draggable from "../generic/Draggable.svelte";
import CharacterDisplay from "./CharacterDisplay.svelte";

const {
    characterManager,
}: {
    characterManager: CharacterManager,
} = $props();

let scale = $state(144);
let pos = $state({x: 0, y: 0});
</script>

<Draggable
    onDrag={({movement, button}) => {
        if (button !== 1) return;
        pos.x += movement.x;
        pos.y += movement.y;
    }}
>
    {#snippet dragTarget({onpointerdown})}
        <div
            class="character-viewport"
            style:--scale={scale}
            style:--pos-x={pos.x}
            style:--pos-y={pos.y}
            {onpointerdown}
            onwheel={event => {
                scale *= 2 ** (-event.deltaY * 0.0005);
            }}
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
    {/snippet}
</Draggable>

<style lang="scss">
.character-viewport {
    grid-area: 1/1;

    position: relative;
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
    transform: translate(calc(var(--pos-x) * 1px), calc(var(--pos-y) * 1px)) translateY(60vh);
    transform-origin: 50% 50%;
}
</style>