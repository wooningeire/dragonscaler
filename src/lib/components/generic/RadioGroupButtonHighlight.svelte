<script lang="ts">
const transitionEasing = "cubic-bezier(0, 0.5, 0.5, 1)";
const defaultTransitionDurationMs = 500;
const optionGapRem = 0.125;
const squashStretchRatio = 2;
const recoilStretchRatio = 1.1;

let {
    optionCount,
    selectedIndex,
    transitionDurationMs = defaultTransitionDurationMs,
}: {
    optionCount: number,
    selectedIndex: number,
    transitionDurationMs?: number,
} = $props();

const visible = $derived(selectedIndex >= 0);
const lastOptionIndex = $derived(Math.max(
    0,
    optionCount - 1,
));
const clampedSelectedIndex = $derived(Math.min(
    lastOptionIndex,
    Math.max(
        0,
        selectedIndex,
    ),
));
const initialSelectedIndex = () => clampedSelectedIndex;

let motionKey = $state(0);
let motionFromIndex = $state(initialSelectedIndex());
let motionToIndex = $state(initialSelectedIndex());

const motionMidpointIndex = $derived((motionFromIndex + motionToIndex) / 2);
const selectedIndexPercent = $derived(`${motionToIndex * 100}%`);
const selectedGapOffset = $derived(`${motionToIndex * optionGapRem}rem`);
const motionFromIndexPercent = $derived(`${motionFromIndex * 100}%`);
const motionFromGapOffset = $derived(`${motionFromIndex * optionGapRem}rem`);
const motionMidpointIndexPercent = $derived(`${motionMidpointIndex * 100}%`);
const motionMidpointGapOffset = $derived(`${motionMidpointIndex * optionGapRem}rem`);
const transitionDuration = $derived(`${transitionDurationMs}ms`);
const stretchScale = $derived(`${squashStretchRatio}`);
const squashScale = $derived(`${1 / squashStretchRatio}`);
const recoilStretchScale = $derived(`${recoilStretchRatio}`);
const recoilSquashScale = $derived(`${1 / recoilStretchRatio}`);

$effect(() => {
    const nextIndex = clampedSelectedIndex;

    if (nextIndex === motionToIndex) return;

    motionFromIndex = motionToIndex;
    motionToIndex = nextIndex;
    motionKey += 1;
});
</script>

<radio-group-button-highlight
    class:visible
    style:--radio-group-highlight-option-count={optionCount}
    style:--radio-group-highlight-selected-index-percent={selectedIndexPercent}
    style:--radio-group-highlight-selected-gap-offset={selectedGapOffset}
    style:--radio-group-highlight-motion-from-index-percent={motionFromIndexPercent}
    style:--radio-group-highlight-motion-from-gap-offset={motionFromGapOffset}
    style:--radio-group-highlight-motion-midpoint-index-percent={motionMidpointIndexPercent}
    style:--radio-group-highlight-motion-midpoint-gap-offset={motionMidpointGapOffset}
    style:--radio-group-highlight-transition-duration={transitionDuration}
    style:--radio-group-highlight-transition-easing={transitionEasing}
    style:--radio-group-highlight-stretch-scale={stretchScale}
    style:--radio-group-highlight-squash-scale={squashScale}
    style:--radio-group-highlight-recoil-stretch-scale={recoilStretchScale}
    style:--radio-group-highlight-recoil-squash-scale={recoilSquashScale}
>
    {#key motionKey}
        <radio-group-button-highlight-knob>
            <radio-group-button-highlight-surface></radio-group-button-highlight-surface>
        </radio-group-button-highlight-knob>
    {/key}
</radio-group-button-highlight>

<style lang="scss">
$highlight-gap: 0.125rem;


radio-group-button-highlight {
    grid-area: 1/1;
    align-self: stretch;
    justify-self: stretch;
    z-index: 0;

    display: grid;
    grid-template-columns: repeat(var(--radio-group-highlight-option-count), minmax(2.25rem, 1fr));
    grid-template-rows: minmax(0, 1fr);
    gap: $highlight-gap;
    min-width: 0;
    height: 100%;

    pointer-events: none;
    opacity: 0;

    transition: opacity 0.12s ease;

    &.visible {
        opacity: 1;
    }
}

radio-group-button-highlight-knob {
    grid-column: 1;
    grid-row: 1;
    align-self: stretch;
    justify-self: stretch;

    display: grid;
    grid-template-rows: minmax(0, 1fr);
    min-width: 0;
    height: 100%;

    translate:
        calc(
            var(--radio-group-highlight-selected-index-percent)
            + var(--radio-group-highlight-selected-gap-offset)
        )
        0;

    animation:
        radio-group-highlight-move
        var(--radio-group-highlight-transition-duration)
        var(--radio-group-highlight-transition-easing);
}

radio-group-button-highlight-surface {
    grid-area: 1/1;

    display: block;
    width: 100%;
    min-width: 0;
    height: 100%;

    border-radius: 0.375rem;
    background: oklch(0.86 0.08 145 / 0.9);
    box-shadow: 0 0.125rem 0.5rem oklch(0.45 0.08 145 / 0.2);

    scale: 1;
    transform-origin: center;

    animation:
        radio-group-horizontal-squash
        var(--radio-group-highlight-transition-duration)
        var(--radio-group-highlight-transition-easing);
}

@keyframes radio-group-highlight-move {
    0% {
        translate:
            calc(
                var(--radio-group-highlight-motion-from-index-percent)
                + var(--radio-group-highlight-motion-from-gap-offset)
            )
            0;
    }

    0.1% {
        translate:
            calc(
                var(--radio-group-highlight-motion-midpoint-index-percent)
                + var(--radio-group-highlight-motion-midpoint-gap-offset)
            )
            0;
    }

    12.5% {
        translate:
            calc(
                var(--radio-group-highlight-selected-index-percent)
                + var(--radio-group-highlight-selected-gap-offset)
            )
            0;
    }

    25% {
        translate:
            calc(
                var(--radio-group-highlight-selected-index-percent)
                + var(--radio-group-highlight-selected-gap-offset)
            )
            0;
    }

    100% {
        translate:
            calc(
                var(--radio-group-highlight-selected-index-percent)
                + var(--radio-group-highlight-selected-gap-offset)
            )
            0;
    }
}

@keyframes radio-group-horizontal-squash {
    0% {
        scale: 1;
    }

    0.1% {
        scale:
            var(--radio-group-highlight-stretch-scale)
            var(--radio-group-highlight-squash-scale);
    }

    12.5% {
        scale:
            var(--radio-group-highlight-stretch-scale)
            var(--radio-group-highlight-squash-scale);
    }

    25% {
        scale:
            var(--radio-group-highlight-recoil-stretch-scale)
            var(--radio-group-highlight-recoil-squash-scale);
    }

    100% {
        scale: 1;
    }
}
</style>
