/**
 * 튜토리얼: 레슨 데이터의 단계별 텐파이·역 판정 + 타이틀에서 끝까지 진행.
 *
 * A. 데이터 단언 — 판정 규칙(yakuLogic)이 바뀌면 여기서 먼저 깨진다.
 * B. 흐름 — 실제 키 입력으로 레슨 1~4를 끝내고 타이틀로 돌아오며, 본편 저장·HP·비기 설정이 그대로인지 확인.
 */
import { test, expect, type Page } from '@playwright/test';

async function tapKey(page: Page, key: string) {
    await page.keyboard.down(key);
    await page.waitForTimeout(70);
    await page.keyboard.up(key);
    await page.waitForTimeout(60);
}

async function waitForTitle(page: Page) {
    await page.waitForFunction(() => {
        try {
            const g = (0, eval)('Game');
            return g.currentScene === (0, eval)('TitleScene');
        } catch { return false; }
    }, { timeout: 30_000 });
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForTitle(page);
    await page.evaluate(() => (0, eval)('Assets').setMute(true));
});

const CHARACTER_IDS = ['ataho', 'rinxiang', 'fari', 'smash', 'petum', 'yuri', 'mayu'];

test.describe('A. 레슨 데이터', () => {
    test('단계마다 텐파이·역·점수가 데이터대로 성립하고 의도하지 않은 펑·텐파이가 없다', async ({ page }) => {
        const report = await page.evaluate((charIds) => {
            const TutorialData = (0, eval)('TutorialData');
            const PaiData = (0, eval)('PaiData');
            const YakuLogic = (0, eval)('YakuLogic');
            const BattleEngine = (0, eval)('BattleEngine');
            const errors: string[] = [];
            const tile = (id: string) => ({ type: id, color: PaiData.BY_ID[id].color, img: PaiData.BY_ID[id].img });
            const count = (hand: any[], id: string) => hand.filter(t => t.type === id).length;

            TutorialData.LESSONS.forEach((lesson: any, li: number) => {
                const tag = `레슨${li + 1}`;
                let hand: any[] = [];
                Object.keys(lesson.hand).forEach(id => { for (let i = 0; i < lesson.hand[id]; i++) hand.push(tile(id)); });
                if (hand.length !== 11) errors.push(`${tag}: 배패가 ${hand.length}장`);
                let open: any[] = [];
                const full = () => hand.concat(...open.map(s => s.tiles));
                const isOpen = () => open.length > 0;
                let discardNo = 0;
                let sawWin = false;
                let reachedTenpai = false;

                const canRiichiAfterDraw = () => hand.some((_, i) => {
                    const rest = hand.slice(); rest.splice(i, 1);
                    return !!YakuLogic.checkTenpai(rest, false, false);
                });

                lesson.plan.forEach((step: any, si: number) => {
                    const where = `${tag} 단계${si + 1}`;
                    if (step.draw) {
                        hand.push(tile(step.draw));
                        if (step.win) {
                            sawWin = true;
                            check(where, full(), step.win, false);
                        } else {
                            const next = lesson.plan[si + 1];
                            const expectsTenpai = !!(next && next.tenpai);
                            if (!reachedTenpai && !isOpen() && canRiichiAfterDraw() !== expectsTenpai) {
                                errors.push(`${where}: 버려서 텐파이가 ${expectsTenpai ? '되어야' : '되면 안 되는'} 구간`);
                            }
                        }
                    } else if (step.discard) {
                        const idx = hand.findIndex(t => t.type === step.discard);
                        if (idx < 0) { errors.push(`${where}: 버릴 ${step.discard} 없음`); return; }
                        hand.splice(idx, 1);
                        if (step.tenpai) {
                            reachedTenpai = true;
                            const names = YakuLogic.checkTenpai(full(), true, isOpen());
                            if (!names || !names.some((n: string) => n.includes(step.tenpai))) {
                                errors.push(`${where}: 텐파이 ${step.tenpai} 아님 (${JSON.stringify(names)})`);
                            }
                        }
                        const cpuTile = lesson.cpuDraws[discardNo];
                        discardNo++;
                        const nextPon = lesson.plan[si + 1] && lesson.plan[si + 1].pon;
                        const nextRon = lesson.plan[si + 1] && lesson.plan[si + 1].ron;
                        if (cpuTile && reachedTenpai && cpuTile !== nextRon && YakuLogic.checkYaku(full().concat([tile(cpuTile)]), 'ataho', isOpen())) {
                            errors.push(`${where}: CPU가 버리는 ${cpuTile}이 화료 패라 의도하지 않은 론이 남`);
                        }
                        if (cpuTile && !lesson.needRiichi && count(hand, cpuTile) >= 2 && cpuTile !== nextPon) {
                            errors.push(`${where}: CPU가 버리는 ${cpuTile}에 의도하지 않은 펑 확인이 뜸`);
                        }
                    } else if (step.pon) {
                        let removed = 0;
                        hand = hand.filter(t => (t.type === step.pon && removed < 2) ? (removed++, false) : true);
                        if (removed !== 2) errors.push(`${where}: 펑할 ${step.pon} 2장 없음`);
                        open.push({ tiles: [tile(step.pon), tile(step.pon), tile(step.pon)] });
                    } else if (step.ron) {
                        sawWin = true;
                        check(where, full().concat([tile(step.ron)]), step.win, true);
                    }
                });
                if (!sawWin) errors.push(`${tag}: 화료 단계 없음`);
                if (lesson.cpuDraws.length < discardNo) errors.push(`${tag}: cpuDraws 부족`);

                const winStep = lesson.plan.find((s: any) => s.win);
                const finalHand = full().concat(lesson.plan.filter((s: any) => s.ron).map((s: any) => tile(s.ron)));
                const doraCount = count(finalHand, lesson.dora);
                if (doraCount !== (winStep.win.dora || 0)) errors.push(`${tag}: 도라 ${doraCount}장 != ${winStep.win.dora || 0}`);
                if (count(finalHand, lesson.uraDora) > 0) errors.push(`${tag}: 우라도라가 화료 패와 겹침`);

                function check(where: string, fullHand: any[], win: any, ron: boolean) {
                    if (fullHand.length !== 12) { errors.push(`${where}: 화료 패 ${fullHand.length}장`); return; }
                    charIds.forEach((cid: string) => {
                        const res = YakuLogic.checkYaku(fullHand, cid, isOpen());
                        if (!res) { errors.push(`${where}: ${cid} 역 없음`); return; }
                        const score = BattleEngine.calculateScore(res.score, !isOpen());
                        if (!res.yaku[0].includes(win.yaku)) errors.push(`${where}: ${cid} 역 ${res.yaku[0]} != ${win.yaku}`);
                        if (score !== win.score) errors.push(`${where}: ${cid} 점수 ${score} != ${win.score}`);
                    });
                }
            });
            return errors;
        }, CHARACTER_IDS);

        expect(report).toEqual([]);
    });

    test('취호전은 닫힌 패에서만 성립하고 펑(오픈)으로는 만들 수 없다', async ({ page }) => {
        const result = await page.evaluate(() => {
            const PaiData = (0, eval)('PaiData');
            const YakuLogic = (0, eval)('YakuLogic');
            const mk = (spec: Record<string, number>) => {
                const hand: any[] = [];
                Object.keys(spec).forEach(id => { for (let i = 0; i < spec[id]; i++) hand.push({ type: id, color: PaiData.BY_ID[id].color, img: PaiData.BY_ID[id].img }); });
                return hand;
            };
            const closed = YakuLogic.checkYaku(mk({ ataho: 4, rin: 4, smash: 4 }), 'ataho', false);
            const opened = YakuLogic.checkYaku(mk({ ataho: 4, rin: 4, smash: 4 }), 'ataho', true);
            return { closed: closed && closed.yaku[0], opened: opened && opened.yaku[0] };
        });
        expect(result.closed).toContain('취호전');
        expect(result.opened == null || !String(result.opened).includes('취호전')).toBe(true);
    });
});

