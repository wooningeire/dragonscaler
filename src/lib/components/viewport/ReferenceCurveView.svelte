<script lang="ts">
import type { ReferenceCurve } from "$lib/types/ReferenceCurve.svelte";

let {
    referenceCurve,
    aspectRatio,
}: {
    referenceCurve: ReferenceCurve,
    aspectRatio: number,
} = $props();

const d = $derived.by(() => {
    if (referenceCurve.points.length === 0) return "";

    let d = `M${referenceCurve.points[0].x},${referenceCurve.points[0].y}`;

    for (let i = 1; i < referenceCurve.points.length; i++) {
        d += `L${referenceCurve.points[i].x},${referenceCurve.points[i].y}`;
    }

    return d;
});
</script>


<svg viewBox="0 0 {aspectRatio} 1">
    <path
        {d}
        stroke="#000"
        stroke-width="0.01"
        stroke-linecap="round"
    />
</svg>
