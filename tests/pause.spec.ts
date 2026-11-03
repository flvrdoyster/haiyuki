import { test, expect } from '@playwright/test';
import { waitForGame, startBattle } from './helpers';

async function setHidden(page, hidden: boolean) {
    await page.evaluate((h) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
        document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
}

test.describe('일시정지', () => {
    test('숨김 → 복귀는 멈춘 채, Z로 재개', async ({ page }) => {
        await page.goto('/');
        await waitForGame(page);
        await startBattle(page, { autoTest: false });

        await setHidden(page, true);
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => (0, eval)('Game').paused)).toBe(true);

        await setHidden(page, false);
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => (0, eval)('Game').paused)).toBe(true);

        await page.keyboard.down('KeyZ');
        await page.waitForTimeout(70);
        await page.keyboard.up('KeyZ');
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => (0, eval)('Game').paused)).toBe(false);
    });

    test('캔버스 클릭으로 재개', async ({ page }) => {
        await page.goto('/');
        await waitForGame(page);
        await startBattle(page, { autoTest: false });
        await setHidden(page, true);
        await page.waitForTimeout(100);
        await setHidden(page, false);
        const box = (await page.locator('#game-canvas').boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(70);
        await page.mouse.up();
        await page.waitForTimeout(150);
        expect(await page.evaluate(() => (0, eval)('Game').paused)).toBe(false);
    });

    test('자동 테스트는 멈추지 않음', async ({ page }) => {
        await page.goto('/');
        await waitForGame(page);
        await startBattle(page, { autoTest: true });
        await setHidden(page, true);
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => (0, eval)('Game').paused)).toBe(false);
    });
});

test('일시정지·재개·BGM 전환을 섞어도 동시에 도는 BGM은 1개 이하', async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    await page.evaluate(() => { (0, eval)('Assets').setMute(false); });
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);

    const playing = () => page.evaluate(() => {
        const A = (0, eval)('Assets');
        return Object.entries(A.audio).filter(([, el]: any) => !el.paused && !el.muted).map(([id]) => id);
    });
    const ids = await page.evaluate(() => Object.keys((0, eval)('Assets').audio).filter(i => i.includes('bgm')));
    expect(ids.length).toBeGreaterThan(2);

    let seed = 7;
    let sawPlaying = false;
    const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let i = 0; i < 60; i++) {
        const a = rnd(5);
        if (a === 0) await setHidden(page, true);
        else if (a === 1) await setHidden(page, false);
        else if (a === 2) await page.evaluate((id) => (0, eval)('Assets').playMusic(id, Math.random() < 0.5), ids[rnd(ids.length)]);
        else if (a === 3) {
            await page.keyboard.down('KeyZ'); await page.waitForTimeout(70); await page.keyboard.up('KeyZ');
        } else await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await page.waitForTimeout(60);
        const list = await playing();
        expect(list.length, `step ${i} action ${a}: ${list.join(',')}`).toBeLessThanOrEqual(1);
        if (list.length === 1) sawPlaying = true;
        const paused = await page.evaluate(() => (0, eval)('Game').paused);
        if (paused) expect(list.length, `step ${i} paused but playing`).toBe(0);
    }
    expect(sawPlaying).toBe(true);
});
