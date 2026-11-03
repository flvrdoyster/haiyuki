import { test } from '@playwright/test';

// Scratch: estimate CPU discard mistake frequency vs skill — ANALYTIC.
// For each (developed mid-game) hand we score the discards once, then read off the
// softmax mistake probability P(not-best) = 1 − (mass on top score)/sum, where
// T = spread × (1−skill) × MISTAKE_TEMP. Split tenpai vs building (sharper vs flatter).
test('AI mistake rate by skill', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
        try { return typeof (0, eval)('AILogic') === 'object' && typeof (0, eval)('PaiData') === 'object'; }
        catch (e) { return false; }
    });

    const out = await page.evaluate(() => {
        const AILogic = (0, eval)('AILogic');
        const YakuLogic = (0, eval)('YakuLogic');
        const PaiData = (0, eval)('PaiData');
        const profile = AILogic.DEFAULT_PROFILE;
        const ctx = { discards: [], opponentRiichi: false, doras: [], charId: 'ataho' };
        const T = PaiData.TYPES;
        const randTile = () => { const t = T[Math.floor(Math.random() * T.length)]; return { type: t.id, color: t.color, img: t.img }; };

        function dealHand() { const h: any[] = []; for (let i = 0; i < 12; i++) h.push(randTile()); return h; }
        // play a few greedy turns to reach a realistic mid-game shape
        function develop(hand: any[], cycles: number) {
            let h = [...hand];
            for (let c = 0; c < cycles; c++) {
                const idx = AILogic.decideDiscard([...h], 1.0, profile, ctx);
                h.splice(idx, 1); h.push(randTile());
            }
            return h;
        }

        const skills = [0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];
        const M = 150, CYCLES = 8;
        const MT = AILogic.MISTAKE_TEMP;

        const acc: any = {}; skills.forEach(s => acc[s] = { all: 0, tenpai: 0, build: 0 });
        let nTenpai = 0, nBuild = 0;

        for (let m = 0; m < M; m++) {
            const hand = develop(dealHand(), CYCLES);
            const cands = AILogic.scoreDiscards(hand, profile, ctx).slice().sort((a: any, b: any) => b.score - a.score);
            const top = cands[0].score;
            const spread = (top - cands[cands.length - 1].score) || 1;
            const best = [...hand]; best.splice(cands[0].index, 1);
            const isTenpai = YakuLogic.checkTenpai(best);
            if (isTenpai) nTenpai++; else nBuild++;

            for (const s of skills) {
                const t = spread * (1 - s) * MT;
                let pMis = 0;
                if (t >= 1e-6) {
                    let sum = 0, topMass = 0;
                    for (const c of cands) { const w = Math.exp((c.score - top) / t); sum += w; if (c.score === top) topMass += w; }
                    pMis = 1 - topMass / sum;
                }
                acc[s].all += pMis;
                if (isTenpai) acc[s].tenpai += pMis; else acc[s].build += pMis;
            }
        }

        const pct = (x: number, n: number) => n > 0 ? +(100 * x / n).toFixed(1) : 0;
        const table: any = { _hands: M, _tenpaiPct: pct(nTenpai, M) };
        for (const s of skills) table[s] = { all: pct(acc[s].all, M), tenpai: pct(acc[s].tenpai, nTenpai), build: pct(acc[s].build, nBuild) };
        return table;
    });

    console.log('MISTAKE_RATE ' + JSON.stringify(out, null, 0));
});
