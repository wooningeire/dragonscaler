<script lang="ts">
import type { Character } from "$lib/types/Character.svelte";
import CenterView from "./CenterView.svelte";
import BaselineView from "./BaselineView.svelte";
import { store } from "$lib/types/Store.svelte";
import CharacterLabel from "./CharacterLabel.svelte";

let {
    character,
    x,
    y,
}: {
    character: Character,
    x: number,
    y: number,
} = $props();

const editing = $derived(character === store.characterManager.selectedCharacter);
const characterViewportScale = $derived(store.camera.scalePxPerMeter * character.baseline.scaleFac);
const overlayOpacity = $derived(Math.exp(-((Math.log(characterViewportScale / 256)) ** 2)));
</script>

<div
    class="character-display"
    style:--x={x}
    style:--y={y}
    style:--height={character.baseline.scaleFac}
    style:--center-x={character.center.x}
    style:--center-y={character.center.y}
>
    {#if character.image !== null}
        <img
            src={character.image.src}
            alt={character.name}
        />
    {:else}
        <div class="image-placeholder"></div>
    {/if}

    <BaselineView
        baseline={character.baseline}
        aspect={character.aspect}
        editable={editing}
        onDraw={points => {
            const oldPoints = character.baseline.points;
            character.baseline.points = points;
            
            if (character.baseline.arcLength === 0) {
                character.baseline.points = oldPoints;
            }
        }}
    />


    {#if editing}
        <CenterView
            center={character.center}
            scaleFac={character.baseline.scaleFac}
            onCenterChange={center => character.center = center}
        />
    {/if}

    <div
        class="character-label-container"
        style:opacity={overlayOpacity}
        style:pointer-events={overlayOpacity < 0.3333333 ? "none" : "auto"}
    >
        <CharacterLabel character={character} />
    </div>
</div>

<style lang="scss">
.character-display {
    --character-scale: calc(var(--viewport-scale) * var(--height));

    position: absolute;
    left: calc(var(--x) * var(--viewport-scale) * 1px);
    // bottom: calc(var(--y) * var(--viewport-scale) * 1px);
    transform: translateY(/* calc(var(--center-x) * -100%),  */calc(var(--center-y) * 100%)) translateY(-100%);
    display: grid;

    > :global(*) {
        grid-area: 1/1;
    }

    &,
    > img,
    > .image-placeholder {
        height: calc(var(--character-scale) * 1px);
    }
}

.image-placeholder {
    background: oklch(0.9 0 0);
}

.character-label-container {
    bottom: 0;
    transform: translateY(100%) scale(calc(var(--character-scale) / 256));
    transform-origin: 0 0;
    position: absolute;
    margin-top: 0.5rem;
}
</style>