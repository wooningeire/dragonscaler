import { expect, test, type Page } from "@playwright/test";


type NameplateSnapshot = {
    canvasCount: number,
    labelScale: number,
    rectHeight: number,
    rendererStatus: string | null,
};

const waitForInitialLoad = async (page: Page) => {
    await page.evaluate(async () => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                initialLoadPromise: Promise<void>,
            },
        };
        const debug = browserWindow.__dragonscalerDebug;
        if (debug === undefined) throw new Error("missing Dragonscaler debug hook");

        await debug.initialLoadPromise;
    });
};

const openEmptyApp = async (page: Page) => {
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

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(async () => page.evaluate(() => "__dragonscalerDebug" in window)).toBe(true);
    await waitForInitialLoad(page);
};

const snapshotAtScale = async (
    page: Page,
    scalePxPerMeter: number,
    characterHeightMeters = 1,
    shoulderY: number | null = null,
    logPerspective = false,
): Promise<NameplateSnapshot> => {
    await page.evaluate(({
        characterHeightMeters,
        logPerspective,
        scalePxPerMeter,
        shoulderY,
    }) => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                store: {
                    camera: {
                        setPosMetersX: (posMetersX: number) => void,
                        setPosMetersY: (posMetersY: number) => void,
                        setScalePxPerMeter: (scalePxPerMeter: number) => void,
                    },
                    characterManager: {
                        characters: unknown[],
                        selectedCharacter: unknown | null,
                        editingCharacter: unknown | null,
                        logPerspective: boolean,
                    },
                },
                Character: new (input: unknown) => unknown,
                Baseline: new (input: unknown) => unknown,
            },
        };
        const debug = browserWindow.__dragonscalerDebug;
        if (debug === undefined) throw new Error("missing Dragonscaler debug hook");

        const character = new debug.Character({
            name: "Nameplate snap tester",
            shoulderY,
            anchor: {x: 0.5, y: 0},
            baseline: new debug.Baseline({
                targetLength: characterHeightMeters,
                points: [
                    {x: 0.5, y: 0},
                    {x: 0.5, y: 1},
                ],
            }),
            ownerIdentities: [
                {
                    id: "identity-1",
                    identityId: "identity-1",
                    accountId: "account-1",
                    name: "Verifier",
                    avatarUrl: null,
                },
            ],
            uploaded: true,
        });

        debug.store.characterManager.characters = [character];
        debug.store.characterManager.selectedCharacter = null;
        debug.store.characterManager.editingCharacter = null;
        debug.store.characterManager.logPerspective = logPerspective;
        debug.store.camera.setPosMetersX(0);
        debug.store.camera.setPosMetersY(0);
        debug.store.camera.setScalePxPerMeter(scalePxPerMeter);
    }, {
        characterHeightMeters,
        logPerspective,
        scalePxPerMeter,
        shoulderY,
    });
    const scaleReferenceAltitude = shoulderY === null
        ? characterHeightMeters
        : shoulderY * characterHeightMeters;
    const expectedHeightPx = logPerspective
        ? characterHeightMeters / scaleReferenceAltitude
            * Math.log1p(scaleReferenceAltitude)
            * scalePxPerMeter
        : characterHeightMeters * scalePxPerMeter;

    await expect.poll(async () => page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerViewportDebug?: {
                renderFrame: {
                    items: {
                        rectPx: {
                            height: number,
                        },
                    }[],
                },
            },
        };

        return browserWindow.__dragonscalerViewportDebug?.renderFrame.items[0]?.rectPx.height ?? -1;
    })).toBeCloseTo(expectedHeightPx);

    return await page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerViewportDebug?: {
                renderFrame: {
                    items: {
                        rectPx: {
                            height: number,
                        },
                        nameplateReferenceHeightPx: number,
                    }[],
                },
            },
        };
        const item = browserWindow.__dragonscalerViewportDebug?.renderFrame.items[0];
        if (item === undefined) throw new Error("missing nameplate frame item");

        const canvas = document.querySelector("canvas[data-renderer=\"webgpu\"]");

        return {
            canvasCount: document.querySelectorAll("canvas[data-renderer=\"webgpu\"]").length,
            labelScale: item.nameplateReferenceHeightPx / 256,
            rectHeight: item.rectPx.height,
            rendererStatus: canvas?.getAttribute("data-webgpu-status") ?? null,
        };
    });
};

test.skip(
    process.env.PLAYWRIGHT_DEV_SERVER !== "1",
    "requires Vite dev mode for the Dragonscaler debug hook",
);

test("nameplates stay fixed in world space in the live viewport", async ({ page }) => {
    await openEmptyApp(page);

    const smallerSnapshot = await snapshotAtScale(page, 220);
    const largerSnapshot = await snapshotAtScale(page, 300);

    expect(smallerSnapshot).toMatchObject({
        canvasCount: 1,
    });
    expect(smallerSnapshot.rectHeight).toBeCloseTo(220);
    expect(smallerSnapshot.labelScale).toBeCloseTo(220 / 256);
    expect(largerSnapshot).toMatchObject({
        canvasCount: 1,
    });
    expect(largerSnapshot.rectHeight).toBeCloseTo(300);
    expect(largerSnapshot.labelScale).toBeCloseTo(300 / 256);
    expect(largerSnapshot.rectHeight).toBeGreaterThan(smallerSnapshot.rectHeight);
    expect(largerSnapshot.labelScale).toBeGreaterThan(smallerSnapshot.labelScale);
    expect(smallerSnapshot.labelScale / smallerSnapshot.rectHeight).toBeCloseTo(
        largerSnapshot.labelScale / largerSnapshot.rectHeight,
    );
    expect([
        "ready",
        "unavailable",
    ]).toContain(largerSnapshot.rendererStatus);
});

test("shoulder marks size live nameplates independently of total image height", async ({ page }) => {
    await openEmptyApp(page);

    const linearTall = await snapshotAtScale(
        page,
        100,
        4,
        0.25,
    );
    const linearShort = await snapshotAtScale(
        page,
        100,
        2,
        0.5,
    );

    expect(linearTall.rectHeight).toBeCloseTo(400);
    expect(linearShort.rectHeight).toBeCloseTo(200);
    expect(linearTall.labelScale).toBeCloseTo(100 / 256);
    expect(linearShort.labelScale).toBeCloseTo(100 / 256);

    const logarithmicTall = await snapshotAtScale(
        page,
        100,
        4,
        0.25,
        true,
    );
    const logarithmicShort = await snapshotAtScale(
        page,
        100,
        2,
        0.5,
        true,
    );

    expect(logarithmicTall.rectHeight).toBeCloseTo(4 * Math.log1p(1) * 100);
    expect(logarithmicShort.rectHeight).toBeCloseTo(2 * Math.log1p(1) * 100);
    expect(logarithmicTall.labelScale).toBeCloseTo(Math.log1p(1) * 100 / 256);
    expect(logarithmicShort.labelScale).toBeCloseTo(Math.log1p(1) * 100 / 256);
});
