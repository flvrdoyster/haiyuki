import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { waitForGame, startBattle, playMatchOut } from './helpers';

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
    { name: 's1014-p0c3-skills-normal', seed: 1014, p: 0, c: 3, skills: true, difficulty: 'normal' },
    { name: 's1097-p6c4-skills-normal', seed: 1097, p: 6, c: 4, skills: true, difficulty: 'normal' },
    { name: 's1109-p4c0-skills-normal', seed: 1109, p: 4, c: 0, skills: true, difficulty: 'normal' },
    { name: 's1017-p3c5-skills-normal', seed: 1017, p: 3, c: 5, skills: true, difficulty: 'normal' },
    { name: 's1036-p1c2-skills-easy', seed: 1036, p: 1, c: 2, skills: true, difficulty: 'easy' },
    { name: 's1120-p1c0-skills-easy', seed: 1120, p: 1, c: 0, skills: true, difficulty: 'easy' },
    { name: 's1096-p5c1-skills-easy', seed: 1096, p: 5, c: 1, skills: true, difficulty: 'easy' },
    { name: 's1092-p1c3-skills-easy', seed: 1092, p: 1, c: 3, skills: true, difficulty: 'easy' },
    { name: 's1001-p1c4-skills-normal', seed: 1001, p: 1, c: 4, skills: true, difficulty: 'normal' },
    { name: 's1137-p4c4-skills-normal', seed: 1137, p: 4, c: 4, skills: true, difficulty: 'normal' },
    { name: 's1016-p2c2-skills-easy', seed: 1016, p: 2, c: 2, skills: true, difficulty: 'easy' },
    { name: 's1032-p4c3-skills-easy', seed: 1032, p: 4, c: 3, skills: true, difficulty: 'easy' },
    { name: 's1069-p6c0-skills-normal', seed: 1069, p: 6, c: 0, skills: true, difficulty: 'normal' },
    { name: 's1075-p5c5-skills-hard', seed: 1075, p: 5, c: 5, skills: true, difficulty: 'hard' },
    { name: 's1008-p1c5-skills-easy', seed: 1008, p: 1, c: 5, skills: true, difficulty: 'easy' },
    { name: 's1060-p4c0-skills-easy', seed: 1060, p: 4, c: 0, skills: true, difficulty: 'easy' },
    { name: 's1136-p3c1-skills-easy', seed: 1136, p: 3, c: 1, skills: true, difficulty: 'easy' },
    { name: 's1035-p0c6-skills-hard', seed: 1035, p: 0, c: 6, skills: true, difficulty: 'hard' },
    { name: 's1019-p5c4-skills-hard', seed: 1019, p: 5, c: 4, skills: true, difficulty: 'hard' },
    { name: 's1127-p1c1-skills-hard', seed: 1127, p: 1, c: 1, skills: true, difficulty: 'hard' },
    { name: 's1024-p3c6-skills-easy', seed: 1024, p: 3, c: 6, skills: true, difficulty: 'easy' },
    { name: 's1044-p2c6-skills-easy', seed: 1044, p: 2, c: 6, skills: true, difficulty: 'easy' },
];

async function play(page: any, c: Case) {
    await page.goto('/');
    await waitForGame(page);
    await startBattle(page, { seed: c.seed, playerIndex: c.p, cpuIndex: c.c, skills: c.skills, difficulty: c.difficulty, randomFirst: true });
    return playMatchOut(page);
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

function updateSummary(file: string, actual: any): string {
    if (!fs.existsSync(file)) return '신규';
    const expected = JSON.parse(fs.readFileSync(file, 'utf8'));
    const ea: any[] = expected.actionLog, aa: any[] = actual.actionLog;
    let changed = 0, first = -1;
    for (let i = 0; i < Math.max(ea.length, aa.length); i++) {
        if (JSON.stringify(ea[i]) !== JSON.stringify(aa[i])) {
            changed++;
            if (first < 0) first = i;
        }
    }
    const hashes = Object.keys({ ...expected.roundHashes, ...actual.roundHashes }).filter(k => expected.roundHashes[k] !== actual.roundHashes[k]);
    if (!changed && !hashes.length && JSON.stringify(expected.result) === JSON.stringify(actual.result)) return '변경 없음';
    const at = first >= 0 ? `첫 차이 actionLog[${first}] (round ${(ea[first] || aa[first]).round})` : '행동 기록 동일';
    return `${at}, 달라진 항목 ${changed}개(${ea.length}→${aa.length}), 달라진 라운드 해시 ${hashes.length}개`;
}

test.describe('골든 리플레이', () => {
    for (const c of CASES) {
        test(c.name, async ({ page }) => {
            test.setTimeout(240_000);
            const actual = await play(page, c);
            expect(actual.actionLog.length).toBeGreaterThan(10);
            expect(actual.result.winner).not.toBeNull();
            const file = path.join(GOLDEN_DIR, c.name + '.json');
            if (UPDATE) {
                fs.mkdirSync(GOLDEN_DIR, { recursive: true });
                console.log(`[golden] ${c.name}: ${updateSummary(file, actual)}`);
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

async function boardSnapshot(page: any, seed: number) {
    await startBattle(page, { seed, randomFirst: true, skills: true });
    await page.waitForFunction(() => (0, eval)('BattleEngine').deck.length > 0);
    return page.evaluate(() => {
        const e = (0, eval)('BattleEngine');
        return {
            seed: e.seed,
            deck: e.deck.map((t: any) => t.type + t.color),
        };
    });
}

test.describe('시드', () => {
    test('시드가 다르면 덱이 다르다', async ({ page }) => {
        await page.goto('/');
        await waitForGame(page);
        const a = await boardSnapshot(page, 12345);
        await page.goto('/');
        await waitForGame(page);
        const b = await boardSnapshot(page, 54321);
        expect(a.seed).toBe(12345);
        expect(b.seed).toBe(54321);
        expect(b.deck).not.toEqual(a.deck);
    });

    test('시드가 다르면 다른 판이 진행된다', async ({ page }) => {
        test.setTimeout(240_000);
        const a = await play(page, { name: 'a', seed: 777, p: 0, c: 1, skills: true });
        const b = await play(page, { name: 'b', seed: 778, p: 0, c: 1, skills: true });
        expect(a.actionLog.length).toBeGreaterThan(10);
        expect(a.result.winner).not.toBeNull();
        expect(JSON.stringify(b.actionLog)).not.toBe(JSON.stringify(a.actionLog));
    });
});
