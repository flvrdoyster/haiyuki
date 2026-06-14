/**
 * 입력/키맵 검증 (E)
 *
 * 다른 스펙은 엔진을 eval/오토테스트로 직접 구동하지만, 여기서는 실제 키 입력과
 * 게임패드 클릭을 시뮬레이트해 입력 레이어(Input·씬 핸들러·gamepad.js)를 잠근다.
 *
 * 통일 키맵(이번 리팩토링)을 회귀로 못 박는다:
 *   - 확인/진행/타패 = Z(Space), 메뉴 = ESC, Enter/X는 제거됨
 *   - 패 교환 = Z(선택 토글) / ESC(확정)
 *   - 가상 게임패드 버튼 → 합성 키 → 엔진 반응
 *
 * 타이밍: Input.isJustPressed는 keydown 다음 프레임에 true가 되고 Input.update()가
 * keys→prevKeys를 복사한다. press()의 down+up이 한 프레임(~16ms) 안에 끝나면 놓칠 수
 * 있으므로 키를 ~70ms 눌러 유지한다(tapKey / click delay).
 */
import { test, expect, type Page } from '@playwright/test';
import { waitForGame, startBattle, waitForState, waitForAnyState, getSnap } from './helpers';

async function tapKey(page: Page, key: string) {
    await page.keyboard.down(key);
    await page.waitForTimeout(70);
    await page.keyboard.up(key);
    await page.waitForTimeout(40);
}

function stateName(page: Page): Promise<string> {
    return page.evaluate(() => (window as any).__haiyuki__?.state?.name ?? '');
}

test.describe('E. 입력/키맵 검증 (Z·Space·ESC)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForGame(page);
        await page.evaluate(() => (0, eval)('Assets').setMute(true));
    });

    test('WAIT_FOR_DRAW: Enter는 드로우 안 됨, Z로 드로우 → PLAYER_TURN', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');

        // Enter는 키맵에서 제거됨 → 아무 일도 없어야 함
        await tapKey(page, 'Enter');
        expect(await stateName(page)).toBe('WAIT_FOR_DRAW');

        // Z로 드로우 → PLAYER_TURN
        await tapKey(page, 'z');
        await waitForState(page, 'PLAYER_TURN');
    });

    test('WAIT_FOR_DRAW: Space도 드로우된다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');
        await tapKey(page, 'Space');
        await waitForState(page, 'PLAYER_TURN');
    });

    test('PLAYER_TURN: Enter는 타패 안 됨, Z로 타패된다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');
        await tapKey(page, 'z'); // 드로우 → 플레이어 턴
        await waitForState(page, 'PLAYER_TURN');

        const before = (await getSnap(page))!.board.discardCount;

        // Enter는 타패 트리거가 아니어야 함
        await tapKey(page, 'Enter');
        expect(await stateName(page)).toBe('PLAYER_TURN');
        expect((await getSnap(page))!.board.discardCount).toBe(before);

        // Z로 타패 → discardCount 증가
        await tapKey(page, 'z');
        await page.waitForFunction(
            (b) => ((window as any).__haiyuki__?.board?.discardCount ?? 0) > b,
            before,
            { timeout: 5000 }
        );
    });

    test('ESC로 배틀 메뉴를 열고 닫는다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');

        await tapKey(page, 'Escape');
        await waitForState(page, 'BATTLE_MENU');

        await tapKey(page, 'Escape');
        await waitForAnyState(page, ['WAIT_FOR_DRAW', 'PLAYER_TURN']);
    });

    test('패 교환: Z=선택 토글, ESC=확정', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');

        // 패 교환 상태로 주입(스킬 캐릭터 라운드 시작과 동일한 상태)
        await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            e.exchangeIndices = [];
            e.hoverIndex = 0;
            e.currentState = e.STATE_TILE_EXCHANGE;
            e.timer = 0;
        });
        await waitForState(page, 'TILE_EXCHANGE');

        // Z로 호버 패 선택 토글
        await tapKey(page, 'z');
        const selected = await page.evaluate(() => (window as any).BattleEngine.exchangeIndices.length);
        expect(selected).toBe(1);

        // ESC로 교환 확정 → 상태 이탈(전역 ESC=메뉴가 TILE_EXCHANGE를 건너뛰고 핸들러가 처리)
        await tapKey(page, 'Escape');
        await page.waitForFunction(
            () => (window as any).__haiyuki__?.state?.name !== 'TILE_EXCHANGE',
            { timeout: 5000 }
        );
    });
});

test.describe('E-gp. 가상 게임패드', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/?gamepad'); // gamepad.js가 body.gamepad-on 부여
        await waitForGame(page);
        await page.evaluate(() => (0, eval)('Assets').setMute(true));
    });

    test('확인(KeyZ) 버튼이 WAIT_FOR_DRAW에서 드로우시킨다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');

        await expect(page.locator('#virtual-gamepad')).toBeVisible();
        // delay로 mousedown을 유지해 합성 keydown(KeyZ)을 프레임이 잡게 한다
        await page.click('#virtual-gamepad .gp-action', { delay: 70 });
        await waitForState(page, 'PLAYER_TURN');
    });

    test('메뉴(Escape) 버튼이 배틀 메뉴를 연다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');

        await page.click('#virtual-gamepad .gp-menu', { delay: 70 });
        await waitForState(page, 'BATTLE_MENU');
    });
});
