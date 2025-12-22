export enum Collections {
	Users = "users",
	Baselines = "dragonscaler_baselines",
	Characters = "dragonscaler_characters",
}

export type PocketbaseCommonRecord = {
	id: string,
	created: string,
	updated: string,
	collectionId: string,
	collectionName: string,
}

export type UserRecord = {
	username: string,
	avatar: string,
} & PocketbaseCommonRecord;

export type BaselineRecord = {
	character_id: string,
	is_default: boolean,
	points: {x: number, y: number}[],
	descriptor: string,
	length_meters: number,
} & PocketbaseCommonRecord;

export type CharacterRecord = {
	name: string,
	image: string,
	center_point: {x: number, y: number},
	owner_id: string,
} & PocketbaseCommonRecord;

export type CollectionRecords = {
	[Collections.Users]: UserRecord;
	[Collections.Baselines]: BaselineRecord;
	[Collections.Characters]: CharacterRecord;
}
