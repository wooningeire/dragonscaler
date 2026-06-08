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

const selected = $derived(store.characterManager.selectedCharacter === character);
const editing = $derived(store.characterManager.editingCharacter === character);
const mutedByEditMode = $derived(
    store.characterManager.editingCharacter !== null
    && store.characterManager.editingCharacter !== character,
);
const currentAccountId = $derived(store.databaseStore.userRecord?.id ?? null);
const canEdit = $derived(
    currentAccountId !== null
    && character.ownerIdentities.some(identity => identity.accountId === currentAccountId),
);
const characterName = $derived(character.name === "" ? "unnamed character" : character.name);
const editLabel = $derived(`Edit ${characterName}`);
</script>

<div
    class="character-card"
    class:selected
    class:edit-muted={mutedByEditMode}
>
    <Button
        class="character-select-button"
        onclick={() => store.characterManager.selectCharacter(character)}
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

    {#if canEdit && !editing}
        <div class="edit-overlay">
            <Button
                onclick={() => store.characterManager.editCharacter(character)}
                aria-label={editLabel}
            >
                Edit
            </Button>
        </div>
    {/if}
</div>

<style lang="scss">
$image-size: 10rem;

.character-card {
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
}

.character-card > :global(.character-select-button) {
    grid-area: 1 / 1;
}

.edit-overlay {
    grid-area: 1 / 1;

    align-self: start;
    justify-self: end;

    transform: translate(0.75rem, -0.75rem);
    z-index: 1;
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
