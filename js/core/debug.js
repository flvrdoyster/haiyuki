/**
 * debug.js — consolidated debug / QA module (console & test only; no on-screen UI).
 *
 *   QADebug     — read-only state snapshot → window.__haiyuki__ (Playwright reads this).
 *   DebugCheats — mutating cheats, exposed as bare console functions (win(),
 *                 challengerTest(), autoTest(), lastChance(), …). See CHEAT.md.
 *
 * Nothing runs unless called: QADebug.sync() from battleScene each frame; cheats from devtools.
 */

/**
 * QADebug — read-only game state export for testing & QA.
 *
 * Usage (browser console):
 *   window.__haiyuki__              → current snapshot
 *   window.__haiyuki__.p1.isTenpai → true/false
 *   window.__haiyuki__.actions.canRon
 *
 * All fields are deeply frozen. Never mutates game state.
 */
const QADebug = (() => {
    'use strict';

    // Human-readable names matching BattleEngine.STATE_* constants (by index)
    const STATE_NAMES = [
        'INIT',             // 0
        'DEALING',          // 1
        'WAIT_FOR_DRAW',    // 2
        'PLAYER_TURN',      // 3
        'ACTION_SELECT',    // 4
        'BATTLE_MENU',      // 5
        'CPU_TURN',         // 6
        'FX_PLAYING',       // 7
        'DAMAGE_ANIMATION', // 8
        'WIN',              // 9
        'LOSE',             // 10
        'NAGARI',           // 11
        'MATCH_OVER',       // 12
        'TILE_EXCHANGE',    // 13
        'ROULETTE',         // 14
    ];

    // Tenpai computation is O(13 × checkYaku). Refresh at most once every N ticks.
    const TENPAI_REFRESH_INTERVAL = 30;
    let _tenpai = { p1: false, cpu: false, lastTick: -Infinity };

    // --- Pure copy helpers (no game-object references leak out) ---

    function copyTile(t) {
        if (!t) return null;
        return { type: t.type, color: t.color };
    }

    function copyTiles(arr) {
        return (arr || []).map(copyTile);
    }

    function copyBuffs(b) {
        return {
            discardGuard: (b && b.discardGuard) | 0,
            curseDraw:    (b && b.curseDraw)    | 0,
            spiritTimer:  (b && b.spiritTimer)  | 0,
            guaranteedWin: !!(b && b.guaranteedWin),
            attackUp:      !!(b && b.attackUp),
            defenseUp:     !!(b && b.defenseUp),
        };
    }

    function copyOpenSets(sets) {
        return (sets || []).map(s => Object.freeze({ tiles: Object.freeze(copyTiles(s.tiles)) }));
    }

    // --- Tenpai helper (safe; engine.checkTenpai + engine.getFullHand) ---

    function computeTenpai(engine, player) {
        try {
            const hand = engine.getFullHand(player);
            // checkTenpai expects 11 tiles; fewer means still dealing
            if (!hand || hand.length < 11) return false;
            return !!engine.checkTenpai(hand);
        } catch (_) {
            return false;
        }
    }

    // --- Player snapshot ---

    function playerSnapshot(p, tenpai) {
        return Object.freeze({
            name:      p.name  || null,
            id:        p.id    || null,
            hp:        p.hp,
            maxHp:     p.maxHp,
            mp:        p.mp,
            maxMp:     p.maxMp,
            isRiichi:  !!p.isRiichi,
            isMenzen:  !p.openSets || p.openSets.length === 0,
            isTenpai:  tenpai,
            hand:      Object.freeze(copyTiles(p.hand)),
            openSets:  Object.freeze(copyOpenSets(p.openSets)),
            buffs:     Object.freeze(copyBuffs(p.buffs)),
        });
    }

    // --- Public API ---

    function sync(engine) {
        if (!engine || engine.currentState === undefined) {
            window.__haiyuki__ = null;
            return;
        }

        // Throttled tenpai refresh
        const tick = engine.totalTicks || 0;
        if (tick - _tenpai.lastTick >= TENPAI_REFRESH_INTERVAL) {
            _tenpai.p1  = computeTenpai(engine, engine.p1);
            _tenpai.cpu = computeTenpai(engine, engine.cpu);
            _tenpai.lastTick = tick;
        }

        const actions = engine.possibleActions || [];

        window.__haiyuki__ = Object.freeze({
            // ── Game state ─────────────────────────────────────────────────
            state: Object.freeze({
                id:            engine.currentState,
                name:          STATE_NAMES[engine.currentState] ?? String(engine.currentState),
                turn:          engine.turnCount,
                round:         engine.currentRound,
                deckRemaining: engine.deck ? engine.deck.length : 0,
                isSequencing:  !!(engine.sequencing && engine.sequencing.active),
            }),

            // ── Players ────────────────────────────────────────────────────
            p1:  playerSnapshot(engine.p1,  _tenpai.p1),
            cpu: playerSnapshot(engine.cpu, _tenpai.cpu),

            // ── Available actions (current possibleActions) ────────────────
            // Ron requires Riichi per RULEBOOK §4. Pon opens the hand (Menzen lost).
            actions: Object.freeze({
                canTsumo: actions.some(a => a.type === 'TSUMO'),
                canRon:   actions.some(a => a.type === 'RON'),
                canRiichi: actions.some(a => a.type === 'RIICHI'),
                canPon:   actions.some(a => a.type === 'PON'),
                raw:      Object.freeze(actions.map(a => Object.freeze({ type: a.type, label: a.label }))),
            }),

            // ── Board ──────────────────────────────────────────────────────
            board: Object.freeze({
                doras:        Object.freeze(copyTiles(engine.doras)),
                uraDoras:     Object.freeze(copyTiles(engine.uraDoras)),
                // discards is a flat shared array (both players pushed to same list)
                discardCount: engine.discards ? engine.discards.length : 0,
                discards:     Object.freeze(copyTiles(engine.discards)),
            }),

            // ── Round result (populated in WIN/LOSE/NAGARI states) ─────────
            winningYaku: engine.winningYaku
                ? Object.freeze({ name: engine.winningYaku.name, score: engine.winningYaku.score })
                : null,

            // ── Easy-mode draw assist: what the last player draw steered toward
            //    (null if assist off / hasn't fired). tier: complete|tenpai|building
            drawAssist: engine.lastDrawAssist
                ? Object.freeze({
                    turn: engine.lastDrawAssist.turn,
                    tile: engine.lastDrawAssist.tile,
                    tier: engine.lastDrawAssist.tier,
                    yaku: engine.lastDrawAssist.yaku,
                    reordered: engine.lastDrawAssist.reordered
                })
                : null,
        });
    }

    function reset() {
        _tenpai = { p1: false, cpu: false, lastTick: -Infinity };
        window.__haiyuki__ = null;
    }

    return { sync, reset };
})();

