<script lang="ts">
import "./index.scss";

import Overlays from "../lib/components/overlays/Overlays.svelte";
import CharacterViewport from "../lib/components/viewport/CharacterViewport.svelte";
import { onMount } from "svelte";
import { store } from "$lib/types/Store.svelte";
import { Character } from "$lib/types/Character.svelte";
import { Baseline } from "$lib/types/Baseline.svelte";

type DragonscalerDebugWindow = typeof window & {
    __dragonscalerDebug?: {
        store: typeof store,
        Character: typeof Character,
        Baseline: typeof Baseline,
        initialLoadPromise: Promise<void>,
    },
};

onMount(async () => {
    const initialLoadPromise = Promise.all([
        store.databaseStore.loadUserRecord(),
        store.loadCharacters(),
    ]).then(() => {});

    if (import.meta.env.DEV) {
        (window as DragonscalerDebugWindow).__dragonscalerDebug = {
            store,
            Character,
            Baseline,
            initialLoadPromise,
        };
    }

    await initialLoadPromise;
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
