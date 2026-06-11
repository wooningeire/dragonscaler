/// <reference path="../pb_data/types.d.ts" />

const COLLECTIONS = {
    accounts: "_pb_users_auth_",
    baselines: "pbc_3302564769",
    characters: "ifhsgi3s6p97ltf",
    characterForms: "ds_char_forms",
    identities: "ds_identities",
    referenceImages: "ds_ref_images",
};

const ID_FIELD_ID = "text3208210256";
const CREATED_FIELD_ID = "autodate2990389176";
const UPDATED_FIELD_ID = "autodate3332085495";

const identityAccountRule = "account_ids.id = @request.auth.id";
const characterOwnerRules = [
    "owner_identity_ids.account_ids.id = @request.auth.id",
    "owner_id.id = @request.auth.id",
].join(" || ");
const characterFormOwnerRules = [
    "character_id.owner_identity_ids.account_ids.id = @request.auth.id",
    "character_id.owner_id.id = @request.auth.id",
].join(" || ");
const baselineOwnerRules = [
    "character_id.owner_identity_ids.account_ids.id = @request.auth.id",
    "character_id.owner_id.id = @request.auth.id",
    "character_form_id.character_id.owner_identity_ids.account_ids.id = @request.auth.id",
].join(" || ");


const idField = () => ({
    autogeneratePattern: "[a-z0-9]{15}",
    help: "",
    hidden: false,
    id: ID_FIELD_ID,
    max: 15,
    min: 15,
    name: "id",
    pattern: "^[a-z0-9]+$",
    presentable: false,
    primaryKey: true,
    required: true,
    system: true,
    type: "text",
});


const createdField = () => ({
    hidden: false,
    id: CREATED_FIELD_ID,
    name: "created",
    onCreate: true,
    onUpdate: false,
    presentable: false,
    system: false,
    type: "autodate",
});


const updatedField = () => ({
    hidden: false,
    id: UPDATED_FIELD_ID,
    name: "updated",
    onCreate: true,
    onUpdate: true,
    presentable: false,
    system: false,
    type: "autodate",
});


const textField = (
    id,
    name,
    {
        required = false,
        presentable = false,
        max = 0,
        min = 0,
    } = {},
) => ({
    autogeneratePattern: "",
    help: "",
    hidden: false,
    id,
    max,
    min,
    name,
    pattern: "",
    presentable,
    primaryKey: false,
    required,
    system: false,
    type: "text",
});


const boolField = (
    id,
    name,
    {
        required = false,
    } = {},
) => ({
    help: "",
    hidden: false,
    id,
    name,
    presentable: false,
    required,
    system: false,
    type: "bool",
});


const jsonField = (
    id,
    name,
    {
        required = false,
        maxSize = 102400,
    } = {},
) => ({
    help: "",
    hidden: false,
    id,
    maxSize,
    name,
    presentable: false,
    required,
    system: false,
    type: "json",
});


const numberField = (
    id,
    name,
    {
        required = false,
    } = {},
) => ({
    help: "",
    hidden: false,
    id,
    max: null,
    min: null,
    name,
    onlyInt: false,
    presentable: false,
    required,
    system: false,
    type: "number",
});


const selectField = (
    id,
    name,
    values,
    {
        required = false,
    } = {},
) => ({
    help: "",
    hidden: false,
    id,
    maxSelect: 1,
    name,
    presentable: false,
    required,
    system: false,
    type: "select",
    values,
});


const relationField = (
    id,
    name,
    collectionId,
    {
        required = false,
        minSelect = 0,
        maxSelect = 1,
        cascadeDelete = false,
    } = {},
) => ({
    cascadeDelete,
    collectionId,
    help: "",
    hidden: false,
    id,
    maxSelect,
    minSelect,
    name,
    presentable: false,
    required,
    system: false,
    type: "relation",
});


const fileField = (
    id,
    name,
    {
        required = false,
        maxSelect = 1,
        maxSize = 52428800,
        mimeTypes = [],
        thumbs = [],
    } = {},
) => ({
    help: "",
    hidden: false,
    id,
    maxSelect,
    maxSize,
    mimeTypes,
    name,
    presentable: false,
    protected: false,
    required,
    system: false,
    thumbs,
    type: "file",
});


const baseCollection = ({
    id,
    name,
    fields,
    rules = {},
    indexes = [],
}) => ({
    id,
    indexes,
    name,
    system: false,
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    ...rules,
    fields: [
        idField(),
        ...fields,
        createdField(),
        updatedField(),
    ],
});


