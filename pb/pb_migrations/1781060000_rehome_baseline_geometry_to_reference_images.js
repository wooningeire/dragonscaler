/// <reference path="../pb_data/types.d.ts" />

const COLLECTIONS = {
    baselines: "pbc_3302564769",
    characters: "ifhsgi3s6p97ltf",
    characterForms: "ds_char_forms",
    referenceImages: "ds_ref_images",
};

const characterFormOwnerRules = "character_id.owner_identity_ids.account_ids.id = @request.auth.id";

const numberField = (
    id,
    name,
    {
        required = false,
    } = {},
) => new Field({
    help: "",
    hidden: false,
    id,
    max: null,
    min: null,
    name,
    onlyInt: false,
    presentable: false,
    required,
    system: false,
    type: "number",
});

const jsonField = (
    id,
    name,
) => new Field({
    help: "",
    hidden: false,
    id,
    maxSize: 0,
    name,
    presentable: false,
    required: false,
    system: false,
    type: "json",
});

const textField = (
    id,
    name,
) => new Field({
    autogeneratePattern: "",
    help: "",
    hidden: false,
    id,
    max: 0,
    min: 0,
    name,
    pattern: "",
    presentable: false,
    primaryKey: false,
    required: false,
    system: false,
    type: "text",
});

const relationIds = value => {
    if (Array.isArray(value)) return value.filter(recordId => recordId !== "");
    if (typeof value === "string" && value !== "") return [value];

    return [];
};

const filterRecordId = recordId => `'${recordId.replace(/'/g, "\\'")}'`;

const recordValue = (
    record,
    fieldName,
) => {
    try {
        return record.get(fieldName);
    } catch (_) {
        return null;
    }
};

const recordFloat = (
    record,
    fieldName,
) => {
    try {
        return record.getFloat(fieldName);
    } catch (_) {
        return null;
    }
};

const findCharacterAnchorForForm = (
    app,
    form,
) => {
    const characterId = form.getString("character_id");
    if (characterId === "") return null;

    try {
        const character = app.findRecordById(
            COLLECTIONS.characters,
            characterId,
        );

        return recordValue(
            character,
            "center_point",
        );
    } catch (_) {
        return null;
    }
};

const findFirstBaselineForForm = (
    app,
    form,
) => {
    try {
        const formId = form.id;
        const formBaselines = app.findRecordsByFilter(
            COLLECTIONS.baselines,
            `character_form_id = ${filterRecordId(formId)}`,
            "-is_default,created",
            1,
            0,
        );

        if (formBaselines.length > 0) return formBaselines[0];

        const characterId = form.getString("character_id");
        if (characterId !== "") {
            const characterBaselines = app.findRecordsByFilter(
                COLLECTIONS.baselines,
                `character_id = ${filterRecordId(characterId)}`,
                "-is_default,created",
                1,
                0,
            );

            if (characterBaselines.length > 0) return characterBaselines[0];
        }
    } catch (_) {
        // Fresh installs do not have the legacy baselines collection.
    }

    return null;
};

const copyCurrentDataToNewOwners = app => {
    for (const form of app.findAllRecords(COLLECTIONS.characterForms)) {
        const referenceImageId = relationIds(form.get("reference_image_ids"))[0];
        if (referenceImageId === undefined) continue;

        let referenceImage = null;
        try {
            referenceImage = app.findRecordById(
                COLLECTIONS.referenceImages,
                referenceImageId,
            );
        } catch (_) {
            continue;
        }

        const baseline = findFirstBaselineForForm(
            app,
            form,
        );
        const formAnchor = recordValue(
            form,
            "center_point",
        );
        const anchor = formAnchor === null || formAnchor === undefined
            ? findCharacterAnchorForForm(
                app,
                form,
            )
            : formAnchor;
        const existingAnchor = recordValue(
            referenceImage,
            "anchor_point",
        );
        const existingBaselinePoints = recordValue(
            referenceImage,
            "baseline_points",
        );
        const existingBaselineDescriptor = recordValue(
            referenceImage,
            "baseline_descriptor",
        );
        const existingLengthMeters = recordFloat(
            form,
            "length_meters",
        );
        const baselinePoints = baseline === null
            ? null
            : recordValue(
                baseline,
                "points",
            );
        const baselineDescriptor = baseline === null
            ? null
            : recordValue(
                baseline,
                "descriptor",
            );
        const baselineLengthMeters = baseline === null
            ? null
            : recordFloat(
                baseline,
                "length_meters",
            );
        const lengthMeters = existingLengthMeters !== null
            && existingLengthMeters !== undefined
            && existingLengthMeters > 0
            ? existingLengthMeters
            : baselineLengthMeters !== null
            && baselineLengthMeters !== undefined
            && baselineLengthMeters > 0
            ? baselineLengthMeters
            : 1;

        if (
            (existingAnchor === null || existingAnchor === undefined)
            && anchor !== null
            && anchor !== undefined
        ) {
            referenceImage.set("anchor_point", anchor);
        }

        if (
            (existingBaselinePoints === null || existingBaselinePoints === undefined)
            && baselinePoints !== null
            && baselinePoints !== undefined
        ) {
            referenceImage.set("baseline_points", baselinePoints);
        }

        if (
            (existingBaselineDescriptor === null || existingBaselineDescriptor === undefined)
            && baselineDescriptor !== null
            && baselineDescriptor !== undefined
        ) {
            referenceImage.set("baseline_descriptor", baselineDescriptor);
        }

        form.set("length_meters", lengthMeters);

        app.save(referenceImage);
        app.save(form);
    }
};

