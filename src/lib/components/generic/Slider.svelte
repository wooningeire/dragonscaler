<script lang="ts">
let { 
    value = $bindable(),
    min = 0,
    max = 1,
    step = 0.01,
    label,
    disabled = false
}: {
    value: number,
    min?: number,
    max?: number,
    step?: number,
    label?: string,
    disabled?: boolean
} = $props();

</script>

<div class="slider-container" class:disabled>
    {#if label}
        <label for="slider">{label}</label>
    {/if}
    <input 
        type="range" 
        id="slider" 
        {min} 
        {max} 
        {step} 
        bind:value 
        {disabled}
    />
</div>

<style lang="scss">
    .slider-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        
        font-family: var(--font-body);
        color: var(--text-1);

        &.disabled {
            opacity: 0.5;
            pointer-events: none;
        }
    }
    label {
        font-size: 0.85rem;
        font-weight: 500;
        user-select: none;
    }
</style>
