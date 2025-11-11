import type { Point } from "./Point";

export class ReferenceCurve {
    points: Point[] = $state.raw()!;
    targetLength: number = $state()!;
    descriptor: string = $state()!;
    
    readonly arcLength = $derived(computeArcLength(this.points));
    readonly scaleFac = $derived(this.targetLength / this.arcLength);

    constructor({
        points = [
            {x: 0.5, y: 0},
            {x: 0.5, y: 0.5},
        ],
        targetLength = 1,
        descriptor = "",
    }: {
        points?: {x: number, y: number}[],
        targetLength?: number,
        descriptor?: string,
    } = {}) {
        this.points = points;
        this.targetLength = targetLength;
        this.descriptor = descriptor;
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