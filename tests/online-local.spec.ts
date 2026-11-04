import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { waitForGame } from './helpers';

type Entry = { round: number; who: string; type: string; [k: string]: any };

const ROOM_URL = '/vs.html';

async function openTab(ctx: BrowserContext, query: string, opts: { autoTest: boolean; symmetric?: boolean; skills?: boolean; logs?: string[] }) {
    const page = await ctx.newPage();
    if (opts.logs) page.on('console', m => { if (m.text().startsWith('[Online]')) opts.logs!.push(m.text()); });
    await page.goto(`${ROOM_URL}${query ? query + '&' : '?'}transport=local`);
    await waitForGame(page);
    await page.waitForFunction(() => (0, eval)('OnlineLobby').ready, undefined, { timeout: 25_000 });
    await page.evaluate(({ at, sym, sk }) => {
        const g = (0, eval)('Game');
        g.isAutoTest = at;
        g.symmetric = !!sym;
        (0, eval)('Assets').setMute(true);
        if (sk === false) {
            (0, eval)('BattleConfig').RULES.SKILLS_ENABLED = false;
            (0, eval)('OnlineLobby').skills = false;
        }
    }, { at: opts.autoTest, sym: opts.symmetric, sk: opts.skills });
    return page;
}

async function createRoom(page: Page): Promise<string> {
    await page.click('#online-create');
    await page.waitForFunction(() => (document.getElementById('online-room-code')?.textContent || '').length === 5);
    return page.locator('#online-room-code').innerText();
}

async function installDriver(page: Page) {
    await page.evaluate(() => {
        const w = window as any;
        w.__online_driver__ = setInterval(() => {
            const om = (0, eval)('OnlineMatch');
            if (om.current) w.__match__ = om.current;
            const e = w.BattleEngine;
            if (!e || e.currentState === undefined || !e.online) return;
            if ((e.currentState === e.STATE_WIN || e.currentState === e.STATE_LOSE) && e.stateTimer > 170) e.confirmResult();
            else if (e.currentState === e.STATE_NAGARI && e.stateTimer > 90) e.confirmResult();
        }, 40);
    });
}

async function waitForSummary(page: Page, timeout: number) {
    await page.waitForFunction(() => {
        const m = (window as any).__match__;
        return !!(m && m.summary);
    }, undefined, { timeout });
    return page.evaluate(() => {
        const m = (window as any).__match__;
        return { summary: m.summary, code: m.code, seed: m.seed, seat: m.seat };
    });
}

function swapSeats(log: Entry[]): Entry[] {
    return log.map(e => ({ ...e, who: e.who === 'P1' ? 'CPU' : 'P1' }));
}

async function forceLastChance(page: Page, turnCount: number) {
    await page.evaluate(() => { (0, eval)('SkillFlows').cpuWantsLastChance = () => true; });
    page.waitForFunction((n: number) => {
        const e = (window as any).BattleEngine;
        if (e && e.online && e.currentState === e.STATE_DEALING && !e.__injected) {
            e.__injected = true;
            e.turnCount = n;
            return true;
        }
        return false;
    }, turnCount, { timeout: 60_000 }).catch(() => { });
}

async function startAiPair(ctx: BrowserContext, opts: { skills: boolean; seed: number; p: number; c: number; lastChance?: boolean }) {
    const host = await openTab(ctx, `?char=${opts.p}&seed=${opts.seed}`, { autoTest: true, symmetric: true, skills: opts.skills });
    const room = await createRoom(host);
    const guest = await openTab(ctx, `?room=${room}&char=${opts.c}`, { autoTest: true, symmetric: true, skills: opts.skills });
    if (opts.lastChance) {
        await forceLastChance(host, 18);
        await forceLastChance(guest, 18);
    }
    await installDriver(host);
    await installDriver(guest);
    return { host, guest, room };
}