/**
 * DebugCheats — cheat implementations + the forceChallenger flag (mutating,
 * unlike QADebug above). Exposed to the console as bare functions further down
 * — win(), lastChance(), challengerTest(), etc. See CHEAT.md.
 */
const DebugCheats = {
    // Flag: when true, character-select confirm jumps straight to the ending →
    // hidden-boss intrusion (arm with window.challengerTest()).
    forceChallenger: false,

    testLastChance: function () {
        const e = BattleEngine;

        // Force Petum's skills onto P1 and jump to the last turn
        e.p1.skills = ['LAST_CHANCE', 'CRITICAL'];
        e.p1.mp = 100;
        e.turnCount = 20;

        const createTile = (id) => {
            const data = PaiData.TYPES.find(t => t.id === id);
            return { type: data.id, color: data.color, img: data.img };
        };

        // Tenpai hand (11) + 1 trash tile to discard
        const newHand = [];
        for (let i = 0; i < 3; i++) newHand.push(createTile('ataho'));
        for (let i = 0; i < 3; i++) newHand.push(createTile('smash'));
        for (let i = 0; i < 3; i++) newHand.push(createTile('rin'));
        for (let i = 0; i < 2; i++) newHand.push(createTile('fari'));
        newHand.push(createTile('punch'));

        e.p1.hand = newHand;
        e.sortHand(e.p1.hand);
        e.currentState = e.STATE_PLAYER_TURN;
    },

    debugWin: function () {
        const e = BattleEngine;
        const yakuName = 'IP_E_DAM';

        // 9 Atahos + 3 Punches
        const template = [
            { id: 'ataho', color: 'red' }, { id: 'ataho', color: 'red' }, { id: 'ataho', color: 'red' },
            { id: 'ataho', color: 'red' }, { id: 'ataho', color: 'red' }, { id: 'ataho', color: 'red' },
            { id: 'ataho', color: 'red' }, { id: 'ataho', color: 'red' }, { id: 'ataho', color: 'red' },
            { id: 'punch', color: 'red' }, { id: 'punch', color: 'red' }, { id: 'punch', color: 'red' }
        ];

        e.p1.hand = template.map(t => {
            const data = PaiData.TYPES.find(p => p.id === t.id);
            return { type: t.id, color: t.color, img: data ? data.img : "" };
        });

        console.log(`[Cheat] Hand set to ${yakuName}. You can now declare TSUMO.`);
        e.setExpression('P1', 'smile');
        e.checkSelfActions();
        if (e.possibleActions.length > 0) {
            // No forced modal: stay in the normal turn so the "날 수 있어!" hint and
            // the battle menu (아가리) surface the win. Drawing/discarding declines it.
            e.currentState = e.STATE_PLAYER_TURN;
            e.hoverIndex = e.p1.hand.length - 1;
            e.timer = 0;
        }
    }
};

