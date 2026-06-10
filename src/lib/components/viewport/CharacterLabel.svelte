<script lang="ts">
import AuthorBadge from "./AuthorBadge.svelte";
import type { Character } from "$lib/types/Character.svelte";

let {
    character,
    hasBg = false,
}: {
    character: Character,
    hasBg?: boolean,
} = $props();
</script>

<div
    class="character-label"
    class:has-bg={hasBg}
>
    <div class="character-name">
        {character.name}
    </div>
        
    {#if character.ownerIdentities.length > 0}
        <div class="character-owners">
            {#each character.ownerIdentities as ownerIdentity (ownerIdentity.id)}
                <AuthorBadge
                    name={ownerIdentity.name}
                    avatarUrl={ownerIdentity.avatarUrl}
                />
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
.character-label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;

    text-align: left;

    &.has-bg {
        padding: 0.5em 0.625em;
        border-radius: 0.625em;
        overflow: hidden;

        background: oklch(0.95 0.05 130 / 0.75);
        box-shadow: 0 0.375rem 1rem oklch(0.22 0.04 130 / 0.22);

        backdrop-filter: blur(1rem);
    }
}

.character-name {
    font-size: 1.5rem;
}

.character-owners {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
}
</style>
