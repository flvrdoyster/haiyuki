/**
 * Playwright test helpers for 환세패유기 (Haiyuki).
 *
 * All game-state reads go through window.__haiyuki__ (qaDebug.js).
 * Game control calls use BattleEngine / Game globals exposed on window.
 */
import type { Page } from '@playwright/test';

// ── Snapshot types (mirror qaDebug.js) ───────────────────────────────────────

export interface Tile { type: string; color: string }
export interface OpenSet { tiles: Tile[] }
export interface Buffs {
    discardGuard: number; curseDraw: number; spiritTimer: number;
    guaranteedWin: boolean; attackUp: boolean; defenseUp: boolean;
}
export interface PlayerSnap {
    name: string | null; id: string | null;
    hp: number; maxHp: number; mp: number; maxMp: number;
    isRiichi: boolean; isMenzen: boolean; isTenpai: boolean;
    hand: Tile[]; openSets: OpenSet[]; buffs: Buffs;
}
export interface HaiyukiSnap {
    state: { id: number; name: string; turn: number; round: number; deckRemaining: number; isSequencing: boolean };
    p1: PlayerSnap;
    cpu: PlayerSnap;
    actions: { canTsumo: boolean; canRon: boolean; canRiichi: boolean; canPon: boolean; raw: Array<{ type: string; label: string }> };
    board: { doras: Tile[]; uraDoras: Tile[]; discardCount: number; discards: Tile[] };
    winningYaku: { name: string; score: number } | null;
}
export interface Violation { rule: string; msg: string; state: string }

// ── Game lifecycle ────────────────────────────────────────────────────────────

/**
 * Wait for the game engine to be fully initialised (assets loaded, first scene active).
 */
export async function waitForGame(page: Page) {
    await page.waitForFunction(
        () => {
            try {
                const g  = (0, eval)('Game');
                const be = (window as any).BattleEngine;
                return !!g && !!be && g.currentScene !== null;
            } catch { return false; }
        },
        { timeout: 25_000 }
    );
}

/**
 * Navigate to a battle.
 * Pass autoTest=false to keep the game paused at each player turn (for state injection).
 */
export async function startBattle(
    page: Page,
    opts: { playerIndex?: number; cpuIndex?: number; autoTest?: boolean } = {}
) {
    const { playerIndex = 0, cpuIndex = 1, autoTest = true } = opts;
    await page.evaluate(
        ({ pi, ci, at }) => {
            // Game/Assets/BattleScene/BattleConfig are `const` — not on window.
            // In the page's eval scope they are accessible as plain identifiers.
            const g  = (0, eval)('Game');
            const a  = (0, eval)('Assets');
            const bc = (0, eval)('BattleConfig');
            const bs = (0, eval)('BattleScene');
            g.isAutoTest = at;
            a.setMute(true);
            bc.RULES.SKILLS_ENABLED = false;
            g.changeScene(bs, { playerIndex: pi, cpuIndex: ci });
        },
        { pi: playerIndex, ci: cpuIndex, at: autoTest }
    );
}

/** Enable Game.isAutoTest (10× speed + AI player) after injection is done. */
export async function enableAutoTest(page: Page) {
    await page.evaluate(() => { (0, eval)('Game').isAutoTest = true; });
}

// ── State waits ───────────────────────────────────────────────────────────────

export async function waitForState(page: Page, name: string, timeout = 30_000) {
    await page.waitForFunction(
        (s: string) => (window as any).__haiyuki__?.state?.name === s,
        name,
        { timeout }
    );
}

export async function waitForAnyState(page: Page, names: string[], timeout = 30_000) {
    await page.waitForFunction(
        (ss: string[]) => ss.includes((window as any).__haiyuki__?.state?.name ?? ''),
        names,
        { timeout }
    );
}

/**
 * Wait for the match to end (up to 60 s).
 *
 * P1-win path: BattleEngine enters STATE_MATCH_OVER visibly.
 * CPU-win path: proceedFromMatchOver() is called synchronously inside
 *   matchOver(), so MATCH_OVER is never captured by QADebug.  Detect it
 *   by watching Game.currentScene leave BattleScene instead.
 */
