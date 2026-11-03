/**
 * 비배틀 씬 입력/커서/사운드 검증 (F)
 *
 * 기존 스펙의 공백을 메운다:
 *   - input.spec.ts 는 실제 키 입력을 쓰는 유일한 스펙이지만 전부 BattleScene 이다.
 *   - flow.spec.ts 등 나머지는 update()/changeScene() 을 직접 불러 입력 레이어를 우회한다.
 *   - 사운드에 대한 단언이 스위트 전체에 하나도 없었다.
 *
 * 그 결과 타이틀·캐릭터선택·컨티뉴의 "확인키(Z/Space)"와 "커서 이동 + 효과음"이
 * 전혀 안 덮여 있었다. 이 셋은 코드 전반에 19곳(확인키) / 5곳(커서)으로 복붙되어 있어
 * 공용 헬퍼로 통합하려는 대상이다. 통합 전후로 동작이 같은지 여기서 잠근다.
 *
 * 씬마다 커서 사운드 ID가 달랐던 건(타이틀 'audio/tick' vs 컨티뉴 'audio/select')
 * 설계가 아니라 **버그**였다 — 'audio/select' 는 매니페스트에 등록조차 안 돼 있어
 * 실제로는 무음이었다(등록된 커서 사운드는 'audio/tick' 하나뿐). 지금은 통일해 고쳤다.
 *
 * 재발 방지로 getMissingSfx() 단언을 함께 둔다 — 등록 안 된 id를 부르면
 * playSound 가 console.warn 만 하고 조용히 끝나기 때문에 눈으로는 안 잡힌다.
 *
 * 타이밍: Input.isJustPressed 는 keydown 다음 프레임에 true 가 되므로
 * input.spec.ts 와 동일하게 키를 ~70ms 눌러 유지한다.
 */
import { test, expect, type Page } from '@playwright/test';
import { installAudioSpy, clearAudioLog, getSfxIds, getMissingSfx } from './helpers';

async function tapKey(page: Page, key: string) {
    await page.keyboard.down(key);
    await page.waitForTimeout(70);
    await page.keyboard.up(key);
    await page.waitForTimeout(60);
}

/** 로딩(COMPILE 스플래시)이 끝나고 TitleScene 이 활성화될 때까지 기다린다. */
async function waitForTitle(page: Page) {
    await page.waitForFunction(() => {
        try {
            const g = (0, eval)('Game');
            return g.currentScene === (0, eval)('TitleScene');
        } catch { return false; }
    }, { timeout: 30_000 });
}

/** 현재 씬 이름을 전역 식별자와 대조해 문자열로 돌려준다. */
function sceneName(page: Page): Promise<string> {
    return page.evaluate(() => {
        const g = (0, eval)('Game');
        const names = ['TitleScene', 'CharacterSelectScene', 'EncounterScene',
            'BattleScene', 'EndingScene', 'ContinueScene', 'CreditsScene', 'LoadingScene'];
        for (const n of names) {
            try { if (g.currentScene === (0, eval)(n)) return n; } catch { /* 미정의 씬 무시 */ }
        }
        return 'UNKNOWN';
    });
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForTitle(page);
    await page.evaluate(() => (0, eval)('Assets').setMute(true));
    await installAudioSpy(page);
});

// ── F-1. 타이틀 ───────────────────────────────────────────────────────────────

test.describe('F-1. TitleScene 확인키/커서', () => {
    test('PRESS_KEY 에서 Z 로 모드 선택으로 넘어간다', async ({ page }) => {
        await tapKey(page, 'z');
        const state = await page.evaluate(() => {
            const ts = (0, eval)('TitleScene');
            return ts.currentState === ts.STATE_MODE_SELECT;
        });
        expect(state).toBe(true);
    });

    test('PRESS_KEY 에서 Space 도 동일하게 동작한다', async ({ page }) => {
        await tapKey(page, 'Space');
        const state = await page.evaluate(() => {
            const ts = (0, eval)('TitleScene');
            return ts.currentState === ts.STATE_MODE_SELECT;
        });
        expect(state).toBe(true);
    });

    test('DOWN 으로 메뉴 커서가 내려가고 tick 효과음이 한 번 난다', async ({ page }) => {
        await tapKey(page, 'z'); // → MODE_SELECT
        await clearAudioLog(page);

        await tapKey(page, 'ArrowDown');

        expect(await page.evaluate(() => (0, eval)('TitleScene').menuIndex)).toBe(1);
        expect(await getSfxIds(page)).toEqual(['audio/tick']);
    });

    test('UP 으로 메뉴 커서가 끝에서 되감긴다 (0 → 2)', async ({ page }) => {
        await tapKey(page, 'z');
        await clearAudioLog(page);

        await tapKey(page, 'ArrowUp');

        expect(await page.evaluate(() => (0, eval)('TitleScene').menuIndex)).toBe(2);
        expect(await getSfxIds(page)).toEqual(['audio/tick']);
    });

    test('첫 메뉴에서 Z 를 누르면 STORY 모드로 캐릭터 선택에 들어간다', async ({ page }) => {
        await tapKey(page, 'z'); // → MODE_SELECT (menuIndex 0)
        await tapKey(page, 'z'); // → 확정

        expect(await sceneName(page)).toBe('CharacterSelectScene');
        expect(await page.evaluate(() => (0, eval)('CharacterSelectScene').mode)).toBe('STORY');
    });
});

