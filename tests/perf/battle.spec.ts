import { test } from '@playwright/test';
import { waitForGame, startBattle } from '../helpers';
import { DRIVER_SRC, PROBE_SRC, summarize, heapUsed, saveJson } from './util';

async function setup(page: any, auto: boolean) {
    await page.goto('/index.html');
    await waitForGame(page);
    await page.evaluate(PROBE_SRC);
    await startBattle(page, { playerIndex: 0, cpuIndex: 1, autoTest: auto });
    await page.evaluate(DRIVER_SRC);
}

async function keepBattle(page: any, auto: boolean, counters: { matches: number }) {
    const left = await page.evaluate(() => {
        const g = (0, eval)('Game');
        return g.currentScene !== (0, eval)('BattleScene');
    });
    if (left) {
        counters.matches++;
        await page.evaluate((a: boolean) => {
            const g = (0, eval)('Game');
            g.isAutoTest = a;
            g.changeScene((0, eval)('BattleScene'), { playerIndex: 0, cpuIndex: 1 });
        }, auto);
    }
}

async function runWindow(page: any, cdp: any, auto: boolean, ms: number, name: string) {
    const counters = { matches: 0 };
    const heap: any[] = [];
    await page.evaluate(() => { const P = (window as any).__probe__; P.frames.length = 0; P.longtasks.length = 0; P.drawPerFrame.length = 0; P.getPerFrame.length = 0; P.slow100.length = 0; P.t0 = performance.now(); P.last = 0; });
    const t0 = Date.now();
    let nextHeap = 0;
    while (Date.now() - t0 < ms) {
        if (Date.now() - t0 >= nextHeap) {
            heap.push({ t: Math.round((Date.now() - t0) / 1000), used: await heapUsed(cdp), matches: counters.matches });
            nextHeap += 5000;
        }
        await keepBattle(page, auto, counters);
        await page.waitForTimeout(250);
    }
    heap.push({ t: Math.round((Date.now() - t0) / 1000), used: await heapUsed(cdp), matches: counters.matches });
    const data = await page.evaluate(() => {
        const P = (window as any).__probe__;
        return { frames: P.frames, longtasks: P.longtasks, draw: P.drawPerFrame, get: P.getPerFrame, slow100: P.slow100 };
    });
    const avg = (a: number[]) => +(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1);
    const out = {
        name, auto, matchesRestarted: counters.matches,
        frames: summarize(data.frames),
        longtasks: data.longtasks,
        longtaskCount: data.longtasks.length,
        longtaskTotalMs: data.longtasks.reduce((a: number, b: any) => a + b.dur, 0),
        drawImage: { mean: avg(data.draw), max: Math.max(...data.draw) },
        assetsGet: { mean: avg(data.get), max: Math.max(...data.get) },
        slow100: data.slow100,
        heap,
    };
    saveJson(`${name}.json`, out);
    return out;
}

for (const auto of [false, true]) {
    test(`battle frames 60s ${auto ? 'autoTest' : 'real'}`, async ({ page }) => {
        test.setTimeout(150_000);
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Performance.enable');
        await setup(page, auto);
        await runWindow(page, cdp, auto, 60_000, `battle-${auto ? 'auto' : 'real'}`);
    });
}

const MATCHES = Number(process.env.PERF_MATCHES || 3);

async function memoSizes(page: any) {
    return page.evaluate(() => { const y = (0, eval)('YakuLogic'); return { memo: y._memo ? y._memo.size : null, tenpai: y._tenpaiMemo ? y._tenpaiMemo.size : null }; });
}

test('three matches autoTest heap', async ({ page }) => {
    test.setTimeout(1_300_000);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    await setup(page, true);
    const heap: any[] = [];
    const t0 = Date.now();
    let matches = 0, lastScene = 'BattleScene';
    heap.push({ t: 0, match: 0, used: await heapUsed(cdp), gcUsed: await heapUsed(cdp, true), memo: await memoSizes(page) });
    let next = 5000;
    while (matches < MATCHES && Date.now() - t0 < 1_200_000) {
        await page.waitForTimeout(250);
        const left = await page.evaluate(() => (0, eval)('Game').currentScene !== (0, eval)('BattleScene'));
        if (left) {
            matches++;
            heap.push({ t: Math.round((Date.now() - t0) / 1000), match: matches, used: await heapUsed(cdp), gcUsed: await heapUsed(cdp, true), tag: 'matchEnd', memo: await memoSizes(page) });
            if (matches < MATCHES) await page.evaluate(() => { const g = (0, eval)('Game'); g.isAutoTest = true; g.changeScene((0, eval)('BattleScene'), { playerIndex: 0, cpuIndex: 1 }); });
        } else if (Date.now() - t0 >= next) {
            heap.push({ t: Math.round((Date.now() - t0) / 1000), match: matches, used: await heapUsed(cdp) });
            next += 5000;
        }
    }
    const P = await page.evaluate(() => { const p = (window as any).__probe__; return { frames: p.frames }; });
    saveJson('three-matches.json', { matches, seconds: Math.round((Date.now() - t0) / 1000), heap, frames: summarize(P.frames) });
});
