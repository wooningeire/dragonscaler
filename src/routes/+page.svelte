<script lang="ts">
import "./index.scss";

import Overlays from "./Overlays.svelte";
import CharacterViewer from "./CharacterViewer.svelte";
import type { Character } from "./Character.svelte";

let characters = $state<Character[]>([]);
const addCharacter = (character: Character) => {
    characters.push(character);
};
</script>

<main>
    <CharacterViewer {characters} />
    <Overlays
        {characters}
        onAddCharacter={addCharacter}
    />
</main>

<style lang="scss">

main {
    width: 100vw;
    height: 100vh;

    display: grid;
    place-items: stretch;
}
</style>