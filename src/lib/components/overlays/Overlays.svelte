<script lang="ts">
import { store } from "$lib/types/Store.svelte";
import Button from "../generic/Button.svelte";
import Slider from "../generic/Slider.svelte";
import BottomDock from "./BottomDock.svelte";

const currentAccountName = $derived(store.databaseStore.currentAccountName());
const currentAccountAvatarUrl = $derived(store.databaseStore.currentAccountAvatarUrl());

const promptDiscordLogin = () => {
    void store.databaseStore.promptDiscordLogin().catch(error => console.error(error));
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
                <div class="discord-login">
                    <p
                        id="discord-login-status"
                        class="discord-login-status"
                        class:error={store.databaseStore.discordLoginError !== null}
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        {store.databaseStore.discordLoginPending
                            ? "Waiting for Discord..."
                            : store.databaseStore.discordLoginError ?? ""}
                    </p>

                    <Button
                        onclick={promptDiscordLogin}
                        disabled={store.databaseStore.discordLoginPending}
                        aria-busy={store.databaseStore.discordLoginPending}
                        aria-describedby="discord-login-status"
                        buttonStyle="icon"
                    >
                        Sign in with Discord
                    </Button>
                </div>
            {/if}

            <Button
                onclick={() => void store.beginNewCharacter()}
                disabled={store.characterManager.editingCharacter !== null || store.databaseStore.userRecord === null}
                buttonStyle="icon"
            >Add character</Button>
        </div>

        <div class="gizmos-bottom-right">
            <label>
                <input
                    type="checkbox"
                    bind:checked={store.characterManager.logPerspective}
                />

                Logarithmic
            </label>

            <label>
                <input
                    type="checkbox"
                    bind:checked={store.gridlinesOnTop}
                />

                Gridlines on top
            </label>

            <Slider
                label="Spacing"
                min={0}
                max={1}
                step={0.01}
                bind:value={store.characterManager.spacingFac}
            />
        </div>
    </div>

    <BottomDock />
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

@media (max-width: 48rem) {
    overlays-panel {
        grid-template-rows: 1fr 50vh;
    }
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
    align-items: flex-end;
    gap: 0.5rem;

    > :global(*) {
        pointer-events: auto;
    }
}

.discord-login {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.discord-login-status {
    min-height: 1rem;
    max-width: 18rem;

    margin: 0;

    color: oklch(0.35 0.03 140);
    font-size: 0.75rem;
    line-height: 1rem;

    &.error {
        color: oklch(0.45 0.18 25);
    }
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
