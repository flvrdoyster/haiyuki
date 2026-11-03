import * as path from 'path';
import { defineConfig } from '@playwright/test';
import base from '../playwright.config';

const PORT = Number(process.env.PERF_PORT || 12801);

export default defineConfig({
    ...base,
    testDir: '..',
    outputDir: '../.playwright/regress-results',
    reporter: [['list']],
    use: { ...base.use, baseURL: `http://localhost:${PORT}` },
    webServer: {
        command: `npx serve .. -l ${PORT} --no-clipboard`,
        url: `http://localhost:${PORT}`,
        cwd: path.resolve(__dirname, '..'),
        reuseExistingServer: false,
        timeout: 30_000,
    },
});
