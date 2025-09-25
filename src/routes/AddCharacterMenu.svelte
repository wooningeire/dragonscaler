<script lang="ts">
import { Character } from "../lib/types/Character.svelte";
import { ReferenceCurve } from "../lib/types/ReferenceCurve.svelte";
import TextEntry from "./TextEntry.svelte";
import { addCharacter } from "$lib/state/characters.svelte";
import { currentNewCharacter, deleteNewCharacter } from "$lib/state/NewCharacter.svelte";


const newCharacter = $derived(currentNewCharacter()!);


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
    const url = URL.createObjectURL(file);

    const img = new Image();
    img.addEventListener("load", () => {
        newCharacter.image = {
            src: url,
            dimensions: {
                width: img.width,
                height: img.height,
            },
        };
        loading = false;
    });
    img.src = url;
};

const submit = () => {
    if (newCharacter.image === null) return;

    const character = new Character({
        imageSrc: newCharacter.image.src,
        imageDimensions: newCharacter.image.dimensions,
        name: newCharacter.name,
        referenceCurve: new ReferenceCurve({
            points: newCharacter.points,
            targetLength: newCharacter.targetLength,
            descriptor: newCharacter.descriptor,
        }),
    });
    addCharacter(character);

    deleteNewCharacter();
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
        value={newCharacter.targetLength.toString()}
        onValueChange={value => newCharacter.targetLength = Number(value)}
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