import { svelteTesting } from "@testing-library/svelte/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [sveltekit()],
    test: {
        projects: [
            {
                plugins: [sveltekit(), svelteTesting()],
                test: {
                    name: "client",
                    environment: "jsdom",
                    clearMocks: true,
                    include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
                    exclude: ["src/lib/server/**"],
                    setupFiles: ["./vitest-setup-client.ts"],
                },
            },
            {
                plugins: [sveltekit()],
                test: {
                    name: "server",
                    environment: "node",
                    include: ["src/**/*.{test,spec}.{js,ts}"],
                    exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
                },
            },
        ],
    },
});
