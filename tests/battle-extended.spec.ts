/**
 * 환세패유기 확장 테스트
 *
 * C-1. Yaku 단위 검증    — YakuLogic.checkYaku 직접 호출 (역 종류별 핸드 → 점수 매핑)
 * C-2. Special Bonus     — 텐호(1턴 쯔모) / 해저(20턴 쯔모) / 하저(20턴 론) 각 +800pt
 * C-3. 멀티 라운드 불변성 — 라운드 카운터 단조 증가, 라운드 간 HP 감소 방향 확인
 * C-4. SPIRIT_RIICHI 중복 방지 — spiritTimer > 0 이면 canUseSkill = false (Fix 검증)
 * C-5. LAST_CHANCE 룰렛  — 이기는/지는 패 결과, activateLastChance → STATE_ROULETTE
 */

import { test, expect } from '@playwright/test';
import {
    waitForGame,
    startBattle,
    waitForAnyState,
    waitForMatchOver,
    installAutoDriver,
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
// C-1. Yaku 단위 검증
//
// YakuLogic.checkYaku(hand, charId) — hand.length === 12 이 필수 조건.
// 게임 상태와 무관하게 브라우저 내 전역 객체를 직접 호출한다.
// ============================================================================

test.describe('C-1. Yaku 단위 검증', () => {

    test('SAM_DO_RIP: 4종 트리플렛 → 점수 2400', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // ataho(red)×3 + smash(blue)×3 + yuri(blue)×3 + pet(yellow)×3
            // 무기 없음 → 상위 역 불성립 → SAM_DO_RIP
            const hand = [
                ...Array(3).fill(null).map(() => mk('ataho', 'red')),
                ...Array(3).fill(null).map(() => mk('smash', 'blue')),
                ...Array(3).fill(null).map(() => mk('yuri', 'blue')),
                ...Array(3).fill(null).map(() => mk('pet', 'yellow')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(2400);
    });

    test('JANG_GI: 동색 캐릭터+무기 트리플렛 포함 4세트 → 점수 2800', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // red: ataho(char)×3 + punch(wep)×3 → 동색 캐릭+무기 성립
            // + yuri(blue char)×3 + pet(yellow char)×3 → 나머지 2세트
            const hand = [
                ...Array(3).fill(null).map(() => mk('ataho', 'red')),
                ...Array(3).fill(null).map(() => mk('punch', 'red')),
                ...Array(3).fill(null).map(() => mk('yuri', 'blue')),
                ...Array(3).fill(null).map(() => mk('pet', 'yellow')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(2800);
    });

    test('SAEK_HANA_SSIK: 4색 각 1트리플렛 → 점수 3200', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // red + blue + yellow + purple 각 3장 = 12패
            const hand = [
                ...Array(3).fill(null).map(() => mk('ataho', 'red')),
                ...Array(3).fill(null).map(() => mk('smash', 'blue')),
                ...Array(3).fill(null).map(() => mk('pet', 'yellow')),
                ...Array(3).fill(null).map(() => mk('mayu_purple', 'purple')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(3200);
    });

    test('COMBINATION: 동색 캐릭터 2+무기 1 트리플렛 + 임의 1세트 → 점수 4000', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // red: ataho(char)×3 + rin(char)×3 + punch(wep)×3 → COMBINATION
            // + smash(blue char)×3 as "임의 1세트"
            const hand = [
                ...Array(3).fill(null).map(() => mk('ataho', 'red')),
                ...Array(3).fill(null).map(() => mk('rin',   'red')),
                ...Array(3).fill(null).map(() => mk('punch', 'red')),
                ...Array(3).fill(null).map(() => mk('smash', 'blue')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(4000);
    });

    test('MAYU: 빨+노+파 마유 트리플렛 각 1 + 임의 1세트 → 점수 4800', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // 마유 3색 각 3장 + punch×3 (임의)
            const hand = [
                ...Array(3).fill(null).map(() => mk('mayu_red',    'red')),
                ...Array(3).fill(null).map(() => mk('mayu_yellow', 'yellow')),
                ...Array(3).fill(null).map(() => mk('mayu_blue',   'blue')),
                ...Array(3).fill(null).map(() => mk('punch',       'red')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(4800);
    });

    test('ALL_STARS: 6 캐릭터 페어 → 점수 2400', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // 6종 캐릭터 각 2장 = 12패
            const hand = [
                ...Array(2).fill(null).map(() => mk('ataho', 'red')),
                ...Array(2).fill(null).map(() => mk('rin',   'red')),
                ...Array(2).fill(null).map(() => mk('smash', 'blue')),
                ...Array(2).fill(null).map(() => mk('yuri',  'blue')),
                ...Array(2).fill(null).map(() => mk('pet',   'yellow')),
                ...Array(2).fill(null).map(() => mk('fari',  'yellow')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(2400);
    });

    test('SAM_YEON_GYEOK: 3색 각 캐릭터+무기 페어 → 점수 2000', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // red: ataho+punch / blue: smash+sword / yellow: pet+wand (각 2장)
            const hand = [
                ...Array(2).fill(null).map(() => mk('ataho', 'red')),
                ...Array(2).fill(null).map(() => mk('punch', 'red')),
                ...Array(2).fill(null).map(() => mk('smash', 'blue')),
                ...Array(2).fill(null).map(() => mk('sword', 'blue')),
                ...Array(2).fill(null).map(() => mk('pet',   'yellow')),
                ...Array(2).fill(null).map(() => mk('wand',  'yellow')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(2000);
    });

    test('Yaku 없음: 12장 전부 단장 → null 반환', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // 13종 중 12종 각 1장 → 역 없음
            const hand = [
                mk('ataho',       'red'),    mk('rin',         'red'),    mk('smash',       'blue'),
                mk('yuri',        'blue'),   mk('pet',         'yellow'), mk('fari',        'yellow'),
                mk('punch',       'red'),    mk('sword',       'blue'),   mk('wand',        'yellow'),
                mk('mayu_red',    'red'),    mk('mayu_blue',   'blue'),   mk('mayu_yellow', 'yellow'),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).toBeNull();
    });
});

// ============================================================================
// C-2. Special Bonus 검증 (§9)
//
// BattleEngine.calculateBonuses(hand, winType, isRiichi) 를 직접 호출.
// 도라/우라도라를 비워 보너스만 독립적으로 검증한다.
// ============================================================================

test.describe('C-2. Special Bonus 검증 (텐호 / 해저 / 하저)', () => {

    async function getBonusResult(
        page: Parameters<typeof getSnap>[0],
        turn: number,
        winType: 'TSUMO' | 'RON',
        isRiichi = false
    ) {
        return page.evaluate(
            ({ turn, winType, isRiichi }) => {
                const e = (window as any).BattleEngine;
                e.turnCount = turn;
                e.doras    = [];
                e.uraDoras = [];
                // 더미 12패 (calculateBonuses는 도라 매칭 외에 패 구성 무관)
                const mk = (t: string, c: string) => ({ type: t, color: c, img: '' });
                const hand = Array.from({ length: 12 }, () => mk('ataho', 'red'));
                return e.calculateBonuses(hand, winType, isRiichi);
            },
            { turn, winType, isRiichi }
        );
    }

    test('§9 텐호: 1턴 쯔모 → +800pt 보너스', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const result = await getBonusResult(page, 1, 'TSUMO');
        expect(result.score).toBe(800);
        expect(result.names).toContain('텐호 보너스');
    });

    test('§9 해저(Haitei): 20턴 쯔모 → +800pt 보너스', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const result = await getBonusResult(page, 20, 'TSUMO');
        expect(result.score).toBe(800);
        expect(result.names).toContain('해저 보너스');
    });

    test('§9 하저(Houtei): 20턴 론 → +800pt 보너스', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const result = await getBonusResult(page, 20, 'RON');
        expect(result.score).toBe(800);
        expect(result.names).toContain('하저 보너스');
    });

    test('중간 턴(10턴) 쯔모 → 보너스 없음 (0pt)', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const result = await getBonusResult(page, 10, 'TSUMO');
        expect(result.score).toBe(0);
    });

    test('텐호 조건: 1턴이라도 론이면 미발동 → 0pt', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        // 텐호는 Tsumo 전용 (§9: "Winning by Tsumo on the very first turn")
        const result = await getBonusResult(page, 1, 'RON');
        expect(result.score).toBe(0);
    });
});

// ============================================================================
// C-3. 멀티 라운드 불변성
//
// 자동 플레이 전체 매치에서:
//   1. 라운드 카운터가 감소하지 않는지 확인
//   2. 라운드 전환 시 양측 HP가 이전보다 증가하지 않는지 확인 (스킬 비활성화 조건)
// ============================================================================

test.describe('C-3. 멀티 라운드 불변성', () => {

    test('라운드 카운터는 감소하지 않아야 한다', async ({ page }) => {
        await page.evaluate(() => {
            (window as any).__qa_prev_round__      = 0;
            (window as any).__qa_round_decreased__ = false;
            (window as any).__qa_round_monitor2__ = setInterval(() => {
                const h = (window as any).__haiyuki__;
                if (!h) return;
                const r = h.state.round;
                if (r < (window as any).__qa_prev_round__) {
                    (window as any).__qa_round_decreased__ = true;
                }
                if (r > (window as any).__qa_prev_round__) {
                    (window as any).__qa_prev_round__ = r;
                }
            }, 50);
        });

        await startBattle(page);          // autoTest=true, SKILLS_ENABLED=false
        await installAutoDriver(page);
        await waitForMatchOver(page);

        const decreased = await page.evaluate(() => (window as any).__qa_round_decreased__);
        expect(decreased, '라운드 카운터가 감소했음').toBe(false);
    });

    test('라운드 전환 시 HP는 증가하지 않아야 한다 (SKILLS_ENABLED=false 기준)', async ({ page }) => {
        // 각 라운드 시작(DEALING/WAIT_FOR_DRAW 진입) 시점의 HP를 기록해
        // 이전 라운드 대비 증가 여부를 확인한다.
        // RECOVERY 스킬이 비활성화된 상태이므로 HP 회복은 발생하지 않는다.
        await page.evaluate(() => {
            (window as any).__qa_hp_snapshots__ = [] as Array<{round: number; p1hp: number; cpuhp: number}>;
            (window as any).__qa_hp_prev_round__ = 0;
            (window as any).__qa_hp_monitor__ = setInterval(() => {
                const h = (window as any).__haiyuki__;
                if (!h) return;
                const { round } = h.state;
                const name = h.state.name;
                if ((name === 'DEALING' || name === 'WAIT_FOR_DRAW') &&
                    round > (window as any).__qa_hp_prev_round__) {
                    (window as any).__qa_hp_snapshots__.push({ round, p1hp: h.p1.hp, cpuhp: h.cpu.hp });
                    (window as any).__qa_hp_prev_round__ = round;
                }
            }, 50);
        });

        await startBattle(page);
        await installAutoDriver(page);
        await waitForMatchOver(page);

        const snaps: Array<{ round: number; p1hp: number; cpuhp: number }> = await page.evaluate(
            () => (window as any).__qa_hp_snapshots__ ?? []
        );

        for (let i = 1; i < snaps.length; i++) {
            const prev = snaps[i - 1];
            const curr = snaps[i];
            expect(curr.p1hp, `p1 HP가 라운드 ${prev.round}→${curr.round} 증가`).toBeLessThanOrEqual(prev.p1hp);
            expect(curr.cpuhp, `cpu HP가 라운드 ${prev.round}→${curr.round} 증가`).toBeLessThanOrEqual(prev.cpuhp);
        }
    });
});

// ============================================================================
// C-4. SPIRIT_RIICHI 중복 사용 방지
//
// battleEngine.js Fix 적용 결과를 검증한다.
// spiritTimer > 0(이미 기합 리치 활성) 상태에서 재사용을 canUseSkill이 차단하는지 확인.
// ============================================================================

test.describe('C-4. SPIRIT_RIICHI 중복 사용 방지', () => {

    // 공통: 텐파이 핸드 주입 + MP/스킬 세팅
    // canUseSkill 내부에서 hand[i]를 제거한 10패에 checkTenpai(11패 기대)를 호출하므로
    // PLAYER_TURN 실전 상황처럼 드로우 후 12패(tenpai 11 + 쓸모없는 패 1)로 세팅한다.
    async function setupSpiritRiichiEnv(page: Parameters<typeof getSnap>[0]) {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);
        await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            const mk = (t: string, c: string, img: string) => ({ type: t, color: c, img });
            // SAM_DO_RIP 텐파이 11패 + punch 1패(드로우 패로 버릴 예정) = 12패
            // canUseSkill 루프: punch 제거 → 11패 텐파이 → checkTenpai 통과
            e.p1.hand = [
                mk('ataho', 'red',  'tiles/pai_ata.png'),  mk('ataho', 'red',  'tiles/pai_ata.png'),  mk('ataho', 'red',  'tiles/pai_ata.png'),
                mk('rin',   'red',  'tiles/pai_rin.png'),  mk('rin',   'red',  'tiles/pai_rin.png'),  mk('rin',   'red',  'tiles/pai_rin.png'),
                mk('smash', 'blue', 'tiles/pai_smsh.png'), mk('smash', 'blue', 'tiles/pai_smsh.png'), mk('smash', 'blue', 'tiles/pai_smsh.png'),
                mk('yuri',  'blue', 'tiles/pai_yuri.png'), mk('yuri',  'blue', 'tiles/pai_yuri.png'),
                mk('punch', 'red',  'tiles/pai_punch.png'), // 12번째 패 (드로우, 버릴 패)
            ];
            e.p1.openSets        = [];
            e.p1.isMenzen        = true;
            e.p1.skills          = ['SPIRIT_RIICHI'];
            e.p1.mp              = 100;
            e.p1.maxMp           = 100;
            e.roundSkillUsage    = { p1: {}, cpu: {} };
            e.skillsUsedThisTurn = false;
            e.turnCount          = 5; // 16턴 이내
        });
    }

    test('spiritTimer > 0이면 SPIRIT_RIICHI 재사용 불가 (canUseSkill=false)', async ({ page }) => {
        await setupSpiritRiichiEnv(page);

        const canUse = await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            e.p1.buffs = { spiritTimer: 3 }; // 이미 기합 리치 활성화 중
            return e.canUseSkill('SPIRIT_RIICHI', 'P1');
        });

        expect(canUse, 'spiritTimer 활성 중 재사용 불가').toBe(false);
    });

    test('spiritTimer = 0이고 조건 충족 시 SPIRIT_RIICHI 사용 가능 (canUseSkill=true)', async ({ page }) => {
        await setupSpiritRiichiEnv(page);

        const canUse = await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            e.p1.buffs = {}; // 비활성 상태
            return e.canUseSkill('SPIRIT_RIICHI', 'P1');
        });

        expect(canUse, 'spiritTimer 없으면 사용 가능').toBe(true);
    });
});

