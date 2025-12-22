<script lang="ts">
import { Character } from "$lib/types/Character.svelte";
import TextEntry from "$lib/components/generic/TextEntry.svelte";
import { CharacterImage } from "$lib/types/CharacterImage.svelte";
import Button from "../generic/Button.svelte";
import { store } from "$lib/types/Store.svelte";
    import { onMount } from "svelte";

const characterBeingEdited = $derived(store.characterManager.selectedCharacter!);

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

    if (characterBeingEdited.uploaded) {
        console.log(characterBeingEdited);
        await store.databaseStore.updateCharacter(characterBeingEdited);
    } else {
        const createResult = await store.databaseStore.createCharacter(characterBeingEdited);
        characterBeingEdited.uploaded = true;

        characterBeingEdited.id = createResult.id;
    }
};


let originalCharacter: Character;
onMount(() => {
    originalCharacter = characterBeingEdited.clone();
});
const cancel = () => {
    if (characterBeingEdited.uploaded) {
        characterBeingEdited.copy(originalCharacter);
    } else {
        store.characterManager.characters.splice(store.characterManager.characters.indexOf(characterBeingEdited), 1);
    }

    store.characterManager.selectedCharacter = null;
};

const canSubmit = $derived(characterBeingEdited.image !== null && characterBeingEdited.name !== "");
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

        <div>
            Baseline

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

.buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>