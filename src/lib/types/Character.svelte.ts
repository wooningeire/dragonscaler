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
import {
    computeShoulderAltitudeMeters,
    normalizeShoulderY,
} from "$lib/util/shoulderAltitude";

export class Character {
    id: string | null = $state(null);

    image: CharacterImage | null = $state()!;
    imageDimensions: Dimensions | null = $state(null);
    name: string = $state()!;
    anchor: Point = $state()!; // in image [0, 1] uv coordinates
    shoulderY: number | null = $state(null);
    readonly baseline: Baseline;
    formId: string | null = $state(null);
    referenceImageIds: string[] = $state([]);

    readonly pixelMeasurementImageLength = $derived.by(() => computePixelMeasurementImageLength(
        this.baseline.pixelMeasurementPx,
        resolvedImageDimensions(this.image, this.imageDimensions)?.height ?? null,
    ));
    readonly hasUsableReferenceSizing = $derived.by(() => (
        this.baseline.referenceSizingMethod === "pixel_measurement"
            ? this.pixelMeasurementImageLength !== null
            : this.baseline.arcLength > 0
    ));
    readonly referenceImageLength = $derived.by(() => (
        this.baseline.referenceSizingMethod === "pixel_measurement"
        && this.pixelMeasurementImageLength !== null
            ? this.pixelMeasurementImageLength
            : this.baseline.arcLength
    ));
    readonly scaleFac = $derived.by(() => this.baseline.targetLength / this.referenceImageLength);
    readonly validShoulderY = $derived(normalizeShoulderY({
        shoulderY: this.shoulderY,
        groundY: this.anchor.y,
    }));
    readonly shoulderAltitude = $derived.by(() => computeShoulderAltitudeMeters({
        shoulderY: this.validShoulderY,
        groundY: this.anchor.y,
        imageHeightMeters: this.scaleFac,
    }));
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
        this.shoulderY = normalizeShoulderY({
            shoulderY,
            groundY: this.anchor.y,
        });
        this.baseline = baseline;
        this.formId = formId;
        this.referenceImageIds = referenceImageIds;
        this.ownerIdentities = ownerIdentities;
        this.sonaIdentities = sonaIdentities;
        this.uploaded = uploaded;
    }

    clone() {
        return new Character({
            id: this.id,
            image: this.image,
            imageDimensions: this.imageDimensions === null
                ? null
                : {...this.imageDimensions},
            name: this.name,
            anchor: {...this.anchor},
            shoulderY: this.validShoulderY,
            baseline: this.baseline.clone(),
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
        this.anchor = character.anchor;
        this.shoulderY = character.validShoulderY;
        this.baseline.copy(character.baseline);
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
