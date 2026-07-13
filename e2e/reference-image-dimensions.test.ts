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

const routePocketBaseRecords = async (
    page: Page,
    referenceSizingMethod: "measurement_line" | "pixel_measurement" = "pixel_measurement",
) => {
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
                        shoulder_y: 0.75,
                        baseline_points: [
                            {x: 1.5, y: 0},
                            {x: 1.5, y: 1},
                        ],
                        baseline_descriptor: "reference human",
                        reference_sizing_method: referenceSizingMethod,
                        pixel_measurement_px: 50,
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

const openLoadedCharacterForEditing = async (page: Page) => {
    await expect.poll(async () => {
        try {
            return await page.evaluate(() => "__dragonscalerDebug" in window);
        } catch {
            return false;
        }
    }).toBe(true);

    await page.evaluate(async () => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                initialLoadPromise: Promise<void>,
                store: {
                    characterManager: {
                        characters: unknown[],
                        selectedCharacter: unknown | null,
                        editingCharacter: unknown | null,
                    },
                },
            },
        };
        const debug = browserWindow.__dragonscalerDebug;
        if (debug === undefined) throw new Error("missing Dragonscaler debug hook");

        await debug.initialLoadPromise;

        const character = debug.store.characterManager.characters[0];
        if (character === undefined) throw new Error("missing loaded character");

        debug.store.characterManager.selectedCharacter = character;
        debug.store.characterManager.editingCharacter = character;
    });
};

const expectPixelEditState = async (page: Page) => {
    const pixelCount = page.getByRole("radio", {name: "Pixel count"});
    await expect(pixelCount).toBeChecked();
    await expect(pixelCount).toBeEnabled();

    const pixelInput = page.locator(".pixel-measurement-input [contenteditable]");
    const referenceLabelInput = page.locator(".measurement-row").first().locator(".measurement-label [contenteditable]");

    await expect(pixelInput).toHaveText("50");
    await expect(referenceLabelInput).toHaveText("reference human");
    await expect(page.getByRole("button", {name: "Update"})).toBeEnabled();
    await expect(page.getByRole("button", {name: "Mark shoulder"})).toHaveCount(0);
    await expect(page.getByRole("button", {name: "Clear shoulder"})).toHaveCount(0);
    await expect.poll(async () => page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                store: {
                    characterManager: {
                        characters: {shoulderY: number | null}[],
                    },
                },
            },
            __dragonscalerViewportDebug?: {
                renderFrame: {
                    items: {shoulderY: number | null}[],
                },
            },
        };

        return {
            character: browserWindow.__dragonscalerDebug
                ?.store.characterManager.characters[0]?.shoulderY ?? null,
            guide: browserWindow.__dragonscalerViewportDebug
                ?.renderFrame.items[0]?.shoulderY ?? null,
        };
    })).toEqual({
        character: 0.75,
        guide: 0.75,
    });
};

const expectLineEditState = async (page: Page) => {
    await expect(page.getByRole("radio", {name: "Curve"})).toBeChecked();
    await expect(page.getByRole("radiogroup", {name: "Redraw measurement as"})).toBeVisible();
    await expect(page.locator(".pixel-measurement-input")).toHaveCount(0);

    await expect.poll(async () => page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                store: {
                    characterManager: {
                        characters: {
                            baseline: {
                                referenceSizingMethod: string,
                                pixelMeasurementPx: number | null,
                            },
                            referenceImageLength: number,
                            scaleFac: number,
                        }[],
                    },
                },
            },
            __dragonscalerViewportDebug?: {
                renderFrame: {
                    items: {baselinePoints: unknown[]}[],
                },
            },
        };
        const character = browserWindow.__dragonscalerDebug
            ?.store.characterManager.characters[0];

        return {
            method: character?.baseline.referenceSizingMethod ?? null,
            pixelMeasurementPx: character?.baseline.pixelMeasurementPx ?? null,
            referenceImageLength: character?.referenceImageLength ?? null,
            scaleFac: character?.scaleFac ?? null,
            baselinePointCount: browserWindow.__dragonscalerViewportDebug
                ?.renderFrame.items[0]?.baselinePoints.length ?? -1,
        };
    })).toEqual({
        method: "measurement_line",
        pixelMeasurementPx: 50,
        referenceImageLength: 1,
        scaleFac: 2,
        baselinePointCount: 2,
    });
};

const expectEditControlsReachable = async (page: Page) => {
    const dock = page.locator("overlays-bottom-dock");
    const controls = page.locator([
        "character-edit-menu button",
        "character-edit-menu input",
        "character-edit-menu select",
        "character-edit-menu textarea",
        "character-edit-menu [contenteditable=\"true\"]",
        "character-edit-menu [tabindex]:not([tabindex=\"-1\"])",
    ].join(", "));
    const controlCount = await controls.count();

    await expect(dock).toHaveCSS("overflow-y", "auto");

    for (let index = 0; index < controlCount; index++) {
        const control = controls.nth(index);
        if (!await control.isVisible()) continue;

        await control.scrollIntoViewIfNeeded();

        const dockBox = await dock.boundingBox();
        const controlBox = await control.boundingBox();
        if (dockBox === null || controlBox === null) {
            throw new Error("missing edit control or dock bounds");
        }

        expect(controlBox.y).toBeGreaterThanOrEqual(dockBox.y - 0.5);
        expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(
            dockBox.y + dockBox.height + 0.5,
        );
    }

    expect(await page.evaluate(() => ({
        horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        vertical: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    }))).toEqual({
        horizontal: 0,
        vertical: 0,
    });
};


