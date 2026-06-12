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
        });
    }

    function reset() {
        _tenpai = { p1: false, cpu: false, lastTick: -Infinity };
        window.__haiyuki__ = null;
    }

    return { sync, reset };
})();

/**
 * DebugCheats — console-only cheats (mutating, unlike QADebug above).
 * Usage from devtools during a battle:
 *   DebugCheats.testLastChance() — Petum skills + tenpai hand + turn 20
 *   DebugCheats.debugWin()       — set hand to IP_E_DAM, then declare Tsumo
 */
const DebugCheats = {
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
            e.currentState = e.STATE_ACTION_SELECT;
            e.selectedActionIndex = 0;
        }
    }
};

// Console shorthand (kept from the old BattleEngine global)
window.debugWin = () => DebugCheats.debugWin();
