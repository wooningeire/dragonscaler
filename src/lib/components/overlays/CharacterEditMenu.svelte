<script lang="ts">
import { Character } from "$lib/types/Character.svelte";
import TextEntry from "$lib/components/generic/TextEntry.svelte";
import { CharacterImage } from "$lib/types/CharacterImage.svelte";
import Button from "../generic/Button.svelte";
import { store } from "$lib/types/Store.svelte";

const characterBeingEdited = $derived(store.characterManager.characterBeingEdited!);

let fileInput: HTMLInputElement;

let loading = $state(false);
const loadFile = async () => {
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
    if (characterBeingEdited.image === null) return;

    const createResult = await store.databaseStore.createCharacter(characterBeingEdited);

    characterBeingEdited.id = createResult.id;
    store.characterManager.characterBeingEdited = null;
};
</script>

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

        <label>
            Baseline length

            <TextEntry
                value={characterBeingEdited.referenceCurve.targetLength.toString()}
                onValueChange={value => characterBeingEdited.referenceCurve.targetLength = Number(value)}
                placeholderText="Target length"
            />
        </label>

        <label>
            Baseline descriptor

            <TextEntry
                value={characterBeingEdited.referenceCurve.descriptor}
                onValueChange={value => characterBeingEdited.referenceCurve.descriptor = value}
                placeholderText="to the shoulder"
            />
        </label>
    </div>



    <div class="submit-button">
        <Button onclick={submit}>Submit</Button>
    </div>
</div>

<style lang="scss">
$image-size: 12rem;

.add-character-menu {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.character-form-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 20rem;
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
</style>