export async function waitForMatchOver(page: Page) {
    await page.waitForFunction(
        () => {
            const h = (window as any).__haiyuki__;
            // Explicit MATCH_OVER (P1-win path)
            if (h?.state?.name === 'MATCH_OVER') return true;
            // Scene-change detection (CPU-win path): h is non-null (we were in
            // battle) and the current scene is no longer BattleScene.
            if (!h) return false;
            try {
                const g  = (0, eval)('Game');
                const bs = (0, eval)('BattleScene');
                return g.currentScene !== bs;
            } catch { return false; }
        },
        { timeout: 60_000 }
    );
}

// ── Browser-side harness ──────────────────────────────────────────────────────

/**
 * Install a 50 ms polling monitor that checks RULEBOOK invariants every tick.
 * Violations accumulate in window.__qa_violations__.
 */
export async function installMonitor(page: Page) {
    await page.evaluate(() => {
        (window as any).__qa_violations__ = [];

        type Snap = any;
        type MaybeViolation = { rule: string; msg: string } | undefined;

        const CHECKS: Array<(h: Snap) => MaybeViolation> = [
            // §4 – Ron only when Riichi
            h => {
                if (h.actions.canRon && !h.p1.isRiichi)
                    return { rule: 'RON_REQUIRES_RIICHI', msg: `canRon=true but isRiichi=false (state=${h.state.name}, turn=${h.state.turn})` };
            },
            // §3 – Riichi requires closed hand
            h => {
                if (h.p1.isRiichi && !h.p1.isMenzen)
                    return { rule: 'RIICHI_REQUIRES_MENZEN', msg: `isRiichi but isMenzen=false (state=${h.state.name})` };
            },
            // §5 – Pon (open sets) disables Ron
            h => {
                if (h.p1.openSets.length > 0 && h.actions.canRon)
                    return { rule: 'PON_DISABLES_RON', msg: `openSets=${h.p1.openSets.length} but canRon=true (state=${h.state.name})` };
            },
            // §1 – Turn limit is 20 (active-play states only).
            // turn=21 appears briefly in FX_PLAYING/NAGARI because PASS increments
            // turnCount before checkRoundEnd fires NAGARI — no actual play occurs at 21.
            h => {
                const ACTIVE = ['PLAYER_TURN', 'ACTION_SELECT', 'WAIT_FOR_DRAW', 'CPU_TURN'];
                if (ACTIVE.includes(h.state.name) && h.state.turn > 20)
                    return { rule: 'TURN_EXCEEDS_20', msg: `turn=${h.state.turn} (state=${h.state.name})` };
            },
            // §8 – HP stays in [0, maxHp]
            h => {
                if (h.p1.hp  < 0 || h.p1.hp  > h.p1.maxHp)
                    return { rule: 'HP_OUT_OF_BOUNDS', msg: `p1.hp=${h.p1.hp} maxHp=${h.p1.maxHp}` };
                if (h.cpu.hp < 0 || h.cpu.hp > h.cpu.maxHp)
                    return { rule: 'HP_OUT_OF_BOUNDS', msg: `cpu.hp=${h.cpu.hp} maxHp=${h.cpu.maxHp}` };
            },
            // §4 – WIN / LOSE must carry a yaku
            h => {
                if ((h.state.name === 'WIN' || h.state.name === 'LOSE') && h.winningYaku === null)
                    return { rule: 'WIN_WITHOUT_YAKU', msg: `${h.state.name} with no winningYaku` };
            },
        ];

        (window as any).__qa_monitor__ = setInterval(() => {
            const h = (window as any).__haiyuki__;
            if (!h) return;
            for (const check of CHECKS) {
                const v = check(h);
                if (v) (window as any).__qa_violations__.push({ ...v, state: h.state.name });
            }
        }, 50);
    });
}

/**
 * Supplementary auto-driver that covers the cases Game.isAutoTest does NOT handle:
 *   - PASS reaction after CPU discards (PON / RON prompts the player)
 *   - WIN / LOSE / NAGARI result screen advancement
 *   - MATCH_OVER advancement
 *
 * Game.isAutoTest already handles PLAYER_TURN (performAutoTurn) and
 * ACTION_SELECT for TSUMO / RIICHI / PASS_SELF.
 */
