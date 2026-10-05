import type {
    CharacterImage,
    Dimensions,
} from "./CharacterImage.svelte";
import type { IdentitySummary } from "./Identity";
import type { Point } from "./Point";
import { Baseline } from "./Baseline.svelte";
import {
    pixelMeasurementImageLength as computePixelMeasurementImageLength,
} from "$lib/util/referenceSizing";
import { normalizeShoulderY } from "$lib/util/shoulderAltitude";

export class Character {
    id: string | null = $state(null);

    image: CharacterImage | null = $state()!;
    imageDimensions: Dimensions | null = $state(null);
    name: string = $state()!;
    anchor: Point = $state()!; // in image [0, 1] uv coordinates
    measurements: Baseline[] = $state([]);
    referenceMeasurementId: string = $state()!;
    shoulderMeasurementId: string | null = $state(null);
    formId: string | null = $state(null);
    referenceImageIds: string[] = $state([]);

    readonly pixelMeasurementImageLength = $derived.by(() => computePixelMeasurementImageLength(
        this.baseline.pixelMeasurementPx,
        resolvedImageDimensions(this.image, this.imageDimensions)?.height ?? null,
    ));
    readonly hasUsableReferenceSizing = $derived.by(() => (
        isPositiveFinite(this.referenceImageLength)
    ));
    readonly referenceImageLength = $derived.by(() => (
        this.baseline.referenceSizingMethod === "pixel_measurement"
            ? this.pixelMeasurementImageLength
            : positiveLength(this.baseline.arcLength)
    ));
    readonly scaleFac = $derived.by(() => (
        this.referenceImageLength === null
            ? Number.NaN
            : this.baseline.targetLength / this.referenceImageLength
    ));
    readonly validShoulderY = $derived(normalizeShoulderY({
        shoulderY: this.shoulderY,
        groundY: this.anchor.y,
    }));
    readonly shoulderAltitude = $derived.by(() => {
        const measurement = this.shoulderMeasurement;

        return measurement === null
            ? null
            : this.measurementLengthMeters(measurement);
    });
    readonly sortingAltitude = $derived(this.shoulderAltitude ?? this.scaleFac);
    readonly aspect = $derived.by(() => (
        imageAspect(resolvedImageDimensions(this.image, this.imageDimensions)) ?? 1
    ));
    readonly viewportWidth = $derived.by(() => this.scaleFac * this.aspect);

    ownerIdentities: IdentitySummary[] = $state([]);
    sonaIdentities: IdentitySummary[] = $state([]);

    uploaded: boolean = $state()!;

    constructor({
        id = null,
        image = null,
        imageDimensions = image?.dimensions ?? null,
        name = "",
        anchor,
        center,
        shoulderY = null,
        baseline = new Baseline(),
        measurements,
        referenceMeasurementId = null,
        shoulderMeasurementId = null,
        formId = null,
        referenceImageIds = [],
        ownerIdentities = [],
        sonaIdentities = [],
        uploaded = false,
    }: {
        id?: string | null,
        image?: CharacterImage | null,
        imageDimensions?: Dimensions | null,
        name?: string,
        anchor?: Point,
        /** @deprecated Use anchor. Kept for PocketBase center_point compatibility. */
        center?: Point,
        shoulderY?: number | null,
        baseline?: Baseline,
        measurements?: Baseline[],
        referenceMeasurementId?: string | null,
        shoulderMeasurementId?: string | null,
        formId?: string | null,
        referenceImageIds?: string[],
        ownerIdentities?: IdentitySummary[],
        sonaIdentities?: IdentitySummary[],
        uploaded?: boolean,
    } = {}) {
        this.id = id;
        this.image = image;
        this.imageDimensions = imageDimensions;
        this.name = name;
        this.anchor = anchor ?? center ?? {x: 0.5, y: 0};
        this.measurements = measurements === undefined || measurements.length === 0
            ? [baseline]
            : measurements;
        this.referenceMeasurementId = this.measurements.some(measurement => (
            measurement.id === referenceMeasurementId
        ))
            ? referenceMeasurementId!
            : this.measurements[0].id;
        this.shoulderMeasurementId = this.measurements.some(measurement => (
            measurement.id === shoulderMeasurementId
        ))
            ? shoulderMeasurementId
            : null;
        this.formId = formId;
        this.referenceImageIds = referenceImageIds;
        this.ownerIdentities = ownerIdentities;
        this.sonaIdentities = sonaIdentities;
        this.uploaded = uploaded;

        if (this.shoulderMeasurementId === null && shoulderY !== null) {
            this.shoulderY = shoulderY;
        }
    }

    get baseline() {
        return this.measurements.find(measurement => (
            measurement.id === this.referenceMeasurementId
        )) ?? this.measurements[0];
    }

    get shoulderMeasurement() {
        return this.measurements.find(measurement => (
            measurement.id === this.shoulderMeasurementId
        )) ?? null;
    }

    get shoulderY() {
        const terminalPoint = this.shoulderMeasurement?.points.at(-1);

        return normalizeShoulderY({
            shoulderY: terminalPoint?.y,
            groundY: this.anchor.y,
        });
    }

