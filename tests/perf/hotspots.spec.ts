import { test } from '@playwright/test';
import { waitForGame, startBattle } from '../helpers';
import { DRIVER_SRC, saveJson } from './util';

test('핫스팟 30초 실플레이', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/index.html');
    await waitForGame(page);
    await page.evaluate(() => {
        const w = window as any;
        const S: Record<string, { n: number; tot: number; max: number; over16: number }> = w.__hs__ = {};
        const wrap = (objName: string) => {
            let o: any; try { o = (0, eval)(objName); } catch (_) { return; }
            if (!o) return;
            for (const k of Object.keys(o)) {
                if (typeof o[k] !== 'function') continue;
                const orig = o[k]; const id = `${objName}.${k}`;
                S[id] = { n: 0, tot: 0, max: 0, over16: 0 };
                o[k] = function () {
                    const t = performance.now();
                    try { return orig.apply(this, arguments); }
                    finally { const d = performance.now() - t; const s = S[id]; s.n++; s.tot += d; if (d > s.max) s.max = d; if (d > 16) s.over16++; }
                };
            }
        };
        ['YakuLogic', 'AILogic', 'AutoPlay', 'BattleEngine', 'BattleSequencer', 'BattleRenderer', 'FXSystem', 'BattleScene', 'BattleDialogue', 'UIDraw', 'BitmapFont'].forEach(wrap);
    });
    await startBattle(page, { playerIndex: 0, cpuIndex: 1, autoTest: false });
    await page.evaluate(DRIVER_SRC);
    await page.waitForTimeout(30_000);
    const hs = await page.evaluate(() => (window as any).__hs__);
    const rows = Object.entries(hs).map(([k, v]: any) => ({ fn: k, calls: v.n, totalMs: Math.round(v.tot), maxMs: +v.max.toFixed(1), over16: v.over16, meanMs: +(v.tot / Math.max(1, v.n)).toFixed(3) }))
        .filter(r => r.calls > 0);
    saveJson('hotspots.json', { byTotal: [...rows].sort((a, b) => b.totalMs - a.totalMs).slice(0, 25), byMax: [...rows].sort((a, b) => b.maxMs - a.maxMs).slice(0, 15) });
});
