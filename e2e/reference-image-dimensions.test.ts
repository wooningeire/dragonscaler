import { expect, test, type Page } from "@playwright/test";


type PocketBaseRecord = Record<string, unknown> & {
    id: string,
    created: string,
    updated: string,
    collectionId: string,
    collectionName: string,
};

type ViewportSnapshot = {
    characters: number,
    items: number,
    aspect: number | null,
    hasImage: boolean | null,
    rectRatio: number | null,
};

const wideImagePng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAMAAAABCAYAAAAb4BS0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAATSURBVBhXY/jPwPCfoYEBRP0HACBwBXxoa2k3AAAAAElFTkSuQmCC",
    "base64",
);

const record = (
    collectionName: string,
    id: string,
    data: Record<string, unknown>,
): PocketBaseRecord => ({
    id,
    created: "",
    updated: "",
    collectionId: collectionName,
    collectionName,
    ...data,
});

const routePocketBaseRecords = async (page: Page) => {
    const recordsByCollection = new Map<string, PocketBaseRecord[]>([
        [
            "dragonscaler_characters",
            [
                record(
                    "dragonscaler_characters",
                    "character-1",
                    {
                        name: "Wide Dragon",
                        owner_identity_ids: [],
                        sona_identity_ids: [],
                    },
                ),
            ],
        ],
        [
            "dragonscaler_character_forms",
            [
                record(
                    "dragonscaler_character_forms",
                    "form-1",
                    {
                        character_id: "character-1",
                        is_default: true,
                        length_meters: 2,
                        length_unit: "m",
                        reference_image_ids: ["reference-1"],
                    },
                ),
            ],
        ],
        [
            "dragonscaler_reference_images",
            [
                record(
                    "dragonscaler_reference_images",
                    "reference-1",
                    {
                        image: "wide.png",
                        anchor_point: {x: 0.5, y: 0},
                        baseline_points: [
                            {x: 1.5, y: 0},
                            {x: 1.5, y: 1},
                        ],
                        width_px: 300,
                        height_px: 100,
                    },
                ),
            ],
        ],
        ["dragonscaler_baselines", []],
        ["dragonscaler_identities", []],
        ["users", []],
    ]);

    await page.route("**/api/collections/**/records*", async route => {
        const url = new URL(route.request().url());
        const collection = decodeURIComponent(url.pathname.split("/").at(-2) ?? "");
        const items = recordsByCollection.get(collection) ?? [];

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                page: 1,
                perPage: 500,
                totalItems: items.length,
                totalPages: items.length > 0 ? 1 : 0,
                items,
            }),
        });
    });
};

const routeDelayedReferenceImage = async (page: Page) => {
    let releaseImage: () => void = () => {};
    let requestCount = 0;
    const imageReleasePromise = new Promise<void>(resolve => {
        releaseImage = resolve;
    });

    await page.route("**/api/files/dragonscaler_reference_images/reference-1/wide.png", async route => {
        requestCount += 1;
        await imageReleasePromise;
        await route.fulfill({
            status: 200,
            contentType: "image/png",
            body: wideImagePng,
            headers: {
                "access-control-allow-origin": "*",
            },
        });
    });

    return {
        release: releaseImage,
        requestCount: () => requestCount,
    };
};

const viewportSnapshot = async (page: Page): Promise<ViewportSnapshot> => await page.evaluate(() => {
    const browserWindow = window as typeof window & {
        __dragonscalerDebug?: {
            store: {
                characterManager: {
                    characters: unknown[],
                },
            },
        },
        __dragonscalerViewportDebug?: {
            renderFrame: {
                items: {
                    aspect: number,
                    image: unknown | null,
                    rectPx: {
                        width: number,
                        height: number,
                    },
                }[],
            },
        },
    };
    const item = browserWindow.__dragonscalerViewportDebug?.renderFrame.items[0];

    return {
        characters: browserWindow.__dragonscalerDebug?.store.characterManager.characters.length ?? -1,
        items: browserWindow.__dragonscalerViewportDebug?.renderFrame.items.length ?? -1,
        aspect: item?.aspect ?? null,
        hasImage: item === undefined ? null : item.image !== null,
        rectRatio: item === undefined
            ? null
            : Number((item.rectPx.width / item.rectPx.height).toFixed(3)),
    };
});


test.skip(
    process.env.PLAYWRIGHT_DEV_SERVER !== "1",
    "requires Vite dev mode for the Dragonscaler debug hook",
);

test("stored reference-image dimensions stabilize placeholder aspect", async ({ page }) => {
    await routePocketBaseRecords(page);
    const imageRoute = await routeDelayedReferenceImage(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(imageRoute.requestCount).toBeGreaterThan(0);

    await page.evaluate(async () => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                initialLoadPromise: Promise<void>,
            },
        };

        await browserWindow.__dragonscalerDebug?.initialLoadPromise;
    });

    expect(await viewportSnapshot(page)).toEqual({
        characters: 1,
        items: 1,
        aspect: 3,
        hasImage: false,
        rectRatio: 3,
    });

    imageRoute.release();

    await expect.poll(async () => viewportSnapshot(page)).toEqual({
        characters: 1,
        items: 1,
        aspect: 3,
        hasImage: true,
        rectRatio: 3,
    });
});
