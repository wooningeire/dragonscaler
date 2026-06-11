import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import RadioGroup from "./RadioGroup.svelte";

const options = [
    {
        id: "m",
        label: "m",
    },
    {
        id: "ft",
        label: "ft",
    },
];

describe("RadioGroup", () => {
    test("renders options as an accessible radio group", () => {
        render(RadioGroup, {
            ariaLabel: "Measurement unit",
            name: "measurement-unit",
            options,
            value: "m",
            onValueChange: () => {},
        });

        expect(screen.getByRole("radiogroup", {name: "Measurement unit"})).toBeVisible();
        expect(screen.getByRole("radio", {name: "m"})).toBeChecked();
        expect(screen.getByRole("radio", {name: "ft"})).not.toBeChecked();
    });

    test("reports selected option changes", async () => {
        const onValueChange = vi.fn();

        render(RadioGroup, {
            ariaLabel: "Measurement unit",
            name: "measurement-unit",
            options,
            value: "m",
            onValueChange,
        });

        await fireEvent.click(screen.getByRole("radio", {name: "ft"}));

        expect(onValueChange).toHaveBeenCalledWith("ft");
    });
});
