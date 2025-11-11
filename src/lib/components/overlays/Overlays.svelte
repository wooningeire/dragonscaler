<script lang="ts">
import CharacterEditMenu from "./CharacterEditMenu.svelte";
import CharacterCarousel from "./CharacterCarousel.svelte";
import { CharacterManager } from "$lib/types/CharacterManager.svelte";

const {
    characterManager,
}: {
    characterManager: CharacterManager,
} = $props();
</script>

<div class="overlays">
    {#if characterManager.characterBeingEdited !== null}
        <CharacterEditMenu
            newCharacter={characterManager.characterBeingEdited}
            onSubmit={() => characterManager.characterBeingEdited = null}
        />
    {:else}
        <button
            class="add-character-button"
            onclick={() => characterManager.beginNewCharacter()}
        >+</button>
    {/if}

    <CharacterCarousel characters={characterManager.characters} />
</div>

<style lang="scss">
.overlays {
    grid-area: 1/1;
    height: 30vh;
    position: relative;

    align-self: end;

    display: flex;
    flex-direction: column;
    align-items: center;

    overflow: hidden;

    background: oklch(0.8 0.1 120 / 0.5);
}

.add-character-button {
    font-size: 2rem;
    border: 1px solid oklch(0.5 0 0);
    padding: 0.5rem;
}
</style>