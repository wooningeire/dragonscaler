import PocketBase, { type AuthRecord } from "pocketbase";
import { Character } from "./Character.svelte";
import {
    Collections,
    LEGACY_BASELINES_COLLECTION,
    type AccountRecord,
    type CharacterFormRecord,
    type CharacterRecord,
    type IdentityRecord,
    type LegacyBaselineRecord,
    type PocketbaseCommonRecord,
    type ReferenceImageRecord,
} from "./PocketBaseTypes";
import { CharacterImage } from "./CharacterImage.svelte";
import { Baseline } from "./Baseline.svelte";
import { getPocketbaseFileUrl, pocketbaseUrl } from "$lib/util/pocketbase";
import type { IdentitySummary } from "./Identity";


type PocketBaseWritePayload = Record<string, unknown>;


const RECORD_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const RECORD_ID_LENGTH = 15;
const POCKETBASE_WRITE_OPTIONS = {
    // A collection path alone is not a write idempotency key.
    requestKey: null,
};


export class DatabaseStore {
    private readonly pb: PocketBase;
    private readonly characterWrites = new WeakMap<Character, Promise<unknown>>();
    private readonly defaultIdentityWrites = new Map<string, Promise<IdentitySummary>>();
    userRecord = $state<AuthRecord>(null);


    constructor() {
        this.pb = new PocketBase(pocketbaseUrl);
        this.syncClientAuthCookie();
    }

    loadUserRecord() {
        this.loadClientAuthCookieFallback();

        if (!this.pb.authStore.isValid) {
            this.pb.authStore.clear();
        }

        this.userRecord = this.pb.authStore.record;
    }

    async loadCharacterData() {
        const characterDataResultPromise = this.pb.collection(Collections.Characters).getFullList<CharacterRecord>();
        const legacyBaselinesResultPromise = this.loadOptionalRecords<LegacyBaselineRecord>(LEGACY_BASELINES_COLLECTION);
        const characterFormsResultPromise = this.loadOptionalRecords<CharacterFormRecord>(Collections.CharacterForms);
        const referenceImagesResultPromise = this.loadOptionalRecords<ReferenceImageRecord>(Collections.ReferenceImages);
        const identitiesResultPromise = this.loadOptionalRecords<IdentityRecord>(Collections.Identities);

        const [
            characterDataResult,
            legacyBaselinesResult,
            characterFormsResult,
            referenceImagesResult,
            identitiesResult,
        ] = await Promise.all([
            characterDataResultPromise,
            legacyBaselinesResultPromise,
            characterFormsResultPromise,
            referenceImagesResultPromise,
            identitiesResultPromise,
        ]);

        const accountsById = await this.loadAccountsById(this.collectAccountIds(
            characterDataResult,
            identitiesResult,
        ));
        const identitiesById = new Map(identitiesResult.map(identity => [identity.id, identity]));
        const referenceImagesById = new Map(referenceImagesResult.map(referenceImage => [referenceImage.id, referenceImage]));
        const formsByCharacterId = this.groupByCharacterId(characterFormsResult);
        const characterPromises: Promise<Character>[] = [];

        for (const characterData of characterDataResult) {
            const form = this.selectDefaultForm(formsByCharacterId.get(characterData.id) ?? []);
            const legacyBaseline = this.selectLegacyBaseline(
                legacyBaselinesResult,
                characterData.id,
                form?.id ?? null,
            );
            const referenceImage = this.selectReferenceImage(
                form,
                referenceImagesById,
            );
            const ownerIdentities = this.resolveCharacterIdentities(
                characterData.owner_identity_ids ?? [],
                identitiesById,
                accountsById,
            );
            const legacyOwner = this.isRecordId(characterData.owner_id)
                ? accountsById.get(characterData.owner_id) ?? null
                : null;
            const sonaIdentities = this.resolveCharacterIdentities(
                characterData.sona_identity_ids ?? [],
                identitiesById,
                accountsById,
            );

            if (ownerIdentities.length === 0 && legacyOwner !== null) {
                ownerIdentities.push(this.legacyIdentitySummary(legacyOwner));
            }

            const character = new Character({
                id: characterData.id,
                image: null,
                name: characterData.name,
                anchor:
                    referenceImage?.anchor_point
                    ?? form?.center_point
                    ?? characterData.center_point
                    ?? {x: 0.5, y: 0},
                formId: form?.id ?? null,
                referenceImageIds: form?.reference_image_ids ?? [],
                baseline: new Baseline({
                    points: referenceImage?.baseline_points ?? legacyBaseline?.points,
                    descriptor: referenceImage?.baseline_descriptor ?? legacyBaseline?.descriptor,
                    targetLength: form?.length_meters ?? legacyBaseline?.length_meters,
                }),
                ownerIdentities,
                sonaIdentities,
                uploaded: true,
            });

            const imageSource = referenceImage === null
                ? this.getLegacyImageSource(characterData)
                : {
                    collection: Collections.ReferenceImages,
                    recordId: referenceImage.id,
                    filename: referenceImage.image,
                };

            if (imageSource !== null) {
                characterPromises.push((async () => {
                    const characterImageUrl = getPocketbaseFileUrl(imageSource);

                    CharacterImage.fromUrl(characterImageUrl, imageSource.filename)
                        .then(image => character.image = image)
                        .catch(error => console.error(error));

                    return character;
                })());
            } else {
                characterPromises.push(Promise.resolve(character));
            }
        }

        return Promise.all(characterPromises);
    }

