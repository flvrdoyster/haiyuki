import type { Page, CDPSession } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const OUT = path.join(__dirname, 'results');
export function saveJson(name: string, data: unknown) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));
}

export const NETWORKS: Record<string, { down: number; latency: number } | null> = {
    local: null,
    '10Mbps-40ms': { down: 10e6 / 8, latency: 40 },
    '4Mbps-100ms': { down: 4e6 / 8, latency: 100 },
};

export async function applyNetwork(cdp: CDPSession, cond: { down: number; latency: number } | null) {
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: cond ? cond.latency : 0,
        downloadThroughput: cond ? cond.down : -1,
        uploadThroughput: cond ? cond.down : -1,
    });
}

export function pct(sorted: number[], p: number) {
    if (!sorted.length) return 0;
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

export const DRIVER_SRC = `
(() => {
  if (window.__perf_driver__) return;
  window.__perf_driver__ = setInterval(() => {
    const e = window.BattleEngine;
    const g = (0, eval)('Game');
    if (!e || e.currentState === undefined) return;
    if (g.currentScene !== (0, eval)('BattleScene')) return;
    if (!g.isAutoTest) {
      if (e.currentState === e.STATE_PLAYER_TURN && e.timer > 20) { (0, eval)('AutoPlay').performTurn(e); return; }
      if (e.currentState === e.STATE_WAIT_FOR_DRAW && e.timer > 10) { e.confirmDraw(); return; }
    }
    if ((e.currentState === e.STATE_WIN || e.currentState === e.STATE_LOSE) && e.stateTimer > 170) { e.confirmResult(); return; }
    if (e.currentState === e.STATE_NAGARI && e.stateTimer > 90) { e.confirmResult(); return; }
    if (e.currentState === e.STATE_MATCH_OVER && e.stateTimer > 70) { e.proceedFromMatchOver(); }
  }, 80);
})();
`;

export const PROBE_SRC = `
(() => {
  const w = window;
  if (w.__probe__) return;
  const P = w.__probe__ = {
    frames: [], longtasks: [], drawPerFrame: [], getPerFrame: [], heap: [], scenes: [], slow100: [],
    _draw: 0, _get: 0, last: 0, t0: performance.now(), running: true, matches: 0,
  };
  const proto = CanvasRenderingContext2D.prototype;
  const od = proto.drawImage;
  proto.drawImage = function () { P._draw++; return od.apply(this, arguments); };
  const A = (0, eval)('Assets');
  const og = A.get;
  A.get = function (id) { P._get++; return og.call(this, id); };
  const G = (0, eval)('Game');
  const sceneName = () => {
    const s = G.currentScene;
    if (!s) return null;
    for (const n of ['LoadingScene','TitleScene','CharacterSelectScene','EncounterScene','BattleScene','EndingScene','ContinueScene','CreditsScene']) {
      try { if ((0, eval)(n) === s) return n; } catch (_) {}
    }
    return 'unknown';
  };
  const stateName = () => {
    try {
      const e = w.BattleEngine;
      if (!e || e.currentState === undefined) return null;
      for (const k of Object.keys(e)) if (k.indexOf('STATE_') === 0 && e[k] === e.currentState) return k;
    } catch (_) {}
    return null;
  };
  P.sceneName = sceneName; P.stateName = stateName;
  let prevScene = null;
  const tick = (now) => {
    if (!P.running) return;
    if (P.last) {
      const d = now - P.last;
      const sc = sceneName();
      const st = sc === 'BattleScene' ? stateName() : null;
      P.frames.push(d);
      P.drawPerFrame.push(P._draw); P.getPerFrame.push(P._get);
      if (d > 100) P.slow100.push({ t: Math.round(now - P.t0), dur: Math.round(d), scene: sc, prevScene, state: st, auto: G.isAutoTest });
      if (sc !== prevScene) { P.scenes.push({ t: Math.round(now - P.t0), scene: sc }); prevScene = sc; }
    }
    P._draw = 0; P._get = 0; P.last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver(l => { for (const e of l.getEntries()) P.longtasks.push({ start: Math.round(e.startTime - P.t0), dur: Math.round(e.duration), scene: sceneName(), state: sceneName()==='BattleScene'?stateName():null }); })
      .observe({ type: 'longtask', buffered: true });
  } catch (_) {}
})();
`;

export function summarize(frames: number[]) {
    const s = [...frames].sort((a, b) => a - b);
    const sum = frames.reduce((a, b) => a + b, 0);
    return {
        n: frames.length,
        mean: +(sum / Math.max(1, frames.length)).toFixed(2),
        p50: +pct(s, 0.5).toFixed(2), p95: +pct(s, 0.95).toFixed(2), p99: +pct(s, 0.99).toFixed(2),
        max: +(s[s.length - 1] ?? 0).toFixed(2),
        over33: frames.filter(x => x > 33.4).length,
        over50: frames.filter(x => x > 50).length,
        over100: frames.filter(x => x > 100).length,
    };
}

export async function heapUsed(cdp: CDPSession, gc = false) {
    if (gc) await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const m = await cdp.send('Performance.getMetrics');
    const v = m.metrics.find((x: any) => x.name === 'JSHeapUsedSize');
    return v ? v.value : 0;
}
