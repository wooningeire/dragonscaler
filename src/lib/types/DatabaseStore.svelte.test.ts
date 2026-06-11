import { beforeEach, describe, expect, test } from "vitest";
import type { AuthRecord } from "pocketbase";
import { Character } from "./Character.svelte";
import { CharacterImage } from "./CharacterImage.svelte";
import { Baseline } from "./Baseline.svelte";
import { DatabaseStore } from "./DatabaseStore.svelte";
import { Collections } from "./PocketBaseTypes";
import type {
    AccountRecord,
    CharacterFormRecord,
    CharacterRecord,
    IdentityRecord,
    PocketbaseCommonRecord,
    ReferenceImageRecord,
} from "./PocketBaseTypes";
import type { IdentitySummary } from "./Identity";


const createToken = () => {
    const payload = btoa(JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 3600,
    }));

    return `header.${payload}.signature`;
};

const createRecord = () => ({
    id: "user-1",
    username: "Test User",
    collectionId: "users",
    collectionName: "users",
}) as AuthRecord;

const clearAuthCookie = () => {
    document.cookie = "pb_auth=; Max-Age=0; Path=/";
};

const commonRecord = (id: string): PocketbaseCommonRecord => ({
    id,
    created: "",
    updated: "",
    collectionId: "",
    collectionName: "",
});

const collectAccountIds = (
    databaseStore: DatabaseStore,
    characters: CharacterRecord[],
    identities: IdentityRecord[],
) => {
    const testStore = databaseStore as unknown as {
        collectAccountIds: (
            characters: CharacterRecord[],
            identities: IdentityRecord[],
        ) => Set<string>,
    };

    return testStore.collectAccountIds(characters, identities);
};

const makePocketBaseError = (
    status: number,
    response: Record<string, unknown>,
) => ({
    status,
    response,
});

const makeDuplicateRecordIdError = () => makePocketBaseError(
    400,
    {
        data: {
            id: {
                code: "validation_not_unique",
                message: "The record id must be unique.",
            },
        },
    },
);

const makeMissingRecordError = () => makePocketBaseError(
    404,
    {
        data: {},
    },
);

class FakeCollection {
    readonly createCalls: Record<string, unknown>[] = [];
    readonly updateCalls: {
        id: string,
        data: Record<string, unknown>,
    }[] = [];
    readonly deleteCalls: string[] = [];
    readonly records = new Map<string, PocketbaseCommonRecord & Record<string, unknown>>();

    createFailure: unknown = null;

    constructor(readonly name: string) {}

    async getOne<RecordType = PocketbaseCommonRecord & Record<string, unknown>>(id: string) {
        const record = this.records.get(id);
        if (record === undefined) throw makeMissingRecordError();

        return record as RecordType;
    }

    async getFullList<RecordType = PocketbaseCommonRecord & Record<string, unknown>>(
        options: {
            filter?: {
                filterText: string,
                params: Record<string, string>,
            },
        } = {},
    ) {
        const records = [...this.records.values()];

        if (options.filter?.filterText === "character_id = {:characterId}") {
            return records.filter(record => (
                record.character_id === options.filter?.params.characterId
            )) as RecordType[];
        }

        if (options.filter?.filterText === "account_ids.id = {:accountId}") {
            return records.filter(record => (
                Array.isArray(record.account_ids)
                && record.account_ids.includes(options.filter?.params.accountId)
            )) as RecordType[];
        }

        return records as RecordType[];
    }

    async create<RecordType = PocketbaseCommonRecord & Record<string, unknown>>(
        data: Record<string, unknown>,
    ) {
        this.createCalls.push(data);

        if (this.createFailure !== null) {
            const error = this.createFailure;
            this.createFailure = null;
            throw error;
        }

        const id = typeof data.id === "string"
            ? data.id
            : `auto-${this.records.size + 1}`;

        if (this.records.has(id)) throw makeDuplicateRecordIdError();

        const record = {
            id,
            created: "",
            updated: "",
            collectionId: this.name,
            collectionName: this.name,
            ...data,
        } as PocketbaseCommonRecord & Record<string, unknown>;
        this.records.set(
            id,
            record,
        );

        return record as RecordType;
    }

    async update<RecordType = PocketbaseCommonRecord & Record<string, unknown>>(
        id: string,
        data: Record<string, unknown>,
    ) {
        this.updateCalls.push({
            id,
            data,
        });

        const record = this.records.get(id);
        if (record === undefined) throw makeMissingRecordError();

        const updatedRecord = {
            ...record,
            ...data,
        };
        this.records.set(
            id,
            updatedRecord,
        );

        return updatedRecord as RecordType;
    }

    async delete(id: string) {
        this.deleteCalls.push(id);

        if (!this.records.delete(id)) throw makeMissingRecordError();

        return true;
    }
}

class FakePocketBase {
    readonly collections = new Map<string, FakeCollection>();

    readonly authStore = {
        isValid: false,
        record: null,
        token: "",
        clear: () => {},
        onChange: () => () => {},
    };

