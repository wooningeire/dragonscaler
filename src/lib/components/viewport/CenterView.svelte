<script lang="ts">
import type { Point } from "$lib/types/Point";
import Draggable from "$lib/components/generic/Draggable.svelte";

const {
    center,
    scaleFac,
    aspect,
    onCenterChange,
}: {
    center: Point,
    scaleFac: number,
    aspect: number,
    onCenterChange: (point: Point) => void,
} = $props();

let container: HTMLDivElement = $state()!;
</script>

<Draggable
    onDown={({button, pointerEvent}) => {
        if (button !== 0) return;
        
        pointerEvent.preventDefault();
        
        (pointerEvent.currentTarget as HTMLElement).requestPointerLock();
    }}
    onDrag={({movement, button, pointerEvent}) => {
        if (button !== 0 || !container) return;
        
        pointerEvent.preventDefault();
        
        const dx = movement.x / aspect * 0.01;
        const dy = -movement.y * 0.01;
        
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
            bind:this={container}
            class="center-container"
        >
            <div
                class="center-control"
                style:--center-x={center.x}
                style:--center-y={center.y}
                style:--scale-fac={scaleFac}
                {onpointerdown}
            ></div>
        </div>
    {/snippet}
</Draggable>

<style lang="scss">
.center-container {
    grid-area: 1/1;
    position: relative;
    width: 100%;
    height: 100%;
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

    transform: scale(var(--scale-fac)) translate(-50%, -50%);
    cursor: move;

    &:hover {
        background: oklch(0.3 0 0);
    }
}
</style>