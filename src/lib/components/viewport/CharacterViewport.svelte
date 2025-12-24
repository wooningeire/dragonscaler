<script lang="ts">
import { untrack } from "svelte";
import { store } from "$lib/types/Store.svelte";
import Draggable from "../generic/Draggable.svelte";
import CharacterDisplay from "./CharacterDisplay.svelte";
import DynamicGrid from "./DynamicGrid.svelte";

$effect(() => {
    const selected = store.characterManager.selectedCharacter;
    untrack(() => {
        if (selected) {
            const index = store.characterManager.characters.indexOf(selected);
            if (index !== -1) {
                const pos = store.centeredCameraPosition(index);
                store.camera.posMeters.x = pos.x;
                store.camera.posMeters.y = pos.y;
                store.camera.scalePxPerMeter = pos.scalePxPerMeter;
            }
        }
    });
});

</script>

<Draggable
    onDrag={({movement, button}) => {
        if (button !== 1) return;
        store.camera.posMeters.x -= movement.x / store.camera.scalePxPerMeter;
        store.camera.posMeters.y += movement.y / store.camera.scalePxPerMeter;
    }}
>
    {#snippet dragTarget({onpointerdown})}
        <div
            class="character-viewport"
            style:--viewport-scale={store.camera.scalePxPerMeter}
            style:--pos-x={store.camera.posMeters.x}
            style:--pos-y={store.camera.posMeters.y}
            {onpointerdown}
            onwheel={event => {
                const rect = event.currentTarget.getBoundingClientRect();
                const mouseX = event.clientX - rect.left - store.camera.viewportDimsPx.width * 0.5;
                const mouseY = event.clientY - rect.top - store.camera.viewportDimsPx.height * 0.5;
                
                const worldX = store.camera.posMeters.x + mouseX / store.camera.scalePxPerMeter;
                const worldY = store.camera.posMeters.y - mouseY / store.camera.scalePxPerMeter;
                
                const scaleFac = 2 ** (-event.deltaY * 0.0005);
                store.camera.scalePxPerMeter *= scaleFac;
                
                store.camera.posMeters.x = worldX - mouseX / store.camera.scalePxPerMeter;
                store.camera.posMeters.y = worldY + mouseY / store.camera.scalePxPerMeter;
            }}

            bind:clientWidth={null, width => store.camera.viewportDimsPx.width = width!}
            bind:clientHeight={null, height => store.camera.viewportDimsPx.height = height!}
        >
            <DynamicGrid />

            <div
                class="viewport"
            >
                {#each store.characterManager.characters.toReversed() as character, i}
                    <CharacterDisplay
                        {character}
                        x={store.characterManager.positionsX.at(-i - 1)!}
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
    transform: translate(calc(var(--pos-x) * var(--viewport-scale) * -1px), calc(var(--pos-y) * var(--viewport-scale) * 1px)) translate(50vw, 50vh);
    transform-origin: 50% 50%;
}
</style>