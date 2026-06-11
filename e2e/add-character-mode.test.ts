import { expect, test, type Page } from "@playwright/test";


type RectSnapshot = {
    x: number,
    y: number,
    width: number,
    height: number,
};

type AddModeSnapshot = {
    characterCount: number,
    sourceNames: string[],
    displayNames: string[],
    selectedName: string | null,
    editingName: string | null,
    viewportRect: RectSnapshot,
    dockRect: RectSnapshot,
    horizontalOverflowPx: number,
    verticalOverflowPx: number,
};

const routeEmptyPocketBaseLists = async (page: Page) => {
    await page.route("**/api/collections/**/records*", async route => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                page: 1,
                perPage: 500,
                totalItems: 0,
                totalPages: 0,
                items: [],
            }),
        });
    });
};

const seedAuthenticatedCharacters = async (page: Page) => {
    await page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                store: {
                    characterManager: {
                        characters: unknown[],
                        selectedCharacter: unknown | null,
                        editingCharacter: unknown | null,
                    },
                    databaseStore: {
                        userRecord: unknown,
                        createOwnerIdentityObject: () => Promise<unknown>,
                    },
                },
                Character: new (input: unknown) => unknown,
                Baseline: new (input: unknown) => unknown,
            },
        };
        const debug = browserWindow.__dragonscalerDebug;
        if (debug === undefined) throw new Error("missing Dragonscaler debug hook");

        const accountId = "account-1";
        const ownerIdentity = {
            id: "identity-1",
            identityId: "identity-1",
            accountId,
            name: "Verifier",
            avatarUrl: null,
        };
        const makeCharacter = (
            name: string,
            targetLength: number,
        ) => new debug.Character({
            name,
            ownerIdentities: [ownerIdentity],
            uploaded: true,
            baseline: new debug.Baseline({
                targetLength,
                points: [
                    {x: 0.5, y: 0},
                    {x: 0.5, y: 1},
                ],
            }),
        });

        debug.store.characterManager.characters = [
            makeCharacter(
                "Tall",
                3,
            ),
            makeCharacter(
                "Short",
                1,
            ),
            makeCharacter(
                "Middle",
                2,
            ),
        ];
        debug.store.characterManager.selectedCharacter = null;
        debug.store.characterManager.editingCharacter = null;
        debug.store.databaseStore.userRecord = {
            id: accountId,
            username: "Verifier",
            avatar: "",
        };
        debug.store.databaseStore.createOwnerIdentityObject = async () => ownerIdentity;
    });
};

const countAnimationFrames = async (
    page: Page,
    durationMs: number,
) => await page.evaluate(duration => new Promise<number>(resolve => {
    let frameCount = 0;
    const startTime = performance.now();

    const tick = () => {
        frameCount += 1;

        if (performance.now() - startTime >= duration) {
            resolve(frameCount);
            return;
        }

        requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
}), durationMs);

const snapshotAddMode = async (page: Page): Promise<AddModeSnapshot> => await page.evaluate(() => {
    const browserWindow = window as typeof window & {
        __dragonscalerDebug?: {
            store: {
                characterManager: {
                    characters: {
                        name: string,
                    }[],
                    displayCharacters: {
                        name: string,
                    }[],
                    selectedCharacter: {
                        name: string,
                    } | null,
                    editingCharacter: {
                        name: string,
                    } | null,
                },
            },
        },
    };
    const debug = browserWindow.__dragonscalerDebug;
    if (debug === undefined) throw new Error("missing Dragonscaler debug hook");

    const rectSnapshot = (element: Element | null): RectSnapshot => {
        if (element === null) throw new Error("missing layout element");

        const rect = element.getBoundingClientRect();

        return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
        };
    };

    return {
        characterCount: debug.store.characterManager.characters.length,
        sourceNames: debug.store.characterManager.characters.map(character => character.name),
        displayNames: debug.store.characterManager.displayCharacters.map(character => character.name),
        selectedName: debug.store.characterManager.selectedCharacter?.name ?? null,
        editingName: debug.store.characterManager.editingCharacter?.name ?? null,
        viewportRect: rectSnapshot(document.querySelector(".character-viewport")),
        dockRect: rectSnapshot(document.querySelector("overlays-bottom-dock")),
        horizontalOverflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        verticalOverflowPx: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    };
});

const expectStableRect = (
    actual: RectSnapshot,
    expected: RectSnapshot,
) => {
    expect(actual.x).toBeCloseTo(expected.x);
    expect(actual.y).toBeCloseTo(expected.y);
    expect(actual.width).toBeCloseTo(expected.width);
    expect(actual.height).toBeCloseTo(expected.height);
};


test.skip(
    process.env.PLAYWRIGHT_DEV_SERVER !== "1",
    "requires Vite dev mode for the Dragonscaler debug hook",
);

test("add character mode enters and exits without lagging or jumping layout", async ({ page }) => {
    await routeEmptyPocketBaseLists(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(async () => page.evaluate(() => "__dragonscalerDebug" in window)).toBe(true);

    await seedAuthenticatedCharacters(page);

    const beforeAdd = await snapshotAddMode(page);
    expect(beforeAdd).toMatchObject({
        characterCount: 3,
        sourceNames: [
            "Tall",
            "Short",
            "Middle",
        ],
        displayNames: [
            "Short",
            "Middle",
            "Tall",
        ],
        selectedName: null,
        editingName: null,
        horizontalOverflowPx: 0,
        verticalOverflowPx: 0,
    });

    const addButton = page.getByRole("button", {name: "Add character"});
    await expect(addButton).toBeEnabled();
    await addButton.click();
    await expect(page.getByRole("button", {name: "Cancel"})).toBeVisible();

    const addFrameCount = await countAnimationFrames(
        page,
        250,
    );
    const afterAdd = await snapshotAddMode(page);

    expect(addFrameCount).toBeGreaterThan(5);
    expect(afterAdd.characterCount).toBe(4);
    expect(afterAdd.sourceNames.slice(0, 3)).toEqual(beforeAdd.sourceNames);
    expect(afterAdd.displayNames.filter(name => name !== "")).toEqual(beforeAdd.displayNames);
    expect(afterAdd.selectedName).toBe("");
    expect(afterAdd.editingName).toBe("");
    expect(afterAdd.horizontalOverflowPx).toBe(0);
    expect(afterAdd.verticalOverflowPx).toBe(0);
    expectStableRect(
        afterAdd.viewportRect,
        beforeAdd.viewportRect,
    );
    expectStableRect(
        afterAdd.dockRect,
        beforeAdd.dockRect,
    );

    await page.getByRole("button", {name: "Cancel"}).click();
    await expect(page.getByRole("button", {name: "Cancel"})).toHaveCount(0);

    const cancelFrameCount = await countAnimationFrames(
        page,
        250,
    );
    const afterCancel = await snapshotAddMode(page);

    expect(cancelFrameCount).toBeGreaterThan(5);
    expect(afterCancel).toMatchObject({
        characterCount: 3,
        sourceNames: beforeAdd.sourceNames,
        displayNames: beforeAdd.displayNames,
        selectedName: null,
        editingName: null,
        horizontalOverflowPx: 0,
        verticalOverflowPx: 0,
    });
    expectStableRect(
        afterCancel.viewportRect,
        beforeAdd.viewportRect,
    );
    expectStableRect(
        afterCancel.dockRect,
        beforeAdd.dockRect,
    );
});
