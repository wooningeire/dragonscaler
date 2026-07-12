import { defineConfig } from "@playwright/test";

export const createPlaywrightConfig = ({
    devServer = process.env.PLAYWRIGHT_DEV_SERVER === "1",
}: {
    devServer?: boolean,
} = {}) => {
    const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
    const webServerCommand = devServer
        ? `deno task dev --host 127.0.0.1 --port ${port} --strictPort`
        : `deno task build && deno task preview --host 127.0.0.1 --port ${port} --strictPort`;

    return defineConfig({
        use: {
            baseURL: `http://127.0.0.1:${port}`,
        },
        webServer: {
            command: webServerCommand,
            port,
        },
        testDir: "e2e",
    });
};

export default createPlaywrightConfig();
