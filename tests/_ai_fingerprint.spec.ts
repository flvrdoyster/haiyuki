import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { waitForGame, startBattle, installAutoDriver, waitForMatchOver, stopHarness } from './helpers';

// Scratch: measure each CPU character's actual in-match behavior fingerprint —
// pon rate, riichi turn, win-type mix, deal-in rate, average win score, dora
// count and hand color-purity at win — to check whether aiProfile axes
// (colorBias/greed/defense/speed/value) actually produce distinguishable play,
// per IMPROVE.md §1 잔여 항목 ①.
//
// P1 is always index 0 and always auto-played via AILogic.decideDiscard(hand,
// 0.7, null, ctx) — a fixed neutral baseline regardless of id (battleEngine.js
// never assigns p1.aiProfile). So only the CPU side carries personality; P1's
// index only fixes which tile-color family P1 plays, held constant throughout.
//
// Data source: BattleEngine already logs everything we need per round —
//   [Pon] SIDE: color type
//   [Round] SIDE WIN — TSUMO|RON · yaku · score dmg
//   [Round] NAGARI — ...
// Riichi/dora/color-purity have no console line, so a light in-page poll (like
// helpers.installMonitor) tracks cpu.isRiichi flips (turn) and, on the
// STATE_LOSE transition (= CPU won this round per battleSequencer.js:129),
// snapshots cpu.hand+openSets to compute dora count (mirrors
// yakuLogic.calculateBonuses' countDoras) and color purity (max-color-share).
//
// Results are written to fingerprint-results.json next to this file (not just
// console) so a long background run can be read back without re-parsing logs.
//
// Run: npx playwright test --config measure.config.ts _ai_fingerprint
//   MPC=<matches to add per character this run> (default 10)
//   CHARS=smash,mayu  (subset)   SKILLS=0 (skills off; default on)   DIFF=easy|normal|hard (default normal)
//   RESET=1 (discard accumulated state)   PORT=12802 (server port, see measure.config.ts)
// State accumulates in fingerprint-state.<commit>.skills<0|1>.<diff>.json (one file per condition), one write per
// match, so a run can be short and repeated; fingerprint-results.json is rebuilt from the state each run.

const CHAR_IDS = ['ataho', 'rinxiang', 'fari', 'smash', 'petum', 'yuri', 'mayu'];
const PLAYER_INDEX = 0; // fixed neutral P1 opponent (profile-irrelevant, see above)
const MATCHES_PER_CHAR = +(process.env.MPC || 10);
const SKILLS = process.env.SKILLS !== '0';
const DIFFICULTY = process.env.DIFF || 'normal';
const COMMIT = execSync('git rev-parse --short HEAD', { cwd: path.join(__dirname, '..', '..') }).toString().trim();
const STATE_KEY = `${COMMIT}|skills=${SKILLS ? 1 : 0}|diff=${DIFFICULTY}`;
const STATE_PATH = path.join(__dirname, `fingerprint-state.${COMMIT}.skills${SKILLS ? 1 : 0}.${DIFFICULTY}.json`);

type CharState = RoundStat & { matches: number; riichiTurns: number[]; winHands: { dora: number; purity: number | null }[]; mpEnd: { r: number; mp: number }[] };

function loadState(): { key: string; chars: Record<string, CharState> } {
    if (!process.env.RESET && fs.existsSync(STATE_PATH)) {
        const st = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
        if (st.key === STATE_KEY) return st;
    }
    return { key: STATE_KEY, chars: {} };
}

function emptyChar(): CharState {
    return {
        rounds: 0, cpuWins: 0, cpuTsumo: 0, cpuRon: 0,
        p1Wins: 0, p1Tsumo: 0, p1Ron: 0, nagari: 0,
        ponP1: 0, ponCpu: 0, winScores: [], exchEvents: 0, exchTiles: 0,
        matches: 0, riichiTurns: [], winHands: [], mpEnd: [],
    };
}

