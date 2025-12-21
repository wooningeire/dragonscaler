<script lang="ts">
let {
    avatarUrl,
    name,
}: {
    avatarUrl: string,
    name: string,
} = $props();
</script>

<div class="author-badge">
    <img src={avatarUrl} alt="{name} avatar" />
    
    {name}
</div>

<style lang="scss">
.author-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;

    
    img {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
    }
}
</style>