import { beforeEach, describe, expect, test } from "vitest";
import type { AuthRecord } from "pocketbase";
import { DatabaseStore } from "./DatabaseStore.svelte";


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
