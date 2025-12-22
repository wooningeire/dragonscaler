import type { CharacterImage } from "./CharacterImage.svelte";
import type { Point } from "./Point";
import { Baseline } from "./Baseline.svelte";

export class Character {
    id: string | null = $state(null);

    image: CharacterImage | null = $state()!;
    name: string = $state()!;
    center: Point = $state()!; // in image [0, 1] uv coordinates
    readonly baseline: Baseline;

    readonly aspect = $derived.by(() => this.image?.aspect ?? 1);
    readonly viewportWidth = $derived.by(() => this.baseline.scaleFac * this.aspect);

    owner = $state<{
        id: string,
        name: string,
        avatarUrl: string,
    } | null>(null);

    uploaded: boolean = $state()!

    constructor({
        id = null,
        image = null,
        name = "",
        center = {x: 0.5, y: 0},
        baseline = new Baseline(),
        owner = null,
        uploaded = false,
    }: {
        id?: string | null,
        image?: CharacterImage | null,
        name?: string,
        center?: Point,
        baseline?: Baseline,
        owner?: {
            id: string,
            name: string,
            avatarUrl: string,
        } | null,
        uploaded?: boolean,
    } = {}) {
        this.id = id;
        this.image = image;
        this.name = name;
        this.center = center;
        this.baseline = baseline;
        this.owner = owner;
        this.uploaded = uploaded;
    }

    clone() {
        return new Character({
            id: this.id,
            image: this.image,
            name: this.name,
            center: {...this.center},
            baseline: this.baseline.clone(),
            owner: this.owner === null ? null : {...this.owner},
            uploaded: this.uploaded,
        });
    }

    copy(character: Character) {
        this.id = character.id;
        this.image = character.image;
        this.name = character.name;
        this.center = character.center;
        this.baseline.copy(character.baseline);
        this.owner = character.owner;
        this.uploaded = character.uploaded;
    }
}