interface RoundStat {
    rounds: number;
    cpuWins: number; cpuTsumo: number; cpuRon: number;
    p1Wins: number; p1Tsumo: number; p1Ron: number; // p1Ron = CPU dealt in
    nagari: number;
    ponP1: number; ponCpu: number;
    winScores: number[];
    exchEvents: number; exchTiles: number;
}

async function installPoll(page: any) {
    await page.evaluate(() => {
        (window as any).__fpRiichi__ = [];
        (window as any).__fpWinHands__ = []; // { dora, purity } for CPU wins
        (window as any).__fpPrevRiichi__ = false;
        (window as any).__fpPrevState__ = null;
        (window as any).__fpMp__ = [];
        (window as any).__fpPrevRound__ = null;
        (window as any).__fpLastMp__ = null;
        (window as any).__fpInterval__ = setInterval(() => {
            const e = (window as any).BattleEngine;
            if (!e || !e.cpu) return;

            if ((window as any).__fpPrevRound__ !== null && e.currentRound !== (window as any).__fpPrevRound__) {
                (window as any).__fpMp__.push({ r: (window as any).__fpPrevRound__, mp: (window as any).__fpLastMp__ });
            }
            (window as any).__fpPrevRound__ = e.currentRound;
            (window as any).__fpLastMp__ = e.cpu.mp;

            if (e.cpu.isRiichi && !(window as any).__fpPrevRiichi__) {
                (window as any).__fpRiichi__.push(e.turnCount);
            }
            (window as any).__fpPrevRiichi__ = e.cpu.isRiichi;

            // STATE_LOSE = CPU won this round (battleSequencer.js sets STATE_WIN
            // for P1 win, STATE_LOSE for CPU win). Capture once on the transition.
            if (e.currentState === e.STATE_LOSE && (window as any).__fpPrevState__ !== e.STATE_LOSE) {
                const closed = e.cpu.hand || [];
                const open = (e.cpu.openSets || []).flatMap((s: any) => s.tiles || []);
                const full = [...closed, ...open];

                const doraSrc = [...(e.doras || [])];
                if (e.cpu.isRiichi) doraSrc.push(...(e.uraDoras || []));
                let doraCount = 0;
                doraSrc.forEach((d: any) => full.forEach((t: any) => {
                    if (t.type === d.type && t.color === d.color) doraCount++;
                }));

                const colorCounts: Record<string, number> = {};
                full.forEach((t: any) => { colorCounts[t.color] = (colorCounts[t.color] || 0) + 1; });
                const maxColor = Math.max(0, ...Object.values(colorCounts));
                const purity = full.length > 0 ? maxColor / full.length : null;

                (window as any).__fpWinHands__.push({ dora: doraCount, purity });
            }
            (window as any).__fpPrevState__ = e.currentState;
        }, 40);
    });
}

async function drainPoll(page: any): Promise<{ riichiTurns: number[]; winHands: { dora: number; purity: number }[]; mpEnd: { r: number; mp: number }[] }> {
    return page.evaluate(() => {
        const mpEnd = (window as any).__fpMp__ || [];
        (window as any).__fpMp__ = [];
        const riichiTurns = (window as any).__fpRiichi__ || [];
        const winHands = (window as any).__fpWinHands__ || [];
        (window as any).__fpRiichi__ = [];
        (window as any).__fpWinHands__ = [];
        return { riichiTurns, winHands, mpEnd };
    });
}

