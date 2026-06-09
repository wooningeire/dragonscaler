<script lang="ts">
import {TextInput} from "@vaie/hui";

let {
    value,
    onValueChange,
    placeholderText,
}: {
    value: string,
    onValueChange: (value: string) => void,
    placeholderText: string,
} = $props();
</script>

<TextInput
    {value}
    {onValueChange}
    {placeholderText}
    multiline
>
    {#snippet container({contents, valid})}
        <div
            class="text-input-container"
            class:invalid={!valid}
        >
            {@render contents()}
        </div>
    {/snippet}

    {#snippet placeholder({placeholderText})}
        <div class="text-input-placeholder">{placeholderText}</div>
    {/snippet}

    {#snippet input({localText, onLocalTextChange, el, onElChange, elProps})}
        <div
            bind:this={() => el, onElChange}
            bind:textContent={() => localText, onLocalTextChange}
            class="text-input-input"
            {...elProps}
            contenteditable
        ></div>
    {/snippet}
</TextInput>


<style lang="scss">
.text-input-container {
    display: grid;
    place-items: stretch;

    background: oklch(1 0 0 / 0.75);

    box-shadow:
        0 0.25rem 1rem 0.5rem oklch(0.75 0.05 140 / 0.5),
        0 0.25rem 1rem oklch(0.75 0.05 140 / 0.5) inset;
    border: 0.0625rem solid oklch(0 0 0 / 0.25);

    &,
    > * {
        border-radius: 0.5rem;
    }

    > * {
        grid-area: 1/1;
    }

    &.invalid {
        border-color: oklch(0.7 0.15 0.98turn);
    }
}

.text-input-placeholder {
    opacity: 0.3333333;
    pointer-events: none;
    user-select: none;
}

.text-input-input,
.text-input-placeholder {
    padding: 0.5rem;
    border-radius: 0.5rem;

    text-align: center;
}
</style>