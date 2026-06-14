/**
 * 환세패유기 게임 흐름(씬 전환) 테스트
 *
 * 전투 로직이 아니라 매치 종료 이후의 진행을 검증한다:
 *   D-1 토너먼트 진행   — 승리(보스 외) → 다음 상대 인카운터
 *   D-2 캐릭터 엔딩     — 전 상대 격파 → 엔딩 대화 → EndingScene
 *   D-3 트루 엔딩/해금  — 마유 격파 → 마유 해금 저장 + TRUE 크레딧
 *   D-4 컨티뉴          — 패배 → 컨티뉴 화면, 재시도/포기 분기
 *
 * 씬 객체는 const 라 window 에 없으므로 (0, eval)('SceneName') 으로 접근한다.
 * (battle.spec.ts / helpers.ts 와 동일 패턴.)
 *
 * 마유는 CharacterData 의 7번째(인덱스 6) 히든 캐릭터. proceedFromMatchOver 는
 * cpuIndex === 6 으로 트루 엔딩을 판정한다(엔트리에 index 필드가 없기 때문).
 */

import { test, expect } from '@playwright/test';
import { waitForGame, startBattle } from './helpers';

const GAME_URL = '/';

test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await waitForGame(page);
    // 씬 전환마다 BGM 재생을 시도하므로 음소거로 노이즈 제거
    await page.evaluate(() => (0, eval)('Assets').setMute(true));
});

