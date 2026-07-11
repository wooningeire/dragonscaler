import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/svelte";
import Page from "./+page.svelte";
import { store } from "$lib/types/Store.svelte";

describe("/+page.svelte", () => {
    beforeEach(() => {
        store.databaseStore.userRecord = null;
        store.databaseStore.discordLoginError = null;
        store.databaseStore.discordLoginPending = false;
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
        store.databaseStore.discordLoginError = null;
        store.databaseStore.discordLoginPending = false;
        vi.restoreAllMocks();
    });

    test("renders the signed-out controls", () => {
        render(Page);

        expect(screen.getByRole("button", { name: "Sign in with Discord" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add character" })).toBeDisabled();
        expect(screen.getByRole("slider", { name: "Spacing" })).toBeInTheDocument();
    });

    test("disables Discord sign-in while login is pending", () => {
        store.databaseStore.discordLoginPending = true;

        render(Page);

        expect(screen.getByRole("button", { name: "Sign in with Discord" })).toBeDisabled();
        expect(screen.getByRole("status")).toHaveTextContent("Waiting for Discord...");
    });

    test("shows Discord sign-in errors without disabling retry", () => {
        store.databaseStore.discordLoginError = "Discord sign-in failed. Try again.";

        render(Page);

        expect(screen.getByRole("status")).toHaveTextContent(
            "Discord sign-in failed. Try again.",
        );
        expect(screen.getByRole("button", { name: "Sign in with Discord" })).toBeEnabled();
    });
});
