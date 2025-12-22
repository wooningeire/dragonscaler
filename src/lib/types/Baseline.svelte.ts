import type { Point } from "./Point";

export class Baseline {
    points: Point[] = $state.raw()!;
    targetLength: number = $state()!;
    descriptor: string = $state()!;
    id: string | null = $state(null);
    
    readonly arcLength = $derived(computeArcLength(this.points));
    readonly scaleFac = $derived(this.targetLength / this.arcLength);

    constructor({
        id = null,
        points = [
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.5},
        ],
        targetLength = 1,
        descriptor = "",
    }: {
        id?: string | null,
        points?: {x: number, y: number}[],
        targetLength?: number,
        descriptor?: string,
    } = {}) {
        this.id = id;
        this.points = points;
        this.targetLength = targetLength;
        this.descriptor = descriptor;
    }

    clone() {
        return new Baseline({
            id: this.id,
            points: [...this.points],
            targetLength: this.targetLength,
            descriptor: this.descriptor,
        });
    }

    copy(other: Baseline) {
        this.id = other.id;
        this.points = other.points;
        this.targetLength = other.targetLength;
        this.descriptor = other.descriptor;
    }
}

const computeArcLength = (points: {x: number, y: number}[]) => {
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
        length += Math.hypot(
            points[i + 1].x - points[i].x,
            points[i + 1].y - points[i].y,
        );
    }
    return length;
};