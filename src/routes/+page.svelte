<script lang="ts">
import "./index.scss";

import Overlays from "../lib/components/overlays/Overlays.svelte";
import CharacterViewport from "../lib/components/viewport/CharacterViewport.svelte";
import { onMount } from "svelte";
import { store } from "$lib/types/Store.svelte";

onMount(async () => {
    await store.loadCharacters();
});
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