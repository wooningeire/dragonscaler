<script lang="ts">
import AddCharacterMenu from "./AddCharacterMenu.svelte";
import CharacterCarousel from "./CharacterCarousel.svelte";
import { beginNewCharacter, currentNewCharacter } from "../lib/state/NewCharacter.svelte";
import { currentCharacters } from "$lib/state/characters.svelte";

const characters = $derived(currentCharacters());
const newCharacter = $derived(currentNewCharacter());
</script>

<div class="overlays">
    {#if newCharacter !== null}
        <AddCharacterMenu />
    {:else}
        <button
            class="add-character-button"
            onclick={beginNewCharacter}
        >+</button>
    {/if}

    <CharacterCarousel {characters} />
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

    background: oklch(0.8 0.1 120 / 0.5);
}

.add-character-button {
    font-size: 2rem;
    border: 1px solid oklch(0.5 0 0);
    padding: 0.5rem;
}
</style>