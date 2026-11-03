import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { waitForGame, startBattle } from '../helpers';
import { DRIVER_SRC, PROBE_SRC, saveJson } from './util';

for (const auto of [false, true]) {
    test(`trace 20s ${auto ? 'auto' : 'real'}`, async ({ page }) => {
        test.setTimeout(120_000);
        const cdp = await page.context().newCDPSession(page);
        await page.goto('/index.html');
        await waitForGame(page);
        await page.evaluate(PROBE_SRC);
        await startBattle(page, { playerIndex: 0, cpuIndex: 1, autoTest: auto });
        await page.evaluate(DRIVER_SRC);
        await page.waitForTimeout(2000);

        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
        await cdp.send('Profiler.start');
        const events: any[] = [];
        cdp.on('Tracing.dataCollected', (e: any) => events.push(...e.value));
        const done = new Promise<void>(r => cdp.on('Tracing.tracingComplete', () => r()));
        await cdp.send('Tracing.start', {
            transferMode: 'ReportEvents',
            traceConfig: { includedCategories: ['devtools.timeline', 'v8.execute', 'blink.user_timing', 'disabled-by-default-devtools.timeline.frame'] },
        });
        await page.waitForTimeout(20_000);
        await cdp.send('Tracing.end');
        await done;
        const { profile } = await cdp.send('Profiler.stop');

        if (!auto) fs.writeFileSync(path.join(__dirname, 'trace.json'), JSON.stringify({ traceEvents: events }));

        const nodes = new Map<number, any>();
        for (const n of profile.nodes) nodes.set(n.id, n);
        const self = new Map<string, { ms: number; name: string; url: string; line: number }>();
        const total = profile.timeDeltas.reduce((a: number, b: number) => a + b, 0);
        profile.samples.forEach((id: number, i: number) => {
            const cf = nodes.get(id).callFrame;
            const key = `${cf.functionName}|${cf.url}|${cf.lineNumber}`;
            const dt = (profile.timeDeltas[i + 1] ?? profile.timeDeltas[i]) / 1000;
            const cur = self.get(key) ?? { ms: 0, name: cf.functionName || '(anonymous)', url: cf.url.replace(/^.*localhost:3000\//, ''), line: cf.lineNumber + 1 };
            cur.ms += dt; self.set(key, cur);
        });
        const top = [...self.values()].sort((a, b) => b.ms - a.ms).slice(0, 25).map(x => ({ ...x, ms: Math.round(x.ms), pct: +(100 * x.ms * 1000 / total).toFixed(1) }));
        saveJson(`trace-top-${auto ? 'auto' : 'real'}.json`, { totalMs: Math.round(total / 1000), top });

        const evCount = new Map<string, number>(), evDur = new Map<string, number>();
        for (const e of events) if (e.ph === 'X' && e.dur) { evDur.set(e.name, (evDur.get(e.name) ?? 0) + e.dur / 1000); evCount.set(e.name, (evCount.get(e.name) ?? 0) + 1); }
        const cats = [...evDur.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([n, d]) => ({ name: n, ms: Math.round(d), count: evCount.get(n) }));
        saveJson(`trace-events-${auto ? 'auto' : 'real'}.json`, cats);
    });
}
