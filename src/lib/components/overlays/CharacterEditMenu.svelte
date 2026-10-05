<script lang="ts">
import { Character } from "$lib/types/Character.svelte";
import TextEntry from "$lib/components/generic/TextEntry.svelte";
import { CharacterImage } from "$lib/types/CharacterImage.svelte";
import Button from "../generic/Button.svelte";
import { store } from "$lib/types/Store.svelte";
import { untrack } from "svelte";
import Separator from "../generic/Separator.svelte";
import CharacterMeasurements from "./CharacterMeasurements.svelte";

const characterBeingEdited = $derived(store.characterManager.editingCharacter);

let fileInput: HTMLInputElement = $state()!;

let loading = $state(false);
let saving = $state(false);
let deleting = $state(false);
let saveError: string | null = $state(null);
const loadFile = async () => {
    const character = characterBeingEdited;
    if (character === null) return;

    if (fileInput.files === null || fileInput.files.length === 0) return;

    if (loading) return;

    loading = true;
    const previousImage = character.image;

    try {
        const file = fileInput.files[0];
        const image = await CharacterImage.fromFile(file);

        if (characterBeingEdited !== character) {
            URL.revokeObjectURL(image.src);
            return;
        }

        character.image = image;
        character.imageDimensions = image.dimensions;

        if (previousImage?.hasObjectUrl) {
            URL.revokeObjectURL(previousImage.src);
        }
    } catch (error) {
        console.error(error);
    } finally {
        loading = false;
    }
};

const mirrorReferenceGeometry = (character: Character) => {
    const image = character.image;
    if (image === null) return;

    character.anchor = {
        ...character.anchor,
        x: 1 - character.anchor.x,
    };
    for (const measurement of character.measurements) {
        measurement.points = measurement.points.map(point => ({
            x: image.aspect - point.x,
            y: point.y,
        }));
    }
};

const flipImage = () => {
    if (characterBeingEdited === null) return;

    const image = characterBeingEdited.image;
    if (image === null) return;

    mirrorReferenceGeometry(characterBeingEdited);
    characterBeingEdited.image = image.withFlippedHorizontally(!image.flippedHorizontally);
};

const submit = async () => {
    if (characterBeingEdited === null) return;

    if (characterBeingEdited.image === null) return;

    if (saving || deleting) return;

    saving = true;
    saveError = null;

    try {
        if (characterBeingEdited.uploaded) {
            await store.databaseStore.updateCharacter(characterBeingEdited);
        } else {
            await store.databaseStore.createCharacter(characterBeingEdited);
        }

        originalCharacter = characterBeingEdited.clone();
        store.characterManager.stopEditingCharacter();
    } catch (error) {
        console.error("Failed to save character.", error);
        saveError = "Could not save this character. Check your edit access and try again.";
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

    if (saving || deleting) return;

    if (characterBeingEdited.uploaded) {
        characterBeingEdited.copy(originalCharacter);
    } else {
        store.characterManager.removeCharacter(characterBeingEdited);
        return;
    }

    store.characterManager.stopEditingCharacter();
};

const del = async () => {
    if (characterBeingEdited === null) return;

    if (saving || deleting) return;

    const character = characterBeingEdited;
    deleting = true;

    try {
        if (character.uploaded) {
            await store.databaseStore.deleteCharacter(character);
        }

        store.characterManager.removeCharacter(character);
    } finally {
        deleting = false;
    }
};

const canSubmit = $derived(
    characterBeingEdited !== null
    && characterBeingEdited.image !== null
    && characterBeingEdited.name !== ""
    && Number.isFinite(characterBeingEdited.baseline.targetLength)
    && characterBeingEdited.baseline.targetLength > 0
    && characterBeingEdited.hasUsableReferenceSizing
    && !loading
    && !saving
    && !deleting,
);
const canLeave = $derived(!loading && !saving && !deleting);
</script>

{#if characterBeingEdited !== null}
    <character-edit-menu>
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
                        class:flipped-horizontally={characterBeingEdited.image.flippedHorizontally}
                    />
                {/if}
            </Button>

            <div class="image-tools">
                <Button
                    onclick={flipImage}
                    disabled={characterBeingEdited.image === null || loading || saving || deleting}
                    aria-pressed={characterBeingEdited.image?.flippedHorizontally ?? false}
                >
                    Flip
                </Button>
            </div>


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

            <CharacterMeasurements
                character={characterBeingEdited}
                disabled={characterBeingEdited.image === null || loading || saving || deleting}
            />
        </div>



        <div class="buttons">
            <div
                class="save-status"
                aria-live="polite"
            >
                {#if saveError !== null}
                    <span role="alert">{saveError}</span>
                {/if}
            </div>

            <Button
                onclick={submit}
                disabled={!canSubmit}
            >
                {#if characterBeingEdited.uploaded}
                    Update
                {:else}
                    Create
                {/if}
            </Button>

            <Button
                onclick={cancel}
                disabled={!canLeave}
            >
                Cancel
            </Button>

            <Separator />

            <Button
                onclick={del}
                disabled={!canLeave}
                red
            >
                Delete
            </Button>
        </div>
    </character-edit-menu>
{/if}

<style lang="scss">
$image-size: clamp(7rem, 18vw, 12rem);

character-edit-menu {
    display: grid;
    grid-template-columns: $image-size minmax(16rem, 1fr) max-content;
    gap: 1rem;
    align-items: center;
    width: min(72rem, calc(100% - 2rem));
    max-width: min(72rem, 100%);
}

.character-image-container {
    display: grid;
    gap: 0.5rem;
    width: $image-size;
}

.image-tools {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
}

.character-form-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
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

    transition: transform 0.16s ease;

    &.flipped-horizontally {
        transform: scaleX(-1);
    }
}

input[type="file"] {
    display: none;
}

.save-status {
    min-height: 1.25rem;

    color: oklch(0.48 0.19 25);
    font-size: 0.8rem;
    line-height: 1.25;
}

.buttons {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5em;
}

@media (max-width: 48rem) {
    character-edit-menu {
        grid-template-columns: $image-size minmax(0, 1fr);
        align-items: start;
        gap: 0.75rem;
    }

    .buttons {
        grid-column: 1 / -1;

        flex-direction: row;
        flex-wrap: wrap;

        .save-status {
            flex: 1 0 100%;
        }

        > :global(*) {
            flex: 1 1 5rem;
        }
    }

}
</style>
