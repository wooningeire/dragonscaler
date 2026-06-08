<script lang="ts">
import { untrack } from "svelte";
import { store } from "$lib/types/Store.svelte";
import {Draggable} from "@vaie/hui";
import CharacterDisplay from "./CharacterDisplay.svelte";
import DynamicGrid from "./DynamicGrid.svelte";

$effect(() => {
    const selected = store.characterManager.selectedCharacter;
    untrack(() => {
        if (selected) {
            const index = store.characterManager.characters.indexOf(selected);
            if (index !== -1) {
                const pos = store.centeredCameraPosition(index);
                store.camera.setPosMetersXWithEase(pos.x);
                store.camera.setPosMetersYWithEase(pos.y);
                store.camera.setScalePxPerMeterWithEase(pos.scalePxPerMeter);
            }
        }
    });
});

</script>

<Draggable
    onDrag={({movement, button}) => {
        if (button !== 1) return;
        store.camera.setPosMetersX(store.camera.posMetersX - movement.x / store.camera.scalePxPerMeter);
        store.camera.setPosMetersY(store.camera.posMetersY + movement.y / store.camera.scalePxPerMeter);
    }}
>
    {#snippet dragTarget({onpointerdown})}
        <div
            class="character-viewport"
            style:--viewport-scale={store.camera.scalePxPerMeter}
            style:--pos-x={store.camera.posMetersX}
            style:--pos-y={store.camera.posMetersY}
            style:--center-x={store.camera.viewportPositionPx.x}
            style:--center-y={store.camera.viewportPositionPx.y}
            {onpointerdown}
            onwheel={event => {
                const mouseX = event.clientX - store.camera.viewportPositionPx.x;
                const mouseY = event.clientY - store.camera.viewportPositionPx.y;
                
                const worldX = store.camera.posMetersX + mouseX / store.camera.scalePxPerMeter;
                const worldY = store.camera.posMetersY - mouseY / store.camera.scalePxPerMeter;
                
                const scaleFac = 2 ** (-event.deltaY * 0.001);
                store.camera.setScalePxPerMeter(store.camera.scalePxPerMeter * scaleFac);
                
                store.camera.setPosMetersX(worldX - mouseX / store.camera.scalePxPerMeter);
                store.camera.setPosMetersY(worldY + mouseY / store.camera.scalePxPerMeter);
            }}
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
    transform: translate(calc(var(--pos-x) * var(--viewport-scale) * -1px), calc(var(--pos-y) * var(--viewport-scale) * 1px)) translate(calc(var(--center-x) * 1px), calc(var(--center-y) * 1px));
    transform-origin: 50% 50%;
}
</style>