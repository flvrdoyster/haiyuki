import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { waitForGame } from './helpers';

const RELAY_DIR = path.resolve(__dirname, '../relay');

let child: ChildProcess | null = null;
let port = 0;
let skipReason = '';

function freePort(): Promise<number> {
    return new Promise((resolve) => {
        const s = net.createServer().listen(0, () => {
            const p = (s.address() as net.AddressInfo).port;
            s.close(() => resolve(p));
        });
    });
}

test.beforeAll(async () => {
    test.setTimeout(150_000);
    if (!existsSync(path.join(RELAY_DIR, 'node_modules', '.bin', 'wrangler'))) {
        skipReason = 'relay/node_modules에 wrangler가 없음(cd relay && npm install)';
        return;
    }
    port = await freePort();
    child = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--ip', '127.0.0.1'], { cwd: RELAY_DIR, stdio: 'ignore' });
    for (let i = 0; i < 240; i++) {
        try {
            const r = await fetch(`http://127.0.0.1:${port}/health`);
            if (r.ok) return;
        } catch { }
        await new Promise((r) => setTimeout(r, 500));
    }
    skipReason = 'wrangler dev가 시간 안에 뜨지 않음';
});

test.afterAll(() => {
    child?.kill('SIGKILL');
});

async function openTab(browser: Browser, query: string, autoTest: boolean): Promise<{ ctx: BrowserContext; page: Page }> {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/vs.html?relay=ws://127.0.0.1:${port}${query}`);
    await waitForGame(page);
    await page.waitForFunction(() => (0, eval)('OnlineLobby').ready, undefined, { timeout: 25_000 });
    await page.evaluate((at) => {
        const g = (0, eval)('Game');
        g.isAutoTest = at;
        g.symmetric = true;
        (0, eval)('Assets').setMute(true);
        (0, eval)('BattleConfig').RULES.SKILLS_ENABLED = false;
    }, autoTest);
    return { ctx, page };
}

async function createRoom(page: Page): Promise<string> {
    await page.click('#online-create');
    await page.waitForFunction(() => (document.getElementById('online-room-code')?.textContent || '').length === 5);
    return page.locator('#online-room-code').innerText();
}

async function pair(browser: Browser, autoTest: boolean) {
    const host = await openTab(browser, '&char=0&seed=77', autoTest);
    const room = await createRoom(host.page);
    const guest = await openTab(browser, `&room=${room}&char=1`, autoTest);
    return { host, guest, room };
}

test.describe('vs.html (relay, two browser contexts)', () => {
    test.beforeEach(() => {
        test.skip(!!skipReason, skipReason);
    });

    test('two contexts meet through the relay, pick characters and apply first-round actions', async ({ browser }) => {
        test.setTimeout(150_000);
        const { host, guest, room } = await pair(browser, true);
        expect(room).toMatch(/^[A-HJ-NP-Z]{5}$/);
        for (const p of [host.page, guest.page]) {
            await p.waitForFunction(() => {
                const e = (window as any).BattleEngine;
                const m = (0, eval)('OnlineMatch').current;
                return !!(m && m.connected && m.ready() && e && e.online && m.checked >= 4);
            }, undefined, { timeout: 120_000 });
        }
        const seen = await Promise.all([host.page, guest.page].map((p) => p.evaluate(() => {
            const m = (0, eval)('OnlineMatch').current;
            const e = (window as any).BattleEngine;
            return { failed: m.failed, takenOver: m.takenOver, seed: m.seed, relay: m.transport.relay, log: e.actionLog.length };
        })));
        expect(seen[0].relay).toBe(true);
        expect(seen[1].relay).toBe(true);
        expect(seen[0].failed).toBeNull();
        expect(seen[1].failed).toBeNull();
        expect(seen[0].seed).toBe(seen[1].seed);
        await host.ctx.close();
        await guest.ctx.close();
    });

    test('closing one context shows the departure message during character select', async ({ browser }) => {
        test.setTimeout(90_000);
        const { host, guest } = await pair(browser, false);
        await host.page.waitForFunction(() => (0, eval)('Game').currentScene === (0, eval)('CharacterSelectScene'));
        await guest.page.waitForFunction(() => (0, eval)('Game').currentScene === (0, eval)('CharacterSelectScene'));
        await guest.ctx.close();
        await expect(host.page.locator('#online-status')).toHaveText('상대가 나갔습니다');
        await expect(host.page.locator('#online-create')).toBeVisible();
        await host.ctx.close();
    });

    test('closing one context during battle hands the seat to the CPU', async ({ browser }) => {
        test.setTimeout(150_000);
        const { host, guest } = await pair(browser, true);
        await host.page.waitForFunction(() => {
            const e = (window as any).BattleEngine;
            const m = (0, eval)('OnlineMatch').current;
            return !!(m && e && e.online === m && m.checked >= 2);
        }, undefined, { timeout: 120_000 });
        await guest.ctx.close();
        await expect(host.page.locator('#online-status')).toHaveText('상대가 나가서 CPU가 이어받습니다');
        await host.ctx.close();
    });

    test('a full room shows the room-full message', async ({ browser }) => {
        test.setTimeout(90_000);
        const { host, guest, room } = await pair(browser, false);
        const third = await openTab(browser, `&room=${room}`, false);
        await expect(third.page.locator('#online-status')).toHaveText('방이 가득 찼습니다');
        await expect(third.page.locator('#online-create')).toBeVisible();
        for (const t of [host, guest, third]) await t.ctx.close();
    });
});
