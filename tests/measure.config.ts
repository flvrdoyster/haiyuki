import { defineConfig, devices } from '@playwright/test';

const PORT = +(process.env.PORT || 12802);

export default defineConfig({
    testDir: './measure',
    outputDir: './.playwright/measure-results',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 120 * 60 * 1000,
    reporter: [['list']],
    use: {
        baseURL: `http://localhost:${PORT}`,
        headless: true,
        video: 'off',
        screenshot: 'off',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        command: `npx serve ../docs -l ${PORT} --no-clipboard`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 30_000,
    },
});
