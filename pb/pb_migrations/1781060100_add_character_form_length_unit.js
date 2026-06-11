/// <reference path="../pb_data/types.d.ts" />

const CHARACTER_FORMS_COLLECTION = "ds_char_forms";
const LENGTH_UNIT_FIELD_ID = "form_length_unit";
const LENGTH_UNIT_FIELD_INDEX = 5;

const lengthUnitField = (
    required,
) => new Field({
    "help": "",
    "hidden": false,
    "id": LENGTH_UNIT_FIELD_ID,
    "maxSelect": 1,
    "name": "length_unit",
    "presentable": false,
    "required": required,
    "system": false,
    "type": "select",
    "values": [
        "m",
        "ft",
    ],
});

const normalizeExistingLengthUnits = app => {
    for (const form of app.findAllRecords(CHARACTER_FORMS_COLLECTION)) {
        const lengthUnit = form.getString("length_unit");
        if (lengthUnit === "m" || lengthUnit === "ft") continue;

        form.set(
            "length_unit",
            "m",
        );
        app.save(form);
    }
};

migrate((app) => {
    const collection = app.findCollectionByNameOrId(CHARACTER_FORMS_COLLECTION);

    collection.fields.addAt(
        LENGTH_UNIT_FIELD_INDEX,
        lengthUnitField(false),
    );
    app.save(collection);

    normalizeExistingLengthUnits(app);

    collection.fields.add(lengthUnitField(true));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId(CHARACTER_FORMS_COLLECTION);

    collection.fields.removeById(LENGTH_UNIT_FIELD_ID);

    return app.save(collection);
});