async function startTutorialFromTitle(page: Page) {
    await tapKey(page, 'z');
    await tapKey(page, 'ArrowDown');
    await tapKey(page, 'z');
    await page.waitForFunction(() => (0, eval)('Game').currentScene === (0, eval)('BattleScene'), { timeout: 15_000 });
}

/** 현재 화면에서 눌러야 할 키 하나를 돌려준다. 기다려야 하면 null. */
function nextKey(page: Page): Promise<{ key: string | null; lesson: number; hpOk: boolean; ids: string[] }> {
    return page.evaluate(() => {
        const g = (0, eval)('Game');
        const e = (0, eval)('BattleEngine');
        if (g.currentScene !== (0, eval)('BattleScene') || !e.tutorial) return { key: null, lesson: -1, hpOk: true, ids: [] };
        const hpOk = e.p1.hp === e.p1.maxHp;
        const out = (key: string | null) => ({ key, lesson: e.tutorial.index, hpOk, ids: [e.p1.id, e.cpu.id] });
        if (e.narration) return out(e.narration.age > 12 ? 'z' : null);
        if (g._fade) return out(null);
        switch (e.currentState) {
            case e.STATE_WAIT_FOR_DRAW:
                if (e.timer < 5) return out(null);
                if (e.possibleActions.some((a: any) => a.type === 'PON')) return out('Escape');
                return out('z');
            case e.STATE_BATTLE_MENU:
                return out('z');
            case e.STATE_PLAYER_TURN: {
                if (e.p1.isRiichi && !e.p1.declaringRiichi) return out(null);
                if (e.actionFocused) return out('z');
                const want = e.tutorial.discards[e.tutorial.discardCount];
                const target = e.p1.hand.findIndex((t: any) => t.type === want);
                if (target < 0) return out(null);
                if (e.hoverIndex === target) return out('z');
                return out(e.hoverIndex < target ? 'ArrowRight' : 'ArrowLeft');
            }
            case e.STATE_WIN:
                return out(e.stateTimer > 125 ? 'z' : null);
            default:
                return out(null);
        }
    });
}

