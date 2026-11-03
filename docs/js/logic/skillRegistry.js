function _aggressiveSkillScore(ctx) {
    let score = 0;
    if (ctx.isTenpai) score += 0.8;
    if (ctx.turn > 15) score += 0.3;
    score += ((ctx.profile.value != null ? ctx.profile.value : 0.5)) * 0.5;
    return score;
}

function _defensiveSkillScore(engine, ctx) {
    let score = 0;
    if (ctx.isPlayerRiichi) score += 1.0;
    const me = engine.getPlayer(ctx.who || 'CPU');
    if (me.hp < me.maxHp * 0.3) score += 0.4;
    score += ctx.profile.defense * 0.5;
    return score;
}

function _cpuBestYaku(engine, who) {
    const me = engine.getPlayer(who || 'CPU');
    const hand = engine.getFullHand(me), charId = me.id, open = engine.isOpen(me);
    let best = 0;
    if (hand.length === 12) {
        for (let i = 0; i < me.hand.length; i++) {
            const rs = YakuLogic.getRiichiScore(hand, charId, i, open);
            if (rs.maxScore > best) best = rs.maxScore;
        }
    } else {
        for (const t of PaiData.TYPES) {
            const w = YakuLogic.checkYaku([...hand, { type: t.id, color: t.color, img: t.img }], charId, open);
            if (w && w.score > best) best = w.score;
        }
    }
    return best;
}

