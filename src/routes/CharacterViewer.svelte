<script lang="ts">
import type { Character } from "./Character.svelte";
import CharacterDisplay from "./CharacterDisplay.svelte";

let {
    characters,
}: {
    characters: Character[],
} = $props();
</script>

<div class="character-viewer">
    {#each characters as character}
        <CharacterDisplay {character} />
    {/each}
</div>

<style lang="scss">
.character-viewer {
    grid-area: 1/1;
}
</style>