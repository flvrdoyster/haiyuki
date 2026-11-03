import { test, expect } from '@playwright/test';
import { waitForGame, startBattle, playMatchOut } from './helpers';

const GAME_URL = '/';

async function snapshot(page: any, seed: number) {
    await startBattle(page, { seed, randomFirst: true, skills: true });
    await page.waitForFunction(() => (0, eval)('BattleEngine').deck.length > 0);
    return page.evaluate(() => {
        const e = (0, eval)('BattleEngine');
        return {
            seed: e.seed,
            deck: e.deck.map((t: any) => t.type + t.color),
            doras: e.doras.map((t: any) => t.type + t.color),
            uraDoras: e.uraDoras.map((t: any) => t.type + t.color),
            firstSeat: e.firstSeat,
            bg: e.bgPath,
        };
    });
}

async function playMatch(page: any, seed: number, p: number, c: number) {
    await page.goto(GAME_URL);
    await waitForGame(page);
    await startBattle(page, { seed, playerIndex: p, cpuIndex: c, randomFirst: true, skills: true });
    const m = await playMatchOut(page);
    return { winner: m.result.winner, hp: m.result.hp, log: JSON.stringify(m.actionLog), len: m.actionLog.length };
}

test.describe('determinism', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(GAME_URL);
        await waitForGame(page);
    });

    test('same seed gives same board, different seed differs', async ({ page }) => {
        const a = await snapshot(page, 12345);
        await page.goto(GAME_URL);
        await waitForGame(page);
        const b = await snapshot(page, 12345);
        await page.goto(GAME_URL);
        await waitForGame(page);
        const c = await snapshot(page, 54321);
        expect(a.seed).toBe(12345);
        expect(b).toEqual(a);
        expect(c.deck).not.toEqual(a.deck);
    });

    test('same seed plays out the same match', async ({ page }) => {
        test.setTimeout(240_000);
        const a = await playMatch(page, 777, 0, 1);
        const b = await playMatch(page, 777, 0, 1);
        expect(a.len).toBeGreaterThan(10);
        expect(a.winner).not.toBeNull();
        expect(b.log).toBe(a.log);
        expect(b.winner).toBe(a.winner);
        expect(b.hp).toEqual(a.hp);
        const c = await playMatch(page, 778, 0, 1);
        expect(c.log).not.toBe(a.log);
    });
});
