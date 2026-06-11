import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/svelte";
import Page from "./+page.svelte";
import { store } from "$lib/types/Store.svelte";

describe("/+page.svelte", () => {
    beforeEach(() => {
        vi.spyOn(
            store.databaseStore,
            "loadUserRecord",
        ).mockImplementation(() => {});
        vi.spyOn(
            store,
            "loadCharacters",
        ).mockResolvedValue();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("renders the signed-out controls", () => {
        render(Page);

        expect(screen.getByRole("button", { name: "Sign in with Discord" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add character" })).toBeDisabled();
        expect(screen.getByRole("slider", { name: "Spacing" })).toBeInTheDocument();
    });
});