export async function installAutoDriver(page: Page) {
    await page.evaluate(() => {
        (window as any).__qa_autodriver__ = setInterval(() => {
            const e = (window as any).BattleEngine;
            if (!e || e.currentState === undefined) return;

            // PASS on any reaction the player didn't auto-handle (PON / RON after CPU discard)
            if (e.currentState === e.STATE_ACTION_SELECT && e.timer > 3) {
                const pass = e.possibleActions.find((a: any) => a.type === 'PASS');
                if (pass) { e.executeAction(pass); return; }
            }

            // Advance WIN / LOSE result screen (stateTimer guard matches engine's 160-frame delay)
            if ((e.currentState === e.STATE_WIN || e.currentState === e.STATE_LOSE) &&
                e.stateTimer > 170) {
                e.confirmResult();
                return;
            }

            // Advance NAGARI result screen
            if (e.currentState === e.STATE_NAGARI && e.stateTimer > 90) {
                e.confirmResult();
                return;
            }

            // Advance MATCH_OVER
            if (e.currentState === e.STATE_MATCH_OVER && e.stateTimer > 70) {
                e.proceedFromMatchOver();
            }
        }, 80);
    });
}

/** Stop both the monitor and the auto-driver. */
export async function stopHarness(page: Page) {
    await page.evaluate(() => {
        clearInterval((window as any).__qa_monitor__);
        clearInterval((window as any).__qa_autodriver__);
        clearInterval((window as any).__qa_nagari_monitor__);
    });
}

/** Return a deep-cloned snapshot of the current __haiyuki__ state. */
export async function getSnap(page: Page): Promise<HaiyukiSnap | null> {
    return page.evaluate(() => {
        const h = (window as any).__haiyuki__;
        return h ? JSON.parse(JSON.stringify(h)) : null;
    });
}

/** Return all accumulated invariant violations. */
export async function getViolations(page: Page): Promise<Violation[]> {
    return page.evaluate(() => (window as any).__qa_violations__ ?? []);
}

// ── State injection helpers ───────────────────────────────────────────────────

/**
 * Tile factory matching PaiData.TYPES shape (type + color + img).
 * Spread to get independent copies: { ...T.rin }
 */
export const T = {
    ataho:      { type: 'ataho',       color: 'red',    img: 'tiles/pai_ata.png'    },
    rin:        { type: 'rin',         color: 'red',    img: 'tiles/pai_rin.png'    },
    smash:      { type: 'smash',       color: 'blue',   img: 'tiles/pai_smsh.png'   },
    yuri:       { type: 'yuri',        color: 'blue',   img: 'tiles/pai_yuri.png'   },
    pet:        { type: 'pet',         color: 'yellow', img: 'tiles/pai_pet.png'    },
    fari:       { type: 'fari',        color: 'yellow', img: 'tiles/pai_fari.png'   },
    punch:      { type: 'punch',       color: 'red',    img: 'tiles/pai_punch.png'  },
    sword:      { type: 'sword',       color: 'blue',   img: 'tiles/pai_sword.png'  },
    wand:       { type: 'wand',        color: 'yellow', img: 'tiles/pai_wand.png'   },
    mred:       { type: 'mayu_red',    color: 'red',    img: 'tiles/pai_red.png'    },
    mblue:      { type: 'mayu_blue',   color: 'blue',   img: 'tiles/pai_blue.png'   },
    myellow:    { type: 'mayu_yellow', color: 'yellow', img: 'tiles/pai_yellow.png' },
    mpurple:    { type: 'mayu_purple', color: 'purple', img: 'tiles/pai_purple.png' },
} as const;

/** Produce n independent copies of a tile object. */
export function repeat<K extends keyof typeof T>(key: K, n: number): Array<typeof T[K]> {
    return Array.from({ length: n }, () => ({ ...T[key] }));
}

