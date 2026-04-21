import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    outputDir: './tests/results',
    // Tests share one game server — run serially to avoid state pollution
    fullyParallel: false,
    workers: 1,
    timeout: 90_000,
    expect: { timeout: 20_000 },
    reporter: [['html', { open: 'never', outputFolder: './tests/results/html' }], ['list']],
    use: {
        baseURL: 'http://localhost:3000',
        headless: true,
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        command: 'npx serve . -l 3000 --no-clipboard',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});
