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
        
    {#if character.owner !== null}
        <AuthorBadge
            name={character.owner.name}
            avatarUrl={character.owner.avatarUrl}
        />
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
</style>