// ── F-2. 캐릭터 선택 ──────────────────────────────────────────────────────────

test.describe('F-2. CharacterSelectScene 확인키/커서', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            const g = (0, eval)('Game');
            g.isAutoTest = false; // true 면 update 가 즉시 룰렛으로 넘겨버린다
            g.changeScene((0, eval)('CharacterSelectScene'), { mode: 'STORY' });
        });
    });

    test('RIGHT 로 커서가 옮겨가고 tick 효과음이 난다', async ({ page }) => {
        await clearAudioLog(page);
        await tapKey(page, 'ArrowRight');

        expect(await page.evaluate(() => (0, eval)('CharacterSelectScene').playerIndex)).toBe(1);
        expect(await getSfxIds(page)).toEqual(['audio/tick']);
    });

    test('LEFT 로 커서가 끝에서 되감긴다', async ({ page }) => {
        await clearAudioLog(page);
        await tapKey(page, 'ArrowLeft');

        // 숨김 캐릭터(마유)를 제외한 행의 마지막 칸으로 되감긴다
        const r = await page.evaluate(() => {
            const cs = (0, eval)('CharacterSelectScene');
            const hiddenIdx = cs.characters.findIndex((c: any) => c.hidden);
            const rowCount = hiddenIdx === -1 ? cs.characters.length : hiddenIdx;
            return { playerIndex: cs.playerIndex, expected: rowCount - 1 };
        });
        expect(r.playerIndex).toBe(r.expected);
        expect(await getSfxIds(page)).toEqual(['audio/tick']);
    });

    test('Z 로 확정하면 상대 룰렛(STATE_CPU_SELECT)에 진입한다', async ({ page }) => {
        await tapKey(page, 'z');

        const spinning = await page.evaluate(() => {
            const cs = (0, eval)('CharacterSelectScene');
            return cs.currentState === cs.STATE_CPU_SELECT;
        });
        expect(spinning).toBe(true);
    });
});

// ── F-3. 컨티뉴 ───────────────────────────────────────────────────────────────

test.describe('F-3. ContinueScene 확인키/커서', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            const g = (0, eval)('Game');
            g.isAutoTest = false;
            g.changeScene((0, eval)('ContinueScene'), {
                playerIndex: 0, cpuIndex: 1, defeatedOpponents: [], isNextRound: false
            });
        });
        // 원본대로 등장 연출(233틱)이 끝나야 입력을 받는다.
        await page.waitForFunction(() => (0, eval)('ContinueScene').phase === 'input', null, { timeout: 10_000 });
    });

    test('DOWN 으로 YES/NO 가 토글되고 flip 효과음이 난다', async ({ page }) => {
        await clearAudioLog(page);
        await tapKey(page, 'ArrowDown');

        expect(await page.evaluate(() => (0, eval)('ContinueScene').selectedOption)).toBe(1);
        expect(await getSfxIds(page)).toEqual(['audio/flip']);
        expect(await getMissingSfx(page)).toEqual([]);
    });

    test('UP 도 같은 토글로 동작한다', async ({ page }) => {
        await clearAudioLog(page);
        await tapKey(page, 'ArrowUp');

        expect(await page.evaluate(() => (0, eval)('ContinueScene').selectedOption)).toBe(1);
        expect(await getSfxIds(page)).toEqual(['audio/flip']);
    });

    test('YES 에서 Z 를 누르면 확정 효과음 뒤 86틱에 전투로 재진입한다', async ({ page }) => {
        await clearAudioLog(page);
        await tapKey(page, 'z');
        expect(await getSfxIds(page)).toEqual(['audio/continue']);
        expect(await sceneName(page)).toBe('ContinueScene');
        await page.waitForFunction(() => (0, eval)('Game').currentScene === (0, eval)('BattleScene'), null, { timeout: 10_000 });
    });

    test('NO 로 옮겨 Z 를 누르면 글자가 떨어진 뒤 타이틀로 간다', async ({ page }) => {
        await tapKey(page, 'ArrowDown'); // → NO
        await tapKey(page, 'z');

        expect(await sceneName(page)).toBe('ContinueScene');
        await page.waitForFunction(() => (0, eval)('Game').currentScene === (0, eval)('TitleScene'), null, { timeout: 10_000 });
    });
});
