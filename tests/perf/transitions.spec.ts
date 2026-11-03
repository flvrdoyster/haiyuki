import { test } from '@playwright/test';
import { PROBE_SRC, DRIVER_SRC, summarize, saveJson } from './util';

test('scene transitions real', async ({ page }) => {
    test.setTimeout(420_000);
    await page.goto('/index.html');
    await page.waitForFunction(() => { try { return !!(0, eval)('Game').currentScene; } catch { return false; } });
    await page.evaluate(PROBE_SRC);
    await page.evaluate(DRIVER_SRC);
    await page.evaluate(() => { (0, eval)('Assets').setMute(true); });
    const log: any[] = [];
    let prev = '', sawBattle = false, battleEndAt = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 400_000) {
        const sc = await page.evaluate(() => (window as any).__probe__.sceneName());
        if (sc !== prev) { log.push({ t: Date.now() - t0, scene: sc }); prev = sc; }
        if (sc === 'BattleScene') { sawBattle = true; battleEndAt = 0; }
        else {
            await page.keyboard.press('Space');
            if (sawBattle) { if (!battleEndAt) battleEndAt = Date.now(); if (Date.now() - battleEndAt > 12_000) break; }
        }
        await page.waitForTimeout(350);
    }
    const data = await page.evaluate(() => { const P = (window as any).__probe__; return { frames: P.frames, slow100: P.slow100, scenes: P.scenes, longtasks: P.longtasks }; });
    saveJson('transitions.json', { sceneLog: log, scenes: data.scenes, frames: summarize(data.frames), slow100: data.slow100, longtasks100: data.longtasks.filter((l: any) => l.dur >= 100) });
});
