<script lang="ts">
import type { Character } from "$lib/types/Character.svelte";

let {
    character,
}: {
    character: Character,
} = $props();
</script>

<div class="character-card">
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
    
    <div>{character.name}</div>
</div>

<style lang="scss">
$image-size: 10rem;

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