// ============================================================================
// C-5. LAST_CHANCE 룰렛 결과 검증
//
// RULEBOOK §10: "Roulette of actual Remaining Deck — winning tile → Tsumo"
// resolveRouletteResult() 를 직접 호출해 이기는/지는 패 두 경우를 검증한다.
// 이기는 패: winningYaku 설정됨 / 지는 패: winningYaku null 유지
// activateLastChance() 호출 시 STATE_ROULETTE 진입도 확인한다.
// ============================================================================

test.describe('C-5. LAST_CHANCE 룰렛', () => {

    // 공통: SAM_DO_RIP 텐파이(11패, 유리 대기) + LAST_CHANCE 스킬 주입
    async function setupTenpaiForRoulette(page: Parameters<typeof getSnap>[0]) {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);
        await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            const mk = (t: string, c: string, img: string) => ({ type: t, color: c, img });
            e.p1.openSets        = [];
            e.p1.isMenzen        = true;
            e.p1.isRiichi        = false;
            e.p1.skills          = ['LAST_CHANCE'];
            e.p1.mp              = 100;
            e.p1.maxMp           = 100;
            e.p1.hand = [
                mk('ataho', 'red',  'tiles/pai_ata.png'),  mk('ataho', 'red',  'tiles/pai_ata.png'),  mk('ataho', 'red',  'tiles/pai_ata.png'),
                mk('rin',   'red',  'tiles/pai_rin.png'),  mk('rin',   'red',  'tiles/pai_rin.png'),  mk('rin',   'red',  'tiles/pai_rin.png'),
                mk('smash', 'blue', 'tiles/pai_smsh.png'), mk('smash', 'blue', 'tiles/pai_smsh.png'), mk('smash', 'blue', 'tiles/pai_smsh.png'),
                mk('yuri',  'blue', 'tiles/pai_yuri.png'), mk('yuri',  'blue', 'tiles/pai_yuri.png'),
            ];
            e.winningYaku = null;
        });
    }

    test('이기는 패(유리)가 룰렛 결과이면 winningYaku가 설정된다', async ({ page }) => {
        await setupTenpaiForRoulette(page);

        const yakuSet = await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            const mk = (t: string, c: string, img: string) => ({ type: t, color: c, img });
            // 룰렛 결과 = 유리(이기는 패)
            e.rouletteResultTile = mk('yuri', 'blue', 'tiles/pai_yuri.png');
            e.resolveRouletteResult();
            return e.winningYaku !== null;
        });

        expect(yakuSet, '이기는 패 → winningYaku 설정됨').toBe(true);
    });

    test('지는 패(주먹)가 룰렛 결과이면 winningYaku가 null로 유지된다', async ({ page }) => {
        await setupTenpaiForRoulette(page);

        const yakuNull = await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            const mk = (t: string, c: string, img: string) => ({ type: t, color: c, img });
            // 룰렛 결과 = 주먹(지는 패) — 유리 대기 핸드에서는 역 없음
            e.rouletteResultTile = mk('punch', 'red', 'tiles/pai_punch.png');
            e.winningYaku = null;
            e.resolveRouletteResult();
            return e.winningYaku === null;
        });

        expect(yakuNull, '지는 패 → winningYaku null 유지').toBe(true);
    });

    test('activateLastChance 호출 시 덱이 있으면 STATE_ROULETTE로 전환된다', async ({ page }) => {
        await setupTenpaiForRoulette(page);

        const isRoulette = await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            const mk = (t: string, c: string, img: string) => ({ type: t, color: c, img });
            // 덱에 패가 있어야 룰렛 진입 (빈 덱이면 MISS 처리)
            if (e.deck.length === 0) {
                e.deck.push(mk('punch', 'red', 'tiles/pai_punch.png'));
            }
            e.activateLastChance('P1');
            return e.currentState === e.STATE_ROULETTE;
        });

        expect(isRoulette, 'activateLastChance → STATE_ROULETTE 진입').toBe(true);
    });
});

