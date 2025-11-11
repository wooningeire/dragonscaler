<script lang="ts">
import type { Character } from "$lib/types/Character.svelte";
import type { CharacterManager } from "$lib/types/CharacterManager.svelte";
import CenterView from "./CenterView.svelte";
import ReferenceCurveView from "./ReferenceCurveView.svelte";

let {
    character,
    characterManager,
    x,
    y,
}: {
    character: Character,
    characterManager: CharacterManager,
    x: number,
    y: number,
} = $props();

const editing = $derived(character === characterManager.characterBeingEdited);
</script>

<div
    class="character-display"
    style:--x={x}
    style:--y={y}
    style:--height={character.referenceCurve.scaleFac}
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

    <ReferenceCurveView
        referenceCurve={character.referenceCurve}
        aspect={character.aspect}
        editable={editing}
        onDraw={points => {
            const oldPoints = character.referenceCurve.points;
            character.referenceCurve.points = points;
            
            if (character.referenceCurve.arcLength === 0) {
                character.referenceCurve.points = oldPoints;
            }
        }}
    />


    {#if editing}
        <CenterView
            center={character.center}
            scaleFac={character.referenceCurve.scaleFac}
            onCenterChange={center => character.center = center}
        />
    {/if}
</div>

<style lang="scss">
.character-display {
    position: absolute;
    left: calc(var(--x) * var(--scale) * 1px);
    // bottom: calc(var(--y) * var(--scale) * 1px);
    transform: translateY(/* calc(var(--center-x) * -100%),  */calc(var(--center-y) * 100%)) translate(-50%, -100%);
    display: grid;

    > :global(*) {
        grid-area: 1/1;
    }

    &,
    > img,
    > .image-placeholder {
        height: calc(var(--height) * var(--scale) * 1px);
    }
}

.image-placeholder {
    background: oklch(0.9 0 0);
}
</style>