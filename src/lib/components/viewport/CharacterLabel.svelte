<script lang="ts">
import AuthorBadge from "./AuthorBadge.svelte";
import type { Character } from "$lib/types/Character.svelte";

let {
    character,
}: {
    character: Character,
} = $props();
</script>

<div class="character-label">
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
    gap: 0.25rem;

    text-align: left;
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
