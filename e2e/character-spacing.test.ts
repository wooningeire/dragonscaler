import { expect, test, type Page } from "@playwright/test";


type RectSnapshot = {
    x: number,
    y: number,
    width: number,
    height: number,
};

type CharacterRectSnapshot = {
    name: string,
    rectPx: RectSnapshot,
};

type GridlineSnapshot = {
    orientation: "x" | "y",
    coordMeters: number,
    offsetPx: number,
};

type SpacingSnapshot = {
    axisXPx: number,
    gridlinesOnTop: boolean,
    items: CharacterRectSnapshot[],
    gridlines: GridlineSnapshot[],
    canvasCoversBottomDock: boolean,
    bottomDockBackgroundAlpha: number,
    horizontalOverflowPx: number,
    verticalOverflowPx: number,
};

type CharacterSeed = {
    name: string,
    targetLength: number,
    shoulderY?: number | null,
};

const defaultCharacterSeeds: CharacterSeed[] = [
    {
        name: "One meter",
        targetLength: 1,
    },
    {
        name: "Two meters",
        targetLength: 2,
    },
    {
        name: "Three meters",
        targetLength: 3,
    },
];

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

const seedCharacters = async (
    page: Page,
    characterSeeds = defaultCharacterSeeds,
) => {
    await page.evaluate((seeds: CharacterSeed[]) => {
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

        debug.store.characterManager.characters = seeds.map(seed => new debug.Character({
            name: seed.name,
            shoulderY: seed.shoulderY ?? null,
            baseline: new debug.Baseline({
                targetLength: seed.targetLength,
                points: [
                    {x: 0.5, y: 0},
                    {x: 0.5, y: 1},
                ],
            }),
            uploaded: true,
        }));
        debug.store.characterManager.selectedCharacter = null;
        debug.store.characterManager.editingCharacter = null;
        debug.store.characterManager.spacingFac = 0;
        debug.store.characterManager.logPerspective = false;
        debug.store.camera.setPosMetersX(0);
        debug.store.camera.setPosMetersY(0);
        debug.store.camera.setScalePxPerMeter(40);
    }, characterSeeds);
};

const setSpacingSlider = async (
    page: Page,
    spacingFac: number,
) => {
    await page.getByLabel("Spacing").evaluate((
        slider,
        value,
    ) => {
        const input = slider as HTMLInputElement;
        input.value = String(value);
        input.dispatchEvent(new Event(
            "input",
            {bubbles: true},
        ));
        input.dispatchEvent(new Event(
            "change",
            {bubbles: true},
        ));
    }, spacingFac);
};

const snapshotSpacing = async (page: Page): Promise<SpacingSnapshot> => await page.evaluate(() => {
    const browserWindow = window as typeof window & {
        __dragonscalerViewportDebug?: {
            renderFrame: {
                gridlinesOnTop: boolean,
                items: CharacterRectSnapshot[],
                gridlines: GridlineSnapshot[],
            },
        },
    };
    const viewport = document.querySelector(".character-viewport");
    if (viewport === null) throw new Error("missing viewport");
    const canvas = document.querySelector("canvas[data-renderer=\"webgpu\"]");
    if (canvas === null) throw new Error("missing viewport canvas");
    const bottomDock = document.querySelector("overlays-bottom-dock");
    if (bottomDock === null) throw new Error("missing bottom dock");

    const frame = browserWindow.__dragonscalerViewportDebug?.renderFrame;
    if (frame === undefined) throw new Error("missing viewport debug frame");

    const bottomDockRect = bottomDock.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const cssAlpha = (color: string) => {
        const slashAlpha = color.match(/\/\s*([0-9.]+%?)\s*\)/)?.[1];
        if (slashAlpha !== undefined) {
            return slashAlpha.endsWith("%")
                ? Number(slashAlpha.slice(0, -1)) / 100
                : Number(slashAlpha);
        }

        const commaParts = color.match(/rgba?\(([^)]+)\)/)?.[1]?.split(",");
        if (commaParts !== undefined && commaParts.length >= 4) {
            return Number(commaParts[3]);
        }

        return color === "transparent" ? 0 : 1;
    };

    return {
        axisXPx: viewport.getBoundingClientRect().width / 2,
        gridlinesOnTop: frame.gridlinesOnTop,
        items: frame.items.map(item => ({
            name: item.name,
            rectPx: item.rectPx,
        })),
        gridlines: frame.gridlines.map(gridline => ({
            orientation: gridline.orientation,
            coordMeters: gridline.coordMeters,
            offsetPx: gridline.offsetPx,
        })),
        canvasCoversBottomDock: (
            canvasRect.top <= bottomDockRect.top + 0.5
            && canvasRect.bottom >= bottomDockRect.bottom - 0.5
        ),
        bottomDockBackgroundAlpha: cssAlpha(getComputedStyle(bottomDock).backgroundColor),
        horizontalOverflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        verticalOverflowPx: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    };
});

