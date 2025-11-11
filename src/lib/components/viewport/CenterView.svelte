<script lang="ts">
import type { Point } from "$lib/types/Point";
import Draggable from "$lib/components/generic/Draggable.svelte";

const {
    center,
    scaleFac,
    onCenterChange,
}: {
    center: Point,
    scaleFac: number,
    onCenterChange: (point: Point) => void,
} = $props();

let container: HTMLDivElement;
</script>

<div
    class="center-view-container"
    bind:this={container}
>
    <Draggable
        onDown={({button, pointerEvent}) => {
            if (button !== 0) return;
            
            pointerEvent.preventDefault();
        
            (pointerEvent.currentTarget as HTMLElement).requestPointerLock();
        }}
        onDrag={({movement, button, pointerEvent}) => {
            if (button !== 0) return;
            
            pointerEvent.preventDefault();
            
            const rect = container.getBoundingClientRect();
            const dx = movement.x / rect.width;
            const dy = -movement.y / rect.height;

            onCenterChange({
                x: center.x + dx,
                y: center.y + dy,
            });
        }}
        onUp={() => {
            document.exitPointerLock();
        }}
    >
        {#snippet dragTarget({onpointerdown})}
            <div
                class="center-control"
                style:--center-x={center.x}
                style:--center-y={center.y}
                style:--scale-fac={scaleFac}
                {onpointerdown}
            ></div>
        {/snippet}
    </Draggable>
</div>

<style lang="scss">
.center-view-container {
    pointer-events: none;
}

.center-control {
    width: 0.25rem;
    aspect-ratio: 1;

    position: absolute;
    left: calc(var(--center-x) * 100%);
    bottom: calc(var(--center-y) * 100%);
    border-radius: 50%;

    background: oklch(0 0 0);
    box-shadow: 0 0 0 0.0625rem oklch(1 0 0);

    transform: translate(-50%, 50%) scale(var(--scale-fac));
    cursor: move;
    pointer-events: auto;

    &:hover {
        background: oklch(0.3 0 0);
    }
}
</style>