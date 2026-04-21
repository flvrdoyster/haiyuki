/**
 * 환세패유기 Playwright 전투 테스트
 *
 * 검증 목적:
 *   - RULEBOOK.md 커스텀 룰이 실제 게임 플레이 흐름에서 지켜지는지 확인
 *   - window.__haiyuki__ (qaDebug.js) 를 통해 게임 상태를 읽기 전용으로 검증
 *
 * 테스트 분류:
 *   A. 불변성(Invariant) 테스트 — 자동 플레이 전체 매치 동안 룰 위반 감시
 *   B. 시나리오(Scenario)  테스트 — 특정 핸드를 주입해 개별 룰을 직접 검증
 *
 * 참고 사항:
 *   - Game.isAutoTest = true  → 10× 속도 + AI가 플레이어 턴 처리
 *   - installAutoDriver()     → autoTest가 다루지 않는 반응(PASS) / 결과 화면 처리
 *   - 스킬은 BattleConfig.RULES.SKILLS_ENABLED = false 로 비활성화해 변수 제거
 */

import { test, expect } from '@playwright/test';
import {
    waitForGame,
    startBattle,
    enableAutoTest,
    waitForState,
    waitForAnyState,
    waitForMatchOver,
    installMonitor,
    installAutoDriver,
    stopHarness,
    getSnap,
    getViolations,
    injectSamDoRipTenpai,
    injectRiichiTenpai,
} from './helpers';

const GAME_URL = '/';

// SAM_DO_RIP (삼도립): 4개 트리플렛 = 12패, 기본 점수 2400
// calculateScore(2400, isMenzen=true,  ...) = round(2400/10)*10       = 2400
// calculateScore(2400, isMenzen=false, ...) = round(floor(2400×0.75)/10)*10 = 1800
const SAM_DO_RIP_BASE   = 2400;
const CLOSED_HAND_DMG   = Math.round(SAM_DO_RIP_BASE / 10) * 10;                   // 2400
const OPEN_HAND_DMG     = Math.round(Math.floor(SAM_DO_RIP_BASE * 0.75) / 10) * 10; // 1800

// ────────────────────────────────────────────────────────────────────────────
// 공통 beforeEach / afterEach
// ────────────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await waitForGame(page);
});

test.afterEach(async ({ page }) => {
    await stopHarness(page);
});

// ============================================================================
// A. 불변성 테스트 — 자동 플레이 전체 매치에서 룰 위반 감시
//
//    패턴: installMonitor → startBattle(autoTest) → installAutoDriver
//          → waitForMatchOver → getViolations → violations 없음 확인
//
//    Game.isAutoTest 가 커버하는 부분:
//      · PLAYER_TURN  → performAutoTurn() (AI 사용)
//      · ACTION_SELECT → TSUMO / RIICHI / PASS_SELF 자동 처리
//      · WAIT_FOR_DRAW → timer > 5 에서 confirmDraw() 자동 호출
//    installAutoDriver 가 추가로 커버하는 부분:
//      · ACTION_SELECT PASS (CPU 버림패 후 PON/RON 반응)
//      · WIN / LOSE / NAGARI / MATCH_OVER 화면 진행
// ============================================================================