    async createCharacter(character: Character) {
        return await this.runExclusiveCharacterWrite(character, async () => {
            const ownerIdentityIds = await this.resolveOwnerIdentityIds(character);
            const characterId = this.ensureRecordId(character.id);
            character.id = characterId;
            const characterData = this.characterWriteData(
                character,
                ownerIdentityIds,
            );
            const charRecord = await this.createOrUpdateRecord<CharacterRecord>(
                Collections.Characters,
                characterId,
                characterData,
            );

            const referenceImageId = await this.saveReferenceImage(character);
            const formId = this.ensureRecordId(character.formId);
            character.formId = formId;
            await this.createOrUpdateRecord<CharacterFormRecord>(
                Collections.CharacterForms,
                formId,
                this.defaultFormWriteData(
                    charRecord.id,
                    character,
                    referenceImageId,
                ),
            );

            character.referenceImageIds = [referenceImageId];
            character.uploaded = true;

            return charRecord;
        });
    }

    async updateCharacter(character: Character) {
        return await this.runExclusiveCharacterWrite(character, async () => {
            if (!this.isRecordId(character.id)) throw new Error("character has no id");

            const ownerIdentityIds = await this.resolveOwnerIdentityIds(character);
            await this.pb.collection(Collections.Characters).update(
                character.id,
                this.characterWriteData(
                    character,
                    ownerIdentityIds,
                ),
                POCKETBASE_WRITE_OPTIONS,
            );

            const referenceImageId = await this.saveReferenceImage(character);

            if (this.isRecordId(character.formId)) {
                await this.updateOrCreateRecord<CharacterFormRecord>(
                    Collections.CharacterForms,
                    character.formId,
                    this.defaultFormWriteData(
                        character.id,
                        character,
                        referenceImageId,
                    ),
                );
            } else {
                const formId = this.createRecordId();
                character.formId = formId;
                await this.createOrUpdateRecord<CharacterFormRecord>(
                    Collections.CharacterForms,
                    formId,
                    this.defaultFormWriteData(
                        character.id,
                        character,
                        referenceImageId,
                    ),
                );
            }

            character.referenceImageIds = [referenceImageId];

            return character;
        });
    }

    async promptDiscordLogin() {
        const authResult = await this.pb.collection(Collections.Accounts).authWithOAuth2({
            provider: "discord",
            scopes: ["identify"],
        });

        this.userRecord = authResult.record;

        // PocketBase does not map Discord avatars into the file field by itself.
        const avatarUrl = authResult.meta!.avatarUrl;
        fetch(avatarUrl)
            .then(async response => {
                await this.pb.collection(Collections.Accounts).update(
                    authResult.record.id,
                    {
                        avatar: new File(
                            [await response.blob()],
                            new URL(avatarUrl).pathname.split("/").at(-1) ?? "avatar",
                        ),
                    },
                    POCKETBASE_WRITE_OPTIONS,
                );

                this.userRecord = await this.pb.collection(Collections.Accounts).getOne(authResult.record.id);
            })
            .catch(error => console.error(error));

        await this.getDefaultIdentityForCurrentAccount();

        return authResult;
    }

    logout() {
        this.pb.authStore.clear();

        this.userRecord = null;
    }

    async createOwnerIdentityObject() {
        return await this.getDefaultIdentityForCurrentAccount();
    }

    currentAccountName() {
        return this.currentAccountRecord()?.username ?? "Account";
    }

    currentAccountAvatarUrl() {
        const account = this.currentAccountRecord();

        return this.accountAvatarUrl(account);
    }

