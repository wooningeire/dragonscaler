<script lang="ts">
import CharacterCarousel from "./CharacterCarousel.svelte";
import { store } from "$lib/types/Store.svelte";
import Button from "../generic/Button.svelte";
import Slider from "../generic/Slider.svelte";
import type { TransitionConfig } from "svelte/transition";
import { circOut } from "svelte/easing";
import CharacterEditMenu from "./CharacterEditMenu.svelte";

const currentAccountName = $derived(store.databaseStore.currentAccountName());
const currentAccountAvatarUrl = $derived(store.databaseStore.currentAccountAvatarUrl());
let bottomDockHeightPx = $state(0);

$effect(() => {
    store.camera.viewportInsetsPx.bottom = bottomDockHeightPx;
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
        easing: params.easing ?? circOut,
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
                bind:value={store.characterManager.spacingFac}
            />
        </div>
    </div>

    <overlays-bottom-dock bind:clientHeight={bottomDockHeightPx}>
        {#if store.characterManager.editingCharacter !== null}
            <character-edit-menu-container transition:grow>
                <CharacterEditMenu />
            </character-edit-menu-container>
        {/if}

        <CharacterCarousel />
    </overlays-bottom-dock>

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
    padding: 1em 0;

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