test.skip(
    process.env.PLAYWRIGHT_DEV_SERVER !== "1",
    "requires Vite dev mode for the Dragonscaler debug hook",
);

test("stored shoulder mark and reference-image dimensions stabilize placeholder aspect", async ({ page }) => {
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


test("pixel measurement and shoulder mark survive reload", async ({page}) => {
    await routePocketBaseRecords(page);
    const imageRoute = await routeDelayedReferenceImage(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(imageRoute.requestCount).toBeGreaterThan(0);
    imageRoute.release();

    await openLoadedCharacterForEditing(page);
    await expectPixelEditState(page);

    await page.reload();
    await openLoadedCharacterForEditing(page);
    await expectPixelEditState(page);
});

test("measurement line and shoulder mark survive dormant pixel input on reload", async ({page}) => {
    await routePocketBaseRecords(page, "measurement_line");
    const imageRoute = await routeDelayedReferenceImage(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(imageRoute.requestCount).toBeGreaterThan(0);
    imageRoute.release();

    await openLoadedCharacterForEditing(page);
    await expectLineEditState(page);

    await page.reload();
    await openLoadedCharacterForEditing(page);
    await expectLineEditState(page);
});

test("measurement list keeps reference and shoulder measurements visible after deselection", async ({page}) => {
    await routePocketBaseRecords(page);
    const imageRoute = await routeDelayedReferenceImage(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(imageRoute.requestCount).toBeGreaterThan(0);
    imageRoute.release();

    await openLoadedCharacterForEditing(page);
    await expectPixelEditState(page);

    await expect(page.locator(".measurement-row")).toHaveCount(2);
    await expect(page.getByRole("radio", {
        name: "Use reference human as reference",
    })).toBeChecked();
    await expect(page.getByRole("radio", {
        name: "Use to shoulder as shoulder measurement",
    })).toBeChecked();
    await expect(page.getByRole("textbox", {
        name: "to shoulder value",
    })).toHaveText("3");
    await expect(page.getByRole("textbox", {
        name: "to shoulder value",
    })).toHaveAttribute("aria-readonly", "true");
    await expect(page.getByRole("textbox", {
        name: "reference human label",
    })).toHaveAttribute("contenteditable", "true");
    await expect(page.getByRole("textbox", {
        name: "reference human value",
    })).toHaveAttribute("contenteditable", "true");
    await expect(page.getByRole("textbox", {
        name: "to shoulder label",
    })).toHaveAttribute("contenteditable", "false");
    await expect(page.getByRole("textbox", {
        name: "to shoulder value",
    })).toHaveAttribute("contenteditable", "false");
    await expect(page.locator(".measurement-value.computed .text-input-container"))
        .toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.locator(".measurement-value.computed .text-input-container"))
        .toHaveCSS("box-shadow", "none");

    await page.getByRole("button", {name: "Add measurement"}).click();
    await expect(page.locator(".measurement-row")).toHaveCount(3);
    await expect(page.getByRole("radio", {name: "Pixel count"})).toBeDisabled();

    await page.setViewportSize({
        width: 640,
        height: 360,
    });
    await expectEditControlsReachable(page);

    const roleIds = await page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                store: {
                    characterManager: {
                        characters: {
                            measurements: {id: string}[],
                            referenceMeasurementId: string,
                            shoulderMeasurementId: string | null,
                        }[],
                    },
                },
            },
        };
        const character = browserWindow.__dragonscalerDebug
            ?.store.characterManager.characters[0];
        if (character === undefined) throw new Error("missing measured character");

        return {
            reference: character.referenceMeasurementId,
            shoulder: character.shoulderMeasurementId,
            ordinary: character.measurements[2]?.id ?? null,
        };
    });

    await page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerDebug?: {
                store: {
                    characterManager: {
                        selectedCharacter: unknown | null,
                        editingCharacter: unknown | null,
                    },
                },
            },
        };
        const manager = browserWindow.__dragonscalerDebug?.store.characterManager;
        if (manager === undefined) throw new Error("missing character manager");

        manager.selectedCharacter = null;
        manager.editingCharacter = null;
    });

    await expect.poll(async () => page.evaluate(() => {
        const browserWindow = window as typeof window & {
            __dragonscalerViewportDebug?: {
                renderFrame: {
                    items: {
                        measurementLines: {
                            measurementId: string,
                            isReference: boolean,
                            isToShoulder: boolean,
                        }[],
                    }[],
                },
            },
        };

        return browserWindow.__dragonscalerViewportDebug
            ?.renderFrame.items[0]?.measurementLines.map(line => ({
                measurementId: line.measurementId,
                isReference: line.isReference,
                isToShoulder: line.isToShoulder,
            })) ?? [];
    })).toEqual([
        {
            measurementId: roleIds.reference,
            isReference: true,
            isToShoulder: false,
        },
        {
            measurementId: roleIds.shoulder,
            isReference: false,
            isToShoulder: true,
        },
    ]);
    expect(roleIds.ordinary).not.toBeNull();
});
