import { defineConfig, devices } from '@playwright/test';

// This config and all test tooling (specs, package.json, node_modules) live under
// haiyuki_web/tests/ so the game folder above stays pure deliverable. The dev
// server therefore serves the parent (the game root) — see webServer below.
export default defineConfig({
    testDir: '.',
    testIgnore: ['node_modules/**'],
    // Generated artifacts (run output, html report, .last-run.json) go in one
    // hidden, gitignored folder under tests/.
    outputDir: './.playwright/results',
    // Tests share one game server — run serially to avoid state pollution
    fullyParallel: false,
    workers: 1,
    timeout: 90_000,
    expect: { timeout: 20_000 },
    reporter: [['html', { open: 'never', outputFolder: './.playwright/report' }], ['list']],
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
        // cwd defaults to this config's dir (tests/); serve the game root one level up.
        command: 'npx serve .. -l 3000 --no-clipboard',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});
