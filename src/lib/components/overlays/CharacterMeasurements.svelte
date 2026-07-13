<script lang="ts">
import Button from "$lib/components/generic/Button.svelte";
import RadioGroup from "$lib/components/generic/RadioGroup.svelte";
import TextEntry from "$lib/components/generic/TextEntry.svelte";
import type { Baseline } from "$lib/types/Baseline.svelte";
import type { Character } from "$lib/types/Character.svelte";
import { store } from "$lib/types/Store.svelte";
import {
    baselineEditModes,
    isBaselineEditMode,
} from "$lib/util/baselineGeometry";
import {
    formatMeasurementValue,
    isMeasurementUnit,
    measurementUnits,
    measurementUnitToMeters,
} from "$lib/util/measurementUnits";
import { formatPixelMeasurementValue } from "$lib/util/referenceSizing";

let {
    character,
    disabled = false,
}: {
    character: Character,
    disabled?: boolean,
} = $props();

const referenceMeasurement = $derived(character.baseline);
const referenceUnit = $derived(referenceMeasurement.measurementUnit);
const pixelCountSelected = $derived(
    referenceMeasurement.referenceSizingMethod === "pixel_measurement",
);
const activeMeasurementIsReference = $derived(
    store.characterManager.activeMeasurementId === null
    || store.characterManager.activeMeasurementId === referenceMeasurement.id,
);
const measurementRedrawModes = $derived([
    ...baselineEditModes,
    {
        id: "pixel_measurement",
        label: "Pixel count",
        disabled: !activeMeasurementIsReference,
    },
]);
const measurementRedrawMode = $derived(
    activeMeasurementIsReference && pixelCountSelected
        ? "pixel_measurement"
        : store.characterManager.baselineEditMode,
);

const measurementName = (
    measurement: Baseline,
    index: number,
) => measurement.descriptor.trim() || `Measurement ${index + 1}`;

const formattedMeasurementValue = (measurement: Baseline) => {
    const lengthMeters = character.measurementLengthMeters(measurement);
    if (lengthMeters === null) return "";

    return formatMeasurementValue(
        lengthMeters,
        referenceUnit,
    );
};

const setMeasurementValue = (
    measurement: Baseline,
    value: string,
) => {
    if (measurement.id !== character.referenceMeasurementId) return;

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
        referenceMeasurement.targetLength = Number.NaN;
        return;
    }

    referenceMeasurement.targetLength = measurementUnitToMeters(
        parsedValue,
        referenceUnit,
    );
};

const setMeasurementUnit = (value: string) => {
    if (!isMeasurementUnit(value)) return;

    referenceMeasurement.measurementUnit = value;
};

const setPixelMeasurement = (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue === "") {
        referenceMeasurement.pixelMeasurementPx = null;
        return;
    }

    const parsedValue = Number(trimmedValue);
    referenceMeasurement.pixelMeasurementPx = Number.isFinite(parsedValue) && parsedValue > 0
        ? parsedValue
        : null;
};

const setMeasurementRedrawMode = (value: string) => {
    if (value === "pixel_measurement") {
        if (!activeMeasurementIsReference) return;

        referenceMeasurement.referenceSizingMethod = "pixel_measurement";
        store.characterManager.setActiveMeasurementId(referenceMeasurement.id);
        return;
    }

    if (!isBaselineEditMode(value)) return;

    if (activeMeasurementIsReference) {
        referenceMeasurement.referenceSizingMethod = "measurement_line";
    }
    store.characterManager.setBaselineEditMode(value);
};

const selectMeasurement = (measurement: Baseline) => {
    store.characterManager.setActiveMeasurementId(measurement.id);
    store.characterManager.setShoulderMarkingActive(false);
};

const selectReferenceMeasurement = (measurement: Baseline) => {
    character.setReferenceMeasurement(measurement);
    selectMeasurement(measurement);
};

const selectShoulderMeasurement = (measurement: Baseline) => {
    character.setShoulderMeasurement(measurement);
    selectMeasurement(measurement);
};

const addMeasurement = () => {
    selectMeasurement(character.addMeasurement());
};

