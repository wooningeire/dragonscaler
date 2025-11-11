<script lang="ts">
import "./index.scss";

import Overlays from "../lib/components/overlays/Overlays.svelte";
import CharacterViewport from "../lib/components/viewport/CharacterViewport.svelte";
</script>

<main>
    <CharacterViewport />
    <Overlays />
</main>

<style lang="scss">

main {
    width: 100vw;
    height: 100vh;

    display: grid;
    place-items: stretch;
}
</style>