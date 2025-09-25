<script lang="ts">
import { Character } from "./Character.svelte";
    import { ReferenceCurve } from "./ReferenceCurve.svelte";
    import TextEntry from "./TextEntry.svelte";

let {
    onSubmit,
    onCancel,
}: {
    onSubmit: (character: Character) => void,
    onCancel: () => void,
} = $props();

let image: {
    src: string,
    dimensions: {
        width: number,
        height: number,
    },
} | null = $state.raw(null);

let name = $state("");
let points = $state.raw([
    {x: 0, y: 0},
    {x: 0, y: 1},
]);
let targetLength = $state(1);
let descriptor = $state("");

let fileInput: HTMLInputElement;

let loading = $state(false);
const loadFile = async () => {
    if (fileInput.files === null || fileInput.files.length === 0) return;

    if (loading) return;

    loading = true;

    if (image !== null) {
        URL.revokeObjectURL(image.src);
    }

    const file = fileInput.files[0];
    const url = URL.createObjectURL(file);

    const img = new Image();
    img.addEventListener("load", () => {
        image = {
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
    if (image === null) return;

    onSubmit(new Character({
        imageSrc: image.src,
        imageDimensions: image.dimensions,
        name,
        referenceCurve: new ReferenceCurve({
            points,
            targetLength,
            descriptor,
        }),
    }));
};
</script>

<div class="add-character-menu">
    <button
        class="character-image"
        onclick={() => fileInput.click()}
        disabled={loading}
    >
        {#if image !== null}
            <img
                src={image.src}
                alt={name}
            />
        {/if}
    </button>

    <TextEntry
        value={name}
        onValueChange={value => name = value}
        placeholderText="Name"
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