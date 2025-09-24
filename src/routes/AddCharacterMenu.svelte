<script lang="ts">
import { Character } from "./Character.svelte";
    import TextEntry from "./TextEntry.svelte";

let {
    onSubmit,
    onCancel,
}: {
    onSubmit: (character: Character) => void,
    onCancel: () => void,
} = $props();

let imageSrc: string | null = $state(null);
let name = $state("");

let fileInput: HTMLInputElement;

const loadFile = () => {
    if (fileInput.files === null || fileInput.files.length === 0) return;

    if (imageSrc !== null) {
        URL.revokeObjectURL(imageSrc);
    }

    const file = fileInput.files[0];
    const url = URL.createObjectURL(file);
    imageSrc = url;
};

const submit = () => {
    if (imageSrc === null) return;

    onSubmit(new Character({imageSrc, name}));
};
</script>

<div class="add-character-menu">
    <button
        class="character-image"
        onclick={() => fileInput.click()}
    >
        {#if imageSrc !== null}
            <img
                src={imageSrc}
                alt={name}
            />
        {/if}
    </button>

    <TextEntry
        value={name}
        onValueChange={value => name = value}
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