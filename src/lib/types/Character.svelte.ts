import type { CharacterImage } from "./CharacterImage.svelte";
import type { IdentitySummary } from "./Identity";
import type { Point } from "./Point";
import { Baseline } from "./Baseline.svelte";

export class Character {
    id: string | null = $state(null);

    image: CharacterImage | null = $state()!;
    name: string = $state()!;
    center: Point = $state()!; // in image [0, 1] uv coordinates
    readonly baseline: Baseline;
    formId: string | null = $state(null);
    referenceImageIds: string[] = $state([]);

    readonly aspect = $derived.by(() => this.image?.aspect ?? 1);
    readonly viewportWidth = $derived.by(() => this.baseline.scaleFac * this.aspect);

    ownerIdentities: IdentitySummary[] = $state([]);
    sonaIdentities: IdentitySummary[] = $state([]);

    uploaded: boolean = $state()!;

    constructor({
        id = null,
        image = null,
        name = "",
        center = {x: 0.5, y: 0},
        baseline = new Baseline(),
        formId = null,
        referenceImageIds = [],
        ownerIdentities = [],
        sonaIdentities = [],
        uploaded = false,
    }: {
        id?: string | null,
        image?: CharacterImage | null,
        name?: string,
        center?: Point,
        baseline?: Baseline,
        formId?: string | null,
        referenceImageIds?: string[],
        ownerIdentities?: IdentitySummary[],
        sonaIdentities?: IdentitySummary[],
        uploaded?: boolean,
    } = {}) {
        this.id = id;
        this.image = image;
        this.name = name;
        this.center = center;
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
            name: this.name,
            center: {...this.center},
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
        this.name = character.name;
        this.center = character.center;
        this.baseline.copy(character.baseline);
        this.formId = character.formId;
        this.referenceImageIds = [...character.referenceImageIds];
        this.ownerIdentities = character.ownerIdentities.map(identity => ({...identity}));
        this.sonaIdentities = character.sonaIdentities.map(identity => ({...identity}));
        this.uploaded = character.uploaded;
    }
}
