/**
 * 렌더링 비주얼 회귀 (G)
 *
 * 스위트 전체에 렌더링 단언이 하나도 없었다. `_titlecheck`/`_logocheck`/`_creditcheck`
 * 는 캔버스 스크린샷을 파일로 떨구기만 하고 expect 가 없어서, 그림이 깨져도
 * 예외만 안 나면 통과한다(눈으로 보는 캡처 도구지 회귀 테스트가 아니다).
 *
 * 그래서 아래 리팩토링 대상들이 전부 무방비였다:
 *   - encounterScene 의 말풍선 그리기 중복 제거
 *   - 캐릭터 이름 스트로크+필 렌더링 공용화 (encounter / charSelect / battleRenderer 3곳)
 *   - battleRenderer 히트테스트 분리, battleScene FX 추출
 *   - assets.js 의 drawWindow/drawButton 등 UI 위젯을 views/ 로 이동
 *
 * 사용법 (리팩토링 워크플로):
 *   1. 리팩토링 **전에** 한 번 돌려 베이스라인을 만든다.
 *      최초 실행은 "snapshot doesn't exist, writing actual" 로 **실패**하면서
 *      베이스라인을 쓴다 — 한 번 더 돌리면 통과한다. 이게 정상이다.
 *   2. 리팩토링한다.
 *   3. 다시 돌린다. 순수 리팩토링이라면 픽셀이 같아야 하므로 통과해야 한다.
 *
 * 베이스라인은 visual.spec.ts-snapshots/ 에 생기고 커밋 대상이다.
 *
 * 결정성: Game.update 를 no-op 으로 덮어 애니메이션(초상화 눈깜빡임·타이머·FX)을
 * 완전히 정지시킨 뒤, 씬 필드를 고정값으로 주입하고 Game.draw() 를 직접 부른다.
 * 웹폰트가 로드되기 전에 찍으면 글자가 폴백 폰트로 나오므로 document.fonts.ready 를 기다린다.
 */
import { test, expect, type Page } from '@playwright/test';

// 허용오차 0. 순수 리팩토링이라면 픽셀이 완전히 같아야 하므로 조금도 봐주지 않는다.
// 느슨하게 뒀다가 실제로 놓친 적이 있다 — maxDiffPixelRatio 0.001(=307px)로는
// 이름 스트로크 두께를 4→6으로 바꿔도 통과했다.
const SHOT = { maxDiffPixels: 0 } as const;

async function bootFrozen(page: Page) {
    await page.goto('/');
    // 로딩(COMPILE 스플래시)이 끝나 TitleScene 이 뜰 때까지 기다린다
    await page.waitForFunction(() => {
        try { return (0, eval)('Game').currentScene === (0, eval)('TitleScene'); }
        catch { return false; }
    }, { timeout: 30_000 });

    await page.evaluate(() => {
        const g = (0, eval)('Game');
        (0, eval)('Assets').setMute(true);
        g.isAutoTest = false;
        g.update = function () { };   // 모든 애니메이션 정지 — draw 만 계속 돈다
    });
    await page.evaluate(() => (document as any).fonts.ready);
}

/** 씬을 띄우고 고정값을 주입한 뒤 한 프레임 그린다. */
async function renderScene(page: Page, sceneName: string, data: any, freeze: Record<string, any> = {}) {
    await page.evaluate(({ sceneName, data, freeze }) => {
        const g = (0, eval)('Game');
        const scene = (0, eval)(sceneName);
        g.changeScene(scene, data);
        Object.assign(scene, freeze);
        g.draw();
    }, { sceneName, data, freeze });
    await page.waitForTimeout(60);
}

const canvas = (page: Page) => page.locator('#game-canvas');