    set shoulderY(shoulderY: number | null) {
        const normalizedShoulderY = normalizeShoulderY({
            shoulderY,
            groundY: this.anchor.y,
        });
        if (normalizedShoulderY === null) {
            this.shoulderMeasurementId = null;
            return;
        }

        let measurement = this.shoulderMeasurement;
        if (measurement === null) {
            measurement = this.addMeasurement({
                descriptor: "to shoulder",
            });
            this.shoulderMeasurementId = measurement.id;
        }

        measurement.points = [
            {...this.anchor},
            {
                x: this.anchor.x,
                y: normalizedShoulderY,
            },
        ];
    }

    measurementImageLength = (measurement: Baseline) => {
        if (
            measurement.id === this.referenceMeasurementId
            && measurement.referenceSizingMethod === "pixel_measurement"
        ) {
            return this.pixelMeasurementImageLength;
        }

        return positiveLength(measurement.arcLength);
    };

    measurementLengthMeters = (measurement: Baseline) => {
        if (measurement.id === this.referenceMeasurementId) {
            return isPositiveFinite(measurement.targetLength)
                ? measurement.targetLength
                : null;
        }

        const imageLength = positiveLength(measurement.arcLength);
        const lengthMeters = imageLength === null
            ? null
            : imageLength * this.scaleFac;

        return isPositiveFinite(lengthMeters)
            ? lengthMeters
            : null;
    };

    addMeasurement = ({
        descriptor = "",
        points = [],
    }: {
        descriptor?: string,
        points?: Point[],
    } = {}) => {
        const measurement = new Baseline({
            points,
            targetLength: this.baseline.targetLength,
            measurementUnit: this.baseline.measurementUnit,
            descriptor,
        });

        this.measurements = [
            ...this.measurements,
            measurement,
        ];

        return measurement;
    };

    removeMeasurement = (measurement: Baseline) => {
        if (
            this.measurements.length === 1
            || !this.measurements.includes(measurement)
        ) return;

        if (measurement.id === this.referenceMeasurementId) {
            const replacement = this.measurements.find(candidate => candidate !== measurement);
            if (replacement === undefined) return;

            this.setReferenceMeasurement(replacement);
        }

        if (measurement.id === this.shoulderMeasurementId) {
            this.shoulderMeasurementId = null;
        }

        this.measurements = this.measurements.filter(candidate => candidate !== measurement);
    };

    setReferenceMeasurement = (measurement: Baseline) => {
        if (
            measurement.id === this.referenceMeasurementId
            || !this.measurements.includes(measurement)
        ) return;

        const previousReference = this.baseline;
        const computedLengthMeters = this.measurementLengthMeters(measurement);

        measurement.targetLength = computedLengthMeters ?? previousReference.targetLength;
        measurement.measurementUnit = previousReference.measurementUnit;
        measurement.referenceSizingMethod = "measurement_line";
        this.referenceMeasurementId = measurement.id;
    };

    setShoulderMeasurement = (measurement: Baseline | null) => {
        if (measurement !== null && !this.measurements.includes(measurement)) return;

        this.shoulderMeasurementId = measurement?.id ?? null;
    };

    clone() {
        return new Character({
            id: this.id,
            image: this.image,
            imageDimensions: this.imageDimensions === null
                ? null
                : {...this.imageDimensions},
            name: this.name,
            anchor: {...this.anchor},
            measurements: this.measurements.map(measurement => measurement.clone()),
            referenceMeasurementId: this.referenceMeasurementId,
            shoulderMeasurementId: this.shoulderMeasurementId,
            formId: this.formId,
            referenceImageIds: [...this.referenceImageIds],
            ownerIdentities: this.ownerIdentities.map(identity => ({...identity})),
            sonaIdentities: this.sonaIdentities.map(identity => ({...identity})),
            uploaded: this.uploaded,
        });
    }

    copy(character: Character) {
        this.id = character.id;
        this.image = character.image;
        this.imageDimensions = character.imageDimensions === null
            ? null
            : {...character.imageDimensions};
        this.name = character.name;
        this.anchor = {...character.anchor};
        this.measurements = character.measurements.map(measurement => measurement.clone());
        this.referenceMeasurementId = character.referenceMeasurementId;
        this.shoulderMeasurementId = character.shoulderMeasurementId;
        this.formId = character.formId;
        this.referenceImageIds = [...character.referenceImageIds];
        this.ownerIdentities = character.ownerIdentities.map(identity => ({...identity}));
        this.sonaIdentities = character.sonaIdentities.map(identity => ({...identity}));
        this.uploaded = character.uploaded;
    }

    get center() {
        return this.anchor;
    }

    set center(center: Point) {
        this.anchor = center;
    }
}

const resolvedImageDimensions = (
    image: CharacterImage | null,
    imageDimensions: Dimensions | null,
) => image?.dimensions ?? imageDimensions;

const imageAspect = (dimensions: Dimensions | null) => {
    if (dimensions === null || dimensions.height === 0) return null;

    return dimensions.width / dimensions.height;
};

const isPositiveFinite = (value: number | null) => (
    value !== null
    && Number.isFinite(value)
    && value > 0
);

const positiveLength = (value: number) => isPositiveFinite(value)
    ? value
    : null;
