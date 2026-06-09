<script lang="ts">
import CharacterCarousel from "./CharacterCarousel.svelte";
import { store } from "$lib/types/Store.svelte";
import Button from "../generic/Button.svelte";
import Slider from "../generic/Slider.svelte";
import type { TransitionConfig } from "svelte/transition";
import { cubicOut } from "svelte/easing";
import CharacterEditMenu from "./CharacterEditMenu.svelte";

let dummyWidth = $state(0);
let dummyHeight = $state(0);
let dummyEl: HTMLDivElement | undefined = $state();
const currentAccountName = $derived(store.databaseStore.currentAccountName());
const currentAccountAvatarUrl = $derived(store.databaseStore.currentAccountAvatarUrl());

$effect(() => {
    dummyWidth; dummyHeight;
    if (dummyEl) {
        const rect = dummyEl.getBoundingClientRect();
        store.camera.viewportDimsPx.width = rect.width;
        store.camera.viewportDimsPx.height = rect.height;
        store.camera.viewportPositionPx.x = rect.left + rect.width / 2;
        store.camera.viewportPositionPx.y = rect.top + rect.height / 2;
    }
});

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
        easing: params.easing ?? cubicOut,
        css: t => `\
height: ${height * t}px;
opacity: ${t};
--scale: ${t};
pointer-events: none;
user-select: none;`,
    };
};
</script>

<overlays-panel>
    <div class="gizmos">
        <div class="gizmos-bottom-left">
            {#if store.databaseStore.userRecord !== null}
                <Button
                    onclick={() => store.databaseStore.logout()}
                    buttonStyle="icon"
                >
                    {#if currentAccountAvatarUrl !== null}
                        <img
                            src={currentAccountAvatarUrl}
                            alt="{currentAccountName} icon"
                            class="user-icon"
                        />
                    {:else}
                        {currentAccountName}
                    {/if}
                </Button>
            {:else}
                <Button
                    onclick={() => void store.databaseStore.promptDiscordLogin()}
                    buttonStyle="icon"
                >
                    Sign in with Discord
                </Button>
            {/if}

            <Button
                onclick={() => void store.beginNewCharacter()}
                disabled={store.characterManager.editingCharacter !== null || store.databaseStore.userRecord === null}
                buttonStyle="icon"
            >Add character</Button>
        </div>

        <div class="gizmos-bottom-right">
            <Slider
                label="Spacing"
                min={0}
                max={1}
                step={0.01}
                bind:value={store.characterManager.overlapFac}
            />
        </div>
    </div>

    <overlays-bottom-dock>
        {#if store.characterManager.editingCharacter !== null}
            <character-edit-menu-container transition:grow>
                <CharacterEditMenu />
            </character-edit-menu-container>
        {/if}

        <CharacterCarousel />
    </overlays-bottom-dock>

    <div
        class="viewport-dummy"
        bind:this={dummyEl}
        bind:clientWidth={dummyWidth}
        bind:clientHeight={dummyHeight}
    ></div>
</overlays-panel>

<style lang="scss">
$dock-bg-col: oklch(0.8 0.05 140 / 0.5);


overlays-panel {
    grid-area: 1/1;
    position: relative;

    display: grid;
    grid-template-rows: 1fr 40vh;
    
    pointer-events: none;
}

.viewport-dummy {
    grid-area: 1/1;
    visibility: hidden;
}

.gizmos {
    grid-area: 1/1;

    display: grid;
    padding: 1rem;
    width: 100%;
    height: 100%;

}

.gizmos-bottom-left {
    grid-area: 1/1;

    align-self: flex-end;

    display: flex;
    gap: 0.5rem;

    > :global(*) {
        pointer-events: auto;
    }
}

overlays-bottom-dock {
    grid-area: 2/1;

    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 1em;

    pointer-events: auto;

    overflow: hidden;

    background: $dock-bg-col;
}

character-edit-menu-container {
    --scale: 1;

    display: flex;
    justify-content: center;

    margin-bottom: calc(2em * var(--scale));
}

.user-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
}

.gizmos-bottom-right {
    grid-area: 1/2;

    align-self: flex-end;
    justify-self: flex-end;
    
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    padding: 0.5rem 1rem;
    background: $dock-bg-col;
    border-radius: 1rem;
    
    > :global(*) {
        pointer-events: auto;
    }
}
</style>
