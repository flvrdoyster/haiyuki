import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const PORT = process.env.PORT || '12801';

export default defineConfig({
    testDir: '.',
    testIgnore: ['node_modules/**', 'perf/**'],
    // Generated artifacts (run output, html report, .last-run.json) go in one
    // hidden, gitignored folder under tests/.
    outputDir: './.playwright/results',
    // Tests share one game server — run serially to avoid state pollution
    fullyParallel: false,
    workers: 1,
    // 전체 스위트에 재현 안 되는 간헐 실패가 있다(매번 다른 테스트, 단독 실행 시 통과,
    // 소스 변경을 stash해도 재현 → 코드 문제 아님). 재시도로 통과한 건 Playwright가
    // 'flaky'로 따로 표시하므로 숨기는 게 아니라 분류하는 것. 두 번 연속 실패만 진짜 실패.
    retries: 1,
    timeout: 90_000,
    expect: { timeout: 20_000 },
    reporter: [['html', { open: 'never', outputFolder: './.playwright/report' }], ['list']],
    use: {
        baseURL: `http://localhost:${PORT}`,
        headless: true,
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        command: `npx serve ../docs -l ${PORT} --no-clipboard -c ${path.resolve(__dirname, 'serve.json')}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});
