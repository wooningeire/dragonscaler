<script lang="ts">
import type { Character } from "../../types/Character.svelte";
    import CharacterCard from "../../../routes/CharacterCard.svelte";

let {
    characters,
}: {
    characters: Character[],
} = $props();
</script>

<div class="character-carousel">
    {#each characters as character}
        <CharacterCard {character} />
    {/each}
</div>

<style lang="scss">
.character-carousel {
    display: flex;
}
</style>