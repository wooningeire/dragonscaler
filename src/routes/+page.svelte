<script lang="ts">
import "./index.scss";

import Overlays from "../lib/components/overlays/Overlays.svelte";
import CharacterViewport from "../lib/components/viewport/CharacterViewport.svelte";
import { CharacterManager } from "$lib/types/CharacterManager.svelte";

const characterManager = new CharacterManager();
</script>

<main>
    <CharacterViewport {characterManager} />
    <Overlays {characterManager} />
</main>

<style lang="scss">

main {
    width: 100vw;
    height: 100vh;

    display: grid;
    place-items: stretch;
}
</style>