migrate((app) => {
    const referenceImages = app.findCollectionByNameOrId(COLLECTIONS.referenceImages);
    referenceImages.fields.add(
        jsonField("json3918007031", "anchor_point"),
        jsonField("json2166194256", "baseline_points"),
        textField("text1657529500", "baseline_descriptor"),
    );
    app.save(referenceImages);

    const characterForms = app.findCollectionByNameOrId(COLLECTIONS.characterForms);
    unmarshal({
        createRule: characterFormOwnerRules,
        deleteRule: characterFormOwnerRules,
        updateRule: characterFormOwnerRules,
    }, characterForms);
    characterForms.fields.add(numberField(
        "form_length_meters",
        "length_meters",
        {
            required: false,
        },
    ));
    app.save(characterForms);

    copyCurrentDataToNewOwners(app);

    characterForms.fields.add(numberField(
        "form_length_meters",
        "length_meters",
        {
            required: true,
        },
    ));
    characterForms.fields.removeById("form_center");
    app.save(characterForms);

    try {
        const characters = app.findCollectionByNameOrId(COLLECTIONS.characters);
        characters.fields.removeById("jkic8j70");
        app.save(characters);
    } catch (_) {
        // Fresh installs do not create the legacy character-level anchor field.
    }

    try {
        const baselines = app.findCollectionByNameOrId(COLLECTIONS.baselines);
        unmarshal({
            createRule: null,
            deleteRule: null,
            updateRule: null,
        }, baselines);
        baselines.fields.removeById("json666537513");
        baselines.fields.removeById("text59930114");
        baselines.fields.removeById("number4202024394");
        app.save(baselines);
    } catch (_) {
        // Fresh installs do not create the legacy baselines collection.
    }
}, (app) => {
    const characters = app.findCollectionByNameOrId(COLLECTIONS.characters);
    characters.fields.add(jsonField("jkic8j70", "center_point"));
    app.save(characters);

    const characterForms = app.findCollectionByNameOrId(COLLECTIONS.characterForms);
    characterForms.fields.add(jsonField("form_center", "center_point"));
    app.save(characterForms);

    for (const form of app.findAllRecords(COLLECTIONS.characterForms)) {
        const referenceImageId = relationIds(form.get("reference_image_ids"))[0];
        if (referenceImageId === undefined) continue;

        try {
            const referenceImage = app.findRecordById(
                COLLECTIONS.referenceImages,
                referenceImageId,
            );
            const anchor = referenceImage.get("anchor_point");
            if (anchor !== null && anchor !== undefined) {
                form.set("center_point", anchor);
                app.save(form);

                const characterId = form.getString("character_id");
                if (characterId !== "") {
                    const character = app.findRecordById(
                        COLLECTIONS.characters,
                        characterId,
                    );

                    character.set("center_point", anchor);
                    app.save(character);
                }
            }
        } catch (_) {
            // Best-effort data restoration for down migrations.
        }
    }

    characterForms.fields.removeById("form_length_meters");
    app.save(characterForms);

    const referenceImages = app.findCollectionByNameOrId(COLLECTIONS.referenceImages);
    referenceImages.fields.removeById("json3918007031");
    referenceImages.fields.removeById("json2166194256");
    referenceImages.fields.removeById("text1657529500");
    app.save(referenceImages);
})
