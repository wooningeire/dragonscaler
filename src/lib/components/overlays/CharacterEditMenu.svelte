<script lang="ts">
import { Character } from "$lib/types/Character.svelte";
import TextEntry from "$lib/components/generic/TextEntry.svelte";
import { CharacterImage } from "$lib/types/CharacterImage.svelte";

const {
    newCharacter,
    onSubmit,
}: {
    newCharacter: Character,
    onSubmit: () => void,
} = $props();

let fileInput: HTMLInputElement;

let loading = $state(false);
const loadFile = async () => {
    if (fileInput.files === null || fileInput.files.length === 0) return;

    if (loading) return;

    loading = true;

    if (newCharacter.image !== null) {
        URL.revokeObjectURL(newCharacter.image.src);
    }

    const file = fileInput.files[0];
    newCharacter.image = await CharacterImage.fromFile(file);
    loading = false;
};

const submit = () => {
    if (newCharacter.image === null) return;

    onSubmit();
};
</script>

<div class="add-character-menu">
    <button
        class="character-image"
        onclick={() => fileInput.click()}
        disabled={loading}
    >
        {#if newCharacter.image !== null}
            <img
                src={newCharacter.image.src}
                alt={newCharacter.name}
            />
        {/if}
    </button>

    <TextEntry
        value={newCharacter.name}
        onValueChange={value => newCharacter.name = value}
        placeholderText="Name"
    />

    <TextEntry
        value={newCharacter.referenceCurve.targetLength.toString()}
        onValueChange={value => newCharacter.referenceCurve.targetLength = Number(value)}
        placeholderText="Target length"
    />

    <button onclick={submit}>Submit</button>


    <input
        type="file"
        bind:this={fileInput}
        oninput={loadFile}
    />

</div>

<style lang="scss">
$image-size: 15rem;

.add-character-menu {
    display: flex;
}

.character-image {
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