const rightEdgesByName = (
    snapshot: SpacingSnapshot,
) => new Map(snapshot.items.map(item => [
    item.name,
    item.rectPx.x + item.rectPx.width,
]));

test.skip(
    process.env.PLAYWRIGHT_DEV_SERVER !== "1",
    "requires Vite dev mode for the Dragonscaler debug hook",
);

test("spacing slider positions characters by accumulated right edges", async ({ page }) => {
    await page.setViewportSize({
        width: 800,
        height: 600,
    });
    await routeEmptyPocketBaseLists(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(async () => page.evaluate(() => "__dragonscalerDebug" in window)).toBe(true);
    await waitForInitialLoad(page);

    await seedCharacters(page);

    await expect.poll(async () => (await snapshotSpacing(page)).items.length).toBe(3);

    const zeroSpacing = await snapshotSpacing(page);
    const zeroRightEdges = rightEdgesByName(zeroSpacing);

    expect(zeroSpacing.horizontalOverflowPx).toBe(0);
    expect(zeroSpacing.verticalOverflowPx).toBe(0);
    expect(zeroRightEdges.get("One meter")).toBeCloseTo(zeroSpacing.axisXPx);
    expect(zeroRightEdges.get("Two meters")).toBeCloseTo(zeroSpacing.axisXPx);
    expect(zeroRightEdges.get("Three meters")).toBeCloseTo(zeroSpacing.axisXPx);

    await setSpacingSlider(
        page,
        1,
    );
    await expect.poll(async () => rightEdgesByName(await snapshotSpacing(page)).get("Three meters")).toBeCloseTo(
        zeroSpacing.axisXPx + 5 * 40,
    );

    const fullSpacing = await snapshotSpacing(page);
    const fullRightEdges = rightEdgesByName(fullSpacing);

    expect(fullSpacing.horizontalOverflowPx).toBe(0);
    expect(fullSpacing.verticalOverflowPx).toBe(0);
    expect(fullRightEdges.get("One meter")).toBeCloseTo(fullSpacing.axisXPx);
    expect(fullRightEdges.get("Two meters")).toBeCloseTo(fullSpacing.axisXPx + 2 * 40);
    expect(fullRightEdges.get("Three meters")).toBeCloseTo(fullSpacing.axisXPx + 5 * 40);
});

test("logarithmic and gridline-layer toggles update the live render frame", async ({ page }) => {
    await page.setViewportSize({
        width: 800,
        height: 600,
    });
    await routeEmptyPocketBaseLists(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(async () => page.evaluate(() => "__dragonscalerDebug" in window)).toBe(true);
    await waitForInitialLoad(page);

    await seedCharacters(page);

    await expect.poll(async () => (await snapshotSpacing(page)).items.length).toBe(3);

    const linearSnapshot = await snapshotSpacing(page);
    const linearTall = linearSnapshot.items.find(item => item.name === "Three meters");
    if (linearTall === undefined) throw new Error("missing tall character");

    expect(linearTall.rectPx.height).toBeCloseTo(3 * 40);
    expect(linearSnapshot.gridlinesOnTop).toBe(false);

    await page.getByLabel("Logarithmic").check();

    await expect.poll(async () => {
        const snapshot = await snapshotSpacing(page);
        return snapshot.items.find(item => item.name === "Three meters")?.rectPx.height ?? 0;
    }).toBeCloseTo(Math.log1p(3) * 40);

    await page.getByLabel("Gridlines on top").check();

    const toggledSnapshot = await snapshotSpacing(page);
    const fourMeterGridline = toggledSnapshot.gridlines.find(gridline => (
        gridline.orientation === "y"
        && Math.abs(gridline.coordMeters - 4) < 1e-6
    ));

    expect(toggledSnapshot.gridlinesOnTop).toBe(true);
    expect(fourMeterGridline?.offsetPx).toBeCloseTo(300 - Math.log1p(4) * 40);
    expect(toggledSnapshot.canvasCoversBottomDock).toBe(true);
    expect(toggledSnapshot.bottomDockBackgroundAlpha).toBeLessThanOrEqual(0.3);
    expect(toggledSnapshot.horizontalOverflowPx).toBe(0);
    expect(toggledSnapshot.verticalOverflowPx).toBe(0);

    await page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                store: {
                    camera: {
                        setPosMetersY: (posMetersY: number) => void,
                    },
                },
            },
        };
        const debug = browserWindow.__dragonscalerDebug;
        if (debug === undefined) throw new Error("missing Dragonscaler debug hook");

        debug.store.camera.setPosMetersY(4);
    });

    await expect.poll(async () => {
        const snapshot = await snapshotSpacing(page);
        return snapshot.gridlines.find(gridline => (
            gridline.orientation === "y"
            && Math.abs(gridline.coordMeters - 4) < 1e-6
        ))?.offsetPx ?? Number.NaN;
    }).toBeCloseTo(300);
});