test('AI 캐릭터 행동 지문 측정', async ({ page }) => {
    test.setTimeout(120 * 60 * 1000);

    await page.goto('/');
    await waitForGame(page);
    await installPoll(page);

    const state = loadState();
    const save = () => fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

    for (let cpuIndex = 0; cpuIndex < CHAR_IDS.length; cpuIndex++) {
        const id = CHAR_IDS[cpuIndex];
        if (process.env.CHARS && !process.env.CHARS.split(',').includes(id)) continue;
        const stat = state.chars[id] || (state.chars[id] = emptyChar());

        let buf: string[] = [];
        const onConsole = (msg: any) => buf.push(msg.text());
        page.on('console', onConsole);

        for (let m = 0; m < MATCHES_PER_CHAR; m++) {
            await startBattle(page, { playerIndex: PLAYER_INDEX, cpuIndex, autoTest: true, skills: SKILLS, difficulty: DIFFICULTY });
            await installAutoDriver(page);
            await waitForMatchOver(page);

            for (const line of buf) {
                let mm: RegExpMatchArray | null;
                if ((mm = line.match(/^\[Exchange\] CPU: (\d+)장/))) {
                    stat.exchEvents++; stat.exchTiles += parseInt(mm[1], 10);
                } else if ((mm = line.match(/^\[Pon\] (P1|CPU):/))) {
                    if (mm[1] === 'P1') stat.ponP1++; else stat.ponCpu++;
                } else if ((mm = line.match(/^\[Round\] (P1|CPU) WIN — (TSUMO|RON) · .+ · (\d+) dmg/))) {
                    const who = mm[1], type = mm[2], score = parseInt(mm[3], 10);
                    stat.rounds++;
                    if (who === 'CPU') {
                        stat.cpuWins++;
                        if (type === 'TSUMO') stat.cpuTsumo++; else stat.cpuRon++;
                        stat.winScores.push(score);
                    } else {
                        stat.p1Wins++;
                        if (type === 'TSUMO') stat.p1Tsumo++; else stat.p1Ron++; // p1Ron = CPU discarded the winning tile
                    }
                } else if (/^\[Round\] NAGARI —/.test(line)) {
                    stat.rounds++;
                    stat.nagari++;
                }
            }
            buf = [];
            const { riichiTurns, winHands, mpEnd } = await drainPoll(page);
            stat.riichiTurns.push(...riichiTurns);
            stat.winHands.push(...winHands);
            stat.mpEnd.push(...mpEnd);
            stat.matches++;
            save();
        }

        page.off('console', onConsole);
    }

    await stopHarness(page);

    const pct = (a: number, b: number) => b > 0 ? +(100 * a / b).toFixed(1) : 0;
    const avg = (arr: number[]) => arr.length > 0 ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;

    const report: Record<string, any> = { _key: STATE_KEY };
    for (const id of CHAR_IDS) {
        const s = state.chars[id];
        if (!s) continue;
        const doras = s.winHands.map(w => w.dora);
        const purities = s.winHands.map(w => w.purity).filter((p): p is number => p !== null);
        report[id] = {
            matches: s.matches,
            rounds: s.rounds,
            cpuWinRate: pct(s.cpuWins, s.rounds),
            cpuTsumoShare: pct(s.cpuTsumo, s.cpuWins),
            cpuRonShare: pct(s.cpuRon, s.cpuWins),
            dealInRate: pct(s.p1Ron, s.rounds), // CPU discarded the tile P1 ron'd
            nagariRate: pct(s.nagari, s.rounds),
            ponRate: pct(s.ponCpu, s.rounds),
            avgWinScore: avg(s.winScores),
            avgRiichiTurn: avg(s.riichiTurns),
            exchPerRound: +(s.exchTiles / Math.max(1, s.rounds)).toFixed(2),
            exchUsePct: pct(s.exchEvents, s.rounds),
            mpEndR1: avg(s.mpEnd.filter(x => x.r === 1).map(x => x.mp)),
            mpEndR2: avg(s.mpEnd.filter(x => x.r === 2).map(x => x.mp)),
            mpEndR3plus: avg(s.mpEnd.filter(x => x.r >= 3).map(x => x.mp)),
            riichiCount: s.riichiTurns.length,
            avgDoraInWin: avg(doras),
            avgColorPurityInWin: avg(purities),
        };
    }

    const outPath = path.join(__dirname, 'fingerprint-results.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log('AI_FINGERPRINT_DONE -> ' + outPath);
});
