import type { CharacterImage } from "./CharacterImage.svelte";
import type { IdentitySummary } from "./Identity";
import type { Point } from "./Point";
import { Baseline } from "./Baseline.svelte";

export class Character {
    id: string | null = $state(null);

    image: CharacterImage | null = $state()!;
    name: string = $state()!;
    anchor: Point = $state()!; // in image [0, 1] uv coordinates
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
        anchor,
        center,
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
        anchor?: Point,
        /** @deprecated Use anchor. Kept for PocketBase center_point compatibility. */
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
        this.anchor = anchor ?? center ?? {x: 0.5, y: 0};
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
            anchor: {...this.anchor},
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
        this.anchor = character.anchor;
        this.baseline.copy(character.baseline);
        this.formId = character.formId;
        this.referenceImageIds = [...character.referenceImageIds];
        this.ownerIdentities = character.ownerIdentities.map(identity => ({...identity}));
        this.sonaIdentities = character.sonaIdentities.map(identity => ({...identity}));
        this.uploaded = character.uploaded;
    }

    get center() {
        return this.anchor;
    }

    set center(center: Point) {
        this.anchor = center;
    }
}