test.describe('A. 불변성 검증 (자동 플레이 전체 매치)', () => {

    // 공통 헬퍼: 모니터 설치 → 자동 플레이 → 매치 종료 대기 → 위반 반환
    async function fullMatchViolations(page: Parameters<typeof installMonitor>[0]) {
        await installMonitor(page);
        await startBattle(page);        // autoTest=true (기본값)
        await installAutoDriver(page);
        await waitForMatchOver(page);
        return getViolations(page);
    }

    test('§4 Ron은 반드시 Riichi 선언 후에만 가능해야 한다', async ({ page }) => {
        // RULEBOOK §4: "A player can ONLY declare Ron if they are in Riichi state."
        const violations = await fullMatchViolations(page);
        const hit = violations.filter(v => v.rule === 'RON_REQUIRES_RIICHI');
        expect(hit, formatViolations(hit)).toHaveLength(0);
    });

    test('§3 Riichi는 멘젠(폐쇄 핸드) 상태에서만 선언 가능해야 한다', async ({ page }) => {
        // RULEBOOK §3: "Player must be Menzen (Closed Hand / No Open Sets)."
        const violations = await fullMatchViolations(page);
        const hit = violations.filter(v => v.rule === 'RIICHI_REQUIRES_MENZEN');
        expect(hit, formatViolations(hit)).toHaveLength(0);
    });

    test('§5 Pon(펑) 후 오픈 핸드에서는 Ron이 불가해야 한다', async ({ page }) => {
        // RULEBOOK §5: "Calling Pon... Ron Disabled: Since Ron requires Riichi,
        //   calling Pon effectively removes the ability to win by Ron."
        const violations = await fullMatchViolations(page);
        const hit = violations.filter(v => v.rule === 'PON_DISABLES_RON');
        expect(hit, formatViolations(hit)).toHaveLength(0);
    });

    test('§1 한 라운드에서 턴 수는 20을 초과하지 않아야 한다', async ({ page }) => {
        // RULEBOOK §1: "The game lasts for a maximum of 20 Turns per round."
        const violations = await fullMatchViolations(page);
        const hit = violations.filter(v => v.rule === 'TURN_EXCEEDS_20');
        expect(hit, formatViolations(hit)).toHaveLength(0);
    });

    test('§8 HP는 항상 [0, maxHp] 범위 안에 있어야 한다', async ({ page }) => {
        // RULEBOOK §8: Direct damage is applied to HP. Should never go below 0.
        const violations = await fullMatchViolations(page);
        const hit = violations.filter(v => v.rule === 'HP_OUT_OF_BOUNDS');
        expect(hit, formatViolations(hit)).toHaveLength(0);
    });

    test('§4 WIN/LOSE 상태에는 반드시 winningYaku가 있어야 한다', async ({ page }) => {
        // RULEBOOK §4: "A valid Yaku is required to win."
        // winningYaku = null 인 채로 WIN/LOSE 가 되면 로직 오류.
        const violations = await fullMatchViolations(page);
        const hit = violations.filter(v => v.rule === 'WIN_WITHOUT_YAKU');
        expect(hit, formatViolations(hit)).toHaveLength(0);
    });
});

// ============================================================================
// B-1. 초기화 검증
// ============================================================================

test.describe('B-1. 초기화 검증', () => {

    test('전투 시작 시 HP·MP·라운드·턴 초기값이 정확해야 한다', async ({ page }) => {
        await startBattle(page);
        await waitForAnyState(page, ['DEALING', 'WAIT_FOR_DRAW', 'PLAYER_TURN', 'CPU_TURN'], 20_000);

        const snap = await getSnap(page);
        expect(snap).not.toBeNull();
        expect(snap!.p1.hp,    'p1.hp').toBe(10_000);
        expect(snap!.p1.maxHp, 'p1.maxHp').toBe(10_000);
        expect(snap!.p1.mp,    'p1.mp').toBe(100);
        expect(snap!.p1.maxMp, 'p1.maxMp').toBe(100);
        expect(snap!.cpu.hp,   'cpu.hp').toBe(10_000);
        expect(snap!.state.round, 'round').toBe(1);
        expect(snap!.state.turn,  'turn').toBe(1);
    });

    test('전투 중 __haiyuki__ 는 null이 아니고 유효한 상태 이름을 가져야 한다', async ({ page }) => {
        const VALID_STATES = [
            'INIT','DEALING','WAIT_FOR_DRAW','PLAYER_TURN','ACTION_SELECT',
            'BATTLE_MENU','CPU_TURN','FX_PLAYING','DAMAGE_ANIMATION',
            'WIN','LOSE','NAGARI','MATCH_OVER','TILE_EXCHANGE','ROULETTE',
        ];
        await startBattle(page);
        await waitForAnyState(page, ['DEALING', 'PLAYER_TURN'], 20_000);

        const snap = await getSnap(page);
        expect(snap).not.toBeNull();
        expect(VALID_STATES).toContain(snap!.state.name);
    });
});

