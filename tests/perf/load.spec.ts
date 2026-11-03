import { test } from '@playwright/test';
import { NETWORKS, applyNetwork, saveJson } from './util';

const RUNS = Number(process.env.PERF_LOAD_RUNS || 3);

const BLOCK = (process.env.PERF_BLOCK || '').split(',').filter(Boolean);
const BLOCK_PATTERNS: Record<string, RegExp> = { fonts: /\.woff2?(\?|$)/, iframe: /haiyuki_manual/ };
const SUFFIX = BLOCK.length ? `-block-${BLOCK.join('+')}` : '';

for (const [label, cond] of Object.entries(NETWORKS)) {
    test(`load ${label}${SUFFIX}`, async ({ browser }) => {
        test.setTimeout(240_000);
        const runs: any[] = [];
        for (let r = 0; r < RUNS; r++) {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            const cdp = await ctx.newCDPSession(page);
            await applyNetwork(cdp, cond);
            for (const b of BLOCK) await page.route(BLOCK_PATTERNS[b], r => r.abort());
            await page.addInitScript(() => {
                const w = window as any;
                w.__load__ = { t: {}, firstImagesDone: null, firstAudioDone: null, bgmDone: [], sfxDone: [] };
                const poll = setInterval(() => {
                    try {
                        const A = (0, eval)('Assets');
                        const now = performance.now();
                        const total = A.toLoad.length;
                        if (!w.__load__.total) {
                            w.__load__.total = total;
                            w.__load__.nImg = A.toLoad.filter((i: any) => typeof i === 'string' || i.type !== 'audio').length;
                            w.__load__.nBgm = A.toLoad.filter((i: any) => typeof i !== 'string' && i.type === 'audio' && i.id.includes('bgm')).length;
                            w.__load__.nSfx = A.toLoad.filter((i: any) => typeof i !== 'string' && i.type === 'audio' && !i.id.includes('bgm')).length;
                        }
                        const L = w.__load__;
                        if (L.loadStart == null && (0, eval)('Game').currentScene) L.loadStart = now;
                        if (L.firstImagesDone === null && Object.keys(A.images).length >= L.nImg) L.firstImagesDone = now;
                        if (L.sfxAllDone == null && Object.keys(A.sfxBuffers).length >= L.nSfx - 0) L.sfxAllDone = now;
                        if (L.bgmAllDone == null && Object.keys(A.audio).length >= L.nBgm) L.bgmAllDone = now;
                        if (L.titleBgm == null && A.audio['audio/bgm_compile'] && A.audio['audio/bgm_title']) L.titleBgm = now;
                        L.counts = { img: Object.keys(A.images).length, bgm: Object.keys(A.audio).length, sfx: Object.keys(A.sfxBuffers).length, loadedCount: A.loadedCount };
                        const G = (0, eval)('Game');
                        const LS = (0, eval)('LoadingScene');
                        if (LS.isLoaded && L.onComplete == null) L.onComplete = now;
                        if (G.currentScene && G.currentScene === (0, eval)('TitleScene') && L.title == null) { L.title = now; clearInterval(poll); }
                    } catch (_) {}
                }, 20);
            });
            const t0 = Date.now();
            await page.goto('/index.html', { waitUntil: 'commit' });
            await page.waitForFunction(() => (window as any).__load__?.onComplete != null, null, { timeout: 200_000, polling: 50 });
            const res = await page.evaluate(() => {
                const L = (window as any).__load__;
                const nav = performance.getEntriesByType('navigation')[0] as any;
                const res = performance.getEntriesByType('resource') as any[];
                let rows = res.map(e => ({
                    name: e.name.replace(location.origin + '/', ''),
                    type: (e.name.match(/\.(\w+)(\?|$)/) || [])[1] || 'other',
                    bytes: e.encodedBodySize || e.transferSize || 0,
                    start: Math.round(e.startTime), dur: Math.round(e.duration), end: Math.round(e.responseEnd),
                }));
                const ext = rows.filter(r => !/^assets\//.test(r.name));
                rows = rows.filter(r => /^assets\//.test(r.name));
                return { L, rows, ext, domContentLoaded: nav.domContentLoadedEventEnd, loadEvent: nav.loadEventEnd };
            });
            await ctx.close();
            const L = res.L;
            runs.push({
                wallMs: Date.now() - t0,
                onComplete: Math.round(L.onComplete),
                imagesDone: Math.round(L.firstImagesDone ?? -1),
                sfxDone: Math.round(L.sfxAllDone ?? -1),
                bgmDone: Math.round(L.bgmAllDone ?? -1), titleBgmDone: Math.round(L.titleBgm ?? -1),
                counts: L.counts, total: L.total, nImg: L.nImg, nBgm: L.nBgm, nSfx: L.nSfx,
                domContentLoaded: Math.round(res.domContentLoaded), loadEvent: Math.round(res.loadEvent),
                rows: res.rows, ext: res.ext, loadStart: Math.round(L.loadStart ?? -1),
            });
        }
        saveJson(`load-${label}${SUFFIX}.json`, runs);
    });
}
