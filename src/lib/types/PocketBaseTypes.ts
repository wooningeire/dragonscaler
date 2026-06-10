import type { Point } from "./Point";

export enum Collections {
    Accounts = "users",
    Characters = "dragonscaler_characters",
    CharacterForms = "dragonscaler_character_forms",
    Identities = "dragonscaler_identities",
    ReferenceImages = "dragonscaler_reference_images",
}

export const LEGACY_BASELINES_COLLECTION = "dragonscaler_baselines";

export type PocketbaseCommonRecord = {
    id: string,
    created: string,
    updated: string,
    collectionId: string,
    collectionName: string,
};

export type AccountRecord = {
    username: string,
    avatar: string,
} & PocketbaseCommonRecord;

export type IdentityRecord = {
    display_name: string,
    account_ids?: string[],
    avatar?: string,
} & PocketbaseCommonRecord;

export type ReferenceImageRecord = {
    image: string,
    caption?: string,
    anchor_point?: Point,
    baseline_points?: Point[],
    baseline_descriptor?: string,
    rotation_deg?: number,
    flipped_horizontally?: boolean,
} & PocketbaseCommonRecord;

export type CharacterFormRecord = {
    character_id: string,
    name?: string,
    is_default?: boolean,
    length_meters?: number,
    /** @deprecated Use ReferenceImageRecord.anchor_point. */
    center_point?: Point,
    reference_image_ids?: string[],
} & PocketbaseCommonRecord;

export type LegacyBaselineRecord = {
    character_id?: string,
    character_form_id?: string,
    is_default: boolean,
    points?: Point[],
    descriptor?: string,
    length_meters?: number,
} & PocketbaseCommonRecord;

export type CharacterRecord = {
    name: string,
    image?: string,
    /** @deprecated Use ReferenceImageRecord.anchor_point. */
    center_point?: Point,
    owner_id?: string,
    owner_identity_ids?: string[],
    sona_identity_ids?: string[],
} & PocketbaseCommonRecord;

export type CollectionRecords = {
    [Collections.Accounts]: AccountRecord;
    [Collections.Characters]: CharacterRecord;
    [Collections.CharacterForms]: CharacterFormRecord;
    [Collections.Identities]: IdentityRecord;
    [Collections.ReferenceImages]: ReferenceImageRecord;
};
