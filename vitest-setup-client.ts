import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";


class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

// required for svelte5 + jsdom as jsdom does not support matchMedia
Object.defineProperty(window, "matchMedia", {
    writable: true,
    enumerable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    enumerable: true,
    value: MockResizeObserver,
});

Object.defineProperty(globalThis, "ResizeObserver", {
    writable: true,
    enumerable: true,
    value: MockResizeObserver,
});

Object.defineProperty(Element.prototype, "animate", {
    writable: true,
    enumerable: true,
    value: vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn(),
        cancel: vi.fn(),
        commitStyles: vi.fn(),
        finished: Promise.resolve(),
        play: vi.fn(),
    })),
});
