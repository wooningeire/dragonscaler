import { describe, expect, test } from "vitest";
import {
    Collections,
    type CharacterFormRecord,
    type CharacterRecord,
    type IdentityRecord,
    type ReferenceImageRecord,
} from "./PocketBaseTypes";


describe("PocketBase data model types", () => {
    test("names the relationship collections", () => {
        expect(Collections.Accounts).toBe("users");
        expect(Collections.Identities).toBe("dragonscaler_identities");
        expect(Collections.CharacterForms).toBe("dragonscaler_character_forms");
        expect(Collections.ReferenceImages).toBe("dragonscaler_reference_images");
        expect(Object.values(Collections)).not.toContain("dragonscaler_baselines");
    });

    test("supports the requested many-to-many relationship fields", () => {
        const identity = {
            account_ids: ["account-1", "account-2"],
        } satisfies Partial<IdentityRecord>;
        const character = {
            owner_identity_ids: ["identity-1", "identity-2"],
            sona_identity_ids: ["identity-2"],
        } satisfies Partial<CharacterRecord>;
        const form = {
            character_id: "character-1",
            reference_image_ids: ["reference-1", "reference-2"],
            length_meters: 2,
            length_unit: "ft",
        } satisfies Partial<CharacterFormRecord>;
        const referenceImage = {
            anchor_point: {
                x: 0.5,
                y: 0,
            },
            shoulder_y: 0.75,
            baseline_points: [
                {x: 0.5, y: 0},
                {x: 0.5, y: 1},
            ],
            baseline_descriptor: "to the shoulder",
            width_px: 300,
            height_px: 100,
            reference_sizing_method: "pixel_measurement",
            pixel_measurement_px: 420,
            measurements: [
                {
                    id: "measurement-1",
                    points: [
                        {x: 0.5, y: 0},
                        {x: 0.5, y: 1},
                    ],
                    descriptor: "reference human",
                },
            ],
            reference_measurement_id: "measurement-1",
            shoulder_measurement_id: null,
        } satisfies Partial<ReferenceImageRecord>;

        expect(identity.account_ids).toHaveLength(2);
        expect(character.owner_identity_ids).toEqual(["identity-1", "identity-2"]);
        expect(character.sona_identity_ids).toEqual(["identity-2"]);
        expect(form.reference_image_ids).toHaveLength(2);
        expect(form.length_meters).toBe(2);
        expect(form.length_unit).toBe("ft");
        expect(referenceImage.anchor_point?.y).toBe(0);
        expect(referenceImage.shoulder_y).toBe(0.75);
        expect(referenceImage.baseline_points).toHaveLength(2);
        expect(referenceImage.baseline_descriptor).toBe("to the shoulder");
        expect(referenceImage.width_px / referenceImage.height_px).toBe(3);
        expect(referenceImage.measurements).toHaveLength(1);
        expect(referenceImage.reference_measurement_id).toBe("measurement-1");
        expect(referenceImage.shoulder_measurement_id).toBeNull();
    });
});
