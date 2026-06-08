<script lang="ts">
let {
    avatarUrl,
    name,
}: {
    avatarUrl: string | null,
    name: string,
} = $props();
</script>

<div class="author-badge">
    {#if avatarUrl !== null}
        <img src={avatarUrl} alt="{name} avatar" />
    {:else}
        <div class="avatar-placeholder" aria-hidden="true"></div>
    {/if}
    
    <span>{name}</span>
</div>

<style lang="scss">
$avatar-size: 1.5rem;

.author-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;

    img,
    .avatar-placeholder {
        width: $avatar-size;
        height: $avatar-size;
        border-radius: 50%;
    }

    .avatar-placeholder {
        background: oklch(0.85 0.02 185);
    }
}
</style>