    private currentAccountRecord() {
        return this.userRecord as AccountRecord | null;
    }

    private async loadOptionalRecords<RecordType>(collection: string) {
        try {
            return await this.pb.collection(collection).getFullList<RecordType>();
        } catch (error) {
            if (this.isMissingCollectionError(error)) return [];

            throw error;
        }
    }

    private isMissingCollectionError(error: unknown) {
        return this.isPocketBaseStatusError(
            error,
            404,
        );
    }

    private isMissingRecordError(error: unknown) {
        return this.isPocketBaseStatusError(
            error,
            404,
        );
    }

    private isDuplicateRecordIdError(error: unknown) {
        if (!this.isPocketBaseStatusError(
            error,
            400,
        )) {
            return false;
        }

        const idError = this.pocketBaseFieldError(
            error,
            "id",
        );
        const code = this.errorText(idError?.code);
        const message = this.errorText(idError?.message);

        return code.includes("unique")
            || message.includes("unique");
    }

    private isPocketBaseStatusError(
        error: unknown,
        status: number,
    ) {
        return typeof error === "object"
            && error !== null
            && "status" in error
            && (error as {status?: number}).status === status;
    }

    private pocketBaseFieldError(
        error: unknown,
        fieldName: string,
    ) {
        if (typeof error !== "object" || error === null) return null;

        const response = (error as {
            response?: {
                data?: Record<string, {
                    code?: unknown,
                    message?: unknown,
                }>,
            },
        }).response;

        return response?.data?.[fieldName] ?? null;
    }

    private errorText(value: unknown) {
        return typeof value === "string"
            ? value.toLowerCase()
            : "";
    }

    private syncClientAuthCookie() {
        if (typeof document === "undefined") return;

        this.pb.authStore.onChange(() => this.writeClientAuthCookie());

        if (this.pb.authStore.token !== "") {
            this.writeClientAuthCookie();
        }
    }

    private writeClientAuthCookie() {
        document.cookie = this.pb.authStore.exportToCookie({
            httpOnly: false,
            sameSite: "lax",
            secure: window.location.protocol === "https:",
        });
    }

    private loadClientAuthCookieFallback() {
        if (
            typeof document === "undefined"
            || this.pb.authStore.record !== null
            || !document.cookie.includes("pb_auth=")
        ) {
            return;
        }

        this.pb.authStore.loadFromCookie(document.cookie);
    }

    private collectAccountIds(
        characters: CharacterRecord[],
        identities: IdentityRecord[],
    ) {
        const accountIds = new Set<string>();

        for (const character of characters) {
            if (this.isRecordId(character.owner_id)) accountIds.add(character.owner_id);
        }

        for (const identity of identities) {
            for (const accountId of identity.account_ids ?? []) {
                if (this.isRecordId(accountId)) accountIds.add(accountId);
            }
        }

        return accountIds;
    }

    private async loadAccountsById(accountIds: Set<string>) {
        const accountEntries = await Promise.all([...accountIds].map(async accountId => {
            try {
                const account = await this.pb.collection(Collections.Accounts).getOne<AccountRecord>(accountId);

                return [accountId, account] as const;
            } catch (error) {
                console.error(error);

                return null;
            }
        }));

        return new Map(accountEntries.filter(entry => entry !== null));
    }

    private groupByCharacterId<RecordType extends {character_id: string}>(
        records: RecordType[],
    ) {
        const recordsByCharacterId = new Map<string, RecordType[]>();

        for (const record of records) {
            const recordsForCharacter = recordsByCharacterId.get(record.character_id) ?? [];
            recordsForCharacter.push(record);
            recordsByCharacterId.set(record.character_id, recordsForCharacter);
        }

        return recordsByCharacterId;
    }

    private selectDefaultForm(forms: CharacterFormRecord[]) {
        return forms.find(form => form.is_default)
            ?? forms[0]
            ?? null;
    }

    private selectLegacyBaseline(
        baselines: LegacyBaselineRecord[],
        characterId: string,
        formId: string | null,
    ) {
        if (formId !== null) {
            const formBaseline = baselines.find(baseline => (
                baseline.character_form_id === formId
                && baseline.is_default
            )) ?? baselines.find(baseline => baseline.character_form_id === formId);

            if (formBaseline !== undefined) return formBaseline;
        }

        const characterBaselines = baselines.filter(baseline => baseline.character_id === characterId);

        return characterBaselines.find(baseline => (
            baseline.is_default
            && baseline.character_form_id === undefined
        )) ?? characterBaselines.find(baseline => baseline.is_default)
            ?? characterBaselines[0]
            ?? null;
    }