const removeMeasurement = (measurement: Baseline) => {
    character.removeMeasurement(measurement);

    if (store.characterManager.activeMeasurementId === measurement.id) {
        store.characterManager.setActiveMeasurementId(character.baseline.id);
    }
};

</script>

<section class="character-measurements" aria-labelledby="character-measurements-title">
    <header>
        <h3 id="character-measurements-title">Measurements</h3>

        <div class="list-actions">
            <Button
                onclick={addMeasurement}
                {disabled}
            >
                Add measurement
            </Button>
        </div>
    </header>

    <div class="measurement-list" role="list">
        <div class="measurement-list-head" aria-hidden="true">
            <span>Measurement</span>
            <span>Value ({referenceUnit})</span>
            <span>Is reference?</span>
            <span>Is to shoulder?</span>
            <span>Actions</span>
        </div>

        {#each character.measurements as measurement, index (measurement.id)}
            {@const name = measurementName(measurement, index)}
            {@const isReference = measurement.id === character.referenceMeasurementId}
            {@const isToShoulder = measurement.id === character.shoulderMeasurementId}
            {@const isActive = (
                measurement.id === store.characterManager.activeMeasurementId
                || (store.characterManager.activeMeasurementId === null && isReference)
            )}

            <article
                class="measurement-row"
                class:active={isActive}
                role="listitem"
                data-measurement-id={measurement.id}
            >
                <label class="measurement-label">
                    <span class="visually-hidden">Measurement label</span>

                    <TextEntry
                        value={measurement.descriptor}
                        onValueChange={value => measurement.descriptor = value}
                        placeholderText={name}
                        readonly={!isReference}
                        ariaLabel={`${name} label`}
                    />
                </label>

                <div
                    class="measurement-value"
                    class:computed={!isReference}
                >
                    <TextEntry
                        value={formattedMeasurementValue(measurement)}
                        onValueChange={value => setMeasurementValue(
                            measurement,
                            value,
                        )}
                        placeholderText="-"
                        readonly={!isReference}
                        ariaLabel={`${name} value`}
                    />
                </div>

                <label class="role-radio">
                    <input
                        type="radio"
                        name="character-reference-measurement"
                        checked={isReference}
                        onchange={() => selectReferenceMeasurement(measurement)}
                        aria-label={`Use ${name} as reference`}
                        {disabled}
                    />

                    <span class="visually-hidden">Is reference?</span>
                </label>

                <label class="role-radio">
                    <input
                        type="radio"
                        name="character-shoulder-measurement"
                        checked={isToShoulder}
                        onchange={() => selectShoulderMeasurement(measurement)}
                        aria-label={`Use ${name} as shoulder measurement`}
                        disabled={disabled || (
                            isReference
                            && measurement.referenceSizingMethod === "pixel_measurement"
                        )}
                    />

                    <span class="visually-hidden">Is to shoulder?</span>
                </label>

                <div class="measurement-actions">
                    <Button
                        onclick={() => selectMeasurement(measurement)}
                        {disabled}
                        aria-pressed={isActive}
                    >
                        Edit line
                    </Button>

                    <Button
                        onclick={() => removeMeasurement(measurement)}
                        disabled={disabled || character.measurements.length === 1}
                        red
                    >
                        Remove
                    </Button>
                </div>
            </article>
        {/each}
    </div>

    <div class="measurement-controls">
        <div class="measurement-redraw-control">
            <span class="control-label">Redraw measurement as</span>

            <RadioGroup
                ariaLabel="Redraw measurement as"
                name="measurement-redraw-mode"
                options={measurementRedrawModes}
                value={measurementRedrawMode}
                onValueChange={setMeasurementRedrawMode}
            />
        </div>

        <div class="measurement-unit-control">
            <RadioGroup
                ariaLabel="Measurement unit"
                name="reference-measurement-unit"
                options={measurementUnits}
                value={referenceUnit}
                onValueChange={setMeasurementUnit}
            />
        </div>

        {#if measurementRedrawMode === "pixel_measurement"}
            <label class="pixel-measurement-input">
                <span>Pixel count</span>

                <div class="pixel-measurement-value">
                    <TextEntry
                        value={formatPixelMeasurementValue(
                            referenceMeasurement.pixelMeasurementPx,
                        )}
                        onValueChange={setPixelMeasurement}
                        placeholderText="Pixels"
                        ariaLabel="Reference pixel count"
                    />

                    <span>px</span>
                </div>
            </label>
        {/if}
    </div>
</section>

<style lang="scss">
.character-measurements {
    display: grid;
    gap: 0.5rem;
    min-width: 0;

    > header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;

        h3 {
            margin: 0;

            font-size: 1rem;
        }
    }
}

.list-actions,
.measurement-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
}

