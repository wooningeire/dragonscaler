/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ifhsgi3s6p97ltf")

  // remove field
  collection.fields.removeById("rt1baztg")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("ifhsgi3s6p97ltf")

  // add field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "rt1baztg",
    "maxSelect": 1,
    "maxSize": 52428800,
    "mimeTypes": [],
    "name": "image",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
})
