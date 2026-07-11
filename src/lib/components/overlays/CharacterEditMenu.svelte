<script lang="ts">
import { Character } from "$lib/types/Character.svelte";
import TextEntry from "$lib/components/generic/TextEntry.svelte";
import { CharacterImage } from "$lib/types/CharacterImage.svelte";
import Button from "../generic/Button.svelte";
import { store } from "$lib/types/Store.svelte";
import { untrack } from "svelte";
import {
    baselineEditModes,
    isBaselineEditMode,
} from "$lib/util/baselineGeometry";
import {
    formatMeasurementValue,
    isMeasurementUnit,
    measurementUnits,
    measurementUnitToMeters,
} from "$lib/util/measurementUnits";
import {
    formatPixelMeasurementValue,
    isReferenceSizingMethod,
    referenceSizingMethods,
} from "$lib/util/referenceSizing";
import Separator from "../generic/Separator.svelte";
import RadioGroup from "$lib/components/generic/RadioGroup.svelte";

const characterBeingEdited = $derived(store.characterManager.editingCharacter);
const targetLengthText = $derived(
    characterBeingEdited === null
        ? ""
        : formatMeasurementValue(
            characterBeingEdited.baseline.targetLength,
            characterBeingEdited.baseline.measurementUnit,
        ),
);
const pixelMeasurementText = $derived(
    characterBeingEdited === null
        ? ""
        : formatPixelMeasurementValue(characterBeingEdited.baseline.pixelMeasurementPx),
);

let fileInput: HTMLInputElement = $state()!;

let loading = $state(false);
let saving = $state(false);
let deleting = $state(false);
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

const setMeasurementUnit = (value: string) => {
    if (characterBeingEdited === null || !isMeasurementUnit(value)) return;

    characterBeingEdited.baseline.measurementUnit = value;
};

const setReferenceSizingMethod = (value: string) => {
    if (characterBeingEdited === null || !isReferenceSizingMethod(value)) return;

    characterBeingEdited.baseline.referenceSizingMethod = value;
};

const setPixelMeasurement = (value: string) => {
    if (characterBeingEdited === null) return;

    const trimmedValue = value.trim();
    if (trimmedValue === "") {
        characterBeingEdited.baseline.pixelMeasurementPx = null;
        return;
    }

    const parsedValue = Number(trimmedValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) return;

    characterBeingEdited.baseline.pixelMeasurementPx = parsedValue;
};

const setBaselineEditMode = (value: string) => {
    if (!isBaselineEditMode(value)) return;

    store.characterManager.setBaselineEditMode(value);
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
    && (
        characterBeingEdited.baseline.referenceSizingMethod === "measurement_line"
        || characterBeingEdited.pixelMeasurementImageLength !== null
    )
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

            <div class="baseline-editor">
                <div class="reference-sizing-control">
                    <RadioGroup
                        ariaLabel="Reference sizing method"
                        name="reference-sizing-method"
                        options={referenceSizingMethods}
                        value={characterBeingEdited.baseline.referenceSizingMethod}
                        onValueChange={setReferenceSizingMethod}
                    />
                </div>

                <div class="reference-measurement-row">
                    <label class="reference-measurement-input">
                        <span>Reference length</span>

                        <TextEntry
                            value={targetLengthText}
                            onValueChange={setTargetLength}
                            placeholderText="Length"
                        />
                    </label>

                    <div
                        class="measurement-unit-control"
                    >
                        <RadioGroup
                            ariaLabel="Measurement unit"
                            name="reference-measurement-unit"
                            options={measurementUnits}
                            value={characterBeingEdited.baseline.measurementUnit}
                            onValueChange={setMeasurementUnit}
                        />
                    </div>

                    <label class="reference-label-input">
                        <span class="visually-hidden">Reference label</span>

                        <TextEntry
                            value={characterBeingEdited.baseline.descriptor}
                            onValueChange={value => characterBeingEdited.baseline.descriptor = value}
                            placeholderText="to the shoulder"
                        />
                    </label>
                </div>

                {#if characterBeingEdited.baseline.referenceSizingMethod === "pixel_measurement"}
                    <div class="pixel-measurement-row">
                        <label class="pixel-measurement-input">
                            <span>Pixel measurement</span>

                            <div class="pixel-measurement-value">
                                <TextEntry
                                    value={pixelMeasurementText}
                                    onValueChange={setPixelMeasurement}
                                    placeholderText="Pixels"
                                />

                                <span>px</span>
                            </div>
                        </label>
                    </div>
                {:else}
                    <div
                        class="baseline-mode-control"
                    >
                        <RadioGroup
                            ariaLabel="Reference curve mode"
                            name="reference-curve-mode"
                            options={baselineEditModes}
                            value={store.characterManager.baselineEditMode}
                            onValueChange={setBaselineEditMode}
                        />
                    </div>
                {/if}
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

.reference-measurement-input,
.pixel-measurement-input {
    display: grid;
    grid-template-columns: max-content minmax(5.5rem, 7rem);
    gap: 0.5rem;
    align-items: center;
    min-width: 0;

    > span {
        white-space: nowrap;
    }
}

.pixel-measurement-input {
    grid-template-columns: max-content minmax(7rem, 8.5rem);
}

.pixel-measurement-value {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    gap: 0.5rem;
    align-items: center;
    min-width: 0;
}

.reference-label-input {
    display: grid;
    min-width: 0;
}

.pixel-measurement-row {
    display: grid;
    grid-template-columns: minmax(13rem, max-content);
    min-width: 0;
}


.reference-sizing-control,
.measurement-unit-control,
.baseline-mode-control {
    display: grid;
    min-width: 0;
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

    .reference-measurement-input,
    .pixel-measurement-input {
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

    .pixel-measurement-row {
        grid-template-columns: minmax(0, 1fr);
    }

}
</style>