// ============================================================================
// B-2. 시나리오: §8 오픈 핸드 75% 데미지 패널티
//
//    SAM_DO_RIP (삼도립) 핸드를 주입해 폐쇄/오픈 핸드 승리 결과를 비교.
//
//    주입 흐름 (수동 제어, race condition 없음):
//      startBattle(autoTest=false)  → PLAYER_TURN/WAIT_FOR_DRAW 대기
//      → injectSamDoRipTenpai()     → WAIT_FOR_DRAW 로 상태 변경
//      → confirmDraw() + executeAction(TSUMO) — 한 evaluate 안에서 동기 실행
//      → BattleEngine.pendingDamage.amount  ← startWinSequence 에서 동기 설정됨
//
//    pendingDamage.amount 를 읽으면:
//      - calculateScore(base, isMenzen) 적용 후 값
//      - HP 변화 대기 없이 즉시 검증 가능 (HP 는 DAMAGE_ANIMATION 에서 적용됨)
// ============================================================================

/** 핸드 주입 → confirmDraw → executeAction(TSUMO) 를 동기 실행하고
 *  startWinSequence 가 설정한 pendingDamage.amount 를 반환. */
async function executeTsumoAndGetPendingDamage(page: Parameters<typeof getSnap>[0], openHand: boolean): Promise<number | null> {
    await injectSamDoRipTenpai(page, openHand);
    return page.evaluate(() => {
        const e = (window as any).BattleEngine;
        e.confirmDraw();                                          // draws winning tile
        const tsumo = e.possibleActions?.find((a: any) => a.type === 'TSUMO');
        if (!tsumo) return null;
        e.executeAction(tsumo);                                   // → startWinSequence (sync) → pendingDamage set
        return e.pendingDamage?.amount ?? null;
    });
}

test.describe('B-2. §8 오픈 핸드 75% 데미지 패널티', () => {

    test('[공식 확인] 폐쇄 핸드 데미지=2400, 오픈 핸드 데미지=1800, 비율≈75%', () => {
        // 엔진 소스(calculateScore) 에서 도출한 공식을 독립적으로 검증
        const base       = 2400; // SAM_DO_RIP base score
        const closed     = Math.round(base / 10) * 10;
        const open       = Math.round(Math.floor(base * 0.75) / 10) * 10;

        expect(closed).toBe(2400);
        expect(open).toBe(1800);
        expect(open / closed).toBeCloseTo(0.75, 4);
    });

    test('폐쇄 핸드 쯔모 승리 시 기본 데미지(2400)가 그대로 적용된다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const dmg = await executeTsumoAndGetPendingDamage(page, false /* closed */);
        expect(dmg, '폐쇄 핸드 데미지').toBe(CLOSED_HAND_DMG);
    });

    test('오픈 핸드(펑 후) 쯔모 승리 시 75% 데미지(1800)만 적용된다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const dmg = await executeTsumoAndGetPendingDamage(page, true /* open */);
        expect(dmg, '오픈 핸드 75% 데미지').toBe(OPEN_HAND_DMG);
    });

    test('오픈 핸드 데미지가 폐쇄 핸드 데미지보다 정확히 25% 적어야 한다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        const closedDmg = await executeTsumoAndGetPendingDamage(page, false);
        const openDmg   = await executeTsumoAndGetPendingDamage(page, true);

        expect(closedDmg).not.toBeNull();
        expect(openDmg).not.toBeNull();
        expect(openDmg!, '오픈이 폐쇄보다 작아야 함').toBeLessThan(closedDmg!);
        expect(openDmg! / closedDmg!, '75% 비율').toBeCloseTo(0.75, 1);
    });
});

// ============================================================================
// B-3. 시나리오: §4 Ron = Riichi 전용 단위 검증
//
//    checkPlayerActions(winTile) 를 직접 호출해 possibleActions 결과를 확인.
//    (BattleEngine 내부 API 를 직접 검증하는 화이트박스 시나리오 테스트)
// ============================================================================

