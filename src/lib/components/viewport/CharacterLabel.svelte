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

<character-label
    class:has-bg={hasBg}
>
    <character-label-name>
        {character.name}
    </character-label-name>

    {#if character.sonaIdentities.length > 0}
        <character-label-identity-list>
            Sona of
            {#each character.sonaIdentities as identity (identity.id)}
                <AuthorBadge
                    name={identity.name}
                    avatarUrl={identity.avatarUrl}
                />
            {/each}
        </character-label-identity-list>
    {/if}
        
    {#if character.ownerIdentities.length > 0}
        <character-label-identity-list>
            Owned by
            {#each character.ownerIdentities as identity (identity.id)}
                <AuthorBadge
                    name={identity.name}
                    avatarUrl={identity.avatarUrl}
                />
            {/each}
        </character-label-identity-list>
    {/if}
</character-label>

<style lang="scss">
character-label {
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

character-label-name {
    font-size: 1.5em;
}

character-label-identity-list {
    display: flex;
    flex-direction: column;
    gap: 0.375em;
}
</style>