test.describe('D. 게임 흐름 / 진행 검증', () => {

    // ── D-1. 토너먼트 진행 ──────────────────────────────────────────────────
    test('승리(보스 외) → 다음 상대 인카운터로 진행하고 격파 목록이 갱신된다', async ({ page }) => {
        await startBattle(page, { playerIndex: 0, cpuIndex: 1, autoTest: false });
        const r = await page.evaluate(() => {
            const g = (0, eval)('Game');
            const e = (window as any).BattleEngine;
            const EncounterScene = (0, eval)('EncounterScene');
            const CharacterSelectScene = (0, eval)('CharacterSelectScene');

            e.playerIndex = 0; e.cpuIndex = 1; e.matchWinner = 'P1';
            e.defeatedOpponents = [];
            e.proceedFromMatchOver(); // → CharacterSelectScene(NEXT_MATCH): 상대 룰렛 → READY → Encounter

            // 다음 상대 선택은 이제 룰렛 애니메이션을 거쳐 비동기로 전환되므로 프레임을 진행시킨다.
            for (let i = 0; i < 300 && g.currentScene === CharacterSelectScene; i++) {
                g.currentScene.update(1);
            }

            return {
                isEncounter: g.currentScene === EncounterScene,
                nextCpu: EncounterScene.cpuIndex,
                defeatedHas1: e.defeatedOpponents.includes(1),
            };
        });
        expect(r.isEncounter).toBe(true);
        expect(r.defeatedHas1).toBe(true);
        // 남은 상대(플레이어=0, 격파=1, 히든 마유=6 제외) 중 하나여야 함
        expect([2, 3, 4, 5]).toContain(r.nextCpu);
    });

    // ── D-2. 캐릭터 엔딩 ────────────────────────────────────────────────────
    test('전 상대 격파 후 승리 → 캐릭터 엔딩 대화(ENDING)로 진입한다', async ({ page }) => {
        await startBattle(page, { playerIndex: 0, cpuIndex: 5, autoTest: false });
        const r = await page.evaluate(() => {
            const g = (0, eval)('Game');
            const e = (window as any).BattleEngine;
            const EncounterScene = (0, eval)('EncounterScene');
            const CharacterSelectScene = (0, eval)('CharacterSelectScene');

            e.playerIndex = 0; e.cpuIndex = 5; e.matchWinner = 'P1';
            e.defeatedOpponents = [1, 2, 3, 4]; // 5를 이기면 비히든 5명 전원 격파
            e.proceedFromMatchOver();

            // 남은 상대 없음 → 룰렛 착지에서 goToEnding 으로 전환. 프레임을 진행시킨다.
            for (let i = 0; i < 300 && g.currentScene === CharacterSelectScene; i++) {
                g.currentScene.update(1);
            }

            return { isEncounter: g.currentScene === EncounterScene, mode: EncounterScene.mode };
        });
        expect(r.isEncounter).toBe(true);
        expect(r.mode).toBe('ENDING');
    });

    test('EndingScene 가 캐릭터별 엔딩 이미지 키를 해석하고 에러 없이 초기화된다', async ({ page }) => {
        const results = await page.evaluate(() => {
            const g = (0, eval)('Game');
            const EndingScene = (0, eval)('EndingScene');
            const out: Array<{ i: number; key?: string; error?: string }> = [];
            for (let i = 0; i < 6; i++) { // 선택 가능한 6 캐릭터
                try {
                    g.changeScene(EndingScene, { playerIndex: i, cpuIndex: 0 });
                    out.push({ i, key: EndingScene.endingImageKey });
                } catch (err) {
                    out.push({ i, error: String(err) });
                }
            }
            return out;
        });
        for (const x of results) {
            expect(x.error, `playerIndex ${x.i} 엔딩 초기화 에러`).toBeUndefined();
            expect(x.key, `playerIndex ${x.i} 엔딩 이미지 키`).toMatch(/^ending\/.+\.png$/);
        }
    });

    // ── D-3. 트루 엔딩 + 마유 해금 ──────────────────────────────────────────
    test('마유 격파 → 마유 해금이 저장되고 TRUE_ENDING_CLEAR 로 진입한다', async ({ page }) => {
        await startBattle(page, { playerIndex: 0, cpuIndex: 6, autoTest: false });
        const r = await page.evaluate(() => {
            const g = (0, eval)('Game');
            const e = (window as any).BattleEngine;
            const EncounterScene = (0, eval)('EncounterScene');

            // 해금 전 깨끗한 상태에서 시작
            localStorage.removeItem('haiyuki_save');
            g.saveData = { unlocked: [], difficulty: 'normal' };

            e.playerIndex = 0; e.cpuIndex = 6; e.matchWinner = 'P1';
            e.defeatedOpponents = [1, 2, 3, 4, 5];
            e.proceedFromMatchOver();

            let persisted: any = null;
            try { persisted = JSON.parse(localStorage.getItem('haiyuki_save') || 'null'); } catch (_) { }

            return {
                isEncounter: g.currentScene === EncounterScene,
                mode: EncounterScene.mode,
                unlockedInMem: g.saveData.unlocked.includes('mayu'),
                unlockedPersisted: !!(persisted && Array.isArray(persisted.unlocked) && persisted.unlocked.includes('mayu')),
            };
        });
        expect(r.isEncounter).toBe(true);
        expect(r.mode).toBe('TRUE_ENDING_CLEAR');
        expect(r.unlockedInMem).toBe(true);
        expect(r.unlockedPersisted).toBe(true);
    });

    test('마유로 플레이 시 히든 보스 난입(트루 엔딩) 분기로 가지 않는다', async ({ page }) => {
        const r = await page.evaluate(() => {
            const g = (0, eval)('Game');
            const EndingScene = (0, eval)('EndingScene');
            const EncounterScene = (0, eval)('EncounterScene');
            const CreditsScene = (0, eval)('CreditsScene');
            const CharacterData = (0, eval)('CharacterData');
            const mayuIndex = CharacterData.findIndex((c: any) => c.id === 'mayu');

            // 난입 조건을 일부러 충족(첫 클리어 + 마유 미해금)시켜도,
            // 플레이어가 마유면 난입이 아니라 일반 크레딧으로 가야 한다.
            g.continueCount = 0;
            g.saveData = { unlocked: [], difficulty: 'normal' };

            g.changeScene(EndingScene, { playerIndex: mayuIndex });
            g.currentScene.checkTrueEnding();

            return {
                mayuIndexValid: mayuIndex >= 0,
                isChallenger: g.currentScene === EncounterScene && EncounterScene.mode === 'CHALLENGER',
                isCredits: g.currentScene === CreditsScene,
                endingType: CreditsScene.endingType,
            };
        });
        expect(r.mayuIndexValid).toBe(true);
        expect(r.isChallenger).toBe(false); // 난입 안 함
        expect(r.isCredits).toBe(true);
        expect(r.endingType).toBe('NORMAL');
    });

    test('CreditsScene 가 TRUE / NORMAL 엔딩 타입으로 진입한다', async ({ page }) => {
        const r = await page.evaluate(() => {
            const g = (0, eval)('Game');
            const CreditsScene = (0, eval)('CreditsScene');
            g.changeScene(CreditsScene, { endingType: 'TRUE' });
            const trueOk = g.currentScene === CreditsScene && CreditsScene.endingType === 'TRUE';
            g.changeScene(CreditsScene, { endingType: 'NORMAL' });
            const normalOk = g.currentScene === CreditsScene && CreditsScene.endingType === 'NORMAL';
            return { trueOk, normalOk };
        });
        expect(r.trueOk).toBe(true);
        expect(r.normalOk).toBe(true);
    });

    // ── D-4. 컨티뉴 ─────────────────────────────────────────────────────────
    test('패배 → 컨티뉴 화면 진입 + continueCount 증가 + 격파 목록 유지', async ({ page }) => {
        await startBattle(page, { playerIndex: 0, cpuIndex: 1, autoTest: false });
        const r = await page.evaluate(() => {
            const g = (0, eval)('Game');
            const e = (window as any).BattleEngine;
            const ContinueScene = (0, eval)('ContinueScene');

            const before = g.continueCount;
            e.playerIndex = 0; e.cpuIndex = 1; e.matchWinner = 'CPU';
            e.defeatedOpponents = [2, 3];
            e.proceedFromMatchOver();

            return {
                isContinue: g.currentScene === ContinueScene,
                delta: g.continueCount - before,
                keptDefeated: JSON.stringify(ContinueScene.data && ContinueScene.data.defeatedOpponents),
            };
        });
        expect(r.isContinue).toBe(true);
        expect(r.delta).toBe(1);
        expect(r.keptDefeated).toBe(JSON.stringify([2, 3]));
    });

    test('컨티뉴 YES(재시도) → 전투 재진입, 격파 목록 보존', async ({ page }) => {
        const r = await page.evaluate(() => {
            const g = (0, eval)('Game');
            const ContinueScene = (0, eval)('ContinueScene');
            const BattleScene = (0, eval)('BattleScene');

            g.changeScene(ContinueScene, { playerIndex: 0, cpuIndex: 1, defeatedOpponents: [2, 3], isNextRound: false });
            ContinueScene.retry();

            return {
                isBattle: g.currentScene === BattleScene,
                defeated: JSON.stringify((window as any).BattleEngine.defeatedOpponents),
            };
        });
        expect(r.isBattle).toBe(true);
        expect(r.defeated).toBe(JSON.stringify([2, 3]));
    });

    test('컨티뉴 NO(포기): 일반 상대 → 타이틀 / 마유 → NORMAL 크레딧', async ({ page }) => {
        const r = await page.evaluate(() => {
            const g = (0, eval)('Game');
            const ContinueScene = (0, eval)('ContinueScene');
            const TitleScene = (0, eval)('TitleScene');
            const CreditsScene = (0, eval)('CreditsScene');

            // 일반 상대 포기 → 타이틀
            g.changeScene(ContinueScene, { playerIndex: 0, cpuIndex: 1, defeatedOpponents: [] });
            ContinueScene.giveUp();
            const afterNormal = g.currentScene === TitleScene;

            // 마유 상대 포기 → NORMAL 크레딧 (트루엔딩 포기)
            g.changeScene(ContinueScene, { playerIndex: 0, cpuIndex: 6, defeatedOpponents: [] });
            ContinueScene.giveUp();
            const afterMayu = (g.currentScene === CreditsScene) ? CreditsScene.endingType : 'not-credits';

            return { afterNormal, afterMayu };
        });
        expect(r.afterNormal).toBe(true);
        expect(r.afterMayu).toBe('NORMAL');
    });

    // ── D-5. 마유는 트루엔딩 보스 전용 (해금 후에도 일반 상대로 안 나옴) ───────
    test('마유 해금 상태에서도 일반 상대 선정에 마유가 절대 포함되지 않는다', async ({ page }) => {
        const r = await page.evaluate(() => {
            const g = (0, eval)('Game');
            const CSS = (0, eval)('CharacterSelectScene');
            const CD = (0, eval)('CharacterData');
            const mayuIdx = CD.findIndex((c: any) => c.id === 'mayu');

            // 마유 해금 + 캐릭터 선택 진입
            localStorage.removeItem('haiyuki_save');
            g.saveData = { unlocked: ['mayu'], difficulty: 'normal' };
            g.changeScene(CSS, { mode: 'STORY' });
            CSS.playerIndex = 0;        // 일반 캐릭터로 플레이
            CSS.defeatedOpponents = [];

            const rosterHasMayu = CSS.characters.some((c: any) => c.id === 'mayu');
            const available = CSS.getAvailableOpponents();

            // 첫 매치 룰렛이 쓰는 chooseOpponentIndex 를 다회 추첨 → 마유가 한 번도 안 나와야 함
            let chooseEverMayu = false;
            for (let i = 0; i < 300; i++) {
                if (CSS.chooseOpponentIndex() === mayuIdx) { chooseEverMayu = true; break; }
            }

            // 마유로 플레이하는 경우: 상대는 0~5 전부, 자기 자신은 제외
            CSS.playerIndex = mayuIdx;
            const avAsMayu = CSS.getAvailableOpponents();

            return {
                rosterHasMayu,                                  // true: 캐릭터로는 선택 가능
                availableHasMayu: available.includes(mayuIdx),  // false: 상대로는 불가
                chooseEverMayu,                                 // false
                asMayuOpponents: avAsMayu.length,               // 6
                asMayuExcludesSelf: !avAsMayu.includes(mayuIdx) // true
            };
        });
        expect(r.rosterHasMayu).toBe(true);
        expect(r.availableHasMayu).toBe(false);
        expect(r.chooseEverMayu).toBe(false);
        expect(r.asMayuOpponents).toBe(6);
        expect(r.asMayuExcludesSelf).toBe(true);
    });
});
