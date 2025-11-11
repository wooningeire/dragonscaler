import type { CharacterImage } from "./CharacterImage.svelte";
import { ReferenceCurve } from "./ReferenceCurve.svelte";

export class Character {
    image: CharacterImage | null = $state()!;
    name: string = $state()!;
    readonly referenceCurve: ReferenceCurve;

    readonly aspect = $derived.by(() => this.image?.aspect ?? 1);
    readonly actualWidth = $derived.by(() => this.referenceCurve.scaleFac * this.aspect);

    constructor({
        image = null,
        name = "",
        referenceCurve = new ReferenceCurve(),
    }: {
        image?: CharacterImage | null,
        name?: string,
        referenceCurve?: ReferenceCurve,
    } = {}) {
        this.image = image;
        this.name = name;
        this.referenceCurve = referenceCurve;
    }
}