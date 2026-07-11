import { expect, test, type Page } from "@playwright/test";


type RectSnapshot = {
    x: number,
    y: number,
    width: number,
    height: number,
};

type FlipPanelSnapshot = {
    anchor: {
        x: number,
        y: number,
    },
    baselinePoints: {
        x: number,
        y: number,
    }[],
    flipped: boolean,
    flipButtonPressed: string | null,
    horizontalOverflowPx: number,
    verticalOverflowPx: number,
    dockRect: RectSnapshot,
    menuRect: RectSnapshot,
    croppedSelectors: string[],
};

const testImagePng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAOSURBVBhXY/jPwABC/wEP+QP98+IdQAAAAABJRU5ErkJggg==",
    "base64",
);

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

const seedEditableCharacter = async (page: Page) => {
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
                    },
                },
                Character: new (input: unknown) => {
                    anchor: {
                        x: number,
                        y: number,
                    },
                    baseline: {
                        points: {
                            x: number,
                            y: number,
                        }[],
                    },
                },
                Baseline: new (input: unknown) => unknown,
            },
        };
        const debug = browserWindow.__dragonscalerDebug;
        if (debug === undefined) throw new Error("missing Dragonscaler debug hook");

        const ownerIdentity = {
            id: "identity-1",
            identityId: "identity-1",
            accountId: "account-1",
            name: "Verifier",
            avatarUrl: null,
        };
        const character = new debug.Character({
            name: "Flip verifier",
            anchor: {
                x: 0.25,
                y: 0.1,
            },
            baseline: new debug.Baseline({
                targetLength: 2,
                points: [
                    {x: 0.25, y: 0.1},
                    {x: 1.5, y: 0.9},
                ],
            }),
            ownerIdentities: [ownerIdentity],
            uploaded: true,
        });

        debug.store.characterManager.characters = [character];
        debug.store.characterManager.selectedCharacter = character;
        debug.store.characterManager.editingCharacter = character;
        debug.store.databaseStore.userRecord = {
            id: "account-1",
            username: "Verifier",
            avatar: "",
        };
    });
};

const uploadTestImage = async (page: Page) => {
    await page.setInputFiles(
        "input[type=\"file\"]",
        {
            name: "flip-verifier.png",
            mimeType: "image/png",
            buffer: testImagePng,
        },
    );

    await expect.poll(async () => page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                store: {
                    characterManager: {
                        editingCharacter: {
                            image: unknown | null,
                        } | null,
                    },
                },
            },
        };

        return browserWindow.__dragonscalerDebug?.store.characterManager.editingCharacter?.image !== null;
    })).toBe(true);
};

const snapshotFlipPanel = async (page: Page): Promise<FlipPanelSnapshot> => await page.evaluate(() => {
    const browserWindow = window as typeof window & {
        __dragonscalerDebug?: {
            store: {
                characterManager: {
                    editingCharacter: {
                        anchor: {
                            x: number,
                            y: number,
                        },
                        baseline: {
                            points: {
                                x: number,
                                y: number,
                            }[],
                        },
                        image: {
                            flippedHorizontally: boolean,
                        } | null,
                    } | null,
                },
            },
        },
    };
    const character = browserWindow.__dragonscalerDebug?.store.characterManager.editingCharacter;
    if (character === undefined || character === null) throw new Error("missing editing character");

    const dock = document.querySelector("overlays-bottom-dock");
    const menu = document.querySelector("character-edit-menu");
    if (dock === null || menu === null) throw new Error("missing flip panel layout");

    const dockRect = dock.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const snapshotRect = (rect: DOMRect): RectSnapshot => ({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
    });
    const clippedSelectors = [
        "character-edit-menu",
        ".character-image-container",
        ".character-form-inputs",
        ".reference-sizing-control",
        ".buttons",
        ".baseline-mode-control",
    ];
    const croppedSelectors = clippedSelectors.filter(selector => {
        const element = document.querySelector(selector);
        if (element === null) return true;

        const rect = element.getBoundingClientRect();
        return rect.left < -0.5
            || rect.right > innerWidth + 0.5
            || rect.top < dockRect.top - 0.5
            || rect.bottom > dockRect.bottom + 0.5;
    });

    return {
        anchor: character.anchor,
        baselinePoints: character.baseline.points,
        flipped: character.image?.flippedHorizontally ?? false,
        flipButtonPressed: document.querySelector("button[aria-pressed=\"true\"]")?.textContent?.trim() ?? null,
        horizontalOverflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        verticalOverflowPx: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        dockRect: snapshotRect(dockRect),
        menuRect: snapshotRect(menuRect),
        croppedSelectors,
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

test("character edit panel flips images without cropping or jumping", async ({ page }) => {
    await routeEmptyPocketBaseLists(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(async () => page.evaluate(() => "__dragonscalerDebug" in window)).toBe(true);

    await seedEditableCharacter(page);
    await uploadTestImage(page);
    await page.waitForTimeout(250);

    const beforeFlip = await snapshotFlipPanel(page);
    expect(beforeFlip).toMatchObject({
        flipped: false,
        horizontalOverflowPx: 0,
        verticalOverflowPx: 0,
        croppedSelectors: [],
    });

    await page.getByRole("button", {
        name: "Flip",
        exact: true,
    }).click();

    const afterFlip = await snapshotFlipPanel(page);
    expect(afterFlip).toMatchObject({
        anchor: {
            x: 0.75,
            y: 0.1,
        },
        baselinePoints: [
            {x: 1.75, y: 0.1},
            {x: 0.5, y: 0.9},
        ],
        flipped: true,
        flipButtonPressed: "Flip",
        horizontalOverflowPx: 0,
        verticalOverflowPx: 0,
        croppedSelectors: [],
    });
    expectStableRect(
        afterFlip.dockRect,
        beforeFlip.dockRect,
    );
    expectStableRect(
        afterFlip.menuRect,
        beforeFlip.menuRect,
    );

    await page.setViewportSize({
        width: 390,
        height: 844,
    });

    const mobileSnapshot = await snapshotFlipPanel(page);
    expect(mobileSnapshot).toMatchObject({
        horizontalOverflowPx: 0,
        verticalOverflowPx: 0,
        croppedSelectors: [],
    });
});
