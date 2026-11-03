/**
 * 캔버스 마우스 좌표 히트테스트 검증 (H)
 *
 * 기존 스위트엔 캔버스 좌표로 무언가를 맞히는 테스트가 하나도 없었다 — battle-keys.spec 의
 * 가상 게임패드 클릭은 DOM 버튼이라 캔버스 좌표계와 무관하다. 그래서
 * battleRenderer 의 히트테스트(getHandTileAt / getMenuItemAt / checkActionButton /
 * checkExchangeButton)를 분리하는 리팩토링이 좌표를 어긋내도 잡을 방법이 없었다.
 *
 * 두 층으로 잠근다:
 *   단위:  히트테스트가 렌더러의 레이아웃 계산(getPlayerHandPosition 등)과 **같은 좌표**를
 *          본다는 것. 히트테스트와 그리기가 서로 다른 계산을 쓰기 시작하면 여기서 깨진다.
 *   E2E:   실제 page.mouse 로 캔버스를 눌러 Input → 씬 핸들러 → 히트테스트 → 엔진까지
 *          전체 체인이 동작한다는 것(캔버스 CSS 스케일 → 게임 좌표 변환 포함).
 *
 * 알아둘 것: checkActionButton / checkExchangeButton 은 **그리기가 캐시한 rect**
 * (_actionRect / _exchangeBtnRect)를 읽는다. 한 번도 그려지지 않으면 항상 false 다.
 * 이건 히트테스트가 렌더링에 묶여 있다는 뜻이고, 분리 리팩토링이 의도적으로 바꿀 수 있는
 * 지점이라 아래에서 명시적으로 단언해 둔다(바꾸면 그 단언을 갱신할 것).
 *
 * 타이밍: Input.isMouseJustPressed 는 mousedown 이 한 프레임 이상 유지돼야 잡힌다.
 * page.mouse.click 은 down/up 이 거의 동시라 놓칠 수 있어 down → 70ms → up 으로 누른다.
 */
import { test, expect, type Page } from '@playwright/test';
import { waitForGame, startBattle, waitForState, getSnap } from './helpers';

/** 게임 좌표(640×480) → 페이지 좌표. Input.mapToCanvas 의 역변환. */
async function gameToPage(page: Page, gx: number, gy: number) {
    return page.evaluate(([gx, gy]) => {
        const c = document.getElementById('game-canvas') as HTMLCanvasElement;
        const r = c.getBoundingClientRect();
        return { x: r.left + gx * (r.width / c.width), y: r.top + gy * (r.height / c.height) };
    }, [gx, gy]);
}

/** 게임 좌표를 실제로 누른다(이동 → down → 유지 → up). */
async function pressAt(page: Page, gx: number, gy: number) {
    const p = await gameToPage(page, gx, gy);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(40);          // hasMouseMoved 가 프레임에 잡히도록
    await page.mouse.down();
    await page.waitForTimeout(70);
    await page.mouse.up();
    await page.waitForTimeout(60);
}

/** i번째 손패의 중심 게임 좌표 — 렌더러의 레이아웃 함수로 계산(단일 진실 출처). */
function tileCenter(page: Page, i: number) {
    return page.evaluate((i) => {
        const e = (window as any).BattleEngine;
        const L = (0, eval)('BattleLayout');
        const C = (0, eval)('BattleConfig');
        const n = e.p1.hand.length;
        const g = e.lastDrawGroupSize || 0;
        const m = L.getVisualMetrics(e.p1, g);
        const pos = L.getPlayerHandPosition(i, n, g, m.startX);
        return { x: pos.x + C.HAND.tileWidth / 2, y: C.HAND.playerY + C.HAND.tileHeight / 2 };
    }, i);
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
    await page.evaluate(() => (0, eval)('Assets').setMute(true));
});

// ── H-1. 단위: 히트테스트 ↔ 레이아웃 일치 ────────────────────────────────────

