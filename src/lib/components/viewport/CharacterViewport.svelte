<script lang="ts">
import { CharacterManager } from "$lib/types/CharacterManager.svelte";
    import Draggable from "../generic/Draggable.svelte";
    import { Camera2d } from "./Camera2d.svelte";
import CharacterDisplay from "./CharacterDisplay.svelte";
    import DynamicGrid from "./DynamicGrid.svelte";

const {
    characterManager,
}: {
    characterManager: CharacterManager,
} = $props();

const camera = new Camera2d();
</script>

<Draggable
    onDrag={({movement, button}) => {
        if (button !== 1) return;
        camera.posMeters.x -= movement.x / camera.scalePxPerMeter;
        camera.posMeters.y += movement.y / camera.scalePxPerMeter;
    }}
>
    {#snippet dragTarget({onpointerdown})}
        <div
            class="character-viewport"
            style:--scale={camera.scalePxPerMeter}
            style:--pos-x={camera.posMeters.x}
            style:--pos-y={camera.posMeters.y}
            {onpointerdown}
            onwheel={event => {
                const rect = event.currentTarget.getBoundingClientRect();
                const mouseX = event.clientX - rect.left - camera.viewportDimsPx.width * 0.5;
                const mouseY = event.clientY - rect.top - camera.viewportDimsPx.height * 0.5;
                
                const worldX = camera.posMeters.x + mouseX / camera.scalePxPerMeter;
                const worldY = camera.posMeters.y - mouseY / camera.scalePxPerMeter;
                
                const scaleFac = 2 ** (-event.deltaY * 0.0005);
                camera.scalePxPerMeter *= scaleFac;
                
                camera.posMeters.x = worldX - mouseX / camera.scalePxPerMeter;
                camera.posMeters.y = worldY + mouseY / camera.scalePxPerMeter;
            }}

            bind:clientWidth={null, width => camera.viewportDimsPx.width = width!}
            bind:clientHeight={null, height => camera.viewportDimsPx.height = height!}
        >
            <DynamicGrid {camera} />

            <div
                class="viewport"
            >
                {#each characterManager.characters as character, i}
                    <CharacterDisplay
                        {character}
                        {characterManager}
                        x={characterManager.offsetsX[i] * characterManager.overlapFac}
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

    display: grid;
    place-items: stretch;
    
    > :global(*) {
        grid-area: 1/1;
    }
}

.viewport {
    transform: translate(calc(var(--pos-x) * var(--scale) * -1px), calc(var(--pos-y) * var(--scale) * 1px)) translate(50vw, 50vh);
    transform-origin: 50% 50%;
}
</style>