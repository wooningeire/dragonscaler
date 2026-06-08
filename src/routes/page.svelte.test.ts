import { describe, expect, test } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/svelte";
import Page from "./+page.svelte";

describe("/+page.svelte", () => {
    test("renders the signed-out controls", () => {
        render(Page);

        expect(screen.getByRole("button", { name: "Sign in with Discord" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Add character" })).toBeDisabled();
        expect(screen.getByRole("slider", { name: "Spacing" })).toBeInTheDocument();
    });
});
