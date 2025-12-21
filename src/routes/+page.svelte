<script lang="ts">
import "./index.scss";

import Overlays from "../lib/components/overlays/Overlays.svelte";
import CharacterViewport from "../lib/components/viewport/CharacterViewport.svelte";
import { onMount } from "svelte";
import { store } from "$lib/types/Store.svelte";

onMount(async () => {
    await Promise.all([
        store.databaseStore.loadUserRecord(),
        store.loadCharacters(),
    ])
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

    background: radial-gradient(oklch(0.995 0.01 150), oklch(0.975 0.05 130));
}
</style>