    private selectReferenceImage(
        form: CharacterFormRecord | null,
        referenceImagesById: Map<string, ReferenceImageRecord>,
    ) {
        for (const referenceImageId of form?.reference_image_ids ?? []) {
            const referenceImage = referenceImagesById.get(referenceImageId);

            if (referenceImage !== undefined) return referenceImage;
        }

        return null;
    }

    private resolveCharacterIdentities(
        identityIds: string[],
        identitiesById: Map<string, IdentityRecord>,
        accountsById: Map<string, AccountRecord>,
    ) {
        return identityIds
            .map(identityId => identitiesById.get(identityId) ?? null)
            .filter(identity => identity !== null)
            .map(identity => this.identitySummary(identity, accountsById));
    }

    private identitySummary(
        identity: IdentityRecord,
        accountsById: Map<string, AccountRecord>,
    ): IdentitySummary {
        const accountIds = (identity.account_ids ?? []).filter(this.isRecordId);
        const fallbackAccount = accountIds
            .map(accountId => accountsById.get(accountId) ?? null)
            .find(account => account !== null) ?? null;

        return {
            id: identity.id,
            identityId: identity.id,
            accountId: fallbackAccount?.id ?? accountIds[0] ?? null,
            name: identity.display_name,
            avatarUrl: identity.avatar === undefined || identity.avatar === ""
                ? this.accountAvatarUrl(fallbackAccount)
                : getPocketbaseFileUrl({
                    collection: Collections.Identities,
                    recordId: identity.id,
                    filename: identity.avatar,
                }),
        };
    }

    private legacyIdentitySummary(account: AccountRecord): IdentitySummary {
        return {
            id: `legacy-account:${account.id}`,
            identityId: null,
            accountId: account.id,
            name: account.username,
            avatarUrl: this.accountAvatarUrl(account),
        };
    }

    private accountAvatarUrl(account: AccountRecord | null) {
        if (account === null || account.avatar === undefined || account.avatar === "") return null;

        return getPocketbaseFileUrl({
            collection: Collections.Accounts,
            recordId: account.id,
            filename: account.avatar,
        });
    }

    private isRecordId = (recordId: string | null | undefined): recordId is string => {
        return recordId !== null
            && recordId !== undefined
            && recordId !== "";
    };

    private getLegacyImageSource(characterData: CharacterRecord) {
        if (characterData.image === undefined || characterData.image === "") return null;

        return {
            collection: Collections.Characters,
            recordId: characterData.id,
            filename: characterData.image,
        };
    }

    private async resolveOwnerIdentityIds(character: Character) {
        const ownerIdentityIds = character.ownerIdentities
            .map(identity => identity.identityId)
            .filter(this.isRecordId);
        const legacyCurrentAccountIndex = character.ownerIdentities.findIndex(identity => (
            identity.identityId === null
            && identity.accountId === this.userRecord?.id
        ));

        if (legacyCurrentAccountIndex >= 0) {
            const currentIdentity = await this.getDefaultIdentityForCurrentAccount();
            character.ownerIdentities[legacyCurrentAccountIndex] = currentIdentity;
            ownerIdentityIds.push(currentIdentity.identityId!);
        }

        if (ownerIdentityIds.length === 0) throw new Error("character has no owner identity");

        return [...new Set(ownerIdentityIds)];
    }

    private characterWriteData(
        character: Character,
        ownerIdentityIds: string[],
    ): PocketBaseWritePayload {
        return {
            name: character.name,
            owner_identity_ids: ownerIdentityIds,
            sona_identity_ids: character.sonaIdentities.map(identity => identity.id),
        };
    }

    private defaultFormWriteData(
        characterId: string,
        character: Character,
        referenceImageId: string,
    ): PocketBaseWritePayload {
        return {
            character_id: characterId,
            name: "Default",
            is_default: true,
            length_meters: character.baseline.targetLength,
            reference_image_ids: [referenceImageId],
        };
    }