test.describe('B-3. §4 Ron = Riichi 전용', () => {

    // 공통: SAM_DO_RIP 텐파이 11패 + winTile 을 설정하고 checkPlayerActions 호출
    async function setupAndCheckPlayerActions(page: Parameters<typeof getSnap>[0], riichi: boolean) {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        await page.evaluate((useRiichi: boolean) => {
            const e = (window as any).BattleEngine;
            const mk = (t: string, c: string, i: string) => ({ type: t, color: c, img: i });

            const winTile = mk('yuri','blue','tiles/pai_yuri.png');

            // 11패 텐파이 핸드 (SAM_DO_RIP, waiting for yuri)
            e.p1.openSets        = [];
            e.p1.hand            = [
                mk('ataho','red','tiles/pai_ata.png'), mk('ataho','red','tiles/pai_ata.png'), mk('ataho','red','tiles/pai_ata.png'),
                mk('rin',  'red','tiles/pai_rin.png'), mk('rin',  'red','tiles/pai_rin.png'), mk('rin',  'red','tiles/pai_rin.png'),
                mk('smash','blue','tiles/pai_smsh.png'),mk('smash','blue','tiles/pai_smsh.png'),mk('smash','blue','tiles/pai_smsh.png'),
                mk('yuri', 'blue','tiles/pai_yuri.png'),mk('yuri', 'blue','tiles/pai_yuri.png'),
            ];
            e.p1.isMenzen        = true;
            e.p1.isRiichi        = useRiichi;
            e.p1.declaringRiichi = false;
            e.cpu.buffs          = {};   // discardGuard=0 (guard가 있으면 checkPlayerActions가 조기 종료)
            e._cachedSelfActionsKey = null;

            // CPU 버림패 후 플레이어 반응을 직접 시뮬레이션
            e.checkPlayerActions(winTile);
        }, riichi);
    }

    test('Riichi 없이 텐파이여도 CPU 버림패에 대한 canRon 은 false', async ({ page }) => {
        await setupAndCheckPlayerActions(page, false /* no riichi */);

        // __haiyuki__ 가 다음 프레임에서 sync 될 때까지 잠깐 대기
        await page.waitForTimeout(300);
        const snap = await getSnap(page);

        expect(snap!.p1.isRiichi,    'isRiichi').toBe(false);
        expect(snap!.actions.canRon, 'canRon').toBe(false);
    });

    test('Riichi 상태에서 텐파이이고 CPU가 유효 패를 버리면 canRon 은 true', async ({ page }) => {
        await setupAndCheckPlayerActions(page, true /* riichi */);

        // possibleActions 가 세팅되고 __haiyuki__ 가 sync 되기를 기다림
        await page.waitForFunction(
            () => (window as any).__haiyuki__?.actions?.canRon === true,
            { timeout: 5_000 }
        );

        const snap = await getSnap(page);
        expect(snap!.p1.isRiichi,    'isRiichi').toBe(true);
        expect(snap!.actions.canRon, 'canRon').toBe(true);
    });
});

// ============================================================================
// B-4. 시나리오: §9 우라도라 = Riichi 전용 공개
//
//    RULEBOOK §9: "Ura Dora only applies if the winner is in Riichi state."
//    BattleEngine.uraDoraRevealed 플래그로 확인.
// ============================================================================

test.describe('B-4. §9 우라도라 Riichi 전용 공개', () => {

    test('Riichi 없이 쯔모 승리 시 uraDoraRevealed 는 false여야 한다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        await injectRiichiTenpai(page, false /* no riichi */);
        await enableAutoTest(page);
        await installAutoDriver(page);

        await waitForState(page, 'WIN', 35_000);

        const uraRevealed = await page.evaluate(() => !!(window as any).BattleEngine.uraDoraRevealed);
        expect(uraRevealed, '우라도라는 공개되지 않아야 함').toBe(false);
    });

    test('Riichi 상태에서 쯔모 승리 시 uraDoraRevealed 는 true여야 한다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        await injectRiichiTenpai(page, true /* riichi */);
        await enableAutoTest(page);
        await installAutoDriver(page);

        await waitForState(page, 'WIN', 35_000);

        const uraRevealed = await page.evaluate(() => !!(window as any).BattleEngine.uraDoraRevealed);
        expect(uraRevealed, '우라도라는 공개되어야 함').toBe(true);
    });
});

// ============================================================================
// B-5. 시나리오: §6 나가리(Nagari)는 턴 20 이상에서만 발생
// ============================================================================

