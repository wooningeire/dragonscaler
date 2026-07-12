import { createPlaywrightConfig } from "./playwright.config";


process.env.PLAYWRIGHT_DEV_SERVER = "1";

export default createPlaywrightConfig({
    devServer: true,
});
