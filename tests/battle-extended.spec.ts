/**
 * 환세패유기 확장 테스트
 *
 * C-1. Yaku 단위 검증    — YakuLogic.checkYaku 직접 호출 (역 종류별 핸드 → 점수 매핑)
 * C-2. Special Bonus     — 텐호(1턴 쯔모) / 해저(20턴 쯔모) / 하저(20턴 론) 각 +800pt
 * C-3. 멀티 라운드 불변성 — 라운드 카운터 단조 증가, 라운드 간 HP 감소 방향 확인
 * C-4. SPIRIT_RIICHI 중복 방지 — spiritTimer > 0 이면 canUseSkill = false (Fix 검증)
 * C-5. LAST_CHANCE 룰렛  — 이기는/지는 패 결과, activateLastChance → STATE_ROULETTE
 * C-7. 쉬움 드로우 어시스트 — 플레이어 전용 덱 상단 재배열, 높은 패 지향, 구성비 보존
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

    // 회귀: SUN_IL_SAEK은 색 변형 역명({red,blue,yellow}, default 없음)이라 isSunIlSaek가
    // meta.color를 줘야 resolveYakuName이 한글 역명을 고른다. 예전엔 bare boolean을
    // 반환해 매치 결과/라운드 기록에 원시 키 'SUN_IL_SAEK'가 그대로 떴다.
    test('SUN_IL_SAEK: 색 변형 역명이 원시 키가 아닌 한글로 해석된다 (순 적/청/황일색)', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // 12 red, 6+3+3 더미 → 순일색 성립
            const hand = [
                ...Array(6).fill(null).map(() => mk('ataho', 'red')),
                ...Array(3).fill(null).map(() => mk('punch', 'red')),
                ...Array(3).fill(null).map(() => mk('sword', 'red')),
            ];
            const m = yl.isSunIlSaek(yl.analyzeHand(hand));
            return {
                meta: m && m.match ? m.meta : null,
                red: yl.resolveYakuName('SUN_IL_SAEK', { color: 'red' }, 0),
                blue: yl.resolveYakuName('SUN_IL_SAEK', { color: 'blue' }, 0),
                yellow: yl.resolveYakuName('SUN_IL_SAEK', { color: 'yellow' }, 0),
            };
        });
        expect(r.meta, 'isSunIlSaek must supply meta.color').toEqual({ color: 'red' });
        expect(r.red).toBe('순 적일색');
        expect(r.blue).toBe('순 청일색');
        expect(r.yellow).toBe('순 황일색');
    });

    // 회귀: 자유 박애 평등은 빨/파/노 3색 × 4장씩이고 보라색은 제외. 예전엔 보라를
    // 안 걸러서 빨4+노4+보라4 같은 손도 "3색"으로 통과했다.
    test('JAYU_BAKAE_PYEONGDEUNG: 빨/파/노 3색×4 성립, 보라색 포함은 불성립', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            const four = (id: string, color: string) => Array(4).fill(null).map(() => mk(id, color));
            const valid = [...four('ataho', 'red'), ...four('pet', 'blue'), ...four('rin', 'yellow')];
            const withPurple = [...four('ataho', 'red'), ...four('rin', 'yellow'), ...four('mayu_purple', 'purple')];
            return {
                valid: yl.isJaYuBakAePyeongDeung(yl.analyzeHand(valid)),
                withPurple: yl.isJaYuBakAePyeongDeung(yl.analyzeHand(withPurple)),
                validTop: (yl.checkYaku(valid, 0) || {}).yaku,
            };
        });
        expect(r.valid, '빨/파/노 3색×4').toBe(true);
        expect(r.withPurple, '보라색 포함은 불성립').toBe(false);
        expect(r.validTop).toEqual(['자유 박애 평등']);
    });

    // 회귀: 순일색/초일색은 빨/파/노 단색만 — 보라 단색은 불성립.
    // 예전엔 색을 안 가려 12장 전부 보라인 손도 매칭 후보에 올랐다(실제론 보라 9장뿐이라
    // 도달 불가 + IP_E_DAM이 더 높아 표시도 안 됐지만, 규칙 정합성 차원에서 수정).
    test('SUN_IL_SAEK/CHO_IL_SAEK: 보라 단색은 일색류 불성립(빨/파/노만)', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            const rep = (id: string, color: string, n: number) => Array(n).fill(null).map(() => mk(id, color));
            const A = (h: any) => yl.analyzeHand(h);
            const purple12 = [...rep('mayu_purple', 'purple', 6), ...rep('mayu_purple', 'purple', 3), ...rep('mayu_purple', 'purple', 3)];
            const redSun = [...rep('ataho', 'red', 6), ...rep('punch', 'red', 3), ...rep('sword', 'red', 3)];
            const redCho = [...rep('ataho', 'red', 4), ...rep('punch', 'red', 4), ...rep('sword', 'red', 4)];
            return {
                sunPurple: yl.isSunIlSaek(A(purple12)),
                choPurple: yl.isChoIlSaek(A(purple12)),
                sunRed: !!(yl.isSunIlSaek(A(redSun)) || {}).match,
                choRed: !!(yl.isChoIlSaek(A(redCho)) || {}).match,
            };
        });
        expect(r.sunPurple, '순일색: 보라 불성립').toBe(false);
        expect(r.choPurple, '초일색: 보라 불성립').toBe(false);
        expect(r.sunRed, '순일색: 빨강 성립').toBe(true);
        expect(r.choRed, '초일색: 빨강 성립').toBe(true);
    });

    // 회귀: 순일색은 [6,3,3](2종×3 + 1종×6, 타입 기반). 초일색은 "같은 색 4개씩 3벌"
    // (세트 기반 — 8+4·12단일 OK, 6+6는 4벌 안 됨 ✗). 보라는 둘 다 제외.
    test('SUN_IL_SAEK/CHO_IL_SAEK: 구조 검증 (순일색=타입 [6,3,3] / 초일색=세트 4×3벌)', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            const rep = (id: string, color: string, n: number) => Array(n).fill(null).map(() => mk(id, color));
            const A = (h: any) => yl.analyzeHand(h);
            const B = (x: any) => !!(x && x.match);
            return {
                sun633: B(yl.isSunIlSaek(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 3), ...rep('sword', 'red', 3)]))),
                sun651: B(yl.isSunIlSaek(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 5), ...rep('sword', 'red', 1)]))),
                sun66: B(yl.isSunIlSaek(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 6)]))),
                sun444: B(yl.isSunIlSaek(A([...rep('ataho', 'red', 4), ...rep('punch', 'red', 4), ...rep('sword', 'red', 4)]))),
                cho444: B(yl.isChoIlSaek(A([...rep('ataho', 'red', 4), ...rep('punch', 'red', 4), ...rep('sword', 'red', 4)]))),
                cho84: B(yl.isChoIlSaek(A([...rep('ataho', 'red', 8), ...rep('punch', 'red', 4)]))),
                cho66: B(yl.isChoIlSaek(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 6)]))),
                cho633: B(yl.isChoIlSaek(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 3), ...rep('sword', 'red', 3)]))),
            };
        });
        expect(r.sun633, '순일색 [6,3,3] 성립').toBe(true);
        expect(r.sun651, '순일색 [6,5,1] 불성립').toBe(false);
        expect(r.sun66, '순일색 [6,6] 불성립').toBe(false);
        expect(r.sun444, '순일색 [4,4,4]는 순일색 아님(초일색)').toBe(false);
        expect(r.cho444, '초일색 [4,4,4] 성립').toBe(true);
        expect(r.cho84, '초일색 [8,4] 성립(세트 기반 3벌)').toBe(true);
        expect(r.cho66, '초일색 [6,6] 불성립(4벌 안 됨)').toBe(false);
        expect(r.cho633, '초일색 [6,3,3] 불성립(순일색)').toBe(false);
    });

    // 회귀: "N종류(타입)" 요구 역은 같은 타입을 여러 세트 쌓아도 종류 수를 부풀리면 안 된다.
    // 콤비/크로스(캐릭터 2종류), 스페셜(4종류), 변태개(여성 3종류).
    test('종류 기반 역: 같은 타입 더미로 종류 수를 부풀리면 불성립', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            const rep = (id: string, color: string, n: number) => Array(n).fill(null).map(() => mk(id, color));
            const A = (h: any) => yl.analyzeHand(h);
            const B = (x: any) => !!(x === true || (x && x.match));
            return {
                // COMBINATION: 같은 색 캐릭터 2종류 + 무기. 1종류(ataho×6)는 불성립.
                comboValid: B(yl.isCombination(A([...rep('ataho', 'red', 3), ...rep('rin', 'red', 3), ...rep('sword', 'red', 3), ...rep('smash', 'blue', 3)]))),
                combo1Type: B(yl.isCombination(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 3), ...rep('smash', 'blue', 3)]))),
                // CROSS: 같은 색 캐릭터 2종류 + 무기 ×4. 1캐릭터종류는 불성립.
                crossValid: B(yl.isCrossCombination(A([...rep('ataho', 'red', 4), ...rep('rin', 'red', 4), ...rep('sword', 'red', 4)]))),
                cross1Type: B(yl.isCrossCombination(A([...rep('ataho', 'red', 8), ...rep('sword', 'red', 4)]))),
                // SPECIAL: 같은 색 4종류 ×3. 3종류(6+3+3=순일색)는 불성립.
                specialValid: B(yl.isSpecialCombination(A([...rep('ataho', 'red', 3), ...rep('rin', 'red', 3), ...rep('sword', 'red', 3), ...rep('wand', 'red', 3)]))),
                special3Type: B(yl.isSpecialCombination(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 3), ...rep('sword', 'red', 3)]))),
                // BYEON: 스마슈 + 여성 3종류. 여성 2종류는 불성립.
                byeonValid: B(yl.isByeonTaeGae(A([...rep('smash', 'blue', 3), ...rep('rin', 'yellow', 3), ...rep('yuri', 'blue', 3), ...rep('fari', 'red', 3)]))),
                byeon2Type: B(yl.isByeonTaeGae(A([...rep('smash', 'blue', 3), ...rep('rin', 'yellow', 6), ...rep('yuri', 'blue', 3)]))),
            };
        });
        expect(r.comboValid, 'COMBINATION 정상(캐릭터 2종)').toBe(true);
        expect(r.combo1Type, 'COMBINATION 캐릭터 1종(6장) 불성립').toBe(false);
        expect(r.crossValid, 'CROSS 정상(캐릭터 2종)').toBe(true);
        expect(r.cross1Type, 'CROSS 캐릭터 1종(8장) 불성립').toBe(false);
        expect(r.specialValid, 'SPECIAL 정상(4종)').toBe(true);
        expect(r.special3Type, 'SPECIAL 3종(6+3+3) 불성립').toBe(false);
        expect(r.byeonValid, 'BYEON 정상(여성 3종)').toBe(true);
        expect(r.byeon2Type, 'BYEON 여성 2종 불성립').toBe(false);
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

// ============================================================================
// C-7. 쉬움 난이도 드로우 어시스트 (플레이어 전용 럭 스무딩)
//
//    BattleEngine.drawTiles: drawAssistChance > 0 인 플레이어 단일 드로우에서
//    덱 상단 peek 후 YakuLogic.rateTileForHand 최고점 패를 surface.
//    - 덱 구성비는 보존 (재배열만)
//    - CPU 드로우에는 절대 적용 안 됨
//    - normal/hard 에서는 chance = 0
// ============================================================================

test.describe('C-7. 쉬움 드로우 어시스트', () => {

    test('rateTileForHand: 쌓는 패 > 새 패, 승리 완성패가 최우선', async ({ page }) => {
        const r = await page.evaluate(() => {
            const Y = (0, eval)('YakuLogic');
            const mk = (t: string, c: string) => ({ type: t, color: c, img: '' });
            // 손패: ataho 3장 + smash 1장 + 기타 (fullHand 없음 → 빌딩 티어)
            const hand = [mk('ataho','red'), mk('ataho','red'), mk('ataho','red'),
                          mk('smash','blue'), mk('rin','red'), mk('fari','yellow')];
            const stack4th = Y.rateTileForHand(hand, mk('ataho','red'), 'ataho', null);
            const pair2nd  = Y.rateTileForHand(hand, mk('smash','blue'), 'ataho', null);
            const fresh    = Y.rateTileForHand(hand, mk('wand','yellow'), 'ataho', null);

            // 승리 완성: 11장 텐파이 풀핸드 + 완성패 → 티어1 (100000 + 실제 역 점수)
            const tenpai = [
                ...Array(3).fill(mk('ataho','red')),
                ...Array(3).fill(mk('smash','blue')),
                ...Array(3).fill(mk('rin','red')),
                ...Array(2).fill(mk('fari','yellow'))
            ];
            const winScore = Y.rateTileForHand(tenpai, mk('fari','yellow'), 'ataho', tenpai);
            return { stack4th, pair2nd, fresh, winScore };
        });
        expect(r.stack4th).toBeGreaterThan(r.pair2nd);   // 4번째 장 > 2번째 장 (제곱 가중)
        expect(r.pair2nd).toBeGreaterThan(r.fresh);
        expect(r.winScore).toBeGreaterThan(100000);      // 완성패 = 티어1 (역 점수 가산)
    });

    test('rateTileForHand: 실제 역 테이블 기반 — 텐파이로 가는 패 > 빌딩 패, 높은 역 완성 우선', async ({ page }) => {
        const r = await page.evaluate(() => {
            const Y = (0, eval)('YakuLogic');
            const mk = (t: string, c: string) => ({ type: t, color: c, img: '' });

            const PD = (0, eval)('PaiData');
            const tileOf = (i: number) => ({ type: PD.TYPES[i].id, color: PD.TYPES[i].color, img: '' });

            // 손패 11장: ataho 7 + punch 3 + rin 1
            const hand = [
                ...Array(7).fill(mk('ataho','red')),
                ...Array(3).fill(mk('punch','red')),
                mk('rin','red')
            ];
            // 후보 A: 8번째 ataho → 한 장 버리면 높은 역 텐파이 → 티어2 이상
            const towardYaku = Y.rateTileForHand(hand, mk('ataho','red'), 'ataho', hand);

            // 티어3 검증: 11종 전부 다른 단패 → 버림+츠모로도 페어 하나가 한계,
            // 어떤 역 지평에도 들 수 없음 (구조적으로 보장)
            const scattered = Array.from({ length: 11 }, (_, i) => tileOf(i));
            const buildingOnly = Y.rateTileForHand(scattered, tileOf(11), 'ataho', scattered);

            // 티어1 역 점수 서열: 같은 즉시 완성이라도 높은 역이 더 높게 평가되는지
            // 9 ataho + 2 punch (11장) → punch 완성 = 일이담(9+3)
            const ipEDamHand = [...Array(9).fill(mk('ataho','red')), ...Array(2).fill(mk('punch','red'))];
            const winHigh = Y.rateTileForHand(ipEDamHand, mk('punch','red'), 'ataho', ipEDamHand);
            // 3/3/3/2 (11장) → fari 완성 = 삼도립(2400)
            const samDoRip = [
                ...Array(3).fill(mk('ataho','red')), ...Array(3).fill(mk('smash','blue')),
                ...Array(3).fill(mk('rin','red')), ...Array(2).fill(mk('fari','yellow'))
            ];
            const winLow = Y.rateTileForHand(samDoRip, mk('fari','yellow'), 'ataho', samDoRip);

            return { towardYaku, buildingOnly, winHigh, winLow };
        });
        expect(r.towardYaku).toBeGreaterThan(10000);       // 티어2 진입 (실제 역으로 가는 길)
        expect(r.buildingOnly).toBeLessThan(10000);        // 티어3 (역 지평 밖)
        expect(r.winHigh).toBeGreaterThan(r.winLow);       // 높은 역 완성 > 낮은 역 완성
    });

    test('어시스트 발동 시 덱 상단에서 쌓는 패를 집고, 덱 구성비는 보존된다', async ({ page }) => {
        await startBattle(page, { playerIndex: 0, cpuIndex: 1, autoTest: false });
        const r = await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            const mk = (t: string, c: string) => ({ type: t, color: c, img: '' });

            e.drawAssistChance = 1.0; // 강제 발동
            e.p1.buffs = {};
            e.p1.openSets = [];
            e.p1.hand = [mk('ataho','red'), mk('ataho','red'), mk('rin','red')];

            // 덱 상단(끝) 3장 구성: [쌓는 패(ataho)] 가 3번째, 위 2장은 잡패
            e.deck.push(mk('ataho','red')); // offset 2
            e.deck.push(mk('wand','yellow')); // offset 1
            e.deck.push(mk('sword','blue')); // offset 0 (top)

            const countTiles = (arr: any[]) => {
                const m: Record<string, number> = {};
                arr.forEach(t => { m[t.type] = (m[t.type] || 0) + 1; });
                return m;
            };
            const before = countTiles([...e.deck, ...e.p1.hand]);
            const deckLenBefore = e.deck.length;

            const drawn = e.drawTiles(1, e.p1);
            e.p1.hand.push(...drawn);

            const after = countTiles([...e.deck, ...e.p1.hand]);
            return {
                drawnType: drawn[0].type,
                deckDelta: deckLenBefore - e.deck.length,
                composition: JSON.stringify(before) === JSON.stringify(after)
            };
        });
        expect(r.drawnType).toBe('ataho');  // 잡패 2장을 제치고 쌓는 패 선택
        expect(r.deckDelta).toBe(1);        // 정확히 1장만 소모
        expect(r.composition).toBe(true);   // 덱+손패 구성비 보존 (재배열만)
    });

    test('CPU 드로우에는 어시스트가 적용되지 않는다', async ({ page }) => {
        await startBattle(page, { playerIndex: 0, cpuIndex: 1, autoTest: false });
        const r = await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            const mk = (t: string, c: string) => ({ type: t, color: c, img: '' });

            e.drawAssistChance = 1.0;
            e.cpu.buffs = {};
            e.cpu.hand = [mk('ataho','red'), mk('ataho','red')];

            e.deck.push(mk('ataho','red'));  // CPU 에게 유리한 패가 아래
            e.deck.push(mk('wand','yellow')); // 잡패가 top
            const drawn = e.drawTiles(1, e.cpu);
            return { drawnType: drawn[0].type };
        });
        expect(r.drawnType).toBe('wand'); // 그냥 top 을 집음 (재배열 없음)
    });

    test('난이도별 발동 확률: easy > 0, normal/hard = 0', async ({ page }) => {
        const r = await page.evaluate(() => {
            const g = (0, eval)('Game');
            const bs = (0, eval)('BattleScene');
            const e = (window as any).BattleEngine;
            const probe = (d: string) => {
                g.saveData.difficulty = d;
                g.changeScene(bs, { playerIndex: 0, cpuIndex: 1 });
                return e.drawAssistChance;
            };
            return { easy: probe('easy'), normal: probe('normal'), hard: probe('hard') };
        });
        expect(r.easy).toBeGreaterThan(0);
        expect(r.normal).toBe(0);
        expect(r.hard).toBe(0);
    });
});

// ============================================================================
// C-8. "리치 가능 시" 전용 스킬은 펑 후(오픈 핸드)에 사용 불가해야 한다
//
//    desc 대조 감사로 발견(2026-06-13): TIGER_STRIKE/SPIRIT_RIICHI 는
//    "리치를 걸 수 있을 때"만 쓸 수 있으나, 멘젠 체크가 없어 펑 후에도 활성화됐음.
//    이제 engine.canDeclareRiichi(who) 로 게이팅.
// ============================================================================

test.describe('C-8. 리치 전용 스킬 멘젠 게이팅', () => {

    const setupRiichiReadyHand = (page: import('@playwright/test').Page, charId: string) =>
        page.evaluate((cid) => {
            const CD = (0, eval)('CharacterData');
            const g = (0, eval)('Game');
            const a = (0, eval)('Assets');
            const bc = (0, eval)('BattleConfig');
            const bs = (0, eval)('BattleScene');
            const e = (window as any).BattleEngine;
            a.setMute(true);
            bc.RULES.SKILLS_ENABLED = true;
            g.changeScene(bs, { playerIndex: CD.findIndex((c: any) => c.id === cid), cpuIndex: 1 });
            e.turnCount = 5; e.p1.mp = 100; e.p1.isRiichi = false;
            const mk = (id: string) => { const d = (0, eval)('PaiData').TYPES.find((t: any) => t.id === id); return { type: d.id, color: d.color, img: d.img }; };
            // 한 장(punch) 버리면 텐파이(3 ataho,3 smash,3 rin,2 fari) 인 12장
            const tenpaiHand = [...Array(3).fill(mk('ataho')), ...Array(3).fill(mk('smash')),
                                ...Array(3).fill(mk('rin')), ...Array(2).fill(mk('fari')), mk('punch')];
            e.p1.hand = tenpaiHand;
            return mk;
        }, charId);

    for (const skillId of ['TIGER_STRIKE', 'SPIRIT_RIICHI']) {
        const charId = skillId === 'TIGER_STRIKE' ? 'ataho' : 'yuri';
        test(`${skillId}: 멘젠 텐파이 → 사용 가능, 펑 후 → 불가`, async ({ page }) => {
            await setupRiichiReadyHand(page, charId);
            const r = await page.evaluate((sid) => {
                const e = (window as any).BattleEngine;
                const mk = (id: string) => { const d = (0, eval)('PaiData').TYPES.find((t: any) => t.id === id); return { type: d.id, color: d.color, img: d.img }; };
                e.p1.openSets = [];
                const menzen = e.canUseSkill(sid, 'P1');
                // 펑으로 손패 오픈
                e.p1.openSets = [{ type: 'PON', tiles: [mk('punch'), mk('punch'), mk('punch')] }];
                const afterPon = e.canUseSkill(sid, 'P1');
                return { menzen, afterPon };
            }, skillId);
            expect(r.menzen, '멘젠 텐파이에서 사용 가능').toBe(true);
            expect(r.afterPon, '펑 후 사용 불가').toBe(false);
        });
    }
});

// ============================================================================
// C-9. 전 스킬 효과(execute) 검증 — desc 대조 전수 (2026-06-13 감사)
//
//    canUse(언제 쓸 수 있나)뿐 아니라 execute(실제 효과)가 desc대로 동작하는지
//    13개 스킬 전부를 실제 발동시켜 확인. 일회성 수동 검증을 자동화로 고정.
// ============================================================================

test.describe('C-9. 전 스킬 효과 전수 검증', () => {

    // 전투 진입 + 스킬 활성 + 헬퍼(mk/tenpai/reset)를 페이지에 심는다
    async function setupSkillHarness(page: import('@playwright/test').Page) {
        await startBattle(page, { playerIndex: 0, cpuIndex: 1, autoTest: false });
        await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            (0, eval)('BattleConfig').RULES.SKILLS_ENABLED = true;
            const mk = (id: string) => { const d = (0, eval)('PaiData').TYPES.find((t: any) => t.id === id); return { type: d.id, color: d.color, img: d.img }; };
            (window as any).__mk = mk;
            (window as any).__tenpai = () => [...Array(3).fill(mk('ataho')), ...Array(3).fill(mk('smash')), ...Array(3).fill(mk('rin')), ...Array(2).fill(mk('fari'))];
            (window as any).__reset = () => {
                e.p1.buffs = {}; e.cpu.buffs = {}; e.p1.openSets = []; e.cpu.openSets = [];
                e.p1.isRiichi = false; e.cpu.isRiichi = false; e.p1.mp = 100; e.cpu.mp = 100;
                e.turnCount = 5; e.sequencing = { active: false, steps: [], currentStep: 0, timer: 0 };
            };
        });
    }

    test('버프형: TIGER_STRIKE / SPIRIT_RIICHI / CRITICAL / WATER_MIRROR / RECOVERY / DISCARD_GUARD / HELL_PILE', async ({ page }) => {
        await setupSkillHarness(page);
        const r = await page.evaluate(() => {
            const e = (window as any).BattleEngine, mk = (window as any).__mk, tenpai = (window as any).__tenpai, reset = (window as any).__reset;
            const SR = (0, eval)('SkillRegistry'), SF = (0, eval)('SkillFlows'), Y = (0, eval)('YakuLogic'), BS = (0, eval)('BattleSequencer');
            const out: any = {};

            // TIGER_STRIKE: guaranteedWin → 드로우가 완성패 (버프는 드로우 시 소비되므로
            // 드로우 전에 캡처)
            reset(); e.p1.hand = tenpai(); SR.TIGER_STRIKE.execute(e, 'P1', e.p1);
            const tigerBuff = e.p1.buffs.guaranteedWin === true;
            e.deck.push(mk('punch')); e.deck.push(mk('punch'));
            const drawn = e.drawTiles(1, e.p1);
            out.tiger = tigerBuff &&
                (!!Y.checkYaku([...e.p1.hand, drawn[0]], e.p1.id) || !!Y.checkYaku([...tenpai(), drawn[0]], e.p1.id));

            // SPIRIT_RIICHI: timer 5 → 5턴 후 보장승
            reset(); SR.SPIRIT_RIICHI.execute(e, 'P1', e.p1);
            const t5 = e.p1.buffs.spiritTimer === 5;
            for (let i = 0; i < 5; i++) e.manageBuffs(e.p1);
            out.spirit = t5 && e.p1.buffs.guaranteedWin === true;

            // CRITICAL: 가해 ×1.25, 소비
            reset(); e.p1.hand = tenpai().concat(mk('fari')); e.winningYaku = Y.checkYaku(e.p1.hand, e.p1.id);
            SR.CRITICAL.execute(e, 'P1', e.p1);
            const cBase = e.calculateScore(e.winningYaku.score, e.p1.isMenzen, e.p1, e.cpu);
            BS.startWinSequence(e, 'TSUMO', 'P1', cBase);
            out.critical = e.pendingDamage.amount >= Math.floor(cBase * 1.25) - 1 && !e.p1.buffs.attackUp;

            // WATER_MIRROR: 피격 ×0.75, 소비
            reset(); e.cpu.hand = tenpai().concat(mk('fari')); e.winningYaku = Y.checkYaku(e.cpu.hand, e.cpu.id);
            SR.WATER_MIRROR.execute(e, 'P1', e.p1);
            const wBase = e.calculateScore(e.winningYaku.score, e.cpu.isMenzen, e.cpu, e.p1);
            BS.startWinSequence(e, 'TSUMO', 'CPU', wBase);
            out.waterMirror = e.pendingDamage.amount <= Math.floor(wBase * 0.75) + 1 && !e.p1.buffs.defenseUp;

            // RECOVERY: +3000, 상한 캡, 만피 불가
            reset(); e.p1.maxHp = 10000; e.p1.hp = 5000; SR.RECOVERY.execute(e, 'P1', e.p1);
            const healed = e.p1.hp === 8000; e.p1.hp = 9000; SR.RECOVERY.execute(e, 'P1', e.p1);
            out.recovery = healed && e.p1.hp === 10000 && SR.RECOVERY.canUse(e, 'P1', { hp: 10000, maxHp: 10000 }) === false;

            // DISCARD_GUARD: 5턴, CPU 반응 차단, 감소
            reset(); SR.DISCARD_GUARD.execute(e, 'P1', e.p1); e.p1.hand = tenpai();
            const blocked = e.checkCpuActions(mk('ataho')) === false;
            e.manageBuffs(e.p1);
            out.discardGuard = blocked && e.p1.buffs.discardGuard === 4;

            // HELL_PILE: 상대 curseDraw 3 → 드로우 시 감소
            reset(); SR.HELL_PILE.execute(e, 'P1', e.p1, e.cpu);
            const c3 = e.cpu.buffs.curseDraw === 3; e.cpu.hand = [mk('ataho'), mk('ataho')]; e.deck.push(mk('ataho'));
            e.drawTiles(1, e.cpu);
            out.hellPile = c3 && e.cpu.buffs.curseDraw === 2;

            return out;
        });
        expect(r.tiger, 'TIGER_STRIKE').toBe(true);
        expect(r.spirit, 'SPIRIT_RIICHI').toBe(true);
        expect(r.critical, 'CRITICAL').toBe(true);
        expect(r.waterMirror, 'WATER_MIRROR').toBe(true);
        expect(r.recovery, 'RECOVERY').toBe(true);
        expect(r.discardGuard, 'DISCARD_GUARD').toBe(true);
        expect(r.hellPile, 'HELL_PILE').toBe(true);
    });

    test('DORA_BOMB: 우라도라를 손패 최다 패로 교체', async ({ page }) => {
        await setupSkillHarness(page);
        const ok = await page.evaluate(() => {
            const e = (window as any).BattleEngine, mk = (window as any).__mk, reset = (window as any).__reset;
            const SF = (0, eval)('SkillFlows');
            reset(); e.p1.id = 'rinxiang';
            e.p1.hand = [...Array(6).fill(mk('ataho')), ...Array(3).fill(mk('punch'))];
            e.uraDoras = [mk('yuri'), mk('pet')];
            SF.applyDoraBomb(e, e.p1, 'P1');
            const res = e.uraDoras.every((d: any) => d.type === 'ataho');
            e.p1.id = 'ataho';
            return res;
        });
        expect(ok).toBe(true);
    });

    test('반응형 론 카운터: EXCHANGE_RON(되돌림) / SUPER_IAI(제거+턴넘김)', async ({ page }) => {
        await setupSkillHarness(page);
        const r = await page.evaluate(() => {
            const e = (window as any).BattleEngine, mk = (window as any).__mk, reset = (window as any).__reset;
            const SF = (0, eval)('SkillFlows');
            const out: any = {};

            reset(); e.p1.hand = [mk('smash'), mk('rin')];
            const bad = mk('punch'); bad.owner = 'p1'; e.discards = [mk('ataho'), bad];
            const dB = e.discards.length, hB = e.p1.hand.length;
            SF.activateRonTileExchange(e, 'P1');
            out.exchangeRon = e.discards.length === dB - 1 && e.p1.hand.length === hB + 1 && e.currentState === e.STATE_PLAYER_TURN;

            reset(); e.discards = [mk('ataho'), mk('punch')];
            const dB2 = e.discards.length;
            SF.activateSuperIaido(e, 'P1');
            out.superIai = e.discards.length === dB2 - 1 && e.currentState === e.STATE_CPU_TURN;

            return out;
        });
        expect(r.exchangeRon, 'EXCHANGE_RON').toBe(true);
        expect(r.superIai, 'SUPER_IAI').toBe(true);
    });

    test('autoFlow: EXCHANGE_TILE / PAINT_TILE(CPU 라운드시작 교환) / LAST_CHANCE(룰렛)', async ({ page }) => {
        await setupSkillHarness(page);
        const r = await page.evaluate(() => {
            const e = (window as any).BattleEngine, mk = (window as any).__mk, tenpai = (window as any).__tenpai, reset = (window as any).__reset;
            const SF = (0, eval)('SkillFlows');
            const out: any = {};
            const junkHand = () => [mk('ataho'), mk('ataho'), mk('smash'), mk('punch'), mk('sword'), mk('wand'), mk('yuri'), mk('pet'), mk('rin'), mk('fari'), mk('mayu_red')];

            for (const sid of ['EXCHANGE_TILE', 'PAINT_TILE']) {
                reset(); e.cpu.hand = junkHand(); e.deck = Array.from({ length: 30 }, () => mk('ataho'));
                const mpB = e.cpu.mp;
                SF.executeCpuTileExchange(e, sid);
                out[sid] = e.cpu.mp < mpB && e.cpu.hand.length === 11;
            }

            reset(); e.p1.hand = tenpai(); e.p1.skills = ['LAST_CHANCE', 'CRITICAL']; e.p1.mp = 100; e.turnCount = 20;
            e.deck = [mk('fari'), mk('punch'), mk('sword')];
            e.activateLastChance('P1');
            out.lastChance = e.currentState === e.STATE_ROULETTE;

            return out;
        });
        expect(r.EXCHANGE_TILE, 'EXCHANGE_TILE').toBe(true);
        expect(r.PAINT_TILE, 'PAINT_TILE').toBe(true);
        expect(r.lastChance, 'LAST_CHANCE').toBe(true);
    });
});
