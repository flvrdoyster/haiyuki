import { test, expect } from '@playwright/test';

test('yaku iframe loads only on open, BGM registered', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const yakuRequests: string[] = [];
    page.on('request', r => { if (r.url().includes('haiyuki_manual')) yakuRequests.push(r.url()); });
    await page.goto('/index.html');
    await page.waitForFunction(() => { try { return (0, eval)('LoadingScene').isLoaded; } catch { return false; } }, null, { timeout: 30_000 });
    expect(yakuRequests.length).toBe(0);
    const before = await page.evaluate(() => (document.getElementById('yaku-frame') as HTMLIFrameElement).getAttribute('src'));
    expect(before).toBeNull();
    const audioIds = await page.evaluate(() => Object.keys((0, eval)('Assets').audio).sort());
    expect(audioIds.length).toBe(11);
    await page.click('#yaku-btn');
    await expect.poll(() => yakuRequests.length, { timeout: 15_000 }).toBeGreaterThan(0);
    const after = await page.evaluate(() => (document.getElementById('yaku-frame') as HTMLIFrameElement).src);
    expect(after).toBe('https://atah.io/haiyuki_manual/index.html#yaku');
    const hidden = await page.evaluate(() => document.getElementById('yaku-container')!.classList.contains('hidden'));
    expect(hidden).toBe(false);
});

test('non-boot BGM plays while still downloading (4Mbps)', async ({ page, context }) => {
    test.setTimeout(120_000);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 4e6 / 8, uploadThroughput: 4e6 / 8 });
    await page.route(/\.woff2?(\?|$)/, r => r.abort());
    await page.goto('/index.html');
    await page.waitForFunction(() => { try { return (0, eval)('LoadingScene').isLoaded; } catch { return false; } }, null, { timeout: 90_000, polling: 100 });
    await page.mouse.click(300, 300);
    const t0 = Date.now();
    const st0 = await page.evaluate(() => {
        const A = (0, eval)('Assets');
        A.setMute(false);
        A.playMusic('audio/bgm_chrsel');
        const a = A.audio['audio/bgm_chrsel'];
        return { readyState: a.readyState, paused: a.paused };
    });
    await page.waitForFunction(() => { const a = (0, eval)('Assets').audio['audio/bgm_chrsel']; return !a.paused && a.currentTime > 0.2; }, null, { timeout: 60_000, polling: 100 });
    const st1 = await page.evaluate(() => { const a = (0, eval)('Assets').audio['audio/bgm_chrsel']; return { readyState: a.readyState, currentTime: a.currentTime }; });
    console.log('chrsel at play:', JSON.stringify(st0), 'playing after ms:', Date.now() - t0, JSON.stringify(st1));
});