test("shoulder marks drive live sorting and logarithmic scale", async ({ page }) => {
    await page.setViewportSize({
        width: 800,
        height: 600,
    });
    await routeEmptyPocketBaseLists(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(async () => page.evaluate(() => "__dragonscalerDebug" in window)).toBe(true);
    await waitForInitialLoad(page);

    await seedCharacters(
        page,
        [
            {
                name: "Higher shoulders",
                targetLength: 2,
                shoulderY: 0.75,
            },
            {
                name: "Taller image",
                targetLength: 4,
                shoulderY: 0.25,
            },
        ],
    );

    await expect.poll(async () => page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                store: {
                    characterManager: {
                        displayCharacters: {name: string}[],
                    },
                },
            },
        };

        return browserWindow.__dragonscalerDebug?.store.characterManager.displayCharacters
            .map(character => character.name) ?? [];
    })).toEqual([
        "Taller image",
        "Higher shoulders",
    ]);

    const linearSnapshot = await snapshotSpacing(page);
    const linearTallerImage = linearSnapshot.items.find(item => item.name === "Taller image");
    const linearHigherShoulders = linearSnapshot.items.find(item => item.name === "Higher shoulders");
    if (linearTallerImage === undefined || linearHigherShoulders === undefined) {
        throw new Error("missing shoulder-marked characters");
    }

    expect(linearTallerImage.rectPx.height).toBeCloseTo(4 * 40);
    expect(linearHigherShoulders.rectPx.height).toBeCloseTo(2 * 40);

    await page.getByLabel("Logarithmic").check();

    await expect.poll(async () => {
        const snapshot = await snapshotSpacing(page);

        return snapshot.items.find(item => item.name === "Taller image")?.rectPx.height ?? 0;
    }).toBeCloseTo(4 * Math.log1p(1) * 40);
    await expect.poll(async () => {
        const snapshot = await snapshotSpacing(page);

        return snapshot.items.find(item => item.name === "Higher shoulders")?.rectPx.height ?? 0;
    }).toBeCloseTo(2 / 1.5 * Math.log1p(1.5) * 40);

    const logarithmicSnapshot = await snapshotSpacing(page);
    const originY = logarithmicSnapshot.gridlines.find(gridline => (
        gridline.orientation === "y"
        && gridline.coordMeters === 0
    ))?.offsetPx;
    const tallerImage = logarithmicSnapshot.items.find(item => item.name === "Taller image");
    if (originY === undefined || tallerImage === undefined) {
        throw new Error("missing logarithmic shoulder geometry");
    }

    const shoulderYPx = tallerImage.rectPx.y + 0.75 * tallerImage.rectPx.height;

    expect(shoulderYPx).toBeCloseTo(originY - Math.log1p(1) * 40);
    expect(logarithmicSnapshot.horizontalOverflowPx).toBe(0);
    expect(logarithmicSnapshot.verticalOverflowPx).toBe(0);
});

test("logarithmic toggle stays responsive when zoomed far out", async ({ page }) => {
    await page.setViewportSize({
        width: 800,
        height: 600,
    });
    await routeEmptyPocketBaseLists(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(async () => page.evaluate(() => "__dragonscalerDebug" in window)).toBe(true);
    await waitForInitialLoad(page);

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
                        logPerspective: boolean,
                    },
                },
            },
        };
        const debug = browserWindow.__dragonscalerDebug;
        if (debug === undefined) throw new Error("missing Dragonscaler debug hook");

        debug.store.characterManager.logPerspective = false;
        debug.store.camera.setPosMetersX(0);
        debug.store.camera.setPosMetersY(0);
        debug.store.camera.setScalePxPerMeter(0.1);
    });

    await page.getByLabel("Logarithmic").check();

    await expect.poll(async () => {
        const snapshot = await snapshotSpacing(page);
        return snapshot.gridlines.filter(gridline => gridline.orientation === "y").length;
    }).toBeLessThanOrEqual(8);

    const snapshot = await snapshotSpacing(page);

    expect(snapshot.horizontalOverflowPx).toBe(0);
    expect(snapshot.verticalOverflowPx).toBe(0);
});