test.describe('B. 흐름', () => {
    test('타이틀에서 TUTORIAL로 레슨 1~4를 끝내고 타이틀로 돌아온다. 저장·HP·비기 설정은 그대로', async ({ page }) => {
        test.setTimeout(240_000);

        await page.evaluate(() => localStorage.removeItem('haiyuki_save'));
        const skillsBefore = await page.evaluate(() => (0, eval)('BattleConfig').RULES.SKILLS_ENABLED);

        await startTutorialFromTitle(page);

        const lessons = new Set<number>();
        let allHpFull = true;
        let ids: string[] = [];
        const lookSeen = new Map<string, string[]>();
        const deadline = Date.now() + 200_000;
        while (Date.now() < deadline) {
            const look = await page.evaluate(() => {
                const e = (0, eval)('BattleEngine');
                if (!e.narration || e.narration.age < 3) return null;
                const p = e.narrationPage();
                if (p.look.length === 0) return null;
                const R = (0, eval)('BattleRenderer');
                const S = (0, eval)('BattleRenderer')._lookRects;
                const missing = p.look.filter((t: string) => {
                    if (t.startsWith('hand:')) return !S.hand.some((r: any) => r.type === t.slice(5));
                    if (t === 'actionButton') return !R._actionRect;
                    return !S[t];
                });
                const onResult = e.currentState === e.STATE_WIN;
                if (onResult && p.look.some((t: string) => t === 'dora' || t === 'uraDora') && !R._lookUnderResult(e)) missing.push('result-not-hidden');
                return { text: p.text, missing };
            });
            if (look) lookSeen.set(look.text, look.missing);
            const s = await nextKey(page);
            if (s.lesson < 0) {
                const onTitle = await page.evaluate(() => (0, eval)('Game').currentScene === (0, eval)('TitleScene'));
                if (onTitle) break;
            } else {
                lessons.add(s.lesson);
                if (!s.hpOk) allHpFull = false;
                if (s.ids.length) ids = s.ids;
            }
            if (s.key) await tapKey(page, s.key); else await page.waitForTimeout(100);
        }

        expect(await page.evaluate(() => (0, eval)('Game').currentScene === (0, eval)('TitleScene'))).toBe(true);
        expect([...lessons].sort()).toEqual([0, 1, 2, 3]);
        expect(allHpFull).toBe(true);
        expect(ids[0]).not.toBe(ids[1]);
        expect(ids).not.toContain('mayu');
        expect(await page.evaluate(() => localStorage.getItem('haiyuki_save'))).toBeNull();
        expect(await page.evaluate(() => (0, eval)('BattleConfig').RULES.SKILLS_ENABLED)).toBe(skillsBefore);
        expect(await page.evaluate(() => (0, eval)('BattleEngine').tutorial)).toBeNull();
        expect(await page.evaluate(() => (0, eval)('BattleEngine').cpu.hp)).toBe(0);

        const lookPages = await page.evaluate(() => (0, eval)('TutorialData').LESSONS
            .flatMap((l: any) => l.script.flatMap((s: any) => s.say))
            .filter((p: any) => typeof p !== 'string' && p.look).map((p: any) => p.text));
        expect([...lookSeen.keys()].sort()).toEqual([...lookPages].sort());
        for (const [text, missing] of lookSeen) expect(missing, text).toEqual([]);
    });

    test('레슨 3에서 펑을 넘기면 그 레슨을 처음부터 다시 시작한다', async ({ page }) => {
        test.setTimeout(120_000);
        await page.evaluate(() => {
            const g = (0, eval)('Game');
            g.changeScene((0, eval)('BattleScene'), { playerIndex: 0, cpuIndex: 1, tutorial: true, lessonIndex: 2 });
        });

        let restarted = false;
        let sawPon = false;
        const deadline = Date.now() + 90_000;
        while (Date.now() < deadline) {
            const info = await page.evaluate(() => {
                const e = (0, eval)('BattleEngine');
                return {
                    pon: e.possibleActions.some((a: any) => a.type === 'PON'),
                    wait: e.currentState === e.STATE_WAIT_FOR_DRAW,
                    narration: !!e.narration,
                    age: e.narration ? e.narration.age : 0,
                    discardCount: e.tutorial.discardCount,
                    handLen: e.p1.hand.length,
                    ptr: e.tutorial.ptr,
                    fail: e.narration ? e.narrationPage().text.includes('처음부터 다시') : false
                };
            });
            if (sawPon && !info.narration && info.discardCount === 0 && info.handLen === 11 && info.ptr <= 1) { restarted = true; break; }
            const s = await nextKey(page);
            if (info.wait && info.pon && !info.narration) {
                sawPon = true;
                await tapKey(page, 'z');
                continue;
            }
            if (s.key) await tapKey(page, s.key); else await page.waitForTimeout(100);
        }
        expect(sawPon).toBe(true);
        expect(restarted).toBe(true);
    });

    test('도중에 메뉴의 타이틀로를 고르면 타이틀로 나가고 비기 설정이 복구된다', async ({ page }) => {
        const skillsBefore = await page.evaluate(() => (0, eval)('BattleConfig').RULES.SKILLS_ENABLED);
        await startTutorialFromTitle(page);

        await page.waitForFunction(() => {
            const e = (0, eval)('BattleEngine');
            return e.currentState === e.STATE_WAIT_FOR_DRAW && !!e.narration;
        }, { timeout: 15_000 });
        for (let i = 0; i < 20; i++) {
            const n = await page.evaluate(() => { const e = (0, eval)('BattleEngine'); return e.narration ? e.narration.pages.length - e.narration.index : 0; });
            if (n === 0) break;
            await page.waitForTimeout(300);
            await tapKey(page, 'z');
        }
        await tapKey(page, 'Escape');
        expect(await page.evaluate(() => { const e = (0, eval)('BattleEngine'); return e.currentState === e.STATE_BATTLE_MENU; })).toBe(true);
        const labels = await page.evaluate(() => (0, eval)('BattleMenuSystem').menuItems.map((i: any) => i.label).filter(Boolean));
        expect(labels[labels.length - 1]).toBe('타이틀로');

        await tapKey(page, 'ArrowDown');
        await tapKey(page, 'z');
        await waitForTitle(page);
        expect(await page.evaluate(() => (0, eval)('BattleConfig').RULES.SKILLS_ENABLED)).toBe(skillsBefore);
    });
});
