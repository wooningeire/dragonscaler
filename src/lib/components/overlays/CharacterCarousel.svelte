<script lang="ts">
import CharacterCard from "./CharacterCard.svelte";
import { store } from "$lib/types/Store.svelte";
</script>

<character-carousel>
    {#each store.characterManager.displayCharacters as character (character)}
        <CharacterCard {character} />
    {/each}
</character-carousel>

<style lang="scss">
character-carousel {
    display: flex;
    justify-content: flex-start;
    justify-content: safe center;

    gap: 1.5em;

    width: 100%;
    min-width: 0;
    padding: 2em 4em;

    overflow-x: auto;
    overflow-y: hidden;
}

</style>