// ── Console cheats — all bare functions, one consistent form (see CHEAT.md) ──
// Save
window.unlockMayu   = () => { Game.saveData.unlocked.push('mayu'); Game.save(); location.reload(); };
window.resetSave    = () => { Game.saveData = { unlocked: [], clearedOpponents: [], difficulty: (Game.saveData && Game.saveData.difficulty) || 'normal' }; Game.continueCount = 0; Game.save(); location.reload(); };
// Scene navigation
window.toCredits    = () => Game.changeScene(CreditsScene);
window.toCharSelect = () => Game.changeScene(CharacterSelectScene);
window.toBattle     = (p1 = 0, cpu = 1) => Game.changeScene(BattleScene, { playerIndex: p1, cpuIndex: cpu });
// Hidden boss (Mayu) — arm the full intrusion sequence from character select
window.challengerTest = () => {
    DebugCheats.forceChallenger = true;
    console.log('[Cheat] Challenger armed — pick a character to jump to the ending.');
};
// Auto-test
window.autoTest     = () => Game.startAutoTest();
window.autoLose     = () => Game.startAutoLoseTest();
window.stopAuto     = () => Game.stopAutoTest();
// Battle
window.lastChance   = () => DebugCheats.testLastChance();
window.win          = () => DebugCheats.debugWin();

/**
 * DebugOverlay — on-screen console for devtools-less debugging (mobile).
 *
 * Mirrors console.log/info/warn/error AND uncaught errors (window 'error' +
 * 'unhandledrejection') into a fixed, scrollable panel — so you can read logs
 * on a phone where devtools isn't available. Original console methods still
 * fire (passthrough). Self-contained: builds its own DOM + styles, no edits to
 * index.html or CSS.
 *
 * Shown only when the URL has ?debug (close with the ✕ button). When ?debug is
 * absent this module does nothing — no console wrapping, no DOM. No game logic here.
 */