    collection(name: string) {
        let collection = this.collections.get(name);

        if (collection === undefined) {
            collection = new FakeCollection(name);
            this.collections.set(
                name,
                collection,
            );
        }

        return collection;
    }

    filter(
        filterText: string,
        params: Record<string, string> = {},
    ) {
        return {
            filterText,
            params,
        };
    }
}

const installFakePocketBase = (databaseStore: DatabaseStore) => {
    const fakePocketBase = new FakePocketBase();
    const testStore = databaseStore as unknown as {
        pb: FakePocketBase,
        createRecordId: () => string,
    };
    const recordIds = [
        "character000001",
        "reference000001",
        "form00000000001",
    ];

    testStore.pb = fakePocketBase;
    testStore.createRecordId = () => {
        const id = recordIds.shift();
        if (id === undefined) throw new Error("missing test record id");

        return id;
    };

    return fakePocketBase;
};

const makeOwnerIdentity = (): IdentitySummary => ({
    id: "identity-1",
    identityId: "identity-1",
    accountId: "account-1",
    name: "Owner",
    avatarUrl: null,
});

const makeCharacterImage = () => new CharacterImage({
    src: "blob:dragon",
    file: new File(
        ["dragon"],
        "dragon.png",
        {type: "image/png"},
    ),
    dimensions: {
        width: 1,
        height: 1,
    },
    hasObjectUrl: true,
});

const makeNewCharacter = () => new Character({
    name: "Test Dragon",
    image: makeCharacterImage(),
    baseline: new Baseline({
        targetLength: 4,
        descriptor: "to the shoulder",
        points: [
            {x: 0.5, y: 0},
            {x: 0.5, y: 1},
        ],
    }),
    ownerIdentities: [makeOwnerIdentity()],
    uploaded: false,
});


describe("DatabaseStore auth persistence", () => {
    beforeEach(() => {
        localStorage.clear();
        clearAuthCookie();
    });

    test("keeps PocketBase local storage auth when no auth cookie exists", () => {
        localStorage.setItem("pocketbase_auth", JSON.stringify({
            token: createToken(),
            record: createRecord(),
        }));

        const databaseStore = new DatabaseStore();

        databaseStore.loadUserRecord();

        expect(databaseStore.userRecord?.id).toBe("user-1");
        expect(document.cookie).toContain("pb_auth=");
    });

    test("loads the server auth cookie when local storage auth is empty", () => {
        document.cookie = `pb_auth=${encodeURIComponent(JSON.stringify({
            token: createToken(),
            record: createRecord(),
        }))}; Path=/`;

        const databaseStore = new DatabaseStore();

        databaseStore.loadUserRecord();

        expect(databaseStore.userRecord?.id).toBe("user-1");
        expect(localStorage.getItem("pocketbase_auth")).toContain("user-1");
    });
});

