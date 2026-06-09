<script lang="ts">
import type { Point } from "$lib/types/Point";
import type { Baseline } from "$lib/types/Baseline.svelte";
import {Draggable} from "@vaie/hui";
import {
    buildBaselinePoints,
    clampBaselinePoint,
    pointsToPathD,
    type BaselineEditMode,
} from "$lib/util/baselineGeometry";

let {
    baseline,
    aspect,
    groundY = 0,
    editable = false,
    editMode = "curve",
    onDraw,
}: {
    baseline: Baseline,
    aspect: number,
    groundY?: number,
    editable?: boolean,
    editMode?: BaselineEditMode,
    onDraw?: (points: Point[]) => void,
} = $props();

const d = $derived(pointsToPathD(baseline.points));

let rawDrawPoints = $state<Point[]>([]);
let editing = $state(false);
const previewPoints = $derived(buildBaselinePoints(
    editMode,
    rawDrawPoints,
    {groundY},
));
const dNew = $derived(pointsToPathD(previewPoints));

let svg: SVGElement = $state()!;
const getCoordinatesFromEvent = (event: PointerEvent): Point | null => {
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * aspect;
    const y = 1 - (event.clientY - rect.top) / rect.height;
    
    return clampBaselinePoint(
        { x, y },
        aspect,
    );
};
</script>

{#if !editable}
    <svg
        viewBox="0 0 {aspect} 1"
    >
        <g>
            <path
                {d}
                stroke="#fff"
                stroke-width={0.01}
                stroke-linecap="square"
                fill="#0000"
            />
            <path
                {d}
                stroke="#000"
                stroke-width={0.003}
                fill="#0000"
            />
        </g>
    </svg>
{:else}
    <Draggable
        onDown={({button, pointerEvent}) => {
            if (button !== 0) return;
            const coords = getCoordinatesFromEvent(pointerEvent);
            if (!coords) return;
            
            editing = true;
            rawDrawPoints = [coords];
        }}
        onDrag={({pointerEvent}) => {
            if (!editing) return;
            const coords = getCoordinatesFromEvent(pointerEvent);
            if (!coords) return;
            
            rawDrawPoints = [
                ...rawDrawPoints,
                coords,
            ];
        }}
        onUp={() => {
            if (!editing) return;

            onDraw?.(buildBaselinePoints(
                editMode,
                rawDrawPoints,
                {groundY},
            ));

            editing = false;
            rawDrawPoints = [];
        }}
    >
        {#snippet dragTarget({onpointerdown})}
            <svg
                bind:this={svg}
                viewBox="0 0 {aspect} 1"
                {onpointerdown}
            >
                <g>
                    {#if !editing}
                        <path
                            {d}
                            stroke="#fff"
                            stroke-width={0.01}
                            stroke-linecap="square"
                            fill="#0000"
                        />
                        <path
                            {d}
                            stroke="#000"
                            stroke-width={0.003}
                            fill="#0000"
                        />
                    {:else}
                        <path
                            d={dNew}
                            stroke="#fff"
                            stroke-width={0.01}
                            stroke-linecap="square"
                            fill="#0000"
                        />
                        <path
                            d={dNew}
                            stroke="#0000003f"
                            stroke-width={0.003}
                            fill="#0000"
                        />
                    {/if}
                </g>
            </svg>
        {/snippet}
    </Draggable>
{/if}

<style lang="scss">
svg {
    opacity: 0.3333333;
    overflow: visible;
}

g {
    transform: translateY(100%) scaleY(-1);
}
</style>
