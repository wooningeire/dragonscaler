import type { Point } from "./Point";
import { computeBaselineArcLength } from "$lib/util/baselineGeometry";
import {
    DEFAULT_MEASUREMENT_UNIT,
    normalizeMeasurementUnit,
    type MeasurementUnit,
} from "$lib/util/measurementUnits";
import {
    DEFAULT_REFERENCE_SIZING_METHOD,
    normalizeReferenceSizingMethod,
    type ReferenceSizingMethod,
} from "$lib/util/referenceSizing";

export class Baseline {
    id: string = $state()!;
    points: Point[] = $state.raw()!;
    targetLength: number = $state()!;
    measurementUnit: MeasurementUnit = $state()!;
    descriptor: string = $state()!;
    referenceSizingMethod: ReferenceSizingMethod = $state()!;
    pixelMeasurementPx: number | null = $state(null);
    
    readonly arcLength = $derived(computeBaselineArcLength(this.points));

    constructor({
        id = createMeasurementId(),
        points = [
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.5},
        ],
        targetLength = 1,
        measurementUnit = DEFAULT_MEASUREMENT_UNIT,
        descriptor = "",
        referenceSizingMethod = DEFAULT_REFERENCE_SIZING_METHOD,
        pixelMeasurementPx = null,
    }: {
        points?: {x: number, y: number}[],
        targetLength?: number,
        measurementUnit?: MeasurementUnit | string | null,
        descriptor?: string,
        referenceSizingMethod?: ReferenceSizingMethod | string | null,
        pixelMeasurementPx?: number | null,
        id?: string,
    } = {}) {
        this.id = id;
        this.points = points;
        this.targetLength = targetLength;
        this.measurementUnit = normalizeMeasurementUnit(measurementUnit);
        this.descriptor = descriptor;
        this.referenceSizingMethod = normalizeReferenceSizingMethod(referenceSizingMethod);
        this.pixelMeasurementPx = pixelMeasurementPx;
    }

    clone() {
        return new Baseline({
            id: this.id,
            points: [...this.points],
            targetLength: this.targetLength,
            measurementUnit: this.measurementUnit,
            descriptor: this.descriptor,
            referenceSizingMethod: this.referenceSizingMethod,
            pixelMeasurementPx: this.pixelMeasurementPx,
        });
    }

    copy(other: Baseline) {
        this.id = other.id;
        this.points = other.points;
        this.targetLength = other.targetLength;
        this.measurementUnit = other.measurementUnit;
        this.descriptor = other.descriptor;
        this.referenceSizingMethod = other.referenceSizingMethod;
        this.pixelMeasurementPx = other.pixelMeasurementPx;
    }
}


let nextMeasurementId = 1;

const createMeasurementId = () => {
    if (typeof globalThis.crypto?.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
    }

    const id = `measurement-${nextMeasurementId}`;
    nextMeasurementId += 1;

    return id;
};
