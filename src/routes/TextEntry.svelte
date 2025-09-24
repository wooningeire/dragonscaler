<script lang="ts">
import {TextInput} from "@vaie/hui";

let {
    value,
    onValueChange,
}: {
    value: string,
    onValueChange: (value: string) => void,
} = $props();
</script>

<TextInput
    {value}
    {onValueChange}
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