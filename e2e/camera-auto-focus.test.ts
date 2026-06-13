import { expect, test, type Page } from "@playwright/test";


type CameraFocusCall = {
    method: "x" | "y" | "scale",
    value: number,
};

type RenderSnapshot = {
    rectPx: {
        x: number,
        y: number,
        width: number,
        height: number,
    },
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

const installCameraFocusProbe = async (page: Page) => {
    await page.evaluate(() => {
        type BrowserCameraFocusCall = {
            method: "x" | "y" | "scale",
            value: number,
        };

        const browserWindow = window as typeof window & {
            __cameraFocusCalls?: BrowserCameraFocusCall[],
            __dragonscalerDebug?: {
                store: {
                    camera: {
                        setPosMetersX: (posMetersX: number) => void,
                        setPosMetersY: (posMetersY: number) => void,
                        setScalePxPerMeter: (scalePxPerMeter: number) => void,
                        setPosMetersXWithEase: (posMetersX: number) => void,
                        setPosMetersYWithEase: (posMetersY: number) => void,
                        setScalePxPerMeterWithEase: (scalePxPerMeter: number) => void,
                    },
                    characterManager: {
                        characters: unknown[],
                        selectedCharacter: unknown | null,
                        spacingFac: number,
                        logPerspective: boolean,
                    },
                },
                Character: new (input: unknown) => unknown,
                Baseline: new (input: unknown) => unknown,
            },
        };
        const debug = browserWindow.__dragonscalerDebug;
        if (debug === undefined) throw new Error("missing Dragonscaler debug hook");

        const calls: BrowserCameraFocusCall[] = [];
        const camera = debug.store.camera;
        const setPosMetersXWithEase = camera.setPosMetersXWithEase.bind(camera);
        const setPosMetersYWithEase = camera.setPosMetersYWithEase.bind(camera);
        const setScalePxPerMeterWithEase = camera.setScalePxPerMeterWithEase.bind(camera);

        browserWindow.__cameraFocusCalls = calls;
        camera.setPosMetersXWithEase = value => {
            calls.push({
                method: "x",
                value,
            });
            setPosMetersXWithEase(value);
        };
        camera.setPosMetersYWithEase = value => {
            calls.push({
                method: "y",
                value,
            });
            setPosMetersYWithEase(value);
        };
        camera.setScalePxPerMeterWithEase = value => {
            calls.push({
                method: "scale",
                value,
            });
            setScalePxPerMeterWithEase(value);
        };
    });
};

const seedFocusedCharacter = async (page: Page) => {
    await page.evaluate(() => {
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
                        spacingFac: number,
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
            name: "Focused",
            baseline: new debug.Baseline({
                targetLength: 2,
                points: [
                    {x: 0.5, y: 0},
                    {x: 0.5, y: 1},
                ],
            }),
            uploaded: true,
        });

        debug.store.characterManager.characters = [character];
        debug.store.characterManager.spacingFac = 0;
        debug.store.characterManager.logPerspective = false;
        debug.store.camera.setPosMetersX(-1);
        debug.store.camera.setPosMetersY(1);
        debug.store.camera.setScalePxPerMeter(200);
        debug.store.characterManager.selectedCharacter = character;
    });
};

const clearCameraFocusCalls = async (page: Page) => {
    await page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __cameraFocusCalls?: CameraFocusCall[],
        };

        browserWindow.__cameraFocusCalls?.splice(0);
    });
};

const cameraFocusCalls = async (page: Page): Promise<CameraFocusCall[]> => await page.evaluate(() => {
    const browserWindow = window as typeof window & {
        __cameraFocusCalls?: CameraFocusCall[],
    };

    return browserWindow.__cameraFocusCalls ?? [];
});