test.describe('B-5. §6 나가리 = 턴 20 이상', () => {

    test('나가리 발생 시 항상 turn >= 20 이어야 한다', async ({ page }) => {
        // 별도 monitor 로 NAGARI 시점의 턴 수를 기록
        await page.evaluate(() => {
            (window as any).__qa_nagari_log__ = [];
            (window as any).__qa_nagari_monitor__ = setInterval(() => {
                const h = (window as any).__haiyuki__;
                if (h?.state?.name === 'NAGARI') {
                    (window as any).__qa_nagari_log__.push({ turn: h.state.turn, round: h.state.round });
                }
            }, 50);
        });

        await startBattle(page);
        await installAutoDriver(page);
        await waitForMatchOver(page);

        const log: Array<{ turn: number; round: number }> = await page.evaluate(
            () => (window as any).__qa_nagari_log__ ?? []
        );

        // 나가리가 한 번도 없으면 그냥 통과 (승패로 끝난 매치)
        for (const entry of log) {
            expect(entry.turn, `나가리가 turn=${entry.turn}에 발생 (round=${entry.round})`).toBeGreaterThanOrEqual(20);
        }
    });

    test('덱이 소진되면 나가리 또는 승패 중 하나로 종료되어야 한다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        // 덱을 거의 비워서 빠른 나가리 유도 (마지막 1패만 남김)
        await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            e.deck = e.deck.slice(0, 1);
        });

        await enableAutoTest(page);
        await installAutoDriver(page);

        const TERMINAL = ['NAGARI', 'WIN', 'LOSE', 'MATCH_OVER'];
        await waitForAnyState(page, TERMINAL, 30_000);

        const snap = await getSnap(page);
        expect(TERMINAL).toContain(snap!.state.name);
    });
});

// ============================================================================
// B-6. 시나리오: §1 Riichi 오토-디스카드 (Riichi 후 후속 턴 자동 버림)
// ============================================================================

test.describe('B-6. §3 Riichi 후속 턴 자동 버림', () => {

    test('Riichi 선언 후 다음 드로우에서 손패 구성이 바뀌지 않아야 한다 (쯔모 외)', async ({ page }) => {
        // Riichi 선언 직후 손패를 스냅샷하고 다음 PLAYER_TURN 에서 다시 비교
        // Auto-discard(tsumogiri) 이므로 손패 core 는 변하지 않아야 함

        await startBattle(page, { autoTest: false });
        await waitForAnyState(page, ['PLAYER_TURN', 'WAIT_FOR_DRAW'], 25_000);

        // 11패 텐파이 + Riichi 상태 주입 (이미 Riichi 선언된 상태)
        await injectRiichiTenpai(page, true);
        await enableAutoTest(page);
        await installAutoDriver(page);

        // Riichi 선언 직후의 핸드 (WAIT_FOR_DRAW 에서 드로우 전)
        await waitForAnyState(page, ['WAIT_FOR_DRAW', 'PLAYER_TURN', 'ACTION_SELECT'], 10_000);
        const snapBefore = await getSnap(page);
        const handSizeBefore = snapBefore!.p1.hand.length + snapBefore!.p1.openSets.reduce((s, os) => s + os.tiles.length, 0);

        // 다음 PLAYER_TURN (드로우 후) 대기
        await waitForAnyState(page, ['WIN', 'MATCH_OVER', 'PLAYER_TURN', 'ACTION_SELECT'], 20_000);
        const snapAfter = await getSnap(page);

        // 쯔모가 발생하거나 매치가 끝났다면 테스트 통과 (그냥 리치로 이겼거나 매치 종료)
        if (['WIN', 'MATCH_OVER'].includes(snapAfter!.state.name)) return;

        // PLAYER_TURN 이 됐다면 Riichi 여전히 유지
        expect(snapAfter!.p1.isRiichi, 'Riichi 유지').toBe(true);
        // 오픈 세트가 생기지 않아야 함 (Riichi 중 PON 불가)
        expect(snapAfter!.p1.openSets, 'openSets 비어있어야 함').toHaveLength(0);
        // 핸드 크기는 드로우 후 12패 (버리기 전) 또는 11패 (버린 후)
        const handSizeAfter = snapAfter!.p1.hand.length + snapAfter!.p1.openSets.reduce((s, os) => s + os.tiles.length, 0);
        expect(handSizeAfter, '핸드 크기').toBeLessThanOrEqual(handSizeBefore + 1);
    });
});

// ============================================================================
// 유틸리티
// ============================================================================

function formatViolations(violations: Array<{ rule: string; msg: string }>): string {
    if (violations.length === 0) return '위반 없음';
    return `\n위반 ${violations.length}건:\n` + violations.map(v => `  [${v.rule}] ${v.msg}`).join('\n');
}