    private async saveReferenceImage(character: Character) {
        if (character.image === null) throw new Error("character has no image");

        const existingReferenceImageId = character.referenceImageIds[0];
        const referenceImageData = {
            anchor_point: character.anchor,
            baseline_points: character.baseline.points,
            baseline_descriptor: character.baseline.descriptor,
        };
        const referenceImageCreateData = {
            ...referenceImageData,
            image: character.image.file,
        };

        if (this.isRecordId(existingReferenceImageId)) {
            if (character.image.hasObjectUrl) {
                await this.updateOrCreateRecord<ReferenceImageRecord>(
                    Collections.ReferenceImages,
                    existingReferenceImageId,
                    referenceImageCreateData,
                );
            } else {
                await this.updateOrCreateRecord<ReferenceImageRecord>(
                    Collections.ReferenceImages,
                    existingReferenceImageId,
                    referenceImageData,
                    referenceImageCreateData,
                );
            }

            return existingReferenceImageId;
        }

        // Allocate ids before network writes so a retry targets the same records.
        const referenceImageId = this.createRecordId();
        character.referenceImageIds = [referenceImageId];
        await this.createOrUpdateRecord<ReferenceImageRecord>(
            Collections.ReferenceImages,
            referenceImageId,
            referenceImageCreateData,
        );

        return referenceImageId;
    }

    private async getDefaultIdentityForCurrentAccount() {
        if (this.userRecord === null) throw new Error("not authenticated");

        const accountId = this.userRecord.id;

        return await this.runDefaultIdentityWrite(accountId, async () => {
            const account = await this.pb.collection(Collections.Accounts).getOne<AccountRecord>(accountId);
            const identities = await this.pb.collection(Collections.Identities).getFullList<IdentityRecord>({
                filter: this.pb.filter(
                    "account_ids.id = {:accountId}",
                    {accountId},
                ),
                sort: "created",
            });
            const accountsById = new Map([[account.id, account]]);

            if (identities.length > 0) {
                return this.identitySummary(
                    identities[0],
                    accountsById,
                );
            }

            const identity = await this.createOrUpdateRecord<IdentityRecord>(
                Collections.Identities,
                account.id,
                {
                    display_name: account.username,
                    account_ids: [account.id],
                },
            );

            return this.identitySummary(
                identity,
                accountsById,
            );
        });
    }

    private runExclusiveCharacterWrite<Result>(
        character: Character,
        write: () => Promise<Result>,
    ) {
        const existingWrite = this.characterWrites.get(character);
        if (existingWrite !== undefined) return existingWrite as Promise<Result>;

        const writePromise = write().finally(() => {
            if (this.characterWrites.get(character) === writePromise) {
                this.characterWrites.delete(character);
            }
        });
        this.characterWrites.set(
            character,
            writePromise,
        );

        return writePromise;
    }

    private runDefaultIdentityWrite(
        accountId: string,
        write: () => Promise<IdentitySummary>,
    ) {
        const existingWrite = this.defaultIdentityWrites.get(accountId);
        if (existingWrite !== undefined) return existingWrite;

        const writePromise = write().finally(() => {
            if (this.defaultIdentityWrites.get(accountId) === writePromise) {
                this.defaultIdentityWrites.delete(accountId);
            }
        });
        this.defaultIdentityWrites.set(
            accountId,
            writePromise,
        );

        return writePromise;
    }

    private async createOrUpdateRecord<RecordType extends PocketbaseCommonRecord>(
        collection: Collections,
        id: string,
        createData: PocketBaseWritePayload,
        updateData: PocketBaseWritePayload = createData,
    ) {
        try {
            return await this.pb.collection(collection).create<RecordType>({
                id,
                ...createData,
            }, POCKETBASE_WRITE_OPTIONS);
        } catch (error) {
            if (!this.isDuplicateRecordIdError(error)) throw error;

            return await this.pb.collection(collection).update<RecordType>(
                id,
                updateData,
                POCKETBASE_WRITE_OPTIONS,
            );
        }
    }

    private async updateOrCreateRecord<RecordType extends PocketbaseCommonRecord>(
        collection: Collections,
        id: string,
        updateData: PocketBaseWritePayload,
        createData: PocketBaseWritePayload = updateData,
    ) {
        try {
            return await this.pb.collection(collection).update<RecordType>(
                id,
                updateData,
                POCKETBASE_WRITE_OPTIONS,
            );
        } catch (error) {
            if (!this.isMissingRecordError(error)) throw error;

            return await this.createOrUpdateRecord<RecordType>(
                collection,
                id,
                createData,
                updateData,
            );
        }
    }

    private ensureRecordId(recordId: string | null | undefined) {
        return this.isRecordId(recordId)
            ? recordId
            : this.createRecordId();
    }

    private createRecordId() {
        const randomValues = new Uint8Array(RECORD_ID_LENGTH);
        globalThis.crypto.getRandomValues(randomValues);

        return [...randomValues]
            .map(value => RECORD_ID_ALPHABET[value % RECORD_ID_ALPHABET.length])
            .join("");
    }
}