const SkillFlows = {
    applyDoraBomb: function (engine, attacker, who) {
        const skillId = 'DORA_BOMB';
        const skill = SkillData[skillId];

        if (!attacker.id || attacker.id !== 'rinxiang') return;
        if (attacker.mp < skill.cost) return;

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
        console.log(`[Skill] ${who} used ${skill.name} (${skillId})`);

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

    activateSuperIaido: function (engine, who) {
        engine.discards.pop();

        engine.playFX('fx/slash_lr', 320, 240, { scale: 2.0, life: 30 });
        engine.events.push({ type: 'SOUND', id: 'audio/slash' });
        engine.triggerDialogue('SKILL_DEFENSE', who === 'P1' ? 'p1' : 'cpu');

        engine.openDrawWindow(engine.opponentOf(who), null);
    },

    pickRonExchangeTile: function (engine, hand, returned) {
        const key = t => t.type + '|' + t.color;
        const counts = {};
        hand.forEach(t => { counts[key(t)] = (counts[key(t)] || 0) + 1; });
        const cands = hand.filter(t => t !== returned);
        const pick = pred => cands.filter(t => pred(counts[key(t)]));
        let pool = pick(n => n === 1);
        if (pool.length === 0) pool = pick(n => n === 2);
        if (pool.length === 0) pool = pick(n => n > 3);
        if (pool.length === 0) pool = cands;
        return engine.rng.ai.pick(pool);
    },

    activateRonTileExchange: function (engine, who) {
        const badTile = engine.discards.pop();

        const player = engine.getPlayer(who);
        const hand = player.hand;
        badTile.owner = who === 'P1' ? 'p1' : 'cpu';
        player.declaringRiichi = !!badTile.isRiichi;
        player.riichiSilent = true;
        delete badTile.isRiichi;
        hand.push(badTile);
        engine.sortHand(hand);

        engine.showPopup('SKILL', { text: '론 패 교환', blocking: false });
        engine.events.push({ type: 'SOUND', id: 'audio/skill_activate' });

        player.exchangeReturned = badTile;
        if (who === 'P1' && engine.symmetric) {
            engine.p1.exchangeDiscard = SkillFlows.pickRonExchangeTile(engine, hand, badTile);
        }
        const returnedIndex = hand.indexOf(badTile);
        engine.enterTurn(who, { drew: false, hoverIndex: returnedIndex !== -1 ? returnedIndex : hand.length - 1 });
    },

    activateLastChance: function (engine, who) {
        engine.currentState = engine.STATE_ROULETTE;
        engine.lastChance = { who: who, phase: 'talk', t: 0, ptr: -1, tile: null, shown: 0, stopAt: 0 };
        engine.triggerDialogue('LAST_CHANCE', who === 'P1' ? 'p1' : 'cpu');
    },

    lastChanceAuto: function (engine, who) {
        return engine.controllerOf(who).autoStopRoulette(engine, who);
    },

    cpuWantsLastChance: function (engine, who) {
        const player = engine.getPlayer(who);
        const hand = engine.getFullHand(player);
        let best = 0, want = null;
        PaiData.TYPES.forEach(type => {
            const y = YakuLogic.checkYaku([...hand, { type: type.id, color: type.color, img: type.img }], player.id, engine.isOpen(player));
            if (y && y.score > best) { best = y.score; want = type.id; }
        });
        if (!want || best < 5000) return false;
        const opp = engine.getOpponent(who);
        const sets = player.openSets.concat(opp.openSets).reduce((a, s) => a.concat(s.tiles), []);
        const seen = player.hand.concat(engine.discards, sets).filter(t => t.type === want).length;
        return seen < 6;
    },

    updateRoulette: function (engine, dt = 1.0) {
        const lc = engine.lastChance;
        if (!lc) return;
        const pressed = Input.isConfirmKey() || Input.isMouseJustPressed();
        const auto = SkillFlows.lastChanceAuto(engine, lc.who);
        lc.t += dt;

        if (lc.phase === 'talk') {
            if (engine.isAutoTest() || (lc.t >= 20 && pressed) || lc.t >= 140) {
                if (typeof BattleDialogue !== 'undefined') BattleDialogue.hideAll();
                SkillFlows.lastChanceActivate(engine);
            }
        } else if (lc.phase === 'pre') {
            if (lc.t >= 10) {
                lc.phase = 'spin';
                lc.t = 0;
                lc.ptr = engine.deck.length - 1;
                lc.tile = engine.deck[lc.ptr] || null;
                lc.shown = 1;
                lc.stopAt = auto ? engine.controllerOf(lc.who).rouletteStopAt(engine, lc.who) : 0;
                if (!lc.tile) SkillFlows.lastChanceJudge(engine);
            }
        } else if (lc.phase === 'spin') {
            if (!auto && pressed) {
                SkillFlows.lastChanceJudge(engine);
                return;
            }
            while (lc.phase === 'spin' && lc.t >= 4) {
                lc.t -= 4;
                if (auto && lc.shown >= lc.stopAt) {
                    SkillFlows.lastChanceJudge(engine);
                } else {
                    lc.ptr = lc.ptr > 0 ? lc.ptr - 1 : engine.deck.length - 1;
                    lc.tile = engine.deck[lc.ptr];
                    lc.shown++;
                }
            }
        } else if (lc.phase === 'miss') {
            if (engine.isAutoTest() || (lc.t >= 1 && pressed) || lc.t >= 201) {
                SkillFlows.lastChanceEnd(engine);
            }
        }
    },

    lastChanceSeek: function (engine, shown) {
        const lc = engine.lastChance;
        const n = engine.deck.length;
        if (!lc || lc.phase !== 'spin' || n === 0) return;
        lc.shown = shown;
        lc.ptr = ((n - shown) % n + n) % n;
        lc.tile = engine.deck[lc.ptr];
    },

    lastChanceSetStop: function (engine, shown) {
        const lc = engine.lastChance;
        if (!lc || lc.phase !== 'spin') return;
        lc.stopAt = shown;
        if (lc.shown > shown) SkillFlows.lastChanceSeek(engine, shown);
    },

    lastChanceActivate: function (engine) {
        const lc = engine.lastChance;
        const skill = SkillData.LAST_CHANCE;
        engine.consumeMp(lc.who, skill.cost);
        engine.logAction(lc.who, 'lastChance');
        console.log(`[Skill] ${lc.who} used ${skill.name} (LAST_CHANCE)`);
        engine.events.push({ type: 'SOUND', id: 'audio/barrier' });
        engine.showPopup('SKILL', { text: skill.name, blocking: false });
        if (lc.who === 'CPU') {
            engine.cpu.isRevealed = true;
            engine.events.push({ type: 'SOUND', id: 'audio/discard' });
        }
        lc.phase = 'pre';
        lc.t = 0;
        engine.roundNotes.lastChance = { who: lc.who, hit: false };
    },

    lastChanceJudge: function (engine) {
        const lc = engine.lastChance;
        engine.logAction(lc.who, 'lastChanceStop', { shown: lc.shown });
        const player = engine.getPlayer(lc.who);
        const tile = lc.tile;
        const winYaku = tile && YakuLogic.checkYaku([...engine.getFullHand(player), tile], player.id, engine.isOpen(player));
        if (winYaku) {
            engine.roundNotes.lastChance = { who: lc.who, hit: true };
            player.hand.push({ type: tile.type, color: tile.color, img: tile.img });
            engine.lastChance = null;
            engine.winningYaku = winYaku;
            const score = engine.calculateScore(winYaku.score, player.isMenzen, player, engine.getOpponent(lc.who));
            engine.sequencing.active = false;
            engine.pendingDamage = { target: engine.opponentOf(lc.who), amount: score };
            BattleSequencer.startWinSequence(engine, 'TSUMO', lc.who, score);
            return;
        }
        lc.phase = 'miss';
        lc.t = 0;
    },

    lastChanceEnd: function (engine) {
        const entry = engine.roundHistory.find(r => r.round === engine.currentRound);
        if (entry) entry.lastChance = engine.roundNotes.lastChance;
        engine.lastChance = null;
        engine.cpu.isRevealed = false;
        engine.currentState = engine.STATE_FX_PLAYING;
        engine.sequencing.active = true;
    },

    executeCpuTileExchange: function (engine, skillId, who) {
        who = who || 'CPU';
        engine.confirmTileExchange(who, SkillFlows.pickCpuTileExchange(engine, skillId, who), skillId);
    },

    pickCpuTileExchange: function (engine, skillId, who) {
        const me = engine.getPlayer(who);
        const skill = SkillData[skillId];
        if (!skill) return [];

        const hand = me.hand;
        if (hand.length === 0) return [];

        const isPaint = skillId === 'PAINT_TILE';
        const keepTypes = isPaint
            ? ['mayu_red', 'mayu_yellow', 'mayu_blue', 'mayu_purple']
            : ['rin', 'fari', 'smash', 'yuri'];

        if (!isPaint) {
            let seen = 0, used = false;
            for (const tile of hand) {
                if (keepTypes.indexOf(tile.type) >= 0) seen++;
                if (seen < 6 && engine.rng.ai.random() < 0.7) { used = true; break; }
            }
            if (!used) return [];
        }

        const typeCount = {};
        hand.forEach(t => { typeCount[t.type] = (typeCount[t.type] || 0) + 1; });

        const order = hand.map((_, i) => i);
        engine.rng.ai.shuffle(order);

        let budget = me.mp;
        const picked = [];
        for (const i of order) {
            if (budget < skill.cost) break;
            const t = hand[i].type;
            if (keepTypes.indexOf(t) >= 0) continue;
            if (!isPaint && typeCount[t] >= 2) continue;
            picked.push(i);
            budget -= skill.cost;
        }
        return picked;
    }
};

const SkillRegistry = {
    // 리치 가능할 때만(닫힌 손패·텐파이 도달). 다음 쯔모 보장승리. 펑 후엔 못 씀.
    TIGER_STRIKE: {
        canUse: (engine, who) => engine.canDeclareRiichi(who),
        execute: (engine, who, user) => {
            user.buffs.guaranteedWin = true;
            // 텐파이 깨면 보장승리패를 못 찾아 낭비되므로 리치처럼 손패 고정.
            engine.declareRiichiLock(who);
        },
        aiScore: (engine, ctx) => _aggressiveSkillScore(ctx)
    },

    HELL_PILE: {
        canUse: (engine, who, user) => {
            const target = engine.getOpponent(who);
            return !user.isRiichi && !(target.buffs && target.buffs.curseDraw > 0);
        },
        execute: (engine, who, user, opponent) => {
            opponent.buffs.curseDraw = 3;
        },
        // 상대 드로우 저주(공격 디버프) — 선제로 깔수록 누적 방해. 중반·상대 리치 시 가중.
        aiScore: (engine, ctx) => {
            const me = engine.getPlayer(ctx.who || 'CPU');
            const tiger = SkillData.TIGER_STRIKE;
            if (me.skills.includes('TIGER_STRIKE') && me.mp >= tiger.cost && ctx.turn <= 12) return 0;
            let score = 0.45;
            if (ctx.isPlayerRiichi) score += 0.4;
            if (ctx.turn >= 3 && ctx.turn <= 12) score += 0.2;
            score += ((ctx.profile.value != null ? ctx.profile.value : 0.5)) * 0.2;
            return score;
        }
    },

    RECOVERY: {
        multiUse: true,
        canUse: (engine, who, user) => !user.isRiichi && user.hp < user.maxHp,
        execute: (engine, who) => {
            engine.heal(who, 1600);
            engine.playFX('fx/heal', BattleConfig.PORTRAIT[who].x + 100, 300, { scale: 1.5 });
        },
        // HP 낮을수록 강하게.
        aiScore: (engine, ctx) => {
            let score = 0;
            const me = engine.getPlayer(ctx.who || 'CPU');
            const hpPct = me.hp / me.maxHp;
            if (hpPct < 0.6) score += 0.5;
            if (hpPct < 0.3) score += 0.5;
            score += ctx.profile.defense * 0.4;
            if (ctx.turn > 10) score += 0.2;
            return score;
        }
    },

    DISCARD_GUARD: {
        multiUse: true,
        canUse: (engine, who, user) => !user.isRiichi && !(user.buffs && user.buffs.discardGuard > 0),
        execute: (engine, who, user) => {
            user.buffs.discardGuard = 5;
        },
        aiScore: (engine, ctx) => _defensiveSkillScore(engine, ctx)
    },

    CRITICAL: {
        canUse: (engine, who, user) => !user.isRiichi && !(user.buffs && user.buffs.attackUp),
        execute: (engine, who, user) => {
            user.buffs.attackUp = true;
        },
        // 라운드 한정 데미지 버프 — 텐파이 + 도달 최고역 큰 손에서만 적극.
        aiScore: (engine, ctx) => {
            if (!ctx.isTenpai) return 0;
            let score = 0.25;
            score += Math.min(_cpuBestYaku(engine, ctx.who) / 8000, 1) * 0.6;
            score += ((ctx.profile.value != null ? ctx.profile.value : 0.5)) * 0.3;
            return score;
        }
    },

    LAST_CHANCE: {
        autoFlow: true
    },

    WATER_MIRROR: {
        canUse: (engine, who, user) => !user.isRiichi && !(user.buffs && user.buffs.defenseUp),
        execute: (engine, who, user) => {
            user.buffs.defenseUp = true;
        },
        aiScore: (engine, ctx) => _defensiveSkillScore(engine, ctx)
    },

    // 리치 가능 시만, 16턴 이후 불가, 스피릿 타이머 없을 때. 5턴 후 보장승리.
    SPIRIT_RIICHI: {
        canUse: (engine, who, user) =>
            engine.turnCount <= 16 &&
            !(user.buffs && user.buffs.spiritTimer > 0) &&
            engine.canDeclareRiichi(who),
        execute: (engine, who, user) => {
            user.buffs.spiritTimer = 5;
            // 기합 리치 = 실제 리치 선언: 손패 고정.
            engine.declareRiichiLock(who);
        },
        aiScore: (engine, ctx) => _aggressiveSkillScore(ctx)
    },

    EXCHANGE_TILE: {
        multiUse: true,
        autoFlow: true,
        canUse: (engine) => engine.turnCount === 1,
        execute: (engine, who) => {
            engine.controllerOf(who).onRoundSetup(engine, who, 'EXCHANGE_TILE');
        }
    },

    PAINT_TILE: {
        multiUse: true,
        autoFlow: true,
        canUse: (engine) => engine.turnCount === 1,
        execute: (engine, who) => {
            engine.controllerOf(who).onRoundSetup(engine, who, 'PAINT_TILE');
        }
    }
};
