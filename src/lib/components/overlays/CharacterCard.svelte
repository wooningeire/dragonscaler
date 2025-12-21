<script lang="ts">
import type { Character } from "$lib/types/Character.svelte";
import Button from "../generic/Button.svelte";
import CharacterLabel from "../viewport/CharacterLabel.svelte";
import { store } from "$lib/types/Store.svelte";

let {
    character,
}: {
    character: Character,
} = $props();
</script>

<div
    class="character-card"
    class:selected={store.characterManager.selectedCharacter === character}
>
    <Button
        onclick={() => store.characterManager.selectedCharacter = character}
    >
        <div class="character-card-image-container">
            {#if character.image !== null}
                <img
                    src={character.image.src}
                    alt={character.name}
                />
            {:else}
                <div class="image-placeholder"></div>
            {/if}
        </div>
        
        <CharacterLabel {character} />
    </Button>
</div>

<style lang="scss">
$image-size: 10rem;

.character-card {
    transition: filter 0.2s ease-in-out;

    &.selected {
        filter: brightness(1.1);
    }
}

.character-card-image-container {
    width: $image-size;
    aspect-ratio: 1/1;
    display: grid;
    place-items: stretch;

    > * {
        width: $image-size;
        height: $image-size;
    }
}

img {
    object-fit: contain;
}

.image-placeholder {
    background: oklch(0.9 0 0);
}
</style>