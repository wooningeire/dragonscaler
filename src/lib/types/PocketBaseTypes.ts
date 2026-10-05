import type { Point } from "./Point";
import type { MeasurementUnit } from "$lib/util/measurementUnits";
import type { ReferenceSizingMethod } from "$lib/util/referenceSizing";

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

export type CharacterMeasurementRecord = {
    id: string,
    points: Point[],
    descriptor: string,
    reference_sizing_method?: ReferenceSizingMethod | null,
    pixel_measurement_px?: number | null,
};


export type ReferenceImageRecord = {
    image: string,
    caption?: string,
    anchor_point?: Point,
    /** Bottom-up normalized image coordinate. */
    shoulder_y?: number | null,
    baseline_points?: Point[],
    baseline_descriptor?: string,
    rotation_deg?: number,
    flipped_horizontally?: boolean,
    width_px?: number | null,
    height_px?: number | null,
    reference_sizing_method?: ReferenceSizingMethod | null,
    pixel_measurement_px?: number | null,
    measurements?: CharacterMeasurementRecord[],
    reference_measurement_id?: string | null,
    shoulder_measurement_id?: string | null,
} & PocketbaseCommonRecord;

export type CharacterFormRecord = {
    character_id: string,
    name?: string,
    is_default?: boolean,
    length_meters?: number,
    length_unit?: MeasurementUnit,
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