describe("DatabaseStore write idempotency", () => {
    beforeEach(() => {
        localStorage.clear();
        clearAuthCookie();
    });

    test("deduplicates concurrent creates for the same character object", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const character = makeNewCharacter();

        await Promise.all([
            databaseStore.createCharacter(character),
            databaseStore.createCharacter(character),
        ]);

        expect(character).toMatchObject({
            id: "character000001",
            formId: "form00000000001",
            referenceImageIds: ["reference000001"],
            uploaded: true,
        });
        expect(fakePocketBase.collection(Collections.Characters).createCalls).toHaveLength(1);
        expect(fakePocketBase.collection(Collections.ReferenceImages).createCalls).toHaveLength(1);
        expect(fakePocketBase.collection(Collections.CharacterForms).createCalls).toHaveLength(1);
    });

    test("persists reference image flip metadata", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const character = makeNewCharacter();
        character.image = character.image?.withFlippedHorizontally(true) ?? null;

        await databaseStore.createCharacter(character);

        expect(fakePocketBase.collection(Collections.ReferenceImages).createCalls[0]).toEqual(
            expect.objectContaining({
                flipped_horizontally: true,
            }),
        );
    });

    test("persists the selected reference measurement unit on the form", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const character = makeNewCharacter();
        character.baseline.measurementUnit = "ft";

        await databaseStore.createCharacter(character);

        expect(fakePocketBase.collection(Collections.CharacterForms).createCalls[0]).toEqual(
            expect.objectContaining({
                length_meters: 4,
                length_unit: "ft",
            }),
        );
    });

    test("retries partial creates against the same record ids", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const character = makeNewCharacter();
        fakePocketBase.collection(Collections.ReferenceImages).createFailure = new Error("network");

        await expect(databaseStore.createCharacter(character)).rejects.toThrow("network");

        expect(character.id).toBe("character000001");
        expect(character.referenceImageIds).toEqual(["reference000001"]);
        expect(character.uploaded).toBe(false);

        await databaseStore.createCharacter(character);

        expect(character).toMatchObject({
            id: "character000001",
            formId: "form00000000001",
            referenceImageIds: ["reference000001"],
            uploaded: true,
        });
        expect(fakePocketBase.collection(Collections.Characters).records.size).toBe(1);
        expect(fakePocketBase.collection(Collections.ReferenceImages).records.size).toBe(1);
        expect(fakePocketBase.collection(Collections.CharacterForms).records.size).toBe(1);
        expect(fakePocketBase.collection(Collections.Characters).updateCalls).toEqual([
            expect.objectContaining({
                id: "character000001",
            }),
        ]);
    });

    test("uses the account id as the default identity create id", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        databaseStore.userRecord = {
            ...commonRecord("account-1"),
            username: "Owner",
            avatar: "",
        } as AccountRecord;
        fakePocketBase.collection(Collections.Accounts).records.set(
            "account-1",
            {
                ...commonRecord("account-1"),
                username: "Owner",
                avatar: "",
            },
        );

        const identity = await databaseStore.createOwnerIdentityObject();

        expect(identity.identityId).toBe("account-1");
        expect(fakePocketBase.collection(Collections.Identities).createCalls).toEqual([
            expect.objectContaining({
                id: "account-1",
                account_ids: ["account-1"],
            }),
        ]);
    });

    test("deletes characters with their dependent form and reference image records", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const character = new Character({
            id: "character-1",
            formId: "form-1",
            referenceImageIds: ["reference-1"],
            uploaded: true,
        });
        fakePocketBase.collection(Collections.Characters).records.set(
            "character-1",
            {
                ...commonRecord("character-1"),
                name: "Scale Wing",
            } satisfies CharacterRecord,
        );
        fakePocketBase.collection(Collections.CharacterForms).records.set(
            "form-1",
            {
                ...commonRecord("form-1"),
                character_id: "character-1",
                reference_image_ids: ["reference-1"],
            } satisfies CharacterFormRecord,
        );
        fakePocketBase.collection(Collections.ReferenceImages).records.set(
            "reference-1",
            {
                ...commonRecord("reference-1"),
                image: "scale-wing.png",
            } satisfies ReferenceImageRecord,
        );

        await databaseStore.deleteCharacter(character);

        expect(fakePocketBase.collection(Collections.CharacterForms).deleteCalls).toEqual([
            "form-1",
        ]);
        expect(fakePocketBase.collection(Collections.ReferenceImages).deleteCalls).toEqual([
            "reference-1",
        ]);
        expect(fakePocketBase.collection(Collections.Characters).deleteCalls).toEqual([
            "character-1",
        ]);
        expect(fakePocketBase.collection(Collections.CharacterForms).records.has("form-1")).toBe(
            false,
        );
        expect(fakePocketBase.collection(Collections.ReferenceImages).records.has("reference-1")).toBe(
            false,
        );
        expect(fakePocketBase.collection(Collections.Characters).records.has("character-1")).toBe(
            false,
        );
        expect(character).toMatchObject({
            id: null,
            formId: null,
            referenceImageIds: [],
            uploaded: false,
        });
    });
});

describe("DatabaseStore character loading", () => {
    test("loads the persisted reference measurement unit from the form", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        fakePocketBase.collection(Collections.Characters).records.set(
            "character-1",
            {
                ...commonRecord("character-1"),
                name: "Scale Wing",
            } satisfies CharacterRecord,
        );
        fakePocketBase.collection(Collections.CharacterForms).records.set(
            "form-1",
            {
                ...commonRecord("form-1"),
                character_id: "character-1",
                is_default: true,
                length_meters: 2,
                length_unit: "ft",
                reference_image_ids: [],
            } satisfies CharacterFormRecord,
        );

        const characters = await databaseStore.loadCharacterData();

        expect(characters).toHaveLength(1);
        expect(characters[0].baseline.targetLength).toBe(2);
        expect(characters[0].baseline.measurementUnit).toBe("ft");
    });

    test("defaults old form records without units to meters", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        fakePocketBase.collection(Collections.Characters).records.set(
            "character-1",
            {
                ...commonRecord("character-1"),
                name: "Scale Wing",
            } satisfies CharacterRecord,
        );
        fakePocketBase.collection(Collections.CharacterForms).records.set(
            "form-1",
            {
                ...commonRecord("form-1"),
                character_id: "character-1",
                is_default: true,
                length_meters: 2,
                reference_image_ids: [],
            } satisfies CharacterFormRecord,
        );

        const characters = await databaseStore.loadCharacterData();

        expect(characters[0].baseline.measurementUnit).toBe("m");
    });
});

describe("DatabaseStore character identity loading", () => {
    test("ignores blank optional account ids before loading account records", () => {
        const databaseStore = new DatabaseStore();
        const accountIds = collectAccountIds(
            databaseStore,
            [
                {
                    ...commonRecord("character-1"),
                    name: "Legacy blank owner",
                    owner_id: "",
                },
                {
                    ...commonRecord("character-2"),
                    name: "Legacy owner",
                    owner_id: "account-1",
                },
            ],
            [
                {
                    ...commonRecord("identity-1"),
                    display_name: "Blank identity account",
                    account_ids: ["", "account-2"],
                },
            ],
        );

        expect([...accountIds]).toEqual(["account-1", "account-2"]);
    });
});