test.describe('히트테스트가 레이아웃 계산과 같은 좌표를 본다', () => {
    test('getHandTileAt: 각 패의 중심은 그 패의 인덱스, 세로 여백과 바깥은 -1', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');

        const r = await page.evaluate(() => {
            const e = (window as any).BattleEngine;
            const L = (0, eval)('BattleLayout');
            const C = (0, eval)('BattleConfig');
            const n = e.p1.hand.length;
            const g = e.lastDrawGroupSize || 0;
            const m = L.getVisualMetrics(e.p1, g);
            const tw = C.HAND.tileWidth, th = C.HAND.tileHeight, hy = C.HAND.playerY;

            const centers: number[] = [];
            for (let i = 0; i < n; i++) {
                const pos = L.getPlayerHandPosition(i, n, g, m.startX);
                centers.push(L.getHandTileAt(pos.x + tw / 2, hy + th / 2, e.p1, g));
            }
            const first = L.getPlayerHandPosition(0, n, g, m.startX);
            return {
                n,
                centers,
                aboveHand: L.getHandTileAt(first.x + tw / 2, hy - 1, e.p1, g),
                belowHand: L.getHandTileAt(first.x + tw / 2, hy + th + 1, e.p1, g),
                farLeft:   L.getHandTileAt(first.x - tw, hy + th / 2, e.p1, g),
            };
        });

        expect(r.n).toBeGreaterThan(0);
        expect(r.centers).toEqual(Array.from({ length: r.n }, (_, i) => i));
        expect(r.aboveHand).toBe(-1);
        expect(r.belowHand).toBe(-1);
        expect(r.farLeft).toBe(-1);
    });

    test('getMenuItemAt: 각 메뉴 항목의 중심은 그 항목의 인덱스', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');

        const r = await page.evaluate(() => {
            const L = (0, eval)('BattleLayout');
            const M = (0, eval)('BattleMenuSystem');
            const C = (0, eval)('BattleConfig');
            const items = M.menuItems;
            const m = L.getMenuMetrics(items);
            const lh = m.lineHeight;
            const sep = C.BATTLE_MENU.separatorHeight || 4;

            // getMenuMetrics 가 그리는 순서대로 y 를 누적해 각 항목 중심을 만든다
            let y = m.startY;
            const hits: Array<number | null> = [];
            items.forEach((it: any, i: number) => {
                const h = it.type === 'SEPARATOR' ? sep : lh;
                hits.push(it.type === 'SEPARATOR' ? null : L.getMenuItemAt(m.startX + 10, y + h / 2, items));
                y += h;
            });
            return { count: items.length, hits, outside: L.getMenuItemAt(m.x - 5, m.y - 5, items) };
        });

        expect(r.count).toBeGreaterThan(0);
        r.hits.forEach((h, i) => { if (h !== null) expect(h).toBe(i); });
        expect(r.outside).toBe(-1);
    });

    test('checkActionButton: 그리기 전엔 false, 한 프레임 그린 뒤엔 버튼 중심에서 true', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');

        // 게임 루프가 이미 그렸으므로 rect 가 캐시돼 있다. 일단 비운 뒤 동작을 본다.
        const r = await page.evaluate(() => {
            const R = (0, eval)('BattleRenderer');
            const e = (window as any).BattleEngine;
            const g = (0, eval)('Game');

            R._actionRect = null;
            const beforeDraw = R.checkActionButton(320, 240);

            g.draw();                         // 한 프레임 그리면 drawActionButton 이 rect 를 캐시한다
            const rect = R._actionRect;
            const afterDraw = rect ? R.checkActionButton(rect.x + rect.w / 2, rect.y + rect.h / 2) : null;
            const justOutside = rect ? R.checkActionButton(rect.x - 1, rect.y + rect.h / 2) : null;
            return { beforeDraw, hasRect: !!rect, afterDraw, justOutside, active: R.getActiveAction(e) };
        });

        expect(r.beforeDraw).toBe(false);     // 렌더링에 묶여 있음 — 분리 시 의도적으로 바꿀 수 있는 지점
        expect(r.active).not.toBeNull();      // WAIT_FOR_DRAW 엔 드로우 버튼이 있어야 한다
        expect(r.hasRect).toBe(true);
        expect(r.afterDraw).toBe(true);
        expect(r.justOutside).toBe(false);
    });
});

// ── H-2. E2E: 실제 마우스 ────────────────────────────────────────────────────

test.describe('실제 마우스 클릭이 캔버스 좌표를 거쳐 엔진에 닿는다', () => {
    test('PLAYER_TURN 에서 패의 중심을 누르면 그 패가 버려진다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');
        await page.keyboard.down('z'); await page.waitForTimeout(70); await page.keyboard.up('z');
        await waitForState(page, 'PLAYER_TURN');

        const target = 3;
        const before = (await getSnap(page))!;
        const targetType = before.p1.hand[target].type;
        const discardsBefore = before.board.discardCount;

        const c = await tileCenter(page, target);
        await pressAt(page, c.x, c.y);

        await page.waitForFunction(
            (n) => ((window as any).__haiyuki__?.board?.discardCount ?? 0) > n,
            discardsBefore, { timeout: 5000 }
        );
        const after = (await getSnap(page))!;
        expect(after.board.discards[after.board.discards.length - 1].type).toBe(targetType);
    });

    test('PLAYER_TURN 에서 손패 바깥(세로 여백)을 눌러도 아무것도 버려지지 않는다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');
        await page.keyboard.down('z'); await page.waitForTimeout(70); await page.keyboard.up('z');
        await waitForState(page, 'PLAYER_TURN');

        const discardsBefore = (await getSnap(page))!.board.discardCount;
        const c = await tileCenter(page, 0);
        const th = await page.evaluate(() => (0, eval)('BattleConfig').HAND.tileHeight);

        await pressAt(page, c.x, c.y - th);   // 패 위쪽 여백
        await page.waitForTimeout(300);

        const s = await getSnap(page)!;
        expect(s!.board.discardCount).toBe(discardsBefore);
        expect(s!.state.name).toBe('PLAYER_TURN');
    });

    test('WAIT_FOR_DRAW 에서 드로우 버튼을 누르면 드로우된다', async ({ page }) => {
        await startBattle(page, { autoTest: false });
        await waitForState(page, 'WAIT_FOR_DRAW');
        await page.waitForTimeout(100);       // 루프가 버튼을 한 번 그려 rect 를 캐시하도록

        const rect = await page.evaluate(() => (0, eval)('BattleRenderer')._actionRect);
        expect(rect).not.toBeNull();

        await pressAt(page, rect.x + rect.w / 2, rect.y + rect.h / 2);
        await waitForState(page, 'PLAYER_TURN');
    });
});
