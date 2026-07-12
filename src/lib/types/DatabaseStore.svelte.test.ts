import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
    ClientResponseError,
    type AuthRecord,
} from "pocketbase";
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
    readonly authWithOAuth2Calls: Record<string, unknown>[] = [];
    readonly createCalls: Record<string, unknown>[] = [];
    readonly updateCalls: {
        id: string,
        data: Record<string, unknown>,
    }[] = [];
    readonly deleteCalls: string[] = [];
    readonly records = new Map<string, PocketbaseCommonRecord & Record<string, unknown>>();

    authWithOAuth2Handler: (
        options: Record<string, unknown>,
    ) => Promise<unknown> = () => new Promise(() => {});
    createFailure: unknown = null;
    updateFailure: unknown = null;

    constructor(readonly name: string) {}

    authWithOAuth2(options: Record<string, unknown>) {
        this.authWithOAuth2Calls.push(options);

        return this.authWithOAuth2Handler(options);
    }

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

        if (this.updateFailure !== null) {
            const error = this.updateFailure;
            this.updateFailure = null;
            throw error;
        }

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

const seedStoredCharacter = (
    fakePocketBase: FakePocketBase,
    {
        form = {},
        referenceImage = null,
    }: {
        form?: Partial<CharacterFormRecord>,
        referenceImage?: Partial<ReferenceImageRecord> | null,
    } = {},
) => {
    const referenceImageIds = referenceImage === null
        ? []
        : ["reference-1"];
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
            ...form,
            character_id: "character-1",
            is_default: true,
            reference_image_ids: form.reference_image_ids ?? referenceImageIds,
        } satisfies CharacterFormRecord,
    );

    if (referenceImage === null) return;

    fakePocketBase.collection(Collections.ReferenceImages).records.set(
        "reference-1",
        {
            ...commonRecord("reference-1"),
            ...referenceImage,
            image: referenceImage.image ?? "scale-wing.png",
        } satisfies ReferenceImageRecord,
    );
};

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

    test("uses a bounded fetch without OAuth request auto-cancellation", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const accounts = fakePocketBase.collection(Collections.Accounts);
        const oauthError = new Error("OAuth failed");
        accounts.authWithOAuth2Handler = () => Promise.reject(oauthError);

        await expect(databaseStore.promptDiscordLogin()).rejects.toBe(oauthError);

        expect(accounts.authWithOAuth2Calls).toEqual([{
            provider: "discord",
            scopes: ["identify"],
            requestKey: null,
            fetch: expect.any(Function),
        }]);
        expect(databaseStore.discordLoginError).toBe(
            "Discord sign-in failed. Try again.",
        );
        expect(databaseStore.discordLoginPending).toBe(false);
    });

    test("times out a stalled Discord token exchange", async () => {
        vi.useFakeTimers();

        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const accounts = fakePocketBase.collection(Collections.Accounts);
        const stalledFetch = vi.fn((
            _input: RequestInfo | URL,
            init?: RequestInit,
        ) => new Promise<Response>((_resolve, reject) => {
            const rejectOnAbort = () => {
                reject(
                    new DOMException("The operation was aborted.", "AbortError"),
                );
            };

            init?.signal?.addEventListener(
                "abort",
                rejectOnAbort,
                {once: true},
            );
        }));
        vi.stubGlobal("fetch", stalledFetch);
        accounts.authWithOAuth2Handler = options => {
            const exchangeFetch = options.fetch as typeof fetch;

            return exchangeFetch(
                "https://pb.example.test/api/collections/users/auth-with-oauth2",
                {},
            ).catch(error => {
                throw new ClientResponseError(error);
            });
        };

        const loginResult = databaseStore.promptDiscordLogin().catch(error => error);

        await vi.runAllTimersAsync();
        const loginError = await loginResult;

        expect(loginError).toBeInstanceOf(ClientResponseError);
        expect(stalledFetch).toHaveBeenCalledTimes(1);
        expect(databaseStore.discordLoginError).toBe(
            "The sign-in server did not respond. Try again in a moment.",
        );
        expect(databaseStore.discordLoginPending).toBe(false);
    });

    test("shares an in-flight Discord login and permits retry after failure", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const accounts = fakePocketBase.collection(Collections.Accounts);
        const rejectLoginAttempts: ((reason: unknown) => void)[] = [];
        accounts.authWithOAuth2Handler = () => new Promise((_resolve, reject) => {
            rejectLoginAttempts.push(reject);
        });

        const firstLogin = databaseStore.promptDiscordLogin();
        const duplicateLogin = databaseStore.promptDiscordLogin();
        const firstAttempt = Promise.allSettled([
            firstLogin,
            duplicateLogin,
        ]);

        expect(duplicateLogin).toBe(firstLogin);
        expect(accounts.authWithOAuth2Calls).toHaveLength(1);
        expect(databaseStore.discordLoginPending).toBe(true);

        rejectLoginAttempts[0]!(new Error("OAuth failed"));
        await firstAttempt;

        expect(databaseStore.discordLoginError).toBe(
            "Discord sign-in failed. Try again.",
        );
        expect(databaseStore.discordLoginPending).toBe(false);

        const retryLogin = databaseStore.promptDiscordLogin();
        const retryAttempt = Promise.allSettled([retryLogin]);

        expect(accounts.authWithOAuth2Calls).toHaveLength(2);
        expect(databaseStore.discordLoginError).toBeNull();

        rejectLoginAttempts[1]!(new Error("OAuth failed again"));
        await retryAttempt;
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

    test("persists reference image dimensions", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const character = makeNewCharacter();
        character.image = new CharacterImage({
            src: "blob:wide-dragon",
            file: new File(["dragon"], "wide-dragon.png", {type: "image/png"}),
            dimensions: {
                width: 300,
                height: 100,
            },
            hasObjectUrl: true,
        });

        await databaseStore.createCharacter(character);

        expect(fakePocketBase.collection(Collections.ReferenceImages).createCalls[0]).toEqual(
            expect.objectContaining({
                width_px: 300,
                height_px: 100,
            }),
        );
    });

    test("persists the shoulder mark on the reference image", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const character = makeNewCharacter();
        character.anchor.y = 0.1;
        character.shoulderY = 0.65;

        await databaseStore.createCharacter(character);

        expect(fakePocketBase.collection(Collections.ReferenceImages).createCalls[0]).toEqual(
            expect.objectContaining({
                shoulder_y: 0.65,
            }),
        );
    });

    test("persists the authored pixel reference sizing input", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const character = makeNewCharacter();
        character.baseline.referenceSizingMethod = "pixel_measurement";
        character.baseline.pixelMeasurementPx = 420;

        await databaseStore.createCharacter(character);

        expect(fakePocketBase.collection(Collections.ReferenceImages).createCalls[0]).toEqual(
            expect.objectContaining({
                reference_sizing_method: "pixel_measurement",
                pixel_measurement_px: 420,
            }),
        );
        expect(fakePocketBase.collection(Collections.CharacterForms).createCalls[0]).not.toHaveProperty(
            "pixel_measurement_px",
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

    test("rejects a foreign-owner update before any network write", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const character = makeNewCharacter();
        databaseStore.userRecord = {
            ...commonRecord("account-1"),
            username: "Owner",
        } as AccountRecord;
        character.id = "character-1";
        character.ownerIdentities = [
            {
                ...makeOwnerIdentity(),
                accountId: "account-2",
            },
        ];
        character.uploaded = true;

        await expect(databaseStore.updateCharacter(character)).rejects.toThrow(
            "current account does not own this character",
        );

        for (const collection of fakePocketBase.collections.values()) {
            expect(collection.createCalls).toEqual([]);
            expect(collection.updateCalls).toEqual([]);
            expect(collection.deleteCalls).toEqual([]);
        }
    });

    test("does not create over a readable record after a masked update 404", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const character = makeNewCharacter();
        databaseStore.userRecord = {
            ...commonRecord("account-1"),
            username: "Owner",
        } as AccountRecord;
        character.id = "character-1";
        character.formId = "form-1";
        character.referenceImageIds = ["reference-1"];
        character.uploaded = true;
        fakePocketBase.collection(Collections.Characters).records.set(
            "character-1",
            {
                ...commonRecord("character-1"),
                name: character.name,
            } satisfies CharacterRecord,
        );
        fakePocketBase.collection(Collections.ReferenceImages).records.set(
            "reference-1",
            {
                ...commonRecord("reference-1"),
                image: "dragon.png",
            } satisfies ReferenceImageRecord,
        );
        const forms = fakePocketBase.collection(Collections.CharacterForms);
        forms.records.set(
            "form-1",
            {
                ...commonRecord("form-1"),
                character_id: "character-1",
                reference_image_ids: ["reference-1"],
            } satisfies CharacterFormRecord,
        );
        forms.updateFailure = makeMissingRecordError();

        await expect(databaseStore.updateCharacter(character)).rejects.toMatchObject({
            status: 404,
        });

        expect(forms.updateCalls).toHaveLength(1);
        expect(forms.createCalls).toEqual([]);
        expect(forms.records.has("form-1")).toBe(true);
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
    test("uses stored reference image dimensions before the image file loads", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const imageLoadPromise = new Promise<CharacterImage>(() => {});
        const fromUrl = vi.spyOn(CharacterImage, "fromUrl").mockReturnValue(imageLoadPromise);

        seedStoredCharacter(fakePocketBase, {
            referenceImage: {
                flipped_horizontally: true,
                shoulder_y: 0,
                width_px: 300,
                height_px: 100,
            },
        });

        const characters = await databaseStore.loadCharacterData();

        expect(characters[0].image).toBeNull();
        expect(characters[0].imageDimensions).toEqual({
            width: 300,
            height: 100,
        });
        expect(characters[0].aspect).toBe(3);
        expect(characters[0].shoulderY).toBeNull();
        expect(fromUrl).toHaveBeenCalledWith(
            expect.stringContaining(
                "/api/files/dragonscaler_reference_images/reference-1/scale-wing.png",
            ),
            "scale-wing.png",
            {
                flippedHorizontally: true,
                dimensions: {
                    width: 300,
                    height: 100,
                },
            },
        );
    });

    test("restores the shoulder mark before the image file loads", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        vi.spyOn(CharacterImage, "fromUrl").mockReturnValue(new Promise<CharacterImage>(() => {}));

        seedStoredCharacter(fakePocketBase, {
            form: {
                length_meters: 4,
            },
            referenceImage: {
                anchor_point: {x: 0.5, y: 0.1},
                baseline_points: [
                    {x: 0.5, y: 0},
                    {x: 0.5, y: 1},
                ],
                shoulder_y: 0.75,
            },
        });

        const characters = await databaseStore.loadCharacterData();

        expect(characters[0].image).toBeNull();
        expect(characters[0].shoulderY).toBe(0.75);
        expect(characters[0].shoulderAltitude).toBeCloseTo(2.6);
    });

    test("uses decoded dimensions without writing during character load", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        const loadedImage = new CharacterImage({
            src: "http://example.test/scale-wing.png",
            file: new File(["dragon"], "scale-wing.png"),
            dimensions: {
                width: 300,
                height: 100,
            },
        });
        let resolveImage: (image: CharacterImage) => void = () => {};
        const imagePromise = new Promise<CharacterImage>(resolve => {
            resolveImage = resolve;
        });
        vi.spyOn(CharacterImage, "fromUrl").mockReturnValue(imagePromise);

        seedStoredCharacter(fakePocketBase, {
            referenceImage: {},
        });

        const characters = await databaseStore.loadCharacterData();
        resolveImage(loadedImage);
        await imagePromise;
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(characters[0].imageDimensions).toEqual({
            width: 300,
            height: 100,
        });
        expect(fakePocketBase.collection(Collections.ReferenceImages).updateCalls).toEqual([]);
    });

    test("loads the persisted reference measurement unit from the form", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        seedStoredCharacter(fakePocketBase, {
            form: {
                length_meters: 2,
                length_unit: "ft",
            },
        });

        const characters = await databaseStore.loadCharacterData();

        expect(characters).toHaveLength(1);
        expect(characters[0].baseline.targetLength).toBe(2);
        expect(characters[0].baseline.measurementUnit).toBe("ft");
    });

    test("keeps pixel input dormant when the method field is missing", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        seedStoredCharacter(fakePocketBase, {
            form: {
                length_meters: 2,
            },
            referenceImage: {
                baseline_points: [
                    {x: 0.5, y: 0},
                    {x: 0.5, y: 1},
                ],
                pixel_measurement_px: 300,
                width_px: 900,
                height_px: 600,
            },
        });

        const characters = await databaseStore.loadCharacterData();

        expect(characters[0].baseline.referenceSizingMethod).toBe("measurement_line");
        expect(characters[0].baseline.pixelMeasurementPx).toBe(300);
        expect(characters[0].referenceImageLength).toBe(1);
        expect(characters[0].scaleFac).toBe(2);
    });


    test("loads pixel sizing when the method is explicit", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        seedStoredCharacter(fakePocketBase, {
            form: {
                length_meters: 2,
            },
            referenceImage: {
                baseline_points: [
                    {x: 0.5, y: 0},
                    {x: 0.5, y: 1},
                ],
                reference_sizing_method: "pixel_measurement",
                pixel_measurement_px: 300,
                width_px: 900,
                height_px: 600,
            },
        });

        const characters = await databaseStore.loadCharacterData();

        expect(characters[0].baseline.referenceSizingMethod).toBe("pixel_measurement");
        expect(characters[0].baseline.pixelMeasurementPx).toBe(300);
        expect(characters[0].scaleFac).toBe(4);
    });

    test("defaults old form records without units to meters", async () => {
        const databaseStore = new DatabaseStore();
        const fakePocketBase = installFakePocketBase(databaseStore);
        seedStoredCharacter(fakePocketBase, {
            form: {
                length_meters: 2,
            },
        });

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
