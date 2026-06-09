<script lang="ts">
import CharacterCard from "./CharacterCard.svelte";
import { store } from "$lib/types/Store.svelte";
</script>

<character-carousel>
    {#each store.characterManager.characters as character}
        <CharacterCard {character} />
    {/each}
</character-carousel>

<style lang="scss">
character-carousel {
    display: flex;
    justify-content: center;

    gap: 1.5rem;
}
</style>