const accountsCollection = () => ({
    authAlert: {
        emailTemplate: {
            body: "<p>Hello,</p><p>We noticed a login to your {APP_NAME} account from a new location:</p><p><em>{ALERT_INFO}</em></p>",
            subject: "Login from a new location",
        },
        enabled: true,
    },
    authRule: "",
    authToken: {
        duration: 1209600,
    },
    confirmEmailChangeTemplate: {
        body: "<p>Hello,</p><p>Click the link below to confirm your new email address.</p><p>{APP_URL}/_/#/auth/confirm-email-change/{TOKEN}</p>",
        subject: "Confirm your {APP_NAME} new email address",
    },
    createRule: "",
    deleteRule: "id = @request.auth.id",
    emailChangeToken: {
        duration: 1800,
    },
    fields: [
        idField(),
        {
            cost: 10,
            help: "",
            hidden: true,
            id: "password901924565",
            max: 0,
            min: 0,
            name: "password",
            pattern: "",
            presentable: false,
            required: true,
            system: true,
            type: "password",
        },
        {
            autogeneratePattern: "[a-zA-Z0-9_]{50}",
            help: "",
            hidden: true,
            id: "text2504183744",
            max: 60,
            min: 30,
            name: "tokenKey",
            pattern: "",
            presentable: false,
            primaryKey: false,
            required: true,
            system: true,
            type: "text",
        },
        {
            exceptDomains: null,
            help: "",
            hidden: false,
            id: "email3885137012",
            name: "email",
            onlyDomains: null,
            presentable: false,
            required: false,
            system: true,
            type: "email",
        },
        {
            help: "",
            hidden: false,
            id: "bool1547992806",
            name: "emailVisibility",
            presentable: false,
            required: false,
            system: true,
            type: "bool",
        },
        {
            help: "",
            hidden: false,
            id: "bool256245529",
            name: "verified",
            presentable: false,
            required: false,
            system: true,
            type: "bool",
        },
        {
            autogeneratePattern: "users[0-9]{6}",
            help: "",
            hidden: false,
            id: "text4166911607",
            max: 150,
            min: 3,
            name: "username",
            pattern: "^[\\w][\\w\\.\\-]*$",
            presentable: false,
            primaryKey: false,
            required: true,
            system: false,
            type: "text",
        },
        fileField(
            "users_avatar",
            "avatar",
            {
                maxSize: 5242880,
                mimeTypes: [
                    "image/jpeg",
                    "image/png",
                    "image/svg+xml",
                    "image/gif",
                    "image/webp",
                ],
                thumbs: null,
            },
        ),
        createdField(),
        updatedField(),
    ],
    fileToken: {
        duration: 120,
    },
    id: COLLECTIONS.accounts,
    indexes: [
        "CREATE UNIQUE INDEX `__pb_users_auth__username_idx` ON `users` (username COLLATE NOCASE)",
        "CREATE UNIQUE INDEX `__pb_users_auth__email_idx` ON `users` (`email`) WHERE `email` != ''",
        "CREATE UNIQUE INDEX `__pb_users_auth__tokenKey_idx` ON `users` (`tokenKey`)",
    ],
    listRule: "",
    manageRule: null,
    mfa: {
        duration: 1800,
        enabled: false,
        rule: "",
    },
    name: "users",
    oauth2: {
        enabled: true,
        mappedFields: {
            avatarURL: "",
            id: "",
            name: "",
            username: "username",
        },
    },
    otp: {
        duration: 180,
        emailTemplate: {
            body: "<p>Hello,</p><p>Your one-time password is: <strong>{OTP}</strong></p>",
            subject: "OTP for {APP_NAME}",
        },
        enabled: false,
        length: 8,
    },
    passwordAuth: {
        enabled: false,
        identityFields: [],
    },
    passwordResetToken: {
        duration: 1800,
    },
    resetPasswordTemplate: {
        body: "<p>Hello,</p><p>Click the link below to reset your password.</p><p>{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}</p>",
        subject: "Reset your {APP_NAME} password",
    },
    system: false,
    type: "auth",
    updateRule: "id = @request.auth.id",
    verificationTemplate: {
        body: "<p>Hello,</p><p>Thank you for joining {APP_NAME}.</p><p>{APP_URL}/_/#/auth/confirm-verification/{TOKEN}</p>",
        subject: "Verify your {APP_NAME} email",
    },
    verificationToken: {
        duration: 604800,
    },
    viewRule: "",
});


const identityCollection = () => baseCollection({
    id: COLLECTIONS.identities,
    name: "dragonscaler_identities",
    rules: {
        createRule: identityAccountRule,
        updateRule: identityAccountRule,
        deleteRule: identityAccountRule,
    },
    fields: [
        textField(
            "ident_name",
            "display_name",
            {
                required: true,
                presentable: true,
            },
        ),
        relationField(
            "ident_accounts",
            "account_ids",
            COLLECTIONS.accounts,
            {
                maxSelect: 999,
            },
        ),
        fileField(
            "ident_avatar",
            "avatar",
            {
                maxSize: 5242880,
                mimeTypes: [
                    "image/jpeg",
                    "image/png",
                    "image/svg+xml",
                    "image/gif",
                    "image/webp",
                ],
                thumbs: null,
            },
        ),
    ],
});