/**
 * Inject a known tenpai state into P1 and queue the winning tile on the deck,
 * then flip the engine to STATE_WAIT_FOR_DRAW so the auto-driver draws it.
 *
 * Hand composition (SAM_DO_RIP = 4 triplets, base score 2400):
 *   Closed: ataho×3 + rin×3 + smash×3 + yuri×2  (11 tiles) → waiting for yuri
 *   Open:   [ata×3 open set] + rin×3 + smash×3 + yuri×2 closed (8 tiles) → waiting for yuri
 *
 * Returns cpu.hp at the moment of injection (before any damage).
 */
export async function injectSamDoRipTenpai(page: Page, openHand: boolean): Promise<number> {
    return page.evaluate((open: boolean) => {
        const e = (window as any).BattleEngine;

        // Clear all modifiers so we get a clean base-score → damage mapping
        e.p1.buffs = {};
        e.cpu.buffs = {};
        e.doras      = [];
        e.uraDoras   = [];

        const mk = (type: string, color: string, img: string) => ({ type, color, img });
        const ata  = () => mk('ataho', 'red',    'tiles/pai_ata.png');
        const rin  = () => mk('rin',   'red',    'tiles/pai_rin.png');
        const smsh = () => mk('smash', 'blue',   'tiles/pai_smsh.png');
        const yuri = () => mk('yuri',  'blue',   'tiles/pai_yuri.png');

        if (open) {
            // 3-tile Pon set + 8 closed tiles = 11 total
            e.p1.openSets = [{ tiles: [ata(), ata(), ata()] }];
            e.p1.hand     = [rin(), rin(), rin(), smsh(), smsh(), smsh(), yuri(), yuri()];
            e.p1.isMenzen = false;
        } else {
            // 11 closed tiles
            e.p1.openSets = [];
            e.p1.hand     = [ata(), ata(), ata(), rin(), rin(), rin(), smsh(), smsh(), smsh(), yuri(), yuri()];
            e.p1.isMenzen = true;
        }
        e.p1.isRiichi         = false;
        e.p1.declaringRiichi  = false;
        // Invalidate action cache so checkSelfActions re-runs after draw
        e._cachedSelfActionsKey = null;
        e._cachedSelfActions    = null;

        // deck.pop() draws from the END — push the winning tile there
        e.deck.push(yuri());

        // Hand off to WAIT_FOR_DRAW so autoTest auto-draws on the next tick
        e.currentState = e.STATE_WAIT_FOR_DRAW;
        e.timer        = 0;

        return e.cpu.hp as number;
    }, openHand);
}

/**
 * Inject a tenpai state (same SAM_DO_RIP hand) together with a Riichi flag.
 * Used for Ura Dora tests.
 */
export async function injectRiichiTenpai(page: Page, withRiichi: boolean): Promise<void> {
    await page.evaluate((riichi: boolean) => {
        const e = (window as any).BattleEngine;
        e.p1.buffs = {};
        e.cpu.buffs = {};
        e.doras    = [];
        // Keep uraDoras intact so we can check uraDoraRevealed

        const mk = (type: string, color: string, img: string) => ({ type, color, img });
        e.p1.openSets        = [];
        e.p1.hand            = [
            mk('ataho','red','tiles/pai_ata.png'), mk('ataho','red','tiles/pai_ata.png'), mk('ataho','red','tiles/pai_ata.png'),
            mk('rin','red','tiles/pai_rin.png'),   mk('rin','red','tiles/pai_rin.png'),   mk('rin','red','tiles/pai_rin.png'),
            mk('smash','blue','tiles/pai_smsh.png'),mk('smash','blue','tiles/pai_smsh.png'),mk('smash','blue','tiles/pai_smsh.png'),
            mk('yuri','blue','tiles/pai_yuri.png'), mk('yuri','blue','tiles/pai_yuri.png'),
        ];
        e.p1.isMenzen        = true;
        e.p1.isRiichi        = riichi;
        e.p1.declaringRiichi = false;
        e._cachedSelfActionsKey = null;
        e._cachedSelfActions    = null;
        e.deck.push(mk('yuri','blue','tiles/pai_yuri.png'));
        e.currentState = e.STATE_WAIT_FOR_DRAW;
        e.timer        = 0;
    }, withRiichi);
}
