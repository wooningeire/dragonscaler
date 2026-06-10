import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const webServerCommand = process.env.PLAYWRIGHT_DEV_SERVER === "1"
    ? `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`
    : `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`;

export default defineConfig({
    use: {
        baseURL: `http://127.0.0.1:${port}`,
    },
    webServer: {
        command: webServerCommand,
        port,
    },
    testDir: "e2e",
});
