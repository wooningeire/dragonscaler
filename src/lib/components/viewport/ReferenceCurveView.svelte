<script lang="ts">
    import type { Point } from "$lib/types/Point";
import type { ReferenceCurve } from "$lib/types/ReferenceCurve.svelte";
import Draggable from "../generic/Draggable.svelte";

let {
    referenceCurve,
    aspect,
    editable = false,
    onDraw,
}: {
    referenceCurve: ReferenceCurve,
    aspect: number,
    editable?: boolean,
    onDraw?: (points: Point[]) => void,
} = $props();

const dFromPoints = (points: Point[]) => {
    if (points.length === 0) return "";

    let d = `M${points[0].x},${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
        d += `L${points[i].x},${points[i].y}`;
    }

    return d;
};

const d = $derived(dFromPoints(referenceCurve.points));

let newPoints = $state<Point[]>([]);
let editing = $state(false);
const dNew = $derived(dFromPoints(newPoints));

let svg: SVGElement = $state()!;
const getCoordinatesFromEvent = (event: PointerEvent): Point | null => {
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * aspect;
    const y = (event.clientY - rect.top) / rect.height;
    
    return { x, y };
};
</script>

{#if !editable}
    <svg viewBox="0 0 {aspect} 1">
        <path
            {d}
            stroke="#000"
            stroke-width="0.01"
            stroke-linecap="round"
            fill="#0000"
        />
    </svg>
{:else}
    <Draggable
        onDown={({button, pointerEvent}) => {
            if (button !== 0) return;
            const coords = getCoordinatesFromEvent(pointerEvent);
            if (!coords) return;
            
            editing = true;
            newPoints.push(coords);
        }}
        onDrag={({pointerEvent}) => {
            if (!editing) return;
            const coords = getCoordinatesFromEvent(pointerEvent);
            if (!coords) return;
            
            newPoints.push(coords);
        }}
        onUp={() => {
            if (!editing) return;

            onDraw?.(newPoints);

            editing = false;
            newPoints = [];
        }}
    >
        {#snippet dragTarget({onpointerdown})}
            <svg
                bind:this={svg}
                viewBox="0 0 {aspect} 1"
                {onpointerdown}
            >
                {#if !editing}
                    <path
                        {d}
                        stroke="#000"
                        stroke-width="0.01"
                        stroke-linecap="round"
                        fill="#0000"
                    />
                {:else}
                    <path
                        d={dNew}
                        stroke="#0000003f"
                        stroke-width="0.01"
                        stroke-linecap="round"
                        fill="#0000"
                    />
                {/if}
            </svg>
        {/snippet}
    </Draggable>
{/if}

<style lang="scss">
svg {
    overflow: visible;
}
</style>