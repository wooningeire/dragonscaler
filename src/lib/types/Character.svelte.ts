import type { ReferenceCurve } from "./ReferenceCurve.svelte";

export class Character {
    readonly imageSrc: string;
    readonly imageDimensions: {width: number, height: number};
    readonly name: string;
    readonly referenceCurve: ReferenceCurve;

    readonly aspectRatio: number;
    readonly actualWidth: number;

    constructor({
        imageSrc,
        imageDimensions,
        name,
        referenceCurve,
    }: {
        imageSrc: string,
        imageDimensions: {width: number, height: number},
        name: string,
        referenceCurve: ReferenceCurve,
    }) {
        this.imageSrc = imageSrc;
        this.imageDimensions = imageDimensions;
        this.name = name;
        this.referenceCurve = referenceCurve;

        this.aspectRatio = imageDimensions.width / imageDimensions.height;
        this.actualWidth = referenceCurve.scaleFac * this.aspectRatio;
    }
}