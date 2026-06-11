import type { Point } from "./Point";
import { computeBaselineArcLength } from "$lib/util/baselineGeometry";
import {
    DEFAULT_MEASUREMENT_UNIT,
    normalizeMeasurementUnit,
    type MeasurementUnit,
} from "$lib/util/measurementUnits";

export class Baseline {
    points: Point[] = $state.raw()!;
    targetLength: number = $state()!;
    measurementUnit: MeasurementUnit = $state()!;
    descriptor: string = $state()!;
    id: string | null = $state(null);
    
    readonly arcLength = $derived(computeBaselineArcLength(this.points));
    readonly scaleFac = $derived(this.targetLength / this.arcLength);

    constructor({
        id = null,
        points = [
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.5},
        ],
        targetLength = 1,
        measurementUnit = DEFAULT_MEASUREMENT_UNIT,
        descriptor = "",
    }: {
        id?: string | null,
        points?: {x: number, y: number}[],
        targetLength?: number,
        measurementUnit?: MeasurementUnit | string | null,
        descriptor?: string,
    } = {}) {
        this.id = id;
        this.points = points;
        this.targetLength = targetLength;
        this.measurementUnit = normalizeMeasurementUnit(measurementUnit);
        this.descriptor = descriptor;
    }

    clone() {
        return new Baseline({
            id: this.id,
            points: [...this.points],
            targetLength: this.targetLength,
            measurementUnit: this.measurementUnit,
            descriptor: this.descriptor,
        });
    }

    copy(other: Baseline) {
        this.id = other.id;
        this.points = other.points;
        this.targetLength = other.targetLength;
        this.measurementUnit = other.measurementUnit;
        this.descriptor = other.descriptor;
    }
}
