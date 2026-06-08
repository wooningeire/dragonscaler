import PocketBase, { type AuthRecord } from "pocketbase";
import { Character } from "./Character.svelte";
import {
    Collections,
    type AccountRecord,
    type BaselineRecord,
    type CharacterFormRecord,
    type CharacterRecord,
    type IdentityRecord,
    type ReferenceImageRecord,
} from "./PocketBaseTypes";
import { CharacterImage } from "./CharacterImage.svelte";
import { Baseline } from "./Baseline.svelte";
import { getPocketbaseFileUrl, pocketbaseUrl } from "$lib/util/pocketbase";
import type { IdentitySummary } from "./Identity";


export class DatabaseStore {
    private readonly pb: PocketBase;
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
        const baselinesResultPromise = this.pb.collection(Collections.Baselines).getFullList<BaselineRecord>();
        const characterFormsResultPromise = this.loadOptionalRecords<CharacterFormRecord>(Collections.CharacterForms);
        const referenceImagesResultPromise = this.loadOptionalRecords<ReferenceImageRecord>(Collections.ReferenceImages);
        const identitiesResultPromise = this.loadOptionalRecords<IdentityRecord>(Collections.Identities);

        const [
            characterDataResult,
            baselinesResult,
            characterFormsResult,
            referenceImagesResult,
            identitiesResult,
        ] = await Promise.all([
            characterDataResultPromise,
            baselinesResultPromise,
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
        const baselinesByCharacterId = this.groupByCharacterId(baselinesResult);
        const characterPromises: Promise<Character>[] = [];

        for (const characterData of characterDataResult) {
            const form = this.selectDefaultForm(formsByCharacterId.get(characterData.id) ?? []);
            const baseline = this.selectDefaultBaseline(
                baselinesByCharacterId.get(characterData.id) ?? [],
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
                center: form?.center_point ?? characterData.center_point ?? {x: 0.5, y: 0},
                formId: form?.id ?? null,
                referenceImageIds: form?.reference_image_ids ?? [],
                baseline: new Baseline({
                    id: baseline?.id ?? null,
                    points: baseline?.points,
                    descriptor: baseline?.descriptor,
                    targetLength: baseline?.length_meters,
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
        const ownerIdentityIds = await this.resolveOwnerIdentityIds(character);
        const charRecord = await this.pb.collection(Collections.Characters).create<CharacterRecord>({
            name: character.name,
            owner_identity_ids: ownerIdentityIds,
            sona_identity_ids: character.sonaIdentities.map(identity => identity.id),
        });

        const referenceImageId = await this.saveReferenceImage(character);
        const formRecord = await this.pb.collection(Collections.CharacterForms).create<CharacterFormRecord>({
            character_id: charRecord.id,
            name: "Default",
            is_default: true,
            center_point: character.center,
            reference_image_ids: [referenceImageId],
        });

        character.formId = formRecord.id;
        character.referenceImageIds = [referenceImageId];

        const baselineRecord = await this.saveBaseline(
            character,
            charRecord.id,
            formRecord.id,
        );

        character.baseline.id = baselineRecord.id;

        return charRecord;
    }

    async updateCharacter(character: Character) {
        if (!this.isRecordId(character.id)) throw new Error("character has no id");

        const ownerIdentityIds = await this.resolveOwnerIdentityIds(character);
        await this.pb.collection(Collections.Characters).update(character.id, {
            name: character.name,
            owner_identity_ids: ownerIdentityIds,
            sona_identity_ids: character.sonaIdentities.map(identity => identity.id),
        });

        const referenceImageId = await this.saveReferenceImage(character);

        if (this.isRecordId(character.formId)) {
            await this.pb.collection(Collections.CharacterForms).update(character.formId, {
                name: "Default",
                is_default: true,
                center_point: character.center,
                reference_image_ids: [referenceImageId],
            });
        } else {
            const formRecord = await this.pb.collection(Collections.CharacterForms).create<CharacterFormRecord>({
                character_id: character.id,
                name: "Default",
                is_default: true,
                center_point: character.center,
                reference_image_ids: [referenceImageId],
            });

            character.formId = formRecord.id;
        }

        character.referenceImageIds = [referenceImageId];

        return await this.saveBaseline(
            character,
            character.id,
            character.formId,
        );
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
                await this.pb.collection(Collections.Accounts).update(authResult.record.id, {
                    avatar: new File(
                        [await response.blob()],
                        new URL(avatarUrl).pathname.split("/").at(-1) ?? "avatar",
                    ),
                });

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

    private async loadOptionalRecords<RecordType>(collection: Collections) {
        try {
            return await this.pb.collection(collection).getFullList<RecordType>();
        } catch (error) {
            if (this.isMissingCollectionError(error)) return [];

            throw error;
        }
    }

    private isMissingCollectionError(error: unknown) {
        return typeof error === "object"
            && error !== null
            && "status" in error
            && (error as {status?: number}).status === 404;
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

    private selectDefaultBaseline(
        baselines: BaselineRecord[],
        formId: string | null,
    ) {
        if (formId !== null) {
            const formBaseline = baselines.find(baseline => (
                baseline.character_form_id === formId
                && baseline.is_default
            )) ?? baselines.find(baseline => baseline.character_form_id === formId);

            if (formBaseline !== undefined) return formBaseline;
        }

        return baselines.find(baseline => (
            baseline.is_default
            && baseline.character_form_id === undefined
        )) ?? baselines.find(baseline => baseline.is_default)
            ?? baselines[0]
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

    private async saveReferenceImage(character: Character) {
        if (character.image === null) throw new Error("character has no image");

        const existingReferenceImageId = character.referenceImageIds[0];

        if (this.isRecordId(existingReferenceImageId)) {
            if (character.image.hasObjectUrl) {
                await this.pb.collection(Collections.ReferenceImages).update(existingReferenceImageId, {
                    image: character.image.file,
                });
            }

            return existingReferenceImageId;
        }

        const referenceImage = await this.pb.collection(Collections.ReferenceImages).create<ReferenceImageRecord>({
            image: character.image.file,
        });

        character.referenceImageIds = [referenceImage.id];

        return referenceImage.id;
    }

    private async saveBaseline(
        character: Character,
        characterId: string,
        formId: string | null,
    ) {
        const baselineData = {
            character_id: characterId,
            character_form_id: formId,
            is_default: true,
            points: character.baseline.points,
            descriptor: character.baseline.descriptor,
            length_meters: character.baseline.targetLength,
        };

        if (this.isRecordId(character.baseline.id)) {
            return await this.pb.collection(Collections.Baselines).update<BaselineRecord>(
                character.baseline.id,
                baselineData,
            );
        }

        const baselineRecord = await this.pb.collection(Collections.Baselines).create<BaselineRecord>(baselineData);

        character.baseline.id = baselineRecord.id;

        return baselineRecord;
    }

    private async getDefaultIdentityForCurrentAccount() {
        if (this.userRecord === null) throw new Error("not authenticated");

        const account = await this.pb.collection(Collections.Accounts).getOne<AccountRecord>(this.userRecord.id);
        const identities = await this.pb.collection(Collections.Identities).getFullList<IdentityRecord>({
            filter: this.pb.filter(
                "account_ids.id = {:accountId}",
                {accountId: this.userRecord.id},
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

        const identity = await this.pb.collection(Collections.Identities).create<IdentityRecord>({
            display_name: account.username,
            account_ids: [account.id],
        });

        return this.identitySummary(
            identity,
            accountsById,
        );
    }
}
