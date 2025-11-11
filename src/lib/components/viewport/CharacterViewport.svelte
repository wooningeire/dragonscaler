<script lang="ts">
import { currentCharacters } from "$lib/state/characters.svelte";
    import { currentNewCharacter } from "$lib/state/NewCharacter.svelte";
    import CharacterCard from "../../../routes/CharacterCard.svelte";
import CharacterDisplay from "./CharacterDisplay.svelte";

const PX_PER_M = 144;

const characters = $derived(currentCharacters());
const newCharacter = $derived(currentNewCharacter());

const offsets = $derived.by(() => {
    const offsets: number[] = [0];

    for (let i = 1; i < characters.length; i++) {
        offsets.push(offsets[i - 1] + characters[i - 1].actualWidth);
    }

    return offsets;
});
</script>

<div
    class="character-viewport"
    style:--scale={PX_PER_M}
>
    <div
        class="viewport"
    >
        {#each characters as character, i}
            <CharacterDisplay
                referenceCurve={character.referenceCurve}
                imageSrc={character.imageSrc}
                name={character.name}
                aspectRatio={character.aspectRatio}
                x={offsets[i]}
                y={0}
            />
        {/each}

        {#if newCharacter !== null}
            <!-- <CharacterDisplay
                
            /> -->
        {/if}
    </div>
</div>

<style lang="scss">
.character-viewport {
    grid-area: 1/1;

    display: grid;
    place-items: stretch;

    overflow: hidden;

    background:
        repeating-linear-gradient(
            to right,
            oklch(0.95 0.04 120) 0,
            oklch(0.95 0.04 120) 1px,
            oklch(0 0 0 / 0) 1px,
            oklch(0 0 0 / 0) calc(var(--scale) * 1px),
        ),
        repeating-linear-gradient(
            to bottom,
            oklch(0.95 0.04 120) 0,
            oklch(0.95 0.04 120) 1px,
            oklch(0 0 0 / 0) 1px,
            oklch(0 0 0 / 0) calc(var(--scale) * 1px),
        );
}

.viewport {
    position: relative;
}
</style>