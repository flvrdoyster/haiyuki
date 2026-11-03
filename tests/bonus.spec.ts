import { test, expect } from '@playwright/test';
import {
    waitForGame,
    startBattle,
    waitForAnyState,
    stopHarness,
    getSnap,
} from './helpers';

const GAME_URL = '/';

test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await waitForGame(page);
});

test.afterEach(async ({ page }) => {
    await stopHarness(page);
});

// ============================================================================
// Special Bonus 검증 (§9)
//
// BattleEngine.calculateBonuses(hand, winType, isRiichi) 를 직접 호출.
// 도라/우라도라를 비워 보너스만 독립적으로 검증한다.
// ============================================================================

test.describe('Special Bonus 검증 (텐호 / 해저 / 하저)', () => {

    async function getBonusResult(
        page: Parameters<typeof getSnap>[0],
        discardCount: number,
        winType: 'TSUMO' | 'RON',
        isRiichi = false,
        winner: 'P1' | 'CPU' = 'P1',
        winnerFirst = true
    ) {
        return page.evaluate(
            ({ discardCount, winType, isRiichi, winner, winnerFirst }) => {
                const e = (window as any).BattleEngine;
                const mk = (t: string, c: string) => ({ type: t, color: c, img: '' });
                e.firstSeat = winnerFirst ? e.seatOf(winner) : 1 - e.seatOf(winner);
                e.discards = Array.from({ length: discardCount }, () => mk('rin', 'red'));
                e.doras    = [];
                e.uraDoras = [];
                // 더미 12패 (calculateBonuses는 도라 매칭 외에 패 구성 무관)
                const hand = Array.from({ length: 12 }, () => mk('ataho', 'red'));
                return e.calculateBonuses(hand, winType, isRiichi, winner);
            },
            { discardCount, winType, isRiichi, winner, winnerFirst }
        );
    }

    test('텐호: 버림 0회 쯔모 → +800pt 보너스', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const result = await getBonusResult(page, 0, 'TSUMO');
        expect(result.score).toBe(800);
        expect(result.names).toContain('텐호 보너스');
    });

    test('치호·렌호: 버림 1회(후공 첫 뽑기) 쯔모 → +800pt, 론 → +400pt', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const tsumo = await getBonusResult(page, 1, 'TSUMO');
        expect(tsumo.score).toBe(800);
        expect(tsumo.names).toContain('치호 보너스');
        const ron = await getBonusResult(page, 1, 'RON');
        expect(ron.score).toBe(400);
        expect(ron.names).toContain('렌호 보너스');
    });

    test('해저(Haitei): 버림 39회 쯔모 → +800pt 보너스', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const result = await getBonusResult(page, 39, 'TSUMO');
        expect(result.score).toBe(800);
        expect(result.names).toContain('해저 보너스');
    });

    test('하저(Houtei): 버림 40회 론 → +800pt 보너스', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const result = await getBonusResult(page, 40, 'RON');
        expect(result.score).toBe(800);
        expect(result.names).toContain('하저 보너스');
    });

    test('해저: 선공 승자는 버림 38회(자기 20번째 뽑기) 쯔모 → +800, 후공 승자는 38회 쯔모 없음 (P1·CPU 무관)', async ({ page }) => {
        for (const winner of ['P1', 'CPU'] as const) {
            const first = await getBonusResult(page, 38, 'TSUMO', false, winner, true);
            expect(first.score).toBe(800);
            expect(first.names).toContain('해저 보너스');
            const second = await getBonusResult(page, 38, 'TSUMO', false, winner, false);
            expect(second.score).toBe(0);
            expect((await getBonusResult(page, 39, 'TSUMO', false, winner, false)).score).toBe(800);
        }
    });

    test('하저: 후공 승자가 선공의 20번째 버림패(39회) 론 → +800, 선공 승자는 40회부터 (P1·CPU 무관)', async ({ page }) => {
        for (const winner of ['P1', 'CPU'] as const) {
            const second = await getBonusResult(page, 39, 'RON', false, winner, false);
            expect(second.score).toBe(800);
            expect(second.names).toContain('하저 보너스');
            expect((await getBonusResult(page, 39, 'RON', false, winner, true)).score).toBe(0);
            expect((await getBonusResult(page, 40, 'RON', false, winner, true)).score).toBe(800);
        }
    });

    test('중간(버림 20회) 쯔모 → 보너스 없음 (0pt)', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const result = await getBonusResult(page, 20, 'TSUMO');
        expect(result.score).toBe(0);
    });

    test('버림 39회 론 → 보너스 없음 (0pt)', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const result = await getBonusResult(page, 39, 'RON');
        expect(result.score).toBe(0);
    });
});