.measurement-list {
    display: grid;
    gap: 0.375rem;
    min-width: 0;
}

.measurement-list-head,
.measurement-row {
    display: grid;
    grid-template-columns: minmax(8rem, 1.4fr) minmax(6rem, 0.8fr) minmax(5.5rem, 0.5fr) minmax(6.5rem, 0.6fr) minmax(10rem, 1fr);
    gap: 0.5rem;
    align-items: center;
    min-width: 0;
}

.measurement-list-head {
    padding: 0 0.5rem;

    color: oklch(0.4 0.03 145);
    font-size: 0.75rem;

    span:nth-child(3),
    span:nth-child(4) {
        text-align: center;
    }
}

.measurement-row {
    padding: 0.5rem;

    border: 0.0625rem solid oklch(0.76 0.04 145 / 0.65);
    border-radius: 0.5rem;
    background: oklch(0.98 0.015 145 / 0.65);

    &.active {
        border-color: oklch(0.52 0.13 145 / 0.8);
        background: oklch(0.96 0.035 145 / 0.75);
    }
}

.measurement-label,
.measurement-value {
    display: grid;
    min-width: 0;
}

.role-radio {
    display: grid;
    place-items: center;

    input {
        width: 1.125rem;
        height: 1.125rem;

        accent-color: oklch(0.48 0.14 145);
        cursor: pointer;
    }
}

.measurement-actions {
    justify-content: flex-start;

    :global(button-display.text-button) {
        padding-inline: 0.5rem;
    }
}

.measurement-value.computed {
    :global(.text-input-container) {
        border-color: transparent;
        background: transparent;
        box-shadow: none;
    }
}

.measurement-controls {
    display: grid;
    grid-template-columns: minmax(22rem, 2fr) minmax(7rem, 0.6fr) minmax(10rem, 1fr);
    gap: 0.5rem;
    min-width: 0;
}

.measurement-redraw-control,
.measurement-unit-control,
.pixel-measurement-input {
    display: grid;
    min-width: 0;
}

.measurement-redraw-control {
    gap: 0.25rem;
}

.control-label {
    color: oklch(0.4 0.03 145);
    font-size: 0.75rem;
}

.pixel-measurement-input {
    grid-template-columns: max-content minmax(7rem, 1fr);
    gap: 0.5rem;
    align-items: center;
}

.pixel-measurement-value {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    gap: 0.5rem;
    align-items: center;
    min-width: 0;
}

.visually-hidden {
    position: fixed;
    width: 0.0625rem;
    height: 0.0625rem;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}

@media (max-width: 56rem) {
    .measurement-list-head {
        display: none;
    }

    .measurement-row {
        grid-template-columns: minmax(0, 1fr) minmax(6rem, max-content) max-content max-content;
    }

    .measurement-actions {
        grid-column: 1 / -1;
    }

    .measurement-controls {
        grid-template-columns: minmax(0, 1fr) max-content;
    }

    .measurement-redraw-control,
    .pixel-measurement-input {
        grid-column: 1 / -1;
    }
}

@media (max-width: 36rem) {
    .character-measurements > header {
        align-items: stretch;
        flex-direction: column;
    }

    .measurement-row,
    .measurement-controls {
        grid-template-columns: minmax(0, 1fr) max-content max-content;
    }

    .measurement-value,
    .measurement-actions,
    .measurement-redraw-control,
    .measurement-unit-control,
    .pixel-measurement-input {
        grid-column: 1 / -1;
    }
}
</style>
