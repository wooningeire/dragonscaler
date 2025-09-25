<script lang="ts">
import AddCharacterMenu from "./AddCharacterMenu.svelte";
import CharacterCarousel from "./CharacterCarousel.svelte";
import { beginNewCharacter, currentNewCharacter } from "../lib/state/NewCharacter.svelte";
import { currentCharacters } from "$lib/state/characters.svelte";

const characters = $derived(currentCharacters());
const newCharacter = $derived(currentNewCharacter());
</script>

<div class="overlays">
    <button onclick={beginNewCharacter}>Add</button>

    {#if newCharacter !== null}
        <AddCharacterMenu />
    {/if}

    <CharacterCarousel {characters} />
</div>

<style lang="scss">
.overlays {
    grid-area: 1/1;
    height: 30vh;
    position: relative;

    align-self: end;

    background: oklch(0.8 0.1 120 / 0.5);
}
</style>