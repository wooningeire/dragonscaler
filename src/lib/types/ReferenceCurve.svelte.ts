export class ReferenceCurve {
    readonly points: {x: number, y: number}[];
    readonly targetLength: number;
    readonly descriptor: string;
    
    readonly arcLength: number;
    readonly scaleFac: number;

    constructor({
        points,
        targetLength,
        descriptor,
    }: {
        points: {x: number, y: number}[],
        targetLength: number,
        descriptor: string,
    }) {
        this.points = points;
        this.targetLength = targetLength;
        this.descriptor = descriptor;

        this.arcLength = computeArcLength(points);
        this.scaleFac = targetLength / this.arcLength;
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