<script lang="ts">
import "./index.scss";

import Overlays from "./Overlays.svelte";
import CharacterViewer from "./CharacterViewer.svelte";
</script>

<main>
    <CharacterViewer />
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