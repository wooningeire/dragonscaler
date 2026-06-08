import { beforeEach, describe, expect, test } from "vitest";
import type { AuthRecord } from "pocketbase";
import { DatabaseStore } from "./DatabaseStore.svelte";
import type {
    CharacterRecord,
    IdentityRecord,
    PocketbaseCommonRecord,
} from "./PocketBaseTypes";


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
