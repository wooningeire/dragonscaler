<script lang="ts">
import { Character } from "$lib/types/Character.svelte";
import TextEntry from "$lib/components/generic/TextEntry.svelte";
import { CharacterImage } from "$lib/types/CharacterImage.svelte";
import Button from "../generic/Button.svelte";
import { store } from "$lib/types/Store.svelte";
import { untrack } from "svelte";
import { baselineEditModes } from "$lib/util/baselineGeometry";
import {
    formatMeasurementValue,
    measurementUnits,
    measurementUnitToMeters,
} from "$lib/util/measurementUnits";
import Separator from "../generic/Separator.svelte";

const characterBeingEdited = $derived(store.characterManager.editingCharacter);
const targetLengthText = $derived(
    characterBeingEdited === null
        ? ""
        : formatMeasurementValue(
            characterBeingEdited.baseline.targetLength,
            characterBeingEdited.baseline.measurementUnit,
        ),
);

let fileInput: HTMLInputElement = $state()!;

let loading = $state(false);
let saving = $state(false);
let deleting = $state(false);
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

const mirrorReferenceGeometry = (character: Character) => {
    const image = character.image;
    if (image === null) return;

    character.anchor = {
        ...character.anchor,
        x: 1 - character.anchor.x,
    };
    character.baseline.points = character.baseline.points.map(point => ({
        x: image.aspect - point.x,
        y: point.y,
    }));
};

const flipImage = () => {
    if (characterBeingEdited === null) return;

    const image = characterBeingEdited.image;
    if (image === null) return;

    mirrorReferenceGeometry(characterBeingEdited);
    characterBeingEdited.image = image.withFlippedHorizontally(!image.flippedHorizontally);
};

const setTargetLength = (value: string) => {
    if (characterBeingEdited === null) return;

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return;

    characterBeingEdited.baseline.targetLength = measurementUnitToMeters(
        parsedValue,
        characterBeingEdited.baseline.measurementUnit,
    );
};

const submit = async () => {
    if (characterBeingEdited === null) return;

    if (characterBeingEdited.image === null) return;

    if (saving || deleting) return;

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
    && !saving
    && !deleting,
);
const canLeave = $derived(!saving && !deleting);
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

            <div class="baseline-editor">
                <div class="reference-measurement-row">
                    <label class="reference-measurement-input">
                        <span>Reference curve</span>

                        <TextEntry
                            value={targetLengthText}
                            onValueChange={setTargetLength}
                            placeholderText="Length"
                        />
                    </label>

                    <div
                        class="measurement-unit-control"
                        role="radiogroup"
                        aria-label="Measurement unit"
                    >
                        {#each measurementUnits as unit}
                            <label class:active={characterBeingEdited.baseline.measurementUnit === unit.id}>
                                <input
                                    type="radio"
                                    name="reference-measurement-unit"
                                    value={unit.id}
                                    checked={characterBeingEdited.baseline.measurementUnit === unit.id}
                                    onchange={() => characterBeingEdited.baseline.measurementUnit = unit.id}
                                />

                                <span>{unit.label}</span>
                            </label>
                        {/each}
                    </div>

                    <label class="reference-label-input">
                        <span class="visually-hidden">Reference curve label</span>

                        <TextEntry
                            value={characterBeingEdited.baseline.descriptor}
                            onValueChange={value => characterBeingEdited.baseline.descriptor = value}
                            placeholderText="to the shoulder"
                        />
                    </label>
                </div>

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
            </div>
        </div>



        <div class="buttons">
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

.baseline-editor {
    display: grid;
    gap: 0.5rem;
}

.reference-measurement-row {
    display: grid;
    grid-template-columns: minmax(13rem, max-content) max-content minmax(10rem, 1fr);
    gap: 0.5rem;
    align-items: center;
    min-width: 0;
}

.reference-measurement-input {
    display: grid;
    grid-template-columns: max-content minmax(5.5rem, 7rem);
    gap: 0.5rem;
    align-items: center;
    min-width: 0;

    > span {
        white-space: nowrap;
    }
}

.reference-label-input {
    display: grid;
    min-width: 0;
}

.measurement-unit-control {
    display: grid;
    grid-template-columns: repeat(2, minmax(2.25rem, 1fr));
    gap: 0.125rem;
    padding: 0.125rem;

    border-radius: 0.5rem;
    background: oklch(0.98 0.02 135 / 0.8);

    label {
        display: grid;
        grid-template-areas: "control";
        min-width: 0;

        cursor: pointer;
        user-select: none;

        input,
        span {
            grid-area: control;
        }

        input {
            width: 100%;
            height: 100%;

            opacity: 0;
            cursor: pointer;
        }

        span {
            display: grid;
            place-items: center;
            padding: 0.375rem 0.5rem;
            min-width: 0;

            border-radius: 0.375rem;
            color: oklch(0.28 0.06 145);
        }

        &.active span {
            background: oklch(0.86 0.08 145 / 0.9);
            box-shadow: 0 0.125rem 0.5rem oklch(0.45 0.08 145 / 0.2);
        }
    }
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

.visually-hidden {
    position: fixed;
    width: 0.0625rem;
    height: 0.0625rem;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
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

        > :global(*) {
            flex: 1 1 5rem;
        }
    }

    .reference-measurement-row {
        grid-template-columns: minmax(0, 1fr) max-content;
    }

    .reference-measurement-input {
        grid-column: 1 / 2;
        grid-template-columns: minmax(0, 1fr);
        gap: 0.25rem;
    }

    .measurement-unit-control {
        grid-column: 2 / 3;
        align-self: end;
    }

    .reference-label-input {
        grid-column: 1 / -1;
        min-width: 0;
    }
}
</style>
