<script lang="ts">
import type { TransitionConfig } from "svelte/transition";
import { circOut } from "svelte/easing";

import CharacterEditMenu from "./CharacterEditMenu.svelte";
import CharacterCarousel from "./CharacterCarousel.svelte";

import { store } from "$lib/types/Store.svelte";

const grow = (
    node: HTMLElement,
    params: {
        delay?: number,
        duration?: number,
        easing?: (t: number) => number,
    } = {},
): TransitionConfig => {
    const height = node.getBoundingClientRect().height;

    return {
        delay: params.delay ?? 0,
        duration: params.duration ?? 200,
        easing: params.easing ?? circOut,
        css: t => `\
height: ${height * t}px;
opacity: ${t};
--scale: ${t};
pointer-events: none;
user-select: none;`,
    };
};


let bottomDockHeightPx = $state(0);

$effect(() => {
    store.camera.viewportInsetsPx.bottom = bottomDockHeightPx;
});
</script>

<overlays-bottom-dock bind:clientHeight={bottomDockHeightPx}>
    {#if store.characterManager.editingCharacter !== null}
        <character-edit-menu-container transition:grow>
            <CharacterEditMenu />
        </character-edit-menu-container>
    {/if}

    <CharacterCarousel />
</overlays-bottom-dock>


<style lang="scss">
$dock-bg-col: oklch(0.8 0.05 140 / 0.5);

overlays-bottom-dock {
    grid-area: 2/1;

    display: flex;
    flex-direction: column;
    align-items: stretch;

    pointer-events: auto;

    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;

    background: $dock-bg-col;
}

character-edit-menu-container {
    --scale: 1;

    display: flex;
    justify-content: center;

    margin: calc(2em * var(--scale)) 0;
}

@media (max-width: 48rem) {
    character-edit-menu-container {
        margin: calc(0.75rem * var(--scale)) 0;
    }
}
</style>
