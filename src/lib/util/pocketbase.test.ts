import { describe, expect, test } from "vitest";
import { getPocketBaseFileUrlForBase } from "./pocketbase";


describe("getPocketBaseFileUrlForBase", () => {
    test("does not create a double-slash API path when the base URL has a trailing slash", () => {
        expect(getPocketBaseFileUrlForBase(
            "http://localhost:8090/",
            {
                collection: "dragonscaler_characters",
                recordId: "39fzb9q6v518oi4",
                filename: "iywralyx_alpha_1rkbwo0kd6.png",
            },
        )).toBe("http://localhost:8090/api/files/dragonscaler_characters/39fzb9q6v518oi4/iywralyx_alpha_1rkbwo0kd6.png");
    });

    test("keeps file URLs relative when the base URL is empty", () => {
        expect(getPocketBaseFileUrlForBase(
            "",
            {
                collection: "users",
                recordId: "abc123",
                filename: "avatar.png",
            },
        )).toBe("/api/files/users/abc123/avatar.png");
    });
});
