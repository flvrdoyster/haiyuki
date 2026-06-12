// Per-skill behavior hooks for BattleEngine.
//
// SkillData (characterData.js) owns the static data (name/desc/type/cost/sfx);
// this registry owns the logic. All hooks are optional:
//   canUse(engine, who, user)            - extra availability conditions
//                                          (generic MP/limit checks stay in engine.canUseSkill)
//   execute(engine, who, user, opponent) - apply the skill effect
//   aiScore(engine, ctx)                 - CPU desire score, fires when score + rand(0~0.2) > 0.6
//                                          ctx: { isTenpai, isPlayerRiichi, turn, profile }
// Flags:
//   multiUse: true - exempt from the once-per-round / once-per-turn limits
//   autoFlow: true - fires via a dedicated flow (round start / pre-nagari);
//                    the generic useSkill path is blocked to prevent double-fire
//
// Not listed here: REACTIVE skills (EXCHANGE_RON, SUPER_IAI) and DORA_BOMB are
// activated by dedicated engine functions (activateRonTileExchange,
// activateSuperIaido, applyDoraBomb) outside the generic skill pipeline.

// --- Shared AI scoring profiles ---

function _aggressiveSkillScore(ctx) {
    let score = 0;
    if (ctx.isTenpai) score += 0.8;          // High priority if Tenpai
    if (ctx.turn > 15) score += 0.3;         // Desperation
    score += ctx.profile.aggression * 0.5;
    return score;
}

function _defensiveSkillScore(engine, ctx) {
    let score = 0;
    if (ctx.isPlayerRiichi) score += 1.0;    // Immediate reaction
    if (engine.cpu.hp < 3000) score += 0.4;
    score += ctx.profile.defense * 0.5;
    return score;
}

const SkillRegistry = {
    // ----- ATAHO -----
    TIGER_STRIKE: {
        canUse: (engine) => engine.turnCount < 20,
        execute: (engine, who, user) => {
            user.buffs.guaranteedWin = true; // Next Draw = Win
        },
        aiScore: (engine, ctx) => _aggressiveSkillScore(ctx)
    },

    HELL_PILE: {
        canUse: (engine, who) => {
            const target = engine.getOpponent(who);
            return !(target.buffs && target.buffs.curseDraw > 0);
        },
        execute: (engine, who, user, opponent) => {
            opponent.buffs.curseDraw = 3; // 3 Turns
        },
        aiScore: (engine, ctx) => _defensiveSkillScore(engine, ctx)
    },

    // ----- FARI -----
    RECOVERY: {
        multiUse: true,
        canUse: (engine, who, user) => user.hp < user.maxHp,
        execute: (engine, who) => {
            engine.heal(who, 3000); // 3000 HP
            engine.playFX('fx/heal', BattleConfig.PORTRAIT[who].x + 100, 300, { scale: 1.5 });
        },
        aiScore: (engine, ctx) => {
            let score = 0;
            const hpPct = engine.cpu.hp / engine.cpu.maxHp;
            if (hpPct < 0.6) score += 0.5;   // Base need
            if (hpPct < 0.3) score += 0.5;   // Critical need
            score += ctx.profile.defense * 0.4;
            if (ctx.turn > 10) score += 0.2; // Late game safety
            return score;
        }
    },

    DISCARD_GUARD: {
        multiUse: true,
        canUse: (engine, who, user) => !(user.buffs && user.buffs.discardGuard > 0),
        execute: (engine, who, user) => {
            user.buffs.discardGuard = 5; // 5 Turns
        },
        aiScore: (engine, ctx) => _defensiveSkillScore(engine, ctx)
    },

    // ----- PETUM -----
    CRITICAL: {
        canUse: (engine, who, user) => !(user.buffs && user.buffs.attackUp),
        execute: (engine, who, user) => {
            user.buffs.attackUp = true; // Lasts the round
        },
        aiScore: (engine, ctx) => _aggressiveSkillScore(ctx)
    },

    LAST_CHANCE: {
        autoFlow: true // Pre-nagari confirmation -> activateLastChance
    },

    // ----- RINXIANG -----
    WATER_MIRROR: {
        canUse: (engine, who, user) => !(user.buffs && user.buffs.defenseUp),
        execute: (engine, who, user) => {
            user.buffs.defenseUp = true;
        },
        aiScore: (engine, ctx) => _defensiveSkillScore(engine, ctx)
    },

    // ----- YURI -----
    SPIRIT_RIICHI: {
        canUse: (engine, who, user) => {
            if (engine.turnCount > 16) return false;
            if (user.buffs && user.buffs.spiritTimer > 0) return false;
            // Must be able to reach Tenpai by discarding one tile
            for (let i = 0; i < user.hand.length; i++) {
                const tempHand = [...user.hand];
                tempHand.splice(i, 1);
                if (engine.checkTenpai(tempHand)) return true;
            }
            return false;
        },
        execute: (engine, who, user) => {
            user.buffs.spiritTimer = 5; // 5 Turns countdown
        },
        aiScore: (engine, ctx) => _aggressiveSkillScore(ctx)
    },

    // ----- SMASH / MAYU -----
    // Setup skills: fire automatically at round start (STATE_INIT). For the
    // player this opens the tile-exchange UI; for the CPU it runs the AI
    // exchange directly. Per-tile MP cost is charged inside those flows.
    EXCHANGE_TILE: {
        multiUse: true,
        autoFlow: true,
        canUse: (engine) => engine.turnCount === 1,
        execute: (engine, who) => {
            if (who === 'CPU') {
                engine.executeCpuTileExchange('EXCHANGE_TILE');
            } else {
                engine.enterTileExchangeState();
            }
        }
    },

    PAINT_TILE: {
        multiUse: true,
        autoFlow: true,
        canUse: (engine) => engine.turnCount === 1,
        execute: (engine, who) => {
            if (who === 'CPU') {
                engine.executeCpuTileExchange('PAINT_TILE');
            } else {
                engine.enterTileExchangeState();
            }
        }
    }
};
