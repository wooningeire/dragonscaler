import { expect, test, type Page } from "@playwright/test";


type RectSnapshot = {
    x: number,
    y: number,
    width: number,
    height: number,
};

type ReferenceMeasurementSnapshot = {
    measurementUnit: string,
    targetLength: number,
    lengthText: string | null,
    checkedUnit: string | null,
    horizontalOverflowPx: number,
    verticalOverflowPx: number,
    highlightCenterOffsetPx: number | null,
    highlightSizeOffsetPx: number | null,
    highlightSurfaceMinSizePx: number | null,
    highlightKnobAnimationDuration: string | null,
    highlightKnobAnimationTimingFunction: string | null,
    highlightSurfaceAnimationDuration: string | null,
    highlightSurfaceAnimationTimingFunction: string | null,
    dockRect: RectSnapshot,
    menuRect: RectSnapshot,
    croppedSelectors: string[],
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
                Character: new (input: unknown) => unknown,
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
            name: "Unit verifier",
            baseline: new debug.Baseline({
                targetLength: 1,
                measurementUnit: "m",
                descriptor: "to the shoulder",
                points: [
                    {x: 0.5, y: 0},
                    {x: 0.5, y: 1},
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

const snapshotReferenceMeasurement = async (page: Page): Promise<ReferenceMeasurementSnapshot> => await page.evaluate(() => {
    const browserWindow = window as typeof window & {
        __dragonscalerDebug?: {
            store: {
                characterManager: {
                    editingCharacter: {
                        baseline: {
                            measurementUnit: string,
                            targetLength: number,
                        },
                    } | null,
                },
            },
        },
    };
    const character = browserWindow.__dragonscalerDebug?.store.characterManager.editingCharacter;
    if (character === undefined || character === null) throw new Error("missing editing character");

    const dock = document.querySelector("overlays-bottom-dock");
    const menu = document.querySelector("character-edit-menu");
    if (dock === null || menu === null) throw new Error("missing edit menu layout");

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
        ".character-form-inputs",
        ".reference-sizing-control",
        ".reference-measurement-row",
        ".reference-measurement-input",
        ".measurement-unit-control",
        ".reference-label-input",
        ".baseline-mode-control",
        ".buttons",
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
    const measurementUnitControl = document.querySelector(".measurement-unit-control");
    const checkedInput = measurementUnitControl?.querySelector<HTMLInputElement>(
        "input[name=\"reference-measurement-unit\"]:checked",
    ) ?? null;
    const highlightKnob = measurementUnitControl?.querySelector<HTMLElement>(
        "radio-group-button-highlight-knob",
    ) ?? null;
    const highlightSurface = measurementUnitControl?.querySelector<HTMLElement>(
        "radio-group-button-highlight-surface",
    ) ?? null;
    const checkedRect = checkedInput?.closest("label")?.getBoundingClientRect() ?? null;
    const highlightRect = highlightKnob?.getBoundingClientRect() ?? null;
    const highlightSurfaceRect = highlightSurface?.getBoundingClientRect() ?? null;
    const highlightKnobStyle = highlightKnob === null ? null : getComputedStyle(highlightKnob);
    const highlightSurfaceStyle = highlightSurface === null ? null : getComputedStyle(highlightSurface);
    const highlightCenterOffsetPx = checkedRect === null || highlightRect === null
        ? null
        : Math.max(
            Math.abs((highlightRect.left + highlightRect.width / 2) - (checkedRect.left + checkedRect.width / 2)),
            Math.abs((highlightRect.top + highlightRect.height / 2) - (checkedRect.top + checkedRect.height / 2)),
        );
    const highlightSizeOffsetPx = checkedRect === null || highlightRect === null
        ? null
        : Math.max(
            Math.abs(highlightRect.width - checkedRect.width),
            Math.abs(highlightRect.height - checkedRect.height),
        );
    const highlightSurfaceMinSizePx = highlightSurfaceRect === null
        ? null
        : Math.min(
            highlightSurfaceRect.width,
            highlightSurfaceRect.height,
        );

    return {
        measurementUnit: character.baseline.measurementUnit,
        targetLength: character.baseline.targetLength,
        lengthText: document.querySelector(".reference-measurement-input [contenteditable]")?.textContent ?? null,
        checkedUnit: checkedInput?.value ?? null,
        horizontalOverflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        verticalOverflowPx: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        highlightCenterOffsetPx,
        highlightSizeOffsetPx,
        highlightSurfaceMinSizePx,
        highlightKnobAnimationDuration: highlightKnobStyle?.animationDuration ?? null,
        highlightKnobAnimationTimingFunction: highlightKnobStyle?.animationTimingFunction ?? null,
        highlightSurfaceAnimationDuration: highlightSurfaceStyle?.animationDuration ?? null,
        highlightSurfaceAnimationTimingFunction: highlightSurfaceStyle?.animationTimingFunction ?? null,
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

const expectSharedHighlightMotionTiming = (snapshot: ReferenceMeasurementSnapshot) => {
    expect(snapshot.highlightKnobAnimationDuration).not.toBeNull();
    expect(snapshot.highlightSurfaceAnimationDuration).not.toBeNull();
    expect(snapshot.highlightKnobAnimationDuration).toBe(snapshot.highlightSurfaceAnimationDuration);
    expect(snapshot.highlightKnobAnimationTimingFunction).not.toBeNull();
    expect(snapshot.highlightSurfaceAnimationTimingFunction).not.toBeNull();
    expect(snapshot.highlightKnobAnimationTimingFunction).toBe(snapshot.highlightSurfaceAnimationTimingFunction);
};


test.skip(
    process.env.PLAYWRIGHT_DEV_SERVER !== "1",
    "requires Vite dev mode for the Dragonscaler debug hook",
);

test("reference measurement unit radio preserves layout and updates the edited form unit", async ({ page }) => {
    await routeEmptyPocketBaseLists(page);

    await page.goto("/");
    await expect(page.getByRole("application", {name: "Character height chart viewport"})).toBeVisible();
    await expect.poll(async () => {
        try {
            return await page.evaluate(() => "__dragonscalerDebug" in window);
        } catch {
            return false;
        }
    }).toBe(true);

    await seedEditableCharacter(page);
    await page.waitForTimeout(250);

    const beforeSwitch = await snapshotReferenceMeasurement(page);
    expect(beforeSwitch).toMatchObject({
        measurementUnit: "m",
        checkedUnit: "m",
        lengthText: "1",
        horizontalOverflowPx: 0,
        verticalOverflowPx: 0,
        croppedSelectors: [],
    });
    expect(beforeSwitch.highlightCenterOffsetPx).not.toBeNull();
    expect(beforeSwitch.highlightCenterOffsetPx).toBeLessThan(0.5);
    expect(beforeSwitch.highlightSizeOffsetPx).not.toBeNull();
    expect(beforeSwitch.highlightSizeOffsetPx).toBeLessThan(0.5);
    expect(beforeSwitch.highlightSurfaceMinSizePx).not.toBeNull();
    expect(beforeSwitch.highlightSurfaceMinSizePx).toBeGreaterThan(1);
    expectSharedHighlightMotionTiming(beforeSwitch);

    await page.getByRole("radio", {name: "ft", exact: true}).click();

    const afterSwitch = await snapshotReferenceMeasurement(page);
    expect(afterSwitch).toMatchObject({
        measurementUnit: "ft",
        targetLength: 1,
        checkedUnit: "ft",
        lengthText: "3.281",
        horizontalOverflowPx: 0,
        verticalOverflowPx: 0,
        croppedSelectors: [],
    });

    await page.waitForTimeout(550);
    const afterSwitchSettled = await snapshotReferenceMeasurement(page);
    expect(afterSwitchSettled.highlightCenterOffsetPx).not.toBeNull();
    expect(afterSwitchSettled.highlightCenterOffsetPx).toBeLessThan(0.5);
    expect(afterSwitchSettled.highlightSizeOffsetPx).not.toBeNull();
    expect(afterSwitchSettled.highlightSizeOffsetPx).toBeLessThan(0.5);
    expect(afterSwitchSettled.highlightSurfaceMinSizePx).not.toBeNull();
    expect(afterSwitchSettled.highlightSurfaceMinSizePx).toBeGreaterThan(1);
    expectSharedHighlightMotionTiming(afterSwitchSettled);
    expectStableRect(
        afterSwitch.dockRect,
        beforeSwitch.dockRect,
    );
    expectStableRect(
        afterSwitch.menuRect,
        beforeSwitch.menuRect,
    );

    await page.getByRole("radio", {name: "m", exact: true}).click();

    const afterReturn = await snapshotReferenceMeasurement(page);
    expect(afterReturn).toMatchObject({
        measurementUnit: "m",
        targetLength: 1,
        checkedUnit: "m",
        lengthText: "1",
        horizontalOverflowPx: 0,
        verticalOverflowPx: 0,
        croppedSelectors: [],
    });

    await page.waitForTimeout(550);
    const afterReturnSettled = await snapshotReferenceMeasurement(page);
    expect(afterReturnSettled.highlightCenterOffsetPx).not.toBeNull();
    expect(afterReturnSettled.highlightCenterOffsetPx).toBeLessThan(0.5);
    expect(afterReturnSettled.highlightSizeOffsetPx).not.toBeNull();
    expect(afterReturnSettled.highlightSizeOffsetPx).toBeLessThan(0.5);
    expect(afterReturnSettled.highlightSurfaceMinSizePx).not.toBeNull();
    expect(afterReturnSettled.highlightSurfaceMinSizePx).toBeGreaterThan(1);
    expectSharedHighlightMotionTiming(afterReturnSettled);

    await page.setViewportSize({
        width: 390,
        height: 844,
    });

    const mobileSnapshot = await snapshotReferenceMeasurement(page);
    expect(mobileSnapshot).toMatchObject({
        measurementUnit: "m",
        checkedUnit: "m",
        horizontalOverflowPx: 0,
        verticalOverflowPx: 0,
        croppedSelectors: [],
    });
    expect(mobileSnapshot.highlightCenterOffsetPx).not.toBeNull();
    expect(mobileSnapshot.highlightCenterOffsetPx).toBeLessThan(0.5);
    expect(mobileSnapshot.highlightSizeOffsetPx).not.toBeNull();
    expect(mobileSnapshot.highlightSizeOffsetPx).toBeLessThan(0.5);
    expect(mobileSnapshot.highlightSurfaceMinSizePx).not.toBeNull();
    expect(mobileSnapshot.highlightSurfaceMinSizePx).toBeGreaterThan(1);
    expectSharedHighlightMotionTiming(mobileSnapshot);

    await page.getByRole("radio", {name: "Give a pixel measurement"}).click();
    await expect(page.getByText("Pixel measurement", {exact: true})).toBeVisible();
    await expect(page.getByText("px", {exact: true})).toBeVisible();
    await expect(page.getByRole("radiogroup", {name: "Reference curve mode"})).toHaveCount(0);

    const referenceLabelInput = page.locator(".reference-label-input [contenteditable]");
    await expect(referenceLabelInput).toBeVisible();
    await referenceLabelInput.fill("reference human");
    await expect(referenceLabelInput).toHaveText("reference human");

    const pixelLayout = await page.evaluate(() => {
        const dock = document.querySelector("overlays-bottom-dock");
        if (dock === null) throw new Error("missing bottom dock");

        const dockRect = dock.getBoundingClientRect();
        const selectors = [
            "character-edit-menu",
            ".character-form-inputs",
            ".reference-sizing-control",
            ".reference-measurement-row",
            ".reference-measurement-input",
            ".measurement-unit-control",
            ".reference-label-input",
            ".pixel-measurement-row",
            ".pixel-measurement-input",
            ".pixel-measurement-value",
            ".buttons",
        ];

        return {
            horizontalOverflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            verticalOverflowPx: document.documentElement.scrollHeight - document.documentElement.clientHeight,
            croppedSelectors: selectors.filter(selector => {
                const rect = document.querySelector(selector)?.getBoundingClientRect();
                if (rect === undefined) return true;

                return rect.left < -0.5
                    || rect.right > innerWidth + 0.5
                    || rect.top < dockRect.top - 0.5
                    || rect.bottom > dockRect.bottom + 0.5;
            }),
        };
    });
    expect(pixelLayout).toEqual({
        horizontalOverflowPx: 0,
        verticalOverflowPx: 0,
        croppedSelectors: [],
    });
});
