/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ifhsgi3s6p97ltf")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": "",
    "updateRule": ""
  }, collection)

  // remove field
  collection.fields.removeById("ankqpwtw")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("ifhsgi3s6p97ltf")

  // update collection data
  unmarshal({
    "createRule": "owner_identity_ids.account_ids.id = @request.auth.id || owner_id.id = @request.auth.id",
    "deleteRule": "owner_identity_ids.account_ids.id = @request.auth.id || owner_id.id = @request.auth.id",
    "updateRule": "owner_identity_ids.account_ids.id = @request.auth.id || owner_id.id = @request.auth.id"
  }, collection)

  // add field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "help": "",
    "hidden": false,
    "id": "ankqpwtw",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "owner_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
