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
// SPIRIT_RIICHI 중복 사용 방지
//
// battleEngine.js Fix 적용 결과를 검증한다.
// spiritTimer > 0(이미 기합 리치 활성) 상태에서 재사용을 canUseSkill이 차단하는지 확인.
// ============================================================================

test.describe('SPIRIT_RIICHI 중복 사용 방지', () => {

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

    test('SPIRIT_RIICHI 사용 시 실제 리치가 걸리고 타패가 텐파이 유지 패로 제한된다', async ({ page }) => {
        await setupSpiritRiichiEnv(page);

        const r = await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            e.p1.buffs = {};
            e.currentState = e.STATE_PLAYER_TURN;
            e._cachedSelfActionsKey = null; e._cachedSelfActions = null;
            const used = e.useSkill('SPIRIT_RIICHI', 'P1');
            const valid: number[] = Array.isArray(e.validRiichiDiscardIndices) ? e.validRiichiDiscardIndices : [];
            const punchIdx = e.p1.hand.findIndex((t: any) => t.type === 'punch');
            return {
                used,
                isRiichi: e.p1.isRiichi,
                declaringRiichi: e.p1.declaringRiichi,
                spiritTimer: e.p1.buffs.spiritTimer,
                validCount: valid.length,
                punchAllowed: valid.includes(punchIdx),  // 텐파이 유지 → 허용
                atahoAllowed: valid.includes(0),          // ataho 버리면 텐파이 깨짐 → 불허
            };
        });

        expect(r.used, '스킬 사용 성공').toBe(true);
        expect(r.isRiichi, '실제 리치 선언됨').toBe(true);
        expect(r.declaringRiichi, '다음 타패가 리치패').toBe(true);
        expect(r.spiritTimer, '기합 타이머 5턴').toBe(5);
        expect(r.validCount, '버릴 수 있는 패가 제한됨').toBeGreaterThan(0);
        expect(r.punchAllowed, '텐파이 유지 패(punch)는 버릴 수 있음').toBe(true);
        expect(r.atahoAllowed, '텐파이 깨는 패(ataho)는 못 버림').toBe(false);
    });
});

// ============================================================================
// LAST_CHANCE 룰렛 결과 검증
//
// RULEBOOK §10: "Roulette of actual Remaining Deck — winning tile → Tsumo"
// resolveRouletteResult() 를 직접 호출해 이기는/지는 패 두 경우를 검증한다.
// 이기는 패: winningYaku 설정됨 / 지는 패: winningYaku null 유지
// activateLastChance() 호출 시 STATE_ROULETTE 진입도 확인한다.
// ============================================================================

