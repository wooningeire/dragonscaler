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

type SpacingSnapshot = {
    axisXPx: number,
    items: CharacterRectSnapshot[],
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

const seedCharacters = async (page: Page) => {
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
                        editingCharacter: unknown | null,
                        spacingFac: number,
                    },
                },
                Character: new (input: unknown) => unknown,
                Baseline: new (input: unknown) => unknown,
            },
        };
        const debug = browserWindow.__dragonscalerDebug;
        if (debug === undefined) throw new Error("missing Dragonscaler debug hook");

        const makeCharacter = (
            name: string,
            targetLength: number,
        ) => new debug.Character({
            name,
            baseline: new debug.Baseline({
                targetLength,
                points: [
                    {x: 0.5, y: 0},
                    {x: 0.5, y: 1},
                ],
            }),
            uploaded: true,
        });

        debug.store.characterManager.characters = [
            makeCharacter(
                "One meter",
                1,
            ),
            makeCharacter(
                "Two meters",
                2,
            ),
            makeCharacter(
                "Three meters",
                3,
            ),
        ];
        debug.store.characterManager.selectedCharacter = null;
        debug.store.characterManager.editingCharacter = null;
        debug.store.characterManager.spacingFac = 0;
        debug.store.camera.setPosMetersX(0);
        debug.store.camera.setPosMetersY(0);
        debug.store.camera.setScalePxPerMeter(40);
    });
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
                items: CharacterRectSnapshot[],
            },
        },
    };
    const viewport = document.querySelector(".character-viewport");
    if (viewport === null) throw new Error("missing viewport");

    const frame = browserWindow.__dragonscalerViewportDebug?.renderFrame;
    if (frame === undefined) throw new Error("missing viewport debug frame");

    return {
        axisXPx: viewport.getBoundingClientRect().width / 2,
        items: frame.items.map(item => ({
            name: item.name,
            rectPx: item.rectPx,
        })),
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
