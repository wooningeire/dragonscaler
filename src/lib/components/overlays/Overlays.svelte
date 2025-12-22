<script lang="ts">
import CharacterEditMenu from "./CharacterEditMenu.svelte";
import CharacterCarousel from "./CharacterCarousel.svelte";
import { store } from "$lib/types/Store.svelte";
import Button from "../generic/Button.svelte";
import Slider from "../generic/Slider.svelte";
import { PUBLIC__POCKETBASE_URL } from "$env/static/public";
</script>

<div class="overlays">
    <div class="gizmos">
        <div class="gizmos-bottom-left">
            {#if store.databaseStore.userRecord !== null}
                <Button
                    onclick={() => store.databaseStore.logout()}
                    buttonStyle="icon"
                >
                    <img
                        src="{PUBLIC__POCKETBASE_URL}/api/files/users/{store.databaseStore.userRecord!.id}/{store.databaseStore.userRecord!.avatar}"
                        alt="{store.databaseStore.userRecord!.username} icon"
                        class="user-icon"
                    />
                </Button>
            {:else}
                <Button
                    onclick={() => store.databaseStore.promptDiscordLogin()}
                    buttonStyle="icon"
                >
                    Sign in with Discord
                </Button>
            {/if}

            <Button
                onclick={() => store.beginNewCharacter()}
                disabled={store.characterManager.selectedCharacter !== null || store.databaseStore.userRecord === null}
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

    <div class="bottom-dock">
        {#if store.characterManager.selectedCharacter !== null}
            <CharacterEditMenu />
        {/if}
    
        <CharacterCarousel />
    </div>
</div>

<style lang="scss">
$dock-bg-col: oklch(0.8 0.05 140 / 0.5);


.overlays {
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

.bottom-dock {
    grid-area: 2/1;

    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;

    pointer-events: auto;

    overflow: hidden;

    background: $dock-bg-col;
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
    min-width: 12rem;

    padding: 1rem;
    background: $dock-bg-col;
    border-radius: 1rem;
    
    > :global(*) {
        pointer-events: auto;
    }
}
</style>