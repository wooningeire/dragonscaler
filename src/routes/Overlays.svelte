<script lang="ts">
import AddCharacterMenu from "./AddCharacterMenu.svelte";
import type { Character } from "./Character.svelte";
    import CharacterCard from "./CharacterCard.svelte";

let {
    characters,
    onAddCharacter,
}: {
    characters: Character[],
    onAddCharacter: (character: Character) => void,
} = $props();


let isAddingCharacter = $state(false);
</script>

<div class="overlays">
    <button onclick={() => isAddingCharacter = true}>Add</button>

    {#if isAddingCharacter}
        <AddCharacterMenu
            onSubmit={character => {
                isAddingCharacter = false;
                onAddCharacter(character);
            }}
            onCancel={() => isAddingCharacter = false}
        />
    {/if}

    {#each characters as character}
        <CharacterCard {character} />
    {/each}
</div>

<style lang="scss">
.overlays {
    grid-area: 1/1;
    height: 30vh;

    align-self: end;

    background: oklch(0.8 0.1 120 / 0.5);
}
</style>