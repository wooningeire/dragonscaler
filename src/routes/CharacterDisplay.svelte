<script lang="ts">
import type { Character } from "./Character.svelte";

let {
    character,
}: {
    character: Character,
} = $props();
</script>

<div class="character-display">
    <img
        src={character.imageSrc}
        alt={character.name}
    />
</div>

<style lang="scss">
$image-size: 10rem;

.character-display {
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
</style>