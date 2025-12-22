<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";

let {
    children,
    keyHeld = false,
    displayClass,
    buttonStyle = "text",
    ...buttonProps
}: {
    children: Snippet,
    keyHeld?: boolean,
    buttonStyle?: "text" | "image" | "icon",
    displayClass?: string,
} & HTMLButtonAttributes = $props();
</script>

<button {...buttonProps}>
    <button-display
        class:key-held={keyHeld}
        class:text-button={buttonStyle === "text"}
        class:icon-button={buttonStyle === "icon"}
        class={displayClass}
    >
        {@render children?.()}
    </button-display>
</button>

<style lang="scss">
$bg-col: oklch(1 0 0 / 0.75);
$bg-stripe-col: oklch(0.975 0.02 120 / 0.75);
$inset-box-shadow: 0 1rem 4rem 2rem oklch(0.6 0.1 120 / 0.125) inset;


button {
    margin: 0;
    padding: 0;
    display: grid;
    place-items: stretch;

    border: none;
    background: none;

    cursor: pointer;


    button-display {
        display: block;

        border-radius: 1rem;
        background: $bg-col;
        box-shadow:
            0 0.25rem 1rem 0.5rem oklch(0.75 0.05 140 / 0.5),
            $inset-box-shadow;

        pointer-events: none;
        overflow: hidden;

        backdrop-filter: blur(4px);

        transition:
            transform 0.25s cubic-bezier(0,2.75,.47,1),
            box-shadow 0.1s cubic-bezier(0,1,.47,1),
            filter 0.25s ease;

        &.text-button {
            padding: 0.25rem 1rem;
        }

        &.icon-button {
            padding: 0.5rem;
        }
    }

    &:is(:hover, :focus-visible) > button-display,
    button-display.key-held {
        border-color: currentcolor;

        transform: translateY(-0.125rem) scale(1.05);

        animation: sliding-background 1s infinite linear;
        background-image: repeating-linear-gradient(
            135deg,
            $bg-col 0,
            $bg-col 1rem,
            $bg-stripe-col 1rem,
            $bg-stripe-col 2rem,
        );
        background-size: calc(100% + 3rem) calc(100% + 3rem);

        @keyframes sliding-background {
            from {
                background-position: -2.828427rem -2.828427rem; // 2 * sqrt(2)
            }
            to {
                background-position: 0 0;
            }
        }
    }

    &:active > button-display,
    button-display.key-held {
        transform: translateY(0.0625rem) scale(0.95);
    }

    &[disabled] {
        pointer-events: none;
        opacity: 0.3;
    }
}
</style>