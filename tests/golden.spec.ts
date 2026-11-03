import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { waitForGame, startBattle } from './helpers';

const GOLDEN_DIR = path.join(__dirname, 'golden');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

interface Case { name: string; seed: number; p: number; c: number; skills: boolean; difficulty?: string }

const CASES: Case[] = [
    { name: 's101-p0c1-skills-normal', seed: 101, p: 0, c: 1, skills: true, difficulty: 'normal' },
    { name: 's102-p2c3-skills-normal', seed: 102, p: 2, c: 3, skills: true, difficulty: 'normal' },
    { name: 's103-p4c5-skills-normal', seed: 103, p: 4, c: 5, skills: true, difficulty: 'normal' },
    { name: 's104-p6c0-skills-normal', seed: 104, p: 6, c: 0, skills: true, difficulty: 'normal' },
    { name: 's105-p0c1-noskills-normal', seed: 105, p: 0, c: 1, skills: false, difficulty: 'normal' },
    { name: 's106-p3c2-noskills-normal', seed: 106, p: 3, c: 2, skills: false, difficulty: 'normal' },
    { name: 's107-p1c6-skills-hard', seed: 107, p: 1, c: 6, skills: true, difficulty: 'hard' },
    { name: 's108-p5c4-noskills-easy', seed: 108, p: 5, c: 4, skills: false, difficulty: 'easy' },
];

async function play(page: any, c: Case) {
    await page.goto('/');
    await waitForGame(page);
    await startBattle(page, { seed: c.seed, playerIndex: c.p, cpuIndex: c.c, skills: c.skills, difficulty: c.difficulty, randomFirst: true });
    return page.evaluate(() => {
        const g = (0, eval)('Game');
        const e = (0, eval)('BattleEngine');
        e.matchWinner = null;
        const roundHashes: Record<string, number> = {};
        let lastRound = -1;
        let n = 0;
        while (!e.matchWinner && n < 400000) {
            g.update(1);
            if (e.currentRound !== lastRound) {
                lastRound = e.currentRound;
                roundHashes['r' + lastRound] = e.stateHash();
            }
            const s = g.currentScene;
            if (s && s.confirmData && s.confirmData.onYes) { const d = s.confirmData; s.confirmData = null; d.onYes(); }
            if ((e.currentState === e.STATE_WIN || e.currentState === e.STATE_LOSE) && e.stateTimer > 170) e.confirmResult();
            else if (e.currentState === e.STATE_NAGARI && e.stateTimer > 90) e.confirmResult();
            n++;
        }
        return {
            result: { winner: e.matchWinner, hp: [e.p1.hp, e.cpu.hp], rounds: e.currentRound, finalHash: e.stateHash() },
            roundHashes,
            actionLog: JSON.parse(JSON.stringify(e.actionLog)),
        };
    });
}

function firstDiff(expected: any, actual: any): string {
    const ea: any[] = expected.actionLog, aa: any[] = actual.actionLog;
    const n = Math.max(ea.length, aa.length);
    for (let i = 0; i < n; i++) {
        if (JSON.stringify(ea[i]) !== JSON.stringify(aa[i])) {
            return `actionLog[${i}] (round ${(ea[i] || aa[i]).round}) 기대 ${JSON.stringify(ea[i])} / 실제 ${JSON.stringify(aa[i])}`;
        }
    }
    const rk = Array.from(new Set([...Object.keys(expected.roundHashes), ...Object.keys(actual.roundHashes)]));
    for (const k of rk) {
        if (expected.roundHashes[k] !== actual.roundHashes[k]) {
            return `stateHash ${k} 기대 ${expected.roundHashes[k]} / 실제 ${actual.roundHashes[k]}`;
        }
    }
    return `result 기대 ${JSON.stringify(expected.result)} / 실제 ${JSON.stringify(actual.result)}`;
}

test.describe('golden replay', () => {
    for (const c of CASES) {
        test(c.name, async ({ page }) => {
            test.setTimeout(240_000);
            const actual = await play(page, c);
            expect(actual.actionLog.length).toBeGreaterThan(10);
            expect(actual.result.winner).not.toBeNull();
            const file = path.join(GOLDEN_DIR, c.name + '.json');
            if (UPDATE) {
                fs.mkdirSync(GOLDEN_DIR, { recursive: true });
                fs.writeFileSync(file, JSON.stringify({ case: c, ...actual }, null, 1) + '\n');
                return;
            }
            expect(fs.existsSync(file), `${file} 없음 — UPDATE_GOLDEN=1 로 먼저 만든다`).toBe(true);
            const expected = JSON.parse(fs.readFileSync(file, 'utf8'));
            const same = JSON.stringify({ result: expected.result, roundHashes: expected.roundHashes, actionLog: expected.actionLog })
                === JSON.stringify(actual);
            expect(same, same ? '' : '처음 달라진 지점: ' + firstDiff(expected, actual)).toBe(true);
        });
    }
});
