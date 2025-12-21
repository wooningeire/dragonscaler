import type { CharacterImage } from "./CharacterImage.svelte";
import type { Point } from "./Point";
import { ReferenceCurve } from "./ReferenceCurve.svelte";

export class Character {
    id: string | null = $state(null);

    image: CharacterImage | null = $state()!;
    name: string = $state()!;
    center: Point = $state()!; // in image [0, 1] uv coordinates
    readonly referenceCurve: ReferenceCurve;

    readonly aspect = $derived.by(() => this.image?.aspect ?? 1);
    readonly viewportWidth = $derived.by(() => this.referenceCurve.scaleFac * this.aspect);

    owner = $state<{
        name: string,
        avatarUrl: string,
    } | null>(null);

    uploaded: boolean = $state()!

    constructor({
        id = null,
        image = null,
        name = "",
        center = {x: 0.5, y: 0},
        referenceCurve = new ReferenceCurve(),
        owner = null,
        uploaded = false,
    }: {
        id?: string | null,
        image?: CharacterImage | null,
        name?: string,
        center?: Point,
        referenceCurve?: ReferenceCurve,
        owner?: {
            name: string,
            avatarUrl: string,
        } | null,
        uploaded?: boolean,
    } = {}) {
        this.id = id;
        this.image = image;
        this.name = name;
        this.center = center;
        this.referenceCurve = referenceCurve;
        this.owner = owner;
        this.uploaded = uploaded;
    }

    clone() {
        return new Character({
            id: this.id,
            image: this.image,
            name: this.name,
            center: {...this.center},
            referenceCurve: this.referenceCurve.clone(),
            owner: this.owner === null ? null : {...this.owner},
            uploaded: this.uploaded,
        });
    }

    copy(character: Character) {
        this.id = character.id;
        this.image = character.image;
        this.name = character.name;
        this.center = character.center;
        this.referenceCurve.copy(character.referenceCurve);
        this.owner = character.owner;
        this.uploaded = character.uploaded;
    }
}