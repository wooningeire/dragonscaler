<script lang="ts">
import CharacterEditMenu from "./CharacterEditMenu.svelte";
import CharacterCarousel from "./CharacterCarousel.svelte";
import { CharacterManager } from "$lib/types/CharacterManager.svelte";
    import Button from "../generic/Button.svelte";

const {
    characterManager,
}: {
    characterManager: CharacterManager,
} = $props();
</script>

<div class="overlays">
    <div class="gizmos">
        <div class="gizmos-bottom-left">
            <Button
                onclick={() => characterManager.beginNewCharacter()}
                disabled={characterManager.characterBeingEdited !== null}
            >+</Button>
        </div>
    </div>

    <div class="bottom-dock">
        {#if characterManager.characterBeingEdited !== null}
            <CharacterEditMenu
                newCharacter={characterManager.characterBeingEdited}
                onSubmit={() => characterManager.characterBeingEdited = null}
            />
        {/if}
    
        <CharacterCarousel characters={characterManager.characters} />
    </div>
</div>

<style lang="scss">
.overlays {
    grid-area: 1/1;
    position: relative;

    display: grid;
    grid-template-rows: 1fr 30vh;
    
    pointer-events: none;
}

:global(.add-character-button) {
    font-size: 2rem;
}

.gizmos {
    grid-area: 1/1;

    display: grid;
    padding: 1rem;
    width: 100%;
    height: 100%;

}

.gizmos-bottom-left {
    align-self: flex-end;

    > :global(*) {
        pointer-events: auto;
    }
}

.bottom-dock {
    grid-area: 2/1;

    display: flex;
    flex-direction: column;
    align-items: center;

    pointer-events: auto;

    overflow: hidden;

    background: oklch(0.8 0.1 120 / 0.5);
}
</style>