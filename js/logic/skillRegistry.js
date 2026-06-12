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
// REACTIVE skills (EXCHANGE_RON, SUPER_IAI) and DORA_BOMB have no registry
// entry: they fire via the SkillFlows functions below, called from dedicated
// engine flows (ron counter / win sequence) outside the generic skill pipeline.

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


// --- Skill flows ---
// Larger skill implementations that drive engine state directly (sequencing,
// states, deck). They live here so ALL skill-specific code is in this file;
// the engine calls them with itself as the first argument.

const SkillFlows = {
    // RINXIANG: rewrite ura-doras to the most frequent tile in the winner's hand
    applyDoraBomb: function (engine, attacker, who) {
        const skillId = 'DORA_BOMB';
        const skill = SkillData[skillId];

        if (!attacker.id || attacker.id !== 'rinxiang') return;
        if (attacker.mp < skill.cost) return;

        // Find most frequent tile in hand
        const hand = engine.getFullHand(attacker);
        const counts = {};
        hand.forEach(tile => {
            const key = tile.type + '_' + tile.color;
            if (!counts[key]) counts[key] = { count: 0, tile: tile };
            counts[key].count++;
        });

        const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
        if (sorted.length === 0) return;

        engine.consumeMp(who, skill.cost);

        // Set Ura Doras to the best tile
        for (let i = 0; i < engine.uraDoras.length; i++) {
            const targetTile = sorted[0].tile;
            engine.uraDoras[i] = {
                type: targetTile.type,
                color: targetTile.color,
                img: targetTile.img
            };
        }

        engine.showPopup('SKILL', { text: skill.name, blocking: false });
        engine.triggerDialogue(skillId, who === 'P1' ? 'p1' : 'cpu');
        engine.events.push({ type: 'SOUND', id: 'audio/quake' });
    },

    // SMASH (REACTIVE): cut the dangerous discard out of existence — turn passes
    activateSuperIaido: function (engine, who) {
        engine.discards.pop();

        engine.playFX('fx/slash_lr', 320, 240, { scale: 2.0, life: 30 });
        engine.events.push({ type: 'SOUND', id: 'audio/sword_draw' });
        engine.triggerDialogue('SKILL_DEFENSE', who === 'P1' ? 'p1' : 'cpu');

        // The discard is gone; it becomes the OTHER player's turn.
        if (who === 'CPU') {
            engine.currentState = engine.STATE_PLAYER_TURN;
            engine.playerDraw();
        } else {
            engine.currentState = engine.STATE_CPU_TURN;
            engine.timer = 0; // Will trigger cpuDraw
        }
    },

    // SMASH (REACTIVE): take the dangerous discard back — same player re-discards
    activateRonTileExchange: function (engine, who) {
        const badTile = engine.discards.pop();

        const hand = engine.getPlayer(who).hand;
        badTile.owner = who === 'P1' ? 'p1' : 'cpu';
        delete badTile.isRiichi;
        hand.push(badTile);
        engine.sortHand(hand);

        engine.showPopup('SKILL', { text: '론 패 교환', blocking: false });
        engine.events.push({ type: 'SOUND', id: 'audio/skill_activate' });

        // Rewind to the discard phase of the SAME player
        if (who === 'P1') {
            engine.currentState = engine.STATE_PLAYER_TURN;
            const returnedIndex = engine.p1.hand.indexOf(badTile);
            engine.hoverIndex = returnedIndex !== -1 ? returnedIndex : engine.p1.hand.length - 1;
            engine.p1.declaringRiichi = false;
        } else {
            engine.currentState = engine.STATE_CPU_TURN;
            engine.cpu.needsToDiscard = true;
            engine.timer = 0;
            engine.cpu.declaringRiichi = false;
        }
    },

    // PETUM: pre-nagari roulette for one last winning tile
    activateLastChance: function (engine, who) {
        const skillId = 'LAST_CHANCE';
        const skill = SkillData[skillId];
        engine.consumeMp(who, skill.cost);
        engine.showPopup('SKILL', { text: skill.name, blocking: false });
        engine.triggerDialogue(skillId, who === 'P1' ? 'p1' : 'cpu');

        // Sanity: the hand must actually be tenpai (have winning tiles)
        const player = engine.getPlayer(who);
        const hand = engine.getFullHand(player);

        const winningTiles = [];
        PaiData.TYPES.forEach(type => {
            const testHand = [...hand, { type: type.id, color: type.color, img: type.img }];
            if (YakuLogic.checkYaku(testHand, player.id)) {
                winningTiles.push(type);
            }
        });

        if (winningTiles.length === 0) {
            console.error("Critical: Last Chance used but no winning tiles pattern found?");
            engine.showPopup('MISS', { blocking: false });
            engine.sequencing.active = true;
            return;
        }

        // Only physical tiles remaining in the wall count
        if (engine.deck.length === 0) {
            engine.showPopup('MISS', { blocking: false });
            engine.sequencing.active = true;
            return;
        }

        // Enter roulette state for the animation
        engine.currentState = engine.STATE_ROULETTE;
        engine.rouletteTimer = 0;
        engine.rouletteIndex = 0;
        engine.rouletteTileType = PaiData.TYPES[0].id;

        engine.rouletteFinished = false;
        engine.rouletteFinishTimer = 0;
        engine.showLastChanceResult = false;
    },

    // Driven from BattleEngine.updateLogic while in STATE_ROULETTE
    updateRoulette: function (engine, dt = 1.0) {
        if (engine.rouletteFinished) {
            engine.rouletteFinishTimer += dt;
            if (engine.rouletteFinishTimer > 60) { // 1 second delay
                SkillFlows.resolveRouletteResult(engine);
            }
            return;
        }

        const cycleInterval = 4;
        const prevRoulette = Math.floor(engine.rouletteTimer / cycleInterval);
        engine.rouletteTimer += dt;
        const currentRoulette = Math.floor(engine.rouletteTimer / cycleInterval);

        // Cycle image every 4 frames; large dt skips multiple steps
        if (currentRoulette > prevRoulette) {
            const skip = currentRoulette - prevRoulette;
            engine.rouletteIndex = (engine.rouletteIndex + skip) % PaiData.TYPES.length;
            engine.rouletteTileType = PaiData.TYPES[engine.rouletteIndex].id;
        }

        if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed()) {
            SkillFlows.finishRoulette(engine);
        }
    },

    finishRoulette: function (engine) {
        // Draw one tile from the deck at random
        const randIdx = Math.floor(Math.random() * engine.deck.length);
        const resultTile = engine.deck[randIdx];

        // Stop spinning on the final tile
        engine.rouletteTileType = resultTile.type;
        engine.rouletteFinished = true;
        engine.rouletteFinishTimer = 0;
        engine.rouletteResultTile = resultTile;

        engine.events.push({ type: 'SOUND', id: 'audio/system_enter' });
    },

    resolveRouletteResult: function (engine) {
        const resultTile = engine.rouletteResultTile;
        if (!resultTile) return;

        const player = engine.p1;
        const hand = engine.getFullHand(player);

        const winTile = { type: resultTile.type, color: resultTile.color, img: resultTile.img };
        const testHand = [...hand, winTile];
        const winYaku = YakuLogic.checkYaku(testHand, player.id);

        if (winYaku) {
            engine.events.push({ type: 'SOUND', id: 'audio/skill_activate' });

            player.hand.push(winTile);
            engine.winningYaku = winYaku;
            const score = engine.calculateScore(winYaku.score, player.isMenzen, player, engine.cpu);

            engine.sequencing.active = false; // Stop Nagari sequence completely
            engine.pendingDamage = { target: 'CPU', amount: score };
            engine.startWinSequence('TSUMO', 'P1', score);
        } else {
            engine.showPopup('MISS', { blocking: false });

            // Show result persistently until the next round/action changes the screen
            engine.showLastChanceResult = true;

            // Resume Nagari sequence
            engine.sequencing.active = true;
            engine.currentState = engine.STATE_FX_PLAYING;
        }
    },

    // SMASH / MAYU: automated round-start exchange for the CPU
    executeCpuTileExchange: function (engine, skillId) {
        const skill = SkillData[skillId];
        if (!skill) return;

        const badIndices = AILogic.getBadTileIndices(engine.cpu.hand);
        if (badIndices.length === 0) return;

        // Exchange up to 3 worst tiles if MP allows
        const count = Math.min(badIndices.length, 3, Math.floor(engine.cpu.mp / skill.cost));
        if (count === 0) return;

        engine.consumeMp('CPU', count * skill.cost);
        engine.exchangeTiles(engine.cpu, badIndices.slice(0, count));

        // Audio feedback only (no visual popup)
        engine.events.push({ type: 'SOUND', id: 'audio/flip' });
        engine.triggerDialogue(skillId, 'cpu');

        // Small delay so the player notices something happened
        engine.timer = -30;
    }
};

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
                SkillFlows.executeCpuTileExchange(engine, 'EXCHANGE_TILE');
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
                SkillFlows.executeCpuTileExchange(engine, 'PAINT_TILE');
            } else {
                engine.enterTileExchangeState();
            }
        }
    }
};
