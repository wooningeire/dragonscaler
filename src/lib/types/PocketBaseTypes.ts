import type { Point } from "./Point";

export enum Collections {
    Accounts = "users",
    Baselines = "dragonscaler_baselines",
    Characters = "dragonscaler_characters",
    CharacterForms = "dragonscaler_character_forms",
    Identities = "dragonscaler_identities",
    ReferenceImages = "dragonscaler_reference_images",
}

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
} & PocketbaseCommonRecord;

export type CharacterFormRecord = {
    character_id: string,
    name?: string,
    is_default?: boolean,
    center_point?: Point,
    reference_image_ids?: string[],
} & PocketbaseCommonRecord;

export type BaselineRecord = {
    character_id: string,
    character_form_id?: string,
    is_default: boolean,
    points: Point[],
    descriptor: string,
    length_meters: number,
} & PocketbaseCommonRecord;

export type CharacterRecord = {
    name: string,
    image?: string,
    center_point?: Point,
    owner_id?: string,
    owner_identity_ids?: string[],
    sona_identity_ids?: string[],
} & PocketbaseCommonRecord;

export type CollectionRecords = {
    [Collections.Accounts]: AccountRecord;
    [Collections.Baselines]: BaselineRecord;
    [Collections.Characters]: CharacterRecord;
    [Collections.CharacterForms]: CharacterFormRecord;
    [Collections.Identities]: IdentityRecord;
    [Collections.ReferenceImages]: ReferenceImageRecord;
};
