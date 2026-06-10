/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ds_ref_images")

  // add field
  collection.fields.addAt(5, new Field({
    "help": "",
    "hidden": false,
    "id": "json3918007031",
    "maxSize": 0,
    "name": "anchor_point",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "json2166194256",
    "maxSize": 0,
    "name": "baseline_points",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1657529500",
    "max": 0,
    "min": 0,
    "name": "baseline_descriptor",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("ds_ref_images")

  // remove field
  collection.fields.removeById("json3918007031")

  // remove field
  collection.fields.removeById("json2166194256")

  // remove field
  collection.fields.removeById("text1657529500")

  return app.save(collection)
})
