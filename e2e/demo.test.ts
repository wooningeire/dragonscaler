import { expect, test } from "@playwright/test";

test("loads PocketBase images without redirect-shaped CORS failures", async ({ page }) => {
    const fileResponses: {
        url: string,
        status: number,
        accessControlAllowOrigin: string | null,
    }[] = [];
    const consoleErrors: string[] = [];

    page.on("response", response => {
        const url = response.url();
        if (!url.includes("/api/files") && !url.includes("//api/files")) return;

        const headers = response.headers();
        fileResponses.push({
            url,
            status: response.status(),
            accessControlAllowOrigin: headers["access-control-allow-origin"] ?? null,
        });
    });

    page.on("console", message => {
        if (message.type() === "error") {
            consoleErrors.push(message.text());
        }
    });

    await page.goto("/");

    await expect(page.getByRole("button", { name: "Sign in with Discord" })).toBeVisible();
    await expect.poll(() => fileResponses.length).toBeGreaterThan(0);
    await expect.poll(
        () => page.locator("img").evaluateAll(images => images.some(image => image.complete && image.naturalWidth > 0)),
    ).toBe(true);

    expect(fileResponses).toEqual(expect.arrayContaining([
        expect.objectContaining({
            status: 200,
            accessControlAllowOrigin: "*",
        }),
    ]));
    expect(fileResponses.map(response => response.url)).not.toEqual(expect.arrayContaining([
        expect.stringMatching(/localhost:8090\/\/api\/files/),
    ]));
    expect(consoleErrors.filter(message => (
        message.includes("CORS")
        || message.includes("Access-Control-Allow-Origin")
    ))).toEqual([]);
});