const DebugOverlay = (() => {
    'use strict';

    const MAX = 120;                       // ring-buffer line cap
    const COLORS = { error: '#ff6b6b', warn: '#ffd166', info: '#8ec6ff', log: '#cfd2d6' };

    let buffer = [];
    let panel = null, logBody = null, visible = false, installed = false;

    function autoShow() {
        try { return new URLSearchParams(location.search).has('debug'); } catch (_) { return false; }
    }

    // Stringify console args without ever calling console.* (would re-enter).
    function fmt(args) {
        return Array.prototype.map.call(args, (a) => {
            if (a instanceof Error) return a.message;
            if (a && typeof a === 'object') { try { return JSON.stringify(a); } catch (_) { return String(a); } }
            return String(a);
        }).join(' ');
    }

    function mkBtn(label, onClick) {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = 'font:11px monospace;background:rgba(255,255,255,0.15);color:#fff;border:0;border-radius:3px;padding:2px 8px;margin-left:6px;cursor:pointer';
        b.addEventListener('click', onClick);
        return b;
    }

    function build() {
        if (panel) return;
        panel = document.createElement('div');
        panel.id = 'debug-overlay';
        panel.style.cssText = [
            // Fixed-size strip pinned to the top — never grows with content, so it
            // can't swallow the screen mid-play. logBody scrolls to show latest.
            'position:fixed', 'top:0', 'left:0', 'right:0', 'height:150px',
            'z-index:20000', 'display:none', 'flex-direction:column',
            'font:11px/1.45 monospace', 'background:rgba(0,0,0,0.82)', 'color:#cfd2d6',
            'border-bottom:1px solid rgba(255,255,255,0.25)', 'user-select:text', '-webkit-user-select:text'
        ].join(';');

        const bar = document.createElement('div');
        bar.style.cssText = 'display:flex;align-items:center;padding:4px 8px;background:rgba(255,255,255,0.08);flex:0 0 auto';
        const title = document.createElement('span');
        title.textContent = 'DEBUG';
        title.style.cssText = 'font-weight:700;letter-spacing:1px;flex:1';
        bar.appendChild(title);
        bar.appendChild(mkBtn('clear', () => { buffer = []; render(); }));
        bar.appendChild(mkBtn('✕', toggle));

        logBody = document.createElement('div');
        logBody.style.cssText = 'overflow-y:auto;padding:4px 8px;flex:1 1 auto;white-space:pre-wrap;word-break:break-word';

        panel.appendChild(bar);
        panel.appendChild(logBody);
        document.body.appendChild(panel);
    }

    function render() {
        if (!logBody) return;
        logBody.innerHTML = buffer.map((e) => {
            const c = COLORS[e.level] || COLORS.log;
            const t = e.text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
            return '<div style="color:' + c + '">' + t + '</div>';
        }).join('');
        logBody.scrollTop = logBody.scrollHeight;
    }

    function push(level, text) {
        buffer.push({ level, text });
        if (buffer.length > MAX) buffer.shift();
        if (visible) render();
    }

    function toggle() {
        build();
        visible = !visible;
        panel.style.display = visible ? 'flex' : 'none';
        if (visible) render();
    }

    // Wrap console.* (passthrough) + catch uncaught errors.
    function hook() {
        if (installed) return;
        installed = true;
        ['log', 'info', 'warn', 'error'].forEach((lvl) => {
            const orig = console[lvl] ? console[lvl].bind(console) : function () {};
            console[lvl] = function () {
                orig.apply(null, arguments);
                try { push(lvl, fmt(arguments)); } catch (_) { /* never break the app */ }
            };
        });
        window.addEventListener('error', (e) => {
            const at = e.filename ? ' @ ' + e.filename.split('/').pop() + ':' + e.lineno : '';
            push('error', (e.message || 'Error') + at);
        });
        window.addEventListener('unhandledrejection', (e) => {
            const r = e.reason;
            push('error', 'Unhandled: ' + (r && r.message ? r.message : String(r)));
        });
    }

    function init() {
        if (!autoShow()) return;   // ?debug-only — zero overhead when absent
        hook();
        build();
        visible = true;
        panel.style.display = 'flex';
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { toggle, push };
})();