// ============================================================================
// C-6. Yaku 우선순위 검증 (중첩 역 최고점 보장)
//
// 동일 패가 여러 역의 성립 조건을 동시에 만족하는 케이스를 구성해,
// checkYaku 가 항상 최고점 역을 반환하는지 확인한다.
//
// 버그 패턴: 상위 역 판정 함수(isXxx)가 valid 패에 false 반환
//   → matches[] 에서 누락 → 하위 역이 matches[0] 이 됨 → 낮은 점수 반환
//
// 각 테스트는 "중첩되는 하위 역" 을 주석으로 명시해 실패 시 원인 추적을 돕는다.
// ============================================================================

test.describe('C-6. Yaku 우선순위 검증 (중첩 역 최고점 보장)', () => {

    /** checkYaku 를 직접 호출해 반환 점수를 가져온다. */
    async function checkYakuScore(
        page: Parameters<typeof getSnap>[0],
        tiles: Array<{ type: string; color: string }>
    ): Promise<number | null> {
        return page.evaluate((hand) => {
            const yl = (0, eval)('YakuLogic');
            const result = yl.checkYaku(hand.map((t: { type: string; color: string }) => ({ ...t, img: '' })), null);
            return result?.score ?? null;
        }, tiles);
    }

    /** tiles 를 n 장 복사한다. */
    function rep(type: string, color: string, n: number) {
        return Array.from({ length: n }, () => ({ type, color }));
    }

    // ── 3-piece 역 중첩 ─────────────────────────────────────────────────────

    test('SPECIAL_COMBINATION(8000) > COMBINATION(4000) > JANG_GI(2800) > SAM_DO_RIP(2400)', async ({ page }) => {
        // 동색 4종×3: ataho·rin·punch·mayu_red 모두 red
        // COMBINATION(2char+1wep 동색) 과 SAM_DO_RIP(4트리플렛) 도 성립
        const hand = [
            ...rep('ataho',    'red', 3),
            ...rep('rin',      'red', 3),
            ...rep('punch',    'red', 3),
            ...rep('mayu_red', 'red', 3),
        ];
        expect(await checkYakuScore(page, hand)).toBe(8000);
    });

    test('DOUBLE_COMBINATION(4800) > JANG_GI(2800) > SAM_DO_RIP(2400)', async ({ page }) => {
        // red: ataho(char)+punch(wep), blue: smash(char)+sword(wep) — 2색 캐릭+무기 쌍
        // JANG_GI(동색 캐릭+무기 포함) 와 SAM_DO_RIP(4트리플렛) 도 성립
        const hand = [
            ...rep('ataho', 'red',  3),
            ...rep('punch', 'red',  3),
            ...rep('smash', 'blue', 3),
            ...rep('sword', 'blue', 3),
        ];
        expect(await checkYakuScore(page, hand)).toBe(4800);
    });

    test('CHO_MAYU(6400) > MAYU(4800) > SAM_DO_RIP(2400)', async ({ page }) => {
        // 4색 마유 각 3장 — CHO_MAYU(4색) 와 MAYU(3색+임의) 모두 성립
        const hand = [
            ...rep('mayu_red',    'red',    3),
            ...rep('mayu_yellow', 'yellow', 3),
            ...rep('mayu_blue',   'blue',   3),
            ...rep('mayu_purple', 'purple', 3),
        ];
        expect(await checkYakuScore(page, hand)).toBe(6400);
    });

    test('BYEON_TAE_GAE(6400) > SAM_DO_RIP(2400)', async ({ page }) => {
        // smash×3 + 여성 3종(rin·yuri·fari)×3 — SAM_DO_RIP(4트리플렛) 도 성립
        const hand = [
            ...rep('smash', 'blue',   3),
            ...rep('rin',   'red',    3),
            ...rep('yuri',  'blue',   3),
            ...rep('fari',  'yellow', 3),
        ];
        expect(await checkYakuScore(page, hand)).toBe(6400);
    });

    // ── 4-piece 역 중첩 ─────────────────────────────────────────────────────

    test('CROSS_COMBINATION(9600) > PIL_SAL_GI(5600) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 동색 2캐릭+1무기×4: red ataho·rin·punch 각 4장
        // PIL_SAL_GI(동색 캐릭+무기) 와 SA_CHEON_YO_RI(임의 3세트×4) 도 성립
        const hand = [
            ...rep('ataho', 'red', 4),
            ...rep('rin',   'red', 4),
            ...rep('punch', 'red', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(9600);
    });

    test('MAGU_DDAERIGI(9600) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 3무기×4: punch·sword·wand 각 4장 — SA_CHEON_YO_RI 도 성립
        const hand = [
            ...rep('punch', 'red',    4),
            ...rep('sword', 'blue',   4),
            ...rep('wand',  'yellow', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(9600);
    });

    test('JIN_MAYU(9600) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 3색 마유×4: mayu_red·mayu_yellow·mayu_blue 각 4장 — SA_CHEON_YO_RI 도 성립
        // (MAYU 는 totalSets<4 로 불성립 → JIN_MAYU 가 유일 고점)
        const hand = [
            ...rep('mayu_red',    'red',    4),
            ...rep('mayu_yellow', 'yellow', 4),
            ...rep('mayu_blue',   'blue',   4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(9600);
    });

    test('NAM_TANG(7200) > JAYU_BAKAE_PYEONGDEUNG(6400) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 남성 3종×4: ataho·smash·pet 각 4장
        // JAYU_BAKAE_PYEONGDEUNG(3색×4) 와 SA_CHEON_YO_RI 도 성립
        const hand = [
            ...rep('ataho', 'red',    4),
            ...rep('smash', 'blue',   4),
            ...rep('pet',   'yellow', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(7200);
    });

    test('YEO_TANG(7200) > JAYU_BAKAE_PYEONGDEUNG(6400) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 여성 3종×4: rin·yuri·fari 각 4장
        // JAYU_BAKAE_PYEONGDEUNG(3색×4) 와 SA_CHEON_YO_RI 도 성립
        const hand = [
            ...rep('rin',  'red',    4),
            ...rep('yuri', 'blue',   4),
            ...rep('fari', 'yellow', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(7200);
    });

    test('CHWI_HO_JEON(7200) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 취호전 3종(ataho·rin·smash)×4 — SA_CHEON_YO_RI 도 성립
        const hand = [
            ...rep('ataho', 'red',  4),
            ...rep('rin',   'red',  4),
            ...rep('smash', 'blue', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(7200);
    });

    test('PO_MUL_JANG(7200) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 포물장 3종(fari·smash·yuri)×4 — SA_CHEON_YO_RI 도 성립
        const hand = [
            ...rep('fari',  'yellow', 4),
            ...rep('smash', 'blue',   4),
            ...rep('yuri',  'blue',   4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(7200);
    });

    test('PIL_SAL_GI(5600) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 동색 캐릭+무기 포함 4-piece (cross-color): red ataho+punch, blue smash
        // SA_CHEON_YO_RI(임의 3세트×4) 도 성립, CROSS_COMBINATION 은 불성립(red 2종뿐)
        const hand = [
            ...rep('ataho', 'red',  4),
            ...rep('punch', 'red',  4),
            ...rep('smash', 'blue', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(5600);
    });
});