const referenceImagesCollection = () => baseCollection({
    id: COLLECTIONS.referenceImages,
    name: "dragonscaler_reference_images",
    rules: {
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
    },
    fields: [
        fileField(
            "ref_image",
            "image",
            {
                required: true,
            },
        ),
        textField("ref_caption", "caption"),
        jsonField("ref_anchor", "anchor_point"),
        jsonField("ref_baseline_points", "baseline_points"),
        textField("ref_baseline_descriptor", "baseline_descriptor"),
    ],
});


const characterFormsCollection = () => baseCollection({
    id: COLLECTIONS.characterForms,
    name: "dragonscaler_character_forms",
    rules: {
        createRule: characterFormOwnerRules,
        updateRule: characterFormOwnerRules,
        deleteRule: characterFormOwnerRules,
    },
    fields: [
        relationField(
            "form_character",
            "character_id",
            COLLECTIONS.characters,
            {
                required: true,
            },
        ),
        textField("form_name", "name"),
        boolField("form_default", "is_default"),
        numberField(
            "form_length_meters",
            "length_meters",
            {
                required: true,
            },
        ),
        selectField(
            "form_length_unit",
            "length_unit",
            [
                "m",
                "ft",
            ],
            {
                required: true,
            },
        ),
        relationField(
            "form_refs",
            "reference_image_ids",
            COLLECTIONS.referenceImages,
            {
                maxSelect: 999,
            },
        ),
    ],
});


const charactersCollection = ({
    includeNewFields,
    includeCenterField,
    imageRequired,
    centerRequired,
    ownerRequired,
    rules,
}) => baseCollection({
    id: COLLECTIONS.characters,
    name: "dragonscaler_characters",
    rules,
    fields: [
        textField(
            "bwopadqg",
            "name",
            {
                required: true,
                presentable: true,
            },
        ),
        fileField(
            "rt1baztg",
            "image",
            {
                required: imageRequired,
            },
        ),
        ...(includeCenterField ? [jsonField(
            "jkic8j70",
            "center_point",
            {
                required: centerRequired,
                maxSize: 10240,
            },
        )] : []),
        relationField(
            "ankqpwtw",
            "owner_id",
            COLLECTIONS.accounts,
            {
                required: ownerRequired,
            },
        ),
        ...(includeNewFields ? [
            relationField(
                "char_owners",
                "owner_identity_ids",
                COLLECTIONS.identities,
                {
                    maxSelect: 999,
                },
            ),
            relationField(
                "char_sonas",
                "sona_identity_ids",
                COLLECTIONS.identities,
                {
                    maxSelect: 999,
                },
            ),
        ] : []),
    ],
});


const baselinesCollection = ({
    includeCharacterForm,
    rules,
}) => baseCollection({
    id: COLLECTIONS.baselines,
    name: "dragonscaler_baselines",
    rules,
    fields: [
        relationField(
            "relation288800373",
            "character_id",
            COLLECTIONS.characters,
            {
                required: true,
            },
        ),
        ...(includeCharacterForm ? [
            relationField(
                "baseline_form",
                "character_form_id",
                COLLECTIONS.characterForms,
            ),
        ] : []),
        boolField("bool4116874775", "is_default"),
        jsonField(
            "json666537513",
            "points",
            {
                required: true,
            },
        ),
        textField(
            "text59930114",
            "descriptor",
            {
                required: true,
            },
        ),
        numberField(
            "number4202024394",
            "length_meters",
            {
                required: true,
            },
        ),
    ],
});


migrate((app) => {
    return app.importCollections([
        accountsCollection(),
        identityCollection(),
        referenceImagesCollection(),
        charactersCollection({
            includeNewFields: true,
            includeCenterField: false,
            imageRequired: false,
            centerRequired: false,
            ownerRequired: false,
            rules: {
                createRule: characterOwnerRules,
                updateRule: characterOwnerRules,
                deleteRule: characterOwnerRules,
            },
        }),
        characterFormsCollection(),
    ], false);
}, (app) => {
    app.importCollections([
        charactersCollection({
            includeNewFields: false,
            includeCenterField: true,
            imageRequired: true,
            centerRequired: true,
            ownerRequired: true,
            rules: {
                createRule: "owner_id.id = @request.auth.id",
                updateRule: "owner_id.id = @request.auth.id",
                deleteRule: "owner_id.id = @request.auth.id",
            },
        }),
        baselinesCollection({
            includeCharacterForm: false,
            rules: {
                createRule: "character_id.owner_id.id = @request.auth.id",
                updateRule: "character_id.owner_id.id = @request.auth.id",
                deleteRule: "character_id.owner_id.id = @request.auth.id",
            },
        }),
    ], false);

    for (const collectionName of [
        "dragonscaler_character_forms",
        "dragonscaler_reference_images",
        "dragonscaler_identities",
    ]) {
        try {
            app.delete(app.findCollectionByNameOrId(collectionName));
        } catch (_) {
            // Down migrations should tolerate already-deleted optional collections.
        }
    }
});
