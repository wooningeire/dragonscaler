/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ds_ref_images")

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "number977993233",
    "max": null,
    "min": null,
    "name": "rotation_deg",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "bool4069852389",
    "name": "flipped_horizontally",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("ds_ref_images")

  // remove field
  collection.fields.removeById("number977993233")

  // remove field
  collection.fields.removeById("bool4069852389")

  return app.save(collection)
})
