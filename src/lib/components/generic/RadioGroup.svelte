<script lang="ts" module>
export type RadioGroupOption = {
    id: string,
    label: string,
};
</script>

<script lang="ts">
import RadioGroupButtonHighlight from "./RadioGroupButtonHighlight.svelte";

let {
    ariaLabel,
    name,
    options,
    value,
    onValueChange,
}: {
    ariaLabel: string,
    name: string,
    options: RadioGroupOption[],
    value: string,
    onValueChange: (value: string) => void,
} = $props();

const selectedIndex = $derived(options.findIndex(option => option.id === value));
</script>

<radio-group
    role="radiogroup"
    aria-label={ariaLabel}
    style:--radio-group-option-count={options.length}
>
    <RadioGroupButtonHighlight
        optionCount={options.length}
        {selectedIndex}
    />

    <radio-group-options>
        {#each options as option (option.id)}
            <label class:active={value === option.id}>
                <input
                    type="radio"
                    {name}
                    value={option.id}
                    checked={value === option.id}
                    onchange={() => onValueChange(option.id)}
                />

                <span>{option.label}</span>
            </label>
        {/each}
    </radio-group-options>
</radio-group>

<style lang="scss">
radio-group {
    display: grid;
    padding: 0.125rem;

    border-radius: 0.5rem;
    background: oklch(0.98 0.02 135 / 0.8);
}

radio-group-options {
    grid-area: 1/1;
    z-index: 1;

    display: grid;
    grid-template-columns: repeat(var(--radio-group-option-count, 2), minmax(2.25rem, 1fr));
    gap: 0.125rem;
}

label {
    display: grid;
    grid-template-areas: "control";
    min-width: 0;

    cursor: pointer;
    user-select: none;

    input,
    span {
        grid-area: control;
    }

    input {
        width: 100%;
        height: 100%;

        opacity: 0;
        cursor: pointer;
    }

    span {
        display: grid;
        place-items: center;
        padding: 0.375rem 0.5rem;
        min-width: 0;

        border-radius: 0.375rem;
        color: oklch(0.28 0.06 145);
    }

    &.active span {
        color: oklch(0.22 0.08 145);
    }

    &:has(input:focus-visible) span {
        outline: 0.125rem solid oklch(0.42 0.12 145 / 0.7);
        outline-offset: -0.125rem;
    }
}
</style>
