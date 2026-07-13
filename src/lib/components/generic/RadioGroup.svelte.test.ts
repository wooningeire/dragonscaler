import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
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

const highlightStyle = (
    highlight: HTMLElement,
    propertyName: string,
): string => highlight.style.getPropertyValue(propertyName).trim();

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

    test("does not report changes from disabled options", async () => {
        const onValueChange = vi.fn();

        render(RadioGroup, {
            ariaLabel: "Redraw measurement as",
            name: "measurement-redraw-mode",
            options: [
                {
                    id: "curve",
                    label: "Curve",
                },
                {
                    id: "pixel_measurement",
                    label: "Pixel count",
                    disabled: true,
                },
            ],
            value: "curve",
            onValueChange,
        });

        const pixelCount = screen.getByRole("radio", {name: "Pixel count"});

        expect(pixelCount).toBeDisabled();
        await fireEvent.click(pixelCount);
        expect(onValueChange).not.toHaveBeenCalled();

        await fireEvent.click(screen.getByRole("radio", {name: "Curve"}));
        expect(onValueChange).toHaveBeenCalledWith("curve");
    });

    test("moves the grid highlight in both directions and remounts the squash surface", async () => {
        const props = {
            ariaLabel: "Measurement unit",
            name: "measurement-unit",
            options,
            value: "m",
            onValueChange: () => {},
        };
        const {
            container,
            rerender,
        } = render(RadioGroup, props);
        const highlight = container.querySelector<HTMLElement>("radio-group-button-highlight");

        expect(highlight).not.toBeNull();
        if (highlight === null) throw new Error("missing radio group highlight");

        let surface = container.querySelector("radio-group-button-highlight-surface");
        expect(surface).not.toBeNull();

        await waitFor(() => {
            expect(highlight).toHaveClass("visible");
            expect(highlightStyle(highlight, "--radio-group-highlight-selected-index-percent")).toBe("0%");
            expect(highlightStyle(highlight, "--radio-group-highlight-selected-gap-offset")).toBe("0em");
        });

        await rerender({
            ...props,
            value: "ft",
        });

        const ftSurface = container.querySelector("radio-group-button-highlight-surface");

        await waitFor(() => {
            expect(highlightStyle(highlight, "--radio-group-highlight-selected-index-percent")).toBe("100%");
            expect(highlightStyle(highlight, "--radio-group-highlight-selected-gap-offset")).toBe("0.125em");
            expect(highlightStyle(highlight, "--radio-group-highlight-motion-from-index-percent")).toBe("0%");
            expect(highlightStyle(highlight, "--radio-group-highlight-motion-from-gap-offset")).toBe("0em");
            expect(highlightStyle(highlight, "--radio-group-highlight-motion-midpoint-index-percent")).toBe("50%");
            expect(highlightStyle(highlight, "--radio-group-highlight-motion-midpoint-gap-offset")).toBe("0.0625em");
        });
        expect(ftSurface).not.toBe(surface);

        surface = ftSurface;

        await rerender({
            ...props,
            value: "m",
        });

        const meterSurface = container.querySelector("radio-group-button-highlight-surface");

        await waitFor(() => {
            expect(highlightStyle(highlight, "--radio-group-highlight-selected-index-percent")).toBe("0%");
            expect(highlightStyle(highlight, "--radio-group-highlight-selected-gap-offset")).toBe("0em");
            expect(highlightStyle(highlight, "--radio-group-highlight-motion-from-index-percent")).toBe("100%");
            expect(highlightStyle(highlight, "--radio-group-highlight-motion-from-gap-offset")).toBe("0.125em");
            expect(highlightStyle(highlight, "--radio-group-highlight-motion-midpoint-index-percent")).toBe("50%");
            expect(highlightStyle(highlight, "--radio-group-highlight-motion-midpoint-gap-offset")).toBe("0.0625em");
        });
        expect(meterSurface).not.toBe(surface);
    });
});