async function playAiMatch(ctx: BrowserContext, opts: { skills: boolean; seed: number; p: number; c: number; lastChance?: boolean }) {
    const { host, guest } = await startAiPair(ctx, opts);
    const [h, g] = await Promise.all([waitForSummary(host, 280_000), waitForSummary(guest, 280_000)]);
    return { h, g, host, guest };
}

function assertSameMatch(h: any, g: any) {
    expect(h.summary.failed).toBeNull();
    expect(g.summary.failed).toBeNull();
    expect(h.summary.checked).toBeGreaterThan(10);
    expect(g.summary.checked).toBeGreaterThan(10);
    expect(h.summary.winner).not.toBeNull();
    const swap = (w: string) => w === 'P1' ? 'CPU' : 'P1';
    expect(g.summary.winner).toBe(swap(h.summary.winner));
    expect(g.summary.hp).toEqual([h.summary.hp[1], h.summary.hp[0]]);
    expect(h.summary.actionLog.length).toBeGreaterThan(10);
    const noConfirm = (log: Entry[]) => log.filter(e => e.type !== 'confirm');
    expect(JSON.stringify(noConfirm(swapSeats(g.summary.actionLog)))).toBe(JSON.stringify(noConfirm(h.summary.actionLog)));
}

test.describe('대전 페이지 (BroadcastChannel, 탭 두 개)', () => {
    test('비기를 끈 AI 대 AI 한 판이 끝까지 동기를 유지한다', async ({ context }) => {
        test.setTimeout(300_000);
        const { h, g } = await playAiMatch(context, { skills: false, seed: 4242, p: 0, c: 1 });
        assertSameMatch(h, g);
        expect(h.summary.actionLog.some((e: Entry) => e.type === 'skill')).toBe(false);
    });

    test('비기를 켠 AI 대 AI 한 판이 끝까지 동기를 유지한다', async ({ context }) => {
        test.setTimeout(300_000);
        const { h, g } = await playAiMatch(context, { skills: true, seed: 4343, p: 3, c: 4 });
        assertSameMatch(h, g);
        expect(g.seed).toBe(h.seed);
    });

    test('양쪽 자리에서 라스트 찬스 룰렛이 도는 나가리도 동기를 유지한다', async ({ context }) => {
        test.setTimeout(300_000);
        const { h, g } = await playAiMatch(context, { skills: true, seed: 6, p: 4, c: 4, lastChance: true });
        assertSameMatch(h, g);
        const types = h.summary.actionLog.map((e: Entry) => e.type + (e.use !== undefined ? ':' + e.use : ''));
        expect(types).toContain('nagari:true');
        expect(types).toContain('lastChanceStop');
    });

    test('호스트가 키로 버린 패가 게스트에서 상대 버림패로 나타난다', async ({ context }) => {
        test.setTimeout(120_000);
        const host = await openTab(context, '?char=0&seed=777', { autoTest: false, skills: false });
        const room = await createRoom(host);
        const guest = await openTab(context, `?room=${room}&char=1`, { autoTest: true, symmetric: true, skills: false });
        await installDriver(guest);

        const tap = async (page: Page, key: string) => {
            await page.keyboard.down(key);
            await page.waitForTimeout(70);
            await page.keyboard.up(key);
        };

        await host.waitForFunction(() => {
            const e = (window as any).BattleEngine;
            const bc = (0, eval)('BattleConfig');
            return !!e.online && e.currentState === e.STATE_WAIT_FOR_DRAW && e.timer > bc.SPEED.DRAW_INPUT_DELAY;
        }, undefined, { timeout: 60_000 });
        await tap(host, 'z');
        await host.waitForFunction(() => {
            const e = (window as any).BattleEngine;
            return e.currentState === e.STATE_PLAYER_TURN && e.timer > 5;
        });
        const tile = await host.evaluate(() => {
            const e = (window as any).BattleEngine;
            const t = e.p1.hand[e.hoverIndex];
            return { type: t.type, color: t.color };
        });
        await tap(host, 'z');

        await guest.waitForFunction((t: any) => {
            const e = (window as any).BattleEngine;
            const last = e.discards.filter((d: any) => d.owner === 'cpu').pop();
            return !!last && last.type === t.type && last.color === t.color;
        }, tile, { timeout: 30_000 });

        const failed = await Promise.all([host, guest].map(p => p.evaluate(() => {
            const m = (0, eval)('OnlineMatch').current;
            return m ? m.failed : 'closed';
        })));
        expect(failed).toEqual([null, null]);
    });
    test('로비: 방을 만들면 코드와 초대 링크가 뜨고, 초대받은 탭이 입장하면 양쪽 패널이 닫힌다', async ({ context }) => {
        test.setTimeout(120_000);
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        const host = await openTab(context, '', { autoTest: false });
        await expect(host.locator('#online-panel')).toBeVisible();
        await expect(host.locator('#online-create')).toBeVisible();
        await expect(host.locator('#online-join-input')).toBeVisible();
        const room = await createRoom(host);
        expect(room).toMatch(/^[A-HJ-NP-Z]{5}$/);
        await expect(host.locator('#online-panel')).toContainText('상대를 기다리는 중');
        await host.click('#online-copy-code');
        await expect(host.locator('#online-status')).toHaveText('코드를 복사했습니다');
        expect(await host.evaluate(() => navigator.clipboard.readText())).toBe(room);
        await host.click('#online-copy-link');
        await expect(host.locator('#online-status')).toHaveText('바로 입장 링크를 복사했습니다');
        const link = await host.evaluate(() => navigator.clipboard.readText());
        expect(link).toMatch(new RegExp(`/vs\\.html\\?room=${room}$`));
        const guest = await openTab(context, link.slice(link.indexOf('?')), { autoTest: false });
        await expect(host.locator('#online-status')).toHaveText('상대가 들어왔습니다');
        await expect(host.locator('#online-panel')).toBeHidden();
        await expect(guest.locator('#online-panel')).toBeHidden();
        for (const p of [host, guest]) {
            expect(await p.evaluate(() => (0, eval)('Game').currentScene === (0, eval)('CharacterSelectScene'))).toBe(true);
        }
    });

    test('비기 끔으로 만든 방: 게스트가 호스트 설정을 따르고 대기 화면에 비기 꺼짐이 나온다', async ({ context }) => {
        test.setTimeout(120_000);
        const host = await openTab(context, '?char=0', { autoTest: false });
        await expect(host.locator('#online-skills-toggle')).toHaveAttribute('aria-label', '비기 켜짐');
        await host.click('#online-skills-toggle');
        await expect(host.locator('#online-skills-toggle')).toHaveAttribute('aria-label', '비기 꺼짐');
        const room = await createRoom(host);
        await expect(host.locator('#online-skills')).toHaveText('비기 꺼짐');
        const guest = await openTab(context, `?room=${room}&char=1`, { autoTest: false });
        await guest.waitForFunction(() => (0, eval)('OnlineMatch').current && (0, eval)('OnlineMatch').current.connected);
        expect(await guest.evaluate(() => (0, eval)('OnlineMatch').current.skills)).toBe(false);
        expect(await host.evaluate(() => (0, eval)('OnlineMatch').current.skills)).toBe(false);
    });

    test('로비: 코드를 입력하면 대문자 다섯 글자로 걸러지고 버튼으로 입장한다', async ({ context }) => {
        test.setTimeout(120_000);
        const host = await openTab(context, '', { autoTest: false });
        const room = await createRoom(host);
        const guest = await openTab(context, '', { autoTest: false });
        const input = guest.locator('#online-join-input');
        await input.fill(`${room.toLowerCase()}9xio`);
        await expect(input).toHaveValue(room);
        await guest.click('#online-join');
        await expect(host.locator('#online-panel')).toBeHidden();
    });

    test('재대전: 한 판이 끝나고 양쪽이 재대전을 누르면 새 시드의 두 번째 판이 동기를 유지한다', async ({ context }) => {
        test.setTimeout(600_000);
        const { host, guest } = await startAiPair(context, { skills: true, seed: 8888, p: 0, c: 1 });
        const [h1, g1] = await Promise.all([waitForSummary(host, 280_000), waitForSummary(guest, 280_000)]);
        assertSameMatch(h1, g1);

        for (const p of [host, guest]) {
            await expect(p.locator('#online-panel')).toBeVisible();
            await expect(p.locator('#online-result')).toHaveAttribute('aria-label', /^(WIN|LOSE)$/);
        }
        const results = await Promise.all([host, guest].map(p => p.locator('#online-result').getAttribute('aria-label')));
        expect(new Set(results)).toEqual(new Set(['WIN', 'LOSE']));
        const lists = await Promise.all([host, guest].map(p => p.locator('#online-history li').evaluateAll(
            lis => lis.map(li => ({ round: li.children[0].textContent, label: li.children[1].textContent })))));
        expect(lists[0].length).toBe(h1.summary.rounds.length);
        expect(lists[1].length).toBe(h1.summary.rounds.length);
        expect(lists[0].length).toBeGreaterThan(0);
        expect(h1.summary.rounds[h1.summary.rounds.length - 1].hp).toEqual(h1.summary.hp);
        expect(g1.summary.rounds[g1.summary.rounds.length - 1].hp).toEqual(g1.summary.hp);
        const flipLabel: Record<string, string> = { '승': '패', '패': '승', '무승부': '무승부' };
        lists[0].forEach((row, i) => {
            expect(row.round).toBe(`R${h1.summary.rounds[i].round}`);
            expect(lists[1][i].label).toBe(flipLabel[row.label]);
        });

        await host.click('#online-rematch');
        await expect(guest.locator('#online-status')).toHaveText('상대가 다시 대전을 원합니다');
        await expect(host.locator('#online-rematch-wait')).toBeVisible();
        await expect(host.locator('#online-rematch')).toHaveCount(0);
        await guest.click('#online-rematch');

        await expect(host.locator('#online-panel')).toBeHidden();
        await expect(guest.locator('#online-panel')).toBeHidden();
        const [h2, g2] = await Promise.all([waitForSummary(host, 280_000), waitForSummary(guest, 280_000)]);
        assertSameMatch(h2, g2);
        expect(h2.seed).not.toBe(h1.seed);
        expect(g2.seed).toBe(h2.seed);
    });

    test('방을 나가면 상대 탭에 이탈 문구와 시작 화면이 나온다', async ({ context }) => {
        test.setTimeout(300_000);
        const { host, guest } = await startAiPair(context, { skills: true, seed: 99, p: 0, c: 1 });
        await Promise.all([waitForSummary(host, 280_000), waitForSummary(guest, 280_000)]);
        await guest.click('#online-leave');
        await expect(guest.locator('#online-create')).toBeVisible();
        await expect(host.locator('#online-status')).toHaveText('상대가 나갔습니다');
        await expect(host.locator('#online-create')).toBeVisible();
    });
    test('결과 창: 한쪽이 확인하면 양쪽이 넘어가고 늦게 온 중복 확인은 버려진다', async ({ context }) => {
        test.setTimeout(300_000);
        const host = await openTab(context, '?char=0&seed=5151', { autoTest: true, symmetric: true, skills: false });
        const room = await createRoom(host);
        const guest = await openTab(context, `?room=${room}&char=1`, { autoTest: true, symmetric: true, skills: false });
        await installDriver(host);
        await installDriver(guest);
        await guest.evaluate(() => {
            const w = window as any;
            clearInterval(w.__online_driver__);
            w.__online_driver__ = setInterval(() => {
                const om = (0, eval)('OnlineMatch');
                if (om.current) w.__match__ = om.current;
            }, 40);
        });
        const [h, g] = await Promise.all([waitForSummary(host, 280_000), waitForSummary(guest, 280_000)]);
        assertSameMatch(h, g);
        const hostConfirms = h.summary.actionLog.filter((e: Entry) => e.type === 'confirm' && e.who === 'P1');
        const guestOwn = g.summary.actionLog.filter((e: Entry) => e.type === 'confirm' && e.who === 'P1');
        const guestRecv = g.summary.actionLog.filter((e: Entry) => e.type === 'confirm' && e.who === 'CPU');
        expect(hostConfirms.length).toBeGreaterThan(0);
        expect(guestOwn.length).toBe(0);
        expect(guestRecv.length).toBe(hostConfirms.length);
    });

    test('제한 시간: 뽑기와 버림이 스스로 처리되어 상대에게 전달된다', async ({ context }) => {
        test.setTimeout(120_000);
        const host = await openTab(context, '?char=0&seed=777', { autoTest: false, skills: false });
        await host.evaluate(() => {
            const c = (0, eval)('BattleConfig').ONLINE;
            c.CHOICE_SEC = 1;
            c.DISCARD_SEC = 2;
        });
        const room = await createRoom(host);
        const guest = await openTab(context, `?room=${room}&char=1`, { autoTest: true, symmetric: true, skills: false });
        await installDriver(guest);
        await host.evaluate(() => {
            const w = window as any;
            w.__discards__ = [];
            w.__seen__ = {};
            const e = w.BattleEngine;
            const orig = e.discardTile;
            e.discardTile = function (i: number) {
                w.__discards__.push({ i, len: this.p1.hand.length });
                return orig.call(this, i);
            };
            setInterval(() => {
                const c = e.clock;
                if (c && e.online) {
                    const r = (0, eval)('OnlineClock').remaining(c);
                    if (r !== null) w.__seen__[c.key + ':' + c.who] = r;
                }
            }, 50);
        });
        await host.waitForFunction(() => (window as any).__discards__.length >= 2, undefined, { timeout: 90_000 });
        const info = await host.evaluate(() => {
            const w = window as any;
            const log = w.BattleEngine.actionLog.filter((e: any) => e.who === 'P1');
            return { discards: w.__discards__, seen: w.__seen__, types: log.map((e: any) => e.type) };
        });
        for (const d of info.discards) expect(d.i).toBe(d.len - 1);
        expect(info.types.slice(0, 2)).toEqual(['draw', 'discard']);
        expect(Object.keys(info.seen)).toEqual(expect.arrayContaining(['draw:P1', 'turn:P1']));
        for (const k of Object.keys(info.seen)) expect(info.seen[k]).toBeLessThanOrEqual(2);

        await guest.waitForFunction(() => {
            const e = (window as any).BattleEngine;
            return e.discards.some((d: any) => d.owner === 'cpu');
        }, undefined, { timeout: 30_000 });

        await guest.evaluate(() => { (0, eval)('Game').update = () => {}; });
        await host.waitForTimeout(500);
        await host.evaluate(() => {
            const e = (window as any).BattleEngine;
            e.currentState = e.STATE_WIN;
            e.stateTimer = 0;
        });
        const ticks = await host.evaluate(() => {
            const g = (0, eval)('Game');
            const e = (window as any).BattleEngine;
            let n = 0;
            while (e.resultSeq !== 1 && n < 3000) {
                g.update(1);
                n++;
            }
            return n;
        });
        expect(ticks).toBeLessThan(3000);
        const confirm = await host.evaluate(() => (window as any).BattleEngine.actionLog.filter((e: any) => e.type === 'confirm' && e.who === 'P1'));
        expect(confirm.length).toBe(1);
        expect(confirm[0].win).toBe(0);
    });

    test('제한 시간: 확인창이 스스로 아니오로 답한다', async ({ context }) => {
        test.setTimeout(120_000);
        const host = await openTab(context, '?char=0&seed=778', { autoTest: false, skills: false });
        await host.evaluate(() => { (0, eval)('BattleConfig').ONLINE.CHOICE_SEC = 1; });
        const room = await createRoom(host);
        await openTab(context, `?room=${room}&char=1`, { autoTest: true, symmetric: true, skills: false });
        await host.waitForFunction(() => {
            const e = (window as any).BattleEngine;
            return !!e.online && e.currentState === e.STATE_WAIT_FOR_DRAW;
        }, undefined, { timeout: 60_000 });
        await host.evaluate(() => {
            const w = window as any;
            w.__answer__ = 'none';
            const e = w.BattleEngine;
            e.controllerOf('P1').onDoraBomb(e, 'P1', (use: boolean) => { w.__answer__ = use ? 'yes' : 'no'; });
        });
        expect(await host.evaluate(() => (0, eval)('BattleScene').confirmData !== null)).toBe(true);
        await host.waitForFunction(() => (window as any).__answer__ === 'no', undefined, { timeout: 10_000 });
        expect(await host.evaluate(() => (0, eval)('BattleScene').confirmData)).toBeNull();
    });

    test('대전 중 상대 이탈: CPU가 자리를 이어받고 이탈 기록만 남기고 끝난다', async ({ context }) => {
        test.setTimeout(300_000);
        const { host, guest } = await startAiPair(context, { skills: true, seed: 2468, p: 0, c: 1 });
        await host.waitForFunction(() => {
            const e = (window as any).BattleEngine;
            return !!e.online && e.actionLog.length > 6;
        }, undefined, { timeout: 90_000 });
        await guest.evaluate(() => (0, eval)('OnlineMatch').current.close());
        await host.waitForFunction(() => (0, eval)('OnlineMatch').current.takenOver === 'left', undefined, { timeout: 15_000 });
        await expect(host.locator('#online-status')).toHaveText('상대가 나가서 CPU가 이어받습니다');
        const state = await host.evaluate(() => {
            const w = window as any;
            const m = (0, eval)('OnlineMatch').current;
            return { failed: m.failed, ctl: w.BattleEngine.controllerOf('CPU') instanceof (0, eval)('AIController') };
        });
        expect(state).toEqual({ failed: null, ctl: true });
        const h = await waitForSummary(host, 280_000);
        expect(h.summary.winner).not.toBeNull();
        expect(h.summary.takenOver).toBe('left');
        await expect(host.locator('#online-panel')).toBeVisible();
        await expect(host.locator('#online-rematch')).toBeHidden();
        await expect(host.locator('#online-leave')).toBeVisible();
    });

    test('콘솔 로그에 connect, connected, pick, 첫 행동이 순서대로 찍힌다 (debug=net)', async ({ context }) => {
        test.setTimeout(120_000);
        const hostLogs: string[] = [];
        const guestLogs: string[] = [];
        const host = await openTab(context, '?char=0&seed=5151&debug=net', { autoTest: true, symmetric: true, skills: false, logs: hostLogs });
        const room = await createRoom(host);
        const guest = await openTab(context, `?room=${room}&char=1&debug=net`, { autoTest: true, symmetric: true, skills: false, logs: guestLogs });
        await installDriver(host);
        await installDriver(guest);
        await expect.poll(() => hostLogs.some(l => /^\[Online\] applied /.test(l)) && guestLogs.some(l => /^\[Online\] applied /.test(l)), { timeout: 60_000 }).toBe(true);
        const order = (logs: string[], seat: string) => {
            const at = (re: RegExp) => logs.findIndex(l => re.test(l));
            const idx = [
                at(new RegExp(`^\\[Online\\] connect transport=local relay=- room=${room} seat=${seat}`)),
                at(/^\[Online\] connected seat=\w+ seed=\d+ skills=(true|false) hello received=\d+ sent=\d+/),
                at(/^\[Online\] pick mine=\d+ peer=\d+/),
                at(/^\[Online\] << (draw|discard|pon|riichi|skill|exchange) seq=\d+ r\d+ t\d+/),
                at(/^\[Online\] applied (draw|discard|pon|riichi|skill|exchange) seq=\d+ r\d+ t\d+ queued=\d+ ticks/)
            ];
            return idx;
        };
        for (const [logs, seat] of [[hostLogs, 'host'], [guestLogs, 'guest']] as const) {
            const idx = order(logs, seat);
            expect(idx.every(i => i >= 0), `${seat}: ${JSON.stringify(idx)}\n${logs.slice(0, 12).join('\n')}`).toBe(true);
            expect([...idx].sort((a, b) => a - b)).toEqual(idx);
        }
        expect(hostLogs.some(l => /^\[Online\] >> hello seq=0 r- t-/.test(l))).toBe(true);
        expect(hostLogs.some(l => l.startsWith('[Online] relay event'))).toBe(false);
    });

    test('대전 중 동기 어긋남은 이탈처럼 처리되어 CPU가 자리를 이어받는다', async ({ context }) => {
        test.setTimeout(300_000);
        const { host } = await startAiPair(context, { skills: true, seed: 1357, p: 0, c: 1 });
        await host.waitForFunction(() => {
            const e = (window as any).BattleEngine;
            return !!e.online && e.actionLog.length > 6;
        }, undefined, { timeout: 90_000 });
        const errors: any[] = [];
        host.on('console', async m => {
            if (m.type() === 'error' && m.text().startsWith('[Online] takeover desync')) errors.push(await m.args()[1].jsonValue());
        });
        await host.evaluate(() => {
            const m = (0, eval)('OnlineMatch').current;
            m.inbox.push({ type: 'probe', seat: 1, seq: 9999, hash: 1 });
        });
        await expect.poll(() => errors.length, { timeout: 10_000 }).toBe(1);
        const info = errors[0];
        expect(info.reason).toBe('hash');
        expect(info.theirs).toBe(1);
        expect(info.detail.msg).toEqual({ type: 'probe', seq: 9999 });
        expect(info.detail.seats).toHaveLength(2);
        for (const k of ['hand', 'openSets', 'hp', 'mp']) expect(info.detail.seats[0]).toHaveProperty(k);
        for (const k of ['discards', 'deck', 'round', 'turn', 'rng', 'applied']) expect(info.detail).toHaveProperty(k);
        expect(Object.keys(info.detail.rng)).toEqual(['deck', 'fx']);
        expect(info.detail.applied.length).toBeGreaterThan(0);
        expect(info.detail.applied.length).toBeLessThanOrEqual(10);
        expect(await host.evaluate(() => (0, eval)('OnlineMatch').current.takenOver)).toBe('desync');
        await expect(host.locator('#online-status')).toHaveText('상대가 나가서 CPU가 이어받습니다');
        const h = await waitForSummary(host, 280_000);
        expect(h.summary.winner).not.toBeNull();
        await expect(host.locator('#online-rematch')).toBeHidden();
    });

    test('캐릭터 선택: 먼저 고르면 대기 문구가, 나가면 이탈 문구가 나온다', async ({ context }) => {
        test.setTimeout(120_000);
        const host = await openTab(context, '', { autoTest: false });
        const room = await createRoom(host);
        const guest = await openTab(context, `?room=${room}`, { autoTest: false });
        await host.waitForFunction(() => (0, eval)('Game').currentScene === (0, eval)('CharacterSelectScene'));
        await host.evaluate(() => (0, eval)('CharacterSelectScene').confirmPlayer());
        await expect(host.locator('#online-status')).toHaveText('상대가 캐릭터를 고르는 중');
        await guest.evaluate(() => (0, eval)('OnlineMatch').current.close());
        await expect(host.locator('#online-status')).toHaveText('상대가 나갔습니다');
        await expect(host.locator('#online-create')).toBeVisible();
    });

    test('index.html?mode=vs가 vs.html로 넘어가고 다른 매개변수를 유지한다', async ({ page }) => {
        await page.goto('/index.html?mode=vs&room=ABCDE');
        await page.waitForURL(/\/vs\.html\?room=ABCDE$/);
        expect(page.url()).not.toContain('mode=');
    });
});