test.describe('LAST_CHANCE 룰렛', () => {

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
            e.lastChance = { who: 'P1', phase: 'spin', t: 0, tile: mk('yuri', 'blue', 'tiles/pai_yuri.png') };
            (0, eval)('SkillFlows').lastChanceJudge(e);
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
            e.lastChance = { who: 'P1', phase: 'spin', t: 0, tile: mk('punch', 'red', 'tiles/pai_punch.png') };
            e.winningYaku = null;
            (0, eval)('SkillFlows').lastChanceJudge(e);
            return e.winningYaku === null && e.lastChance.phase === 'miss';
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
// "리치 가능 시" 전용 스킬은 펑 후(오픈 핸드)에 사용 불가해야 한다
//
//    desc 대조 감사로 발견(2026-06-13): TIGER_STRIKE/SPIRIT_RIICHI 는
//    "리치를 걸 수 있을 때"만 쓸 수 있으나, 멘젠 체크가 없어 펑 후에도 활성화됐음.
//    이제 engine.canDeclareRiichi(who) 로 게이팅.
// ============================================================================

test.describe('리치 전용 스킬 멘젠 게이팅', () => {

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
// 전 스킬 효과(execute) 검증 — desc 대조 전수 (2026-06-13 감사)
//
//    canUse(언제 쓸 수 있나)뿐 아니라 execute(실제 효과)가 desc대로 동작하는지
//    13개 스킬 전부를 실제 발동시켜 확인. 일회성 수동 검증을 자동화로 고정.
// ============================================================================

test.describe('전 스킬 효과 전수 검증', () => {

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
            // guaranteedWin + 손패 고정(리치): 텐파이 유지 강제 → 보장 승리패 확보
            const tigerBuff = e.p1.buffs.guaranteedWin === true &&
                e.p1.isRiichi === true && e.p1.declaringRiichi === true;
            e.deck.push(mk('punch')); e.deck.push(mk('punch'));
            const drawn = e.drawTiles(1, e.p1);
            out.tiger = tigerBuff &&
                (!!Y.checkYaku([...e.p1.hand, drawn[0]], e.p1.id) || !!Y.checkYaku([...tenpai(), drawn[0]], e.p1.id));

            // SPIRIT_RIICHI: timer 5 → 5턴 후 보장승
            reset(); SR.SPIRIT_RIICHI.execute(e, 'P1', e.p1);
            const t5 = e.p1.buffs.spiritTimer === 5;
            for (let i = 0; i < 5; i++) e.manageBuffs(e.p1);
            out.spirit = t5 && e.p1.buffs.guaranteedWin === true;

            // CRITICAL: 가해 정확히 ×1.25 (이중 적용 ×1.5625가 아니어야 함), 소비.
            // cBase는 버프 부여 '전'에 캡처한 무버프 기준값 → 실제 게임 흐름
            // (calculateScore → startWinSequence)이 정확히 한 번만 ×1.25 해야 통과.
            reset(); e.p1.hand = tenpai().concat(mk('fari')); e.winningYaku = Y.checkYaku(e.p1.hand, e.p1.id);
            const cBase = e.calculateScore(e.winningYaku.score, e.p1.isMenzen, e.p1, e.cpu);
            SR.CRITICAL.execute(e, 'P1', e.p1);
            const cScored = e.calculateScore(e.winningYaku.score, e.p1.isMenzen, e.p1, e.cpu);
            BS.startWinSequence(e, 'TSUMO', 'P1', cScored);
            out.critical = e.pendingDamage.amount === Math.floor(cBase * 1.25) && !e.p1.buffs.attackUp;

            // WATER_MIRROR: 피격 정확히 ×0.75 (이중 적용 ×0.5625가 아니어야 함), 소비
            reset(); e.cpu.hand = tenpai().concat(mk('fari')); e.winningYaku = Y.checkYaku(e.cpu.hand, e.cpu.id);
            const wBase = e.calculateScore(e.winningYaku.score, e.cpu.isMenzen, e.cpu, e.p1);
            SR.WATER_MIRROR.execute(e, 'P1', e.p1);
            const wScored = e.calculateScore(e.winningYaku.score, e.cpu.isMenzen, e.cpu, e.p1);
            BS.startWinSequence(e, 'TSUMO', 'CPU', wScored);
            out.waterMirror = e.pendingDamage.amount === Math.floor(wBase * 0.75) && !e.p1.buffs.defenseUp;

            // RECOVERY: +1600, 상한 캡, 만피 불가
            reset(); e.p1.maxHp = 10000; e.p1.hp = 5000; SR.RECOVERY.execute(e, 'P1', e.p1);
            const healed = e.p1.hp === 6600; e.p1.hp = 9000; SR.RECOVERY.execute(e, 'P1', e.p1);
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

    test('버림 대사 칸: 뽑은 패 여부 + 상대 리치 중 종류 분류 + 빈 풀 폴백', async ({ page }) => {
        await setupSkillHarness(page);
        const r = await page.evaluate(() => {
            const e = (window as any).BattleEngine, mk = (window as any).__mk;
            const out: any = {};

            e.lastDrawInfo.CPU = { tile: mk('ataho'), preHand: [] };
            out.drawn = e.isDrawnKind('CPU', mk('ataho')) === true;
            out.notDrawn = e.isDrawnKind('CPU', mk('smash')) === false;
            e.lastDrawInfo.CPU = null;
            out.noDraw = e.isDrawnKind('CPU', mk('ataho')) === false;

            const own = (t: any, owner: string, riichi = false) => Object.assign(t, { owner, isRiichi: riichi });
            e.discards = [own(mk('smash'), 'p1'), own(mk('wand'), 'p1', true), own(mk('punch'), 'cpu')];
            out.unseen = e.riichiDiscardKey('P1', mk('ataho')) === 'DISCARD_UNSEEN';
            out.passed = e.riichiDiscardKey('P1', mk('wand')) === 'DISCARD_PASSED';
            out.beforeRiichi = e.riichiDiscardKey('P1', mk('smash')) === null;
            out.cpuPassed = e.riichiDiscardKey('P1', mk('punch')) === 'DISCARD_UNSEEN';

            const DD = (0, eval)('DialogueData');
            const saved = DD.BATTLE.ataho;
            e.cpu.id = 'ataho';
            const sayWith = (charDef: any, key: string, fb: string) => {
                DD.BATTLE.ataho = charDef;
                const before = e.events.length;
                e.triggerDialogue(key, 'cpu', fb);
                const ev = e.events.slice(before).find((x: any) => x.type === 'DIALOGUE');
                return ev ? ev.text : null;
            };
            out.fallback = sayWith({ GOOD_DRAW: [], RANDOM: ['__FB__'] }, 'GOOD_DRAW', 'RANDOM') === '__FB__';
            out.atahoGood = sayWith({ GOOD_DRAW: ['__GD__'], RANDOM: ['__FB__'] }, 'GOOD_DRAW', 'RANDOM') === '__GD__';
            DD.BATTLE.ataho = saved;

            return out;
        });
        for (const k of Object.keys(r)) expect(r[k], k).toBe(true);
    });
});
