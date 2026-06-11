<script lang="ts">
import { Character } from "$lib/types/Character.svelte";
import TextEntry from "$lib/components/generic/TextEntry.svelte";
import { CharacterImage } from "$lib/types/CharacterImage.svelte";
import Button from "../generic/Button.svelte";
import { store } from "$lib/types/Store.svelte";
import { untrack } from "svelte";
import { baselineEditModes } from "$lib/util/baselineGeometry";

const characterBeingEdited = $derived(store.characterManager.editingCharacter);

let fileInput: HTMLInputElement = $state()!;

let loading = $state(false);
let saving = $state(false);
const loadFile = async () => {
    if (characterBeingEdited === null) return;

    if (fileInput.files === null || fileInput.files.length === 0) return;

    if (loading) return;

    loading = true;

    if (characterBeingEdited.image !== null) {
        URL.revokeObjectURL(characterBeingEdited.image.src);
    }

    const file = fileInput.files[0];
    characterBeingEdited.image = await CharacterImage.fromFile(file);
    loading = false;
};

const submit = async () => {
    if (characterBeingEdited === null) return;

    if (characterBeingEdited.image === null) return;

    if (saving) return;

    saving = true;

    try {
        if (characterBeingEdited.uploaded) {
            await store.databaseStore.updateCharacter(characterBeingEdited);
        } else {
            await store.databaseStore.createCharacter(characterBeingEdited);
        }

        originalCharacter = characterBeingEdited.clone();
        store.characterManager.stopEditingCharacter();
    } finally {
        saving = false;
    }
};


let originalCharacter: Character;
$effect(() => {
    if (characterBeingEdited === null) return;

    void characterBeingEdited.id;

    untrack(() => originalCharacter = characterBeingEdited.clone());
});

const cancel = () => {
    if (characterBeingEdited === null) return;

    if (characterBeingEdited.uploaded) {
        characterBeingEdited.copy(originalCharacter);
    } else {
        store.characterManager.characters.splice(store.characterManager.characters.indexOf(characterBeingEdited), 1);

        if (store.characterManager.selectedCharacter === characterBeingEdited) {
            store.characterManager.selectedCharacter = null;
        }
    }

    store.characterManager.stopEditingCharacter();
};

const canSubmit = $derived(
    characterBeingEdited !== null
    && characterBeingEdited.image !== null
    && characterBeingEdited.name !== ""
    && !saving,
);
</script>

{#if characterBeingEdited !== null}
    <div class="add-character-menu">
        <div class="character-image-container">
            <Button
                onclick={() => fileInput.click()}
                disabled={loading}
                displayClass="character-image"
                buttonStyle="image"
            >
                {#if characterBeingEdited.image !== null}
                    <img
                        src={characterBeingEdited.image.src}
                        alt={characterBeingEdited.name}
                    />
                {/if}
            </Button>


            <input
                type="file"
                bind:this={fileInput}
                oninput={loadFile}
            />
        </div>

        <div class="character-form-inputs">
            <label>
                Name

                <TextEntry
                    value={characterBeingEdited.name}
                    onValueChange={value => characterBeingEdited.name = value}
                    placeholderText="Name"
                />
            </label>

            <div class="baseline-editor">
                <span>Baseline</span>

                <div
                    class="baseline-mode-control"
                    role="group"
                    aria-label="Reference curve mode"
                >
                    {#each baselineEditModes as mode}
                        <button
                            type="button"
                            class:active={store.characterManager.baselineEditMode === mode.id}
                            aria-pressed={store.characterManager.baselineEditMode === mode.id}
                            onclick={() => store.characterManager.setBaselineEditMode(mode.id)}
                        >
                            {mode.label}
                        </button>
                    {/each}
                </div>

                <TextEntry
                    value={characterBeingEdited.baseline.targetLength.toString()}
                    onValueChange={value => characterBeingEdited.baseline.targetLength = Number(value)}
                    placeholderText="Target length"
                />

                <TextEntry
                    value={characterBeingEdited.baseline.descriptor}
                    onValueChange={value => characterBeingEdited.baseline.descriptor = value}
                    placeholderText="to the shoulder"
                />
            </div>
        </div>



        <div class="buttons">
            <Button onclick={submit} disabled={!canSubmit}>
                {#if characterBeingEdited.uploaded}
                    Update
                {:else}
                    Create
                {/if}
            </Button>

            <Button onclick={cancel}>
                Cancel
            </Button>
        </div>
    </div>
{/if}

<style lang="scss">
$image-size: 12rem;

.add-character-menu {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    max-width: min(72rem, 100%);
}

.character-form-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 20rem;
}

.baseline-editor {
    display: grid;
    gap: 0.5rem;
}

.baseline-mode-control {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.125rem;
    padding: 0.125rem;

    border-radius: 0.5rem;
    background: oklch(0.98 0.02 135 / 0.8);

    button {
        display: grid;
        place-items: center;
        padding: 0.375rem 0.5rem;
        min-width: 0;

        border-radius: 0.375rem;
        color: oklch(0.28 0.06 145);
        font: inherit;

        cursor: pointer;
        user-select: none;

        &.active {
            background: oklch(0.86 0.08 145 / 0.9);
            box-shadow: 0 0.125rem 0.5rem oklch(0.45 0.08 145 / 0.2);
        }
    }
}

:global(.character-image) {
    width: $image-size;
    aspect-ratio: 1/1;
    display: grid;
    place-items: stretch;

    background: oklch(0.9 0.1 200 / 0.5);

    > * {
        width: $image-size;
        height: $image-size;
    }
}

img {
    object-fit: contain;
}

input[type="file"] {
    display: none;
}

.buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>