test.describe('G. 렌더링 비주얼 회귀', () => {
    test.beforeEach(async ({ page }) => {
        await bootFrozen(page);
    });

    test('캐릭터 선택 — 초상화·이름 스트로크 렌더링', async ({ page }) => {
        await renderScene(page, 'CharacterSelectScene', { mode: 'STORY' }, {
            playerIndex: 0,
            cpuIndex: 1,
            currentState: 0,   // STATE_PLAYER_SELECT
            timer: 0,
            cpuTimer: 0
        });
        await expect(canvas(page)).toHaveScreenshot('charselect.png', SHOT);
    });

    test('인카운터(STORY) — 대사 말풍선', async ({ page }) => {
        await renderScene(page, 'EncounterScene',
            { playerIndex: 0, cpuIndex: 1, mode: 'STORY', defeatedOpponents: [] },
            { state: 1, currentLineIndex: 0, textTimer: 99999 });
        await expect(canvas(page)).toHaveScreenshot('encounter-story.png', SHOT);
    });

    test('인카운터(CHALLENGER) — 마유 난입 모놀로그 말풍선', async ({ page }) => {
        // encounterScene 안에서 말풍선 그리기가 복붙된 두 번째 경로
        // (drawChallengerMonologue). 중복 제거 리팩토링의 핵심 대상.
        const mayuIndex = await page.evaluate(() =>
            (0, eval)('CharacterData').findIndex((c: any) => c.id === 'mayu'));

        await renderScene(page, 'EncounterScene',
            { playerIndex: 0, cpuIndex: mayuIndex, mode: 'CHALLENGER', defeatedOpponents: [] },
            { state: 1, currentLineIndex: 0, textTimer: 99999 });
        await expect(canvas(page)).toHaveScreenshot('encounter-challenger.png', SHOT);
    });

    test('전투 — 손패·UI 위젯·이름 표시', async ({ page }) => {
        await page.evaluate(() => {
            const g = (0, eval)('Game');
            const e = (window as any).BattleEngine;
            (0, eval)('BattleConfig').RULES.SKILLS_ENABLED = false;
            g.changeScene((0, eval)('BattleScene'), { playerIndex: 0, cpuIndex: 1 });

            // 배경은 매 전투 랜덤(battleEngine init의 bgIndex)이라 고정하지 않으면
            // 스크린샷이 실행마다 달라진다.
            e.bgPath = 'bg/00.png';

            // 손패를 고정값으로 주입해 랜덤 덱을 제거한다
            const mk = (t: string, c: string, img: string) => ({ type: t, color: c, img });
            e.p1.hand = [
                mk('ataho', 'red', 'tiles/pai_ata.png'), mk('ataho', 'red', 'tiles/pai_ata.png'),
                mk('rin', 'red', 'tiles/pai_rin.png'), mk('rin', 'red', 'tiles/pai_rin.png'),
                mk('smash', 'blue', 'tiles/pai_smsh.png'), mk('smash', 'blue', 'tiles/pai_smsh.png'),
                mk('yuri', 'blue', 'tiles/pai_yuri.png'), mk('yuri', 'blue', 'tiles/pai_yuri.png'),
                mk('pet', 'yellow', 'tiles/pai_pet.png'), mk('fari', 'yellow', 'tiles/pai_fari.png'),
                mk('wand', 'yellow', 'tiles/pai_wand.png')
            ];
            e.p1.openSets = [];
            e.p1.hp = 8000; e.cpu.hp = 6400;
            e.p1.mp = 50; e.cpu.mp = 30;
            e.doras = []; e.uraDoras = [];
            e.hoverIndex = 0;
            e.currentState = e.STATE_PLAYER_TURN;
            e.timer = 0;
            g.draw();
        });
        await page.waitForTimeout(60);
        await expect(canvas(page)).toHaveScreenshot('battle-player-turn.png', SHOT);
    });
});

test.describe('G. VS MODE 로비 화면', () => {
    const PREVIEWS = ['start', 'start-failed', 'wait-host', 'wait-guest', 'ended-win', 'ended-waiting',
        'ended-peer-rematch', 'ended-takeover', 'ended-long'];
    const WIDTHS = [{ label: '640', viewport: { width: 1100, height: 900 } }, { label: '360', viewport: { width: 360, height: 800 } }];

    for (const w of WIDTHS) {
        for (const name of PREVIEWS) {
            test(`preview ${name} @${w.label}`, async ({ page }) => {
                await page.setViewportSize(w.viewport);
                await page.goto(`/vs.html?preview=${name}`);
                await page.waitForFunction(() => {
                    try { return (0, eval)('OnlineLobby').ready; } catch { return false; }
                }, undefined, { timeout: 30_000 });
                await page.evaluate(() => {
                    (0, eval)('Assets').setMute(true);
                    const g = (0, eval)('Game');
                    g.update = function () { };
                    g.draw();
                });
                await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
                await page.evaluate(() => (document as any).fonts.ready);
                await page.waitForTimeout(150);
                await expect(page.locator('#game-container')).toHaveScreenshot(`vs-${name}-${w.label}.png`, SHOT);
            });
        }
    }
});
