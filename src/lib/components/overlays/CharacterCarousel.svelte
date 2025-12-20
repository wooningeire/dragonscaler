<script lang="ts">
import CharacterCard from "./CharacterCard.svelte";
import { store } from "$lib/types/Store.svelte";
</script>

<div class="character-carousel">
    {#each store.characterManager.characters as character}
        <CharacterCard {character} />
    {/each}
</div>

<style lang="scss">
.character-carousel {
    display: flex;
}
</style>