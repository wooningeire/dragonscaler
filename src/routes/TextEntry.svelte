<script lang="ts">
import {TextInput} from "@vaie/hui";

let {
    value,
    onValueChange,
    placeholderText = "",
}: {
    value: string,
    onValueChange: (value: string) => void,
    placeholderText?: string,
} = $props();
</script>

<TextInput
    {value}
    {onValueChange}
    {placeholderText}
>
    {#snippet container({contents})}
        <div class="text-entry">
            {@render contents()}
        </div>
    {/snippet}
</TextInput>

<style lang="scss">
.text-entry {
    width: 8rem;
}
</style>