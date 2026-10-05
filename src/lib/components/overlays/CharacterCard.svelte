<script lang="ts">
import type { Character } from "$lib/types/Character.svelte";
import Button from "../generic/Button.svelte";
import CharacterLabel from "../viewport/CharacterLabel.svelte";
import { store } from "$lib/types/Store.svelte";
import { fade } from "svelte/transition";
import { cubicInOut } from "svelte/easing";

let {
    character,
}: {
    character: Character,
} = $props();

const selected = $derived(store.characterManager.selectedCharacter === character);
const editing = $derived(store.characterManager.editingCharacter === character);
const mutedByEditMode = $derived(
    store.characterManager.editingCharacter !== null
    && store.characterManager.editingCharacter !== character,
);
const canEdit = $derived(store.databaseStore.canEditCharacter(character));
const characterName = $derived(character.name === "" ? "unnamed character" : character.name);
const editLabel = $derived(`Edit ${characterName}`);
</script>

<character-card
    class="character-card"
    class:selected
    class:edit-muted={mutedByEditMode}
>
    <character-select-button>
        <Button
            onclick={() => store.characterManager.selectCharacter(character)}
        >
            <character-card-image-container>
                {#if character.image !== null}
                    <img
                        src={character.image.src}
                        alt={character.name}
                    />
                {:else}
                    <character-card-image-placeholder></character-card-image-placeholder>
                {/if}
            </character-card-image-container>
            
            <CharacterLabel {character} />
        </Button>
    </character-select-button>

    {#if canEdit && !editing}
        <character-edit-overlay
            class="edit-overlay"
            transition:fade={{duration: 200, easing: cubicInOut}}
        >
            <Button
                onclick={() => store.characterManager.editCharacter(character)}
                aria-label={editLabel}
            >
                Edit
            </Button>
        </character-edit-overlay>
    {/if}
</character-card>

<style lang="scss">
$image-size: 10rem;

character-card {
    flex-shrink: 0;

    display: grid;

    transition:
        filter 0.2s ease-in-out,
        opacity 0.2s ease-in-out;

    &.selected {
        filter: brightness(1.1);
    }

    &.edit-muted {
        opacity: 0.3333333;
        pointer-events: none;
    }

    > * {
        grid-area: 1/1;
    }
}

character-edit-overlay {
    align-self: start;
    justify-self: end;

    transform: translate(-0.5em, 0.5em);
}

character-card-image-container {
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

character-card-image-placeholder {
    background: oklch(0.9 0 0);
    border-radius: 0.5em;
}
</style>
