import * as path from 'path';
import { defineConfig } from '@playwright/test';
import base from '../playwright.config';

export default defineConfig({
    ...base,
    testDir: '.',
    testIgnore: ['node_modules/**'],
    outputDir: '../.playwright/perf-results',
    retries: 0,
    reporter: [['list']],
    webServer: { ...(base.webServer as any), cwd: path.resolve(__dirname, '..') },
});