const renderSnapshot = async (page: Page): Promise<RenderSnapshot> => await page.evaluate(() => {
    const browserWindow = window as typeof window & {
        __dragonscalerViewportDebug?: {
            renderFrame: {
                items: {
                    name: string,
                    rectPx: RenderSnapshot["rectPx"],
                }[],
            },
        },
    };
    const frame = browserWindow.__dragonscalerViewportDebug?.renderFrame;
    if (frame === undefined) throw new Error("missing viewport debug frame");

    const item = frame.items.find(item => item.name === "Focused");
    if (item === undefined) throw new Error("missing focused character");

    return {
        rectPx: item.rectPx,
        horizontalOverflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        verticalOverflowPx: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    };
});

const expectRectToStayInCameraFrame = (
    actual: RenderSnapshot["rectPx"],
    expected: RenderSnapshot["rectPx"],
) => {
    expect(actual.x).toBeCloseTo(
        expected.x,
        0,
    );
    expect(actual.y).toBeCloseTo(
        expected.y,
        0,
    );
    expect(actual.width).toBeCloseTo(
        expected.width,
        0,
    );
    expect(actual.height).toBeCloseTo(
        expected.height,
        0,
    );
};

test.skip(
    process.env.PLAYWRIGHT_DEV_SERVER !== "1",
    "requires Vite dev mode for the Dragonscaler debug hook",
);

test("automatic camera focus is driven only by reference curve changes", async ({ page }) => {
    await page.setViewportSize({
        width: 800,
        height: 600,
    });
    await routeEmptyPocketBaseLists(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(async () => page.evaluate(() => "__dragonscalerDebug" in window)).toBe(true);
    await waitForInitialLoad(page);
    await installCameraFocusProbe(page);
    await seedFocusedCharacter(page);

    await expect.poll(async () => (await cameraFocusCalls(page)).length).toBeGreaterThanOrEqual(3);
    await page.waitForTimeout(600);

    const initialSnapshot = await renderSnapshot(page);
    const focusedHeightPx = initialSnapshot.rectPx.height;

    expect(focusedHeightPx).toBeGreaterThan(0);
    await clearCameraFocusCalls(page);

    await page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                store: {
                    characterManager: {
                        spacingFac: number,
                        selectedCharacter: {
                            anchor: {
                                x: number,
                                y: number,
                            },
                        } | null,
                    },
                },
            },
        };
        const manager = browserWindow.__dragonscalerDebug?.store.characterManager;
        if (manager === undefined || manager.selectedCharacter === null) {
            throw new Error("missing selected character");
        }

        manager.spacingFac = 1;
        manager.selectedCharacter.anchor = {
            x: 0.25,
            y: 0.25,
        };
    });
    await page.waitForTimeout(100);

    expect(await cameraFocusCalls(page)).toEqual([]);

    await page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                store: {
                    characterManager: {
                        selectedCharacter: {
                            baseline: {
                                targetLength: number,
                            },
                        } | null,
                    },
                },
            },
        };
        const character = browserWindow.__dragonscalerDebug?.store.characterManager.selectedCharacter;
        if (character === undefined || character === null) throw new Error("missing selected character");

        character.baseline.targetLength = 4;
    });
    await expect.poll(async () => (await cameraFocusCalls(page)).some(call => call.method === "scale")).toBe(true);

    await page.waitForTimeout(50);

    const duringReferenceUpdate = await renderSnapshot(page);

    expectRectToStayInCameraFrame(
        duringReferenceUpdate.rectPx,
        initialSnapshot.rectPx,
    );

    await page.waitForTimeout(650);

    const settledReferenceUpdate = await renderSnapshot(page);
    const calls = await cameraFocusCalls(page);

    expect(calls).toEqual(expect.arrayContaining([
        {
            method: "x",
            value: -2,
        },
    ]));
    expect(calls.some(call => call.method === "scale")).toBe(true);
    expectRectToStayInCameraFrame(
        settledReferenceUpdate.rectPx,
        initialSnapshot.rectPx,
    );
    expect(settledReferenceUpdate.horizontalOverflowPx).toBe(0);
    expect(settledReferenceUpdate.verticalOverflowPx).toBe(0);
});
