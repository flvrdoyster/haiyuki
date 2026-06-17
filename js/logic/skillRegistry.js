// 스킬별 동작 훅. 정적 데이터(name/desc/type/cost/sfx)는 SkillData(characterData.js),
// 로직은 여기. 훅(모두 선택): canUse(engine,who,user) 추가 가용조건 / execute(engine,who,
// user,opponent) 효과 / aiScore(engine,ctx) CPU 욕구(score+rand(0~0.2)>0.6 발동;
// ctx={isTenpai,isPlayerRiichi,turn,profile}). 플래그: multiUse=라운드/턴 제한 면제,
// autoFlow=전용 플로우로만 발동(일반 useSkill 경로 차단, 중복발동 방지).
// REACTIVE(EXCHANGE_RON·SUPER_IAI)·DORA_BOMB은 레지스트리 항목 없이 아래 SkillFlows로
// 전용 엔진 플로우(론 카운터/승리 시퀀스)에서 호출된다.

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
    if (engine.cpu.hp < 3000) score += 0.4;
    score += ctx.profile.defense * 0.5;
    return score;
}

// CPU 현재 손패가 도달 가능한 최고 역점수(value 인지 스킬용 — CRITICAL은 큰 손에서만 값어치).
// 12패(버림 전)·11패(텐파이) 모두 처리.
function _cpuBestYaku(engine) {
    const hand = engine.cpu.hand, charId = engine.cpu.id;
    let best = 0;
    if (hand.length === 12) {
        for (let i = 0; i < hand.length; i++) {
            const rs = YakuLogic.getRiichiScore(hand, charId, i);
            if (rs.maxScore > best) best = rs.maxScore;
        }
    } else {
        for (const t of PaiData.TYPES) {
            const w = YakuLogic.checkYaku([...hand, { type: t.id, color: t.color, img: t.img }], charId);
            if (w && w.score > best) best = w.score;
        }
    }
    return best;
}

// 엔진 상태(시퀀싱/덱)를 직접 다루는 큰 스킬 구현. 스킬 전용 코드를 한 파일에 모으려 여기 둔다.
const SkillFlows = {
    // 우라도라를 승자 손패에서 가장 많은 패로 덮어쓴다.
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

    // REACTIVE: 위험한 버림패를 베어 없앤다 — 턴이 상대로 넘어감.
    activateSuperIaido: function (engine, who) {
        engine.discards.pop();

        engine.playFX('fx/slash_lr', 320, 240, { scale: 2.0, life: 30 });
        engine.events.push({ type: 'SOUND', id: 'audio/sword_draw' });
        engine.triggerDialogue('SKILL_DEFENSE', who === 'P1' ? 'p1' : 'cpu');

        if (who === 'CPU') {
            engine.currentState = engine.STATE_PLAYER_TURN;
            engine.playerDraw();
        } else {
            engine.currentState = engine.STATE_CPU_TURN;
            engine.timer = 0;
        }
    },

    // REACTIVE: 위험한 버림패를 손으로 되가져온다 — 같은 플레이어가 다시 버린다.
    activateRonTileExchange: function (engine, who) {
        const badTile = engine.discards.pop();

        const hand = engine.getPlayer(who).hand;
        badTile.owner = who === 'P1' ? 'p1' : 'cpu';
        delete badTile.isRiichi;
        hand.push(badTile);
        engine.sortHand(hand);

        engine.showPopup('SKILL', { text: '론 패 교환', blocking: false });
        engine.events.push({ type: 'SOUND', id: 'audio/skill_activate' });

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

    // 나가리 직전 룰렛으로 마지막 화료패를 노린다.
    activateLastChance: function (engine, who) {
        const skillId = 'LAST_CHANCE';
        const skill = SkillData[skillId];
        engine.consumeMp(who, skill.cost);
        engine.showPopup('SKILL', { text: skill.name, blocking: false });
        engine.triggerDialogue(skillId, who === 'P1' ? 'p1' : 'cpu');

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
            engine.showPopup('MISS', { blocking: false });
            engine.sequencing.active = true;
            return;
        }

        if (engine.deck.length === 0) {
            engine.showPopup('MISS', { blocking: false });
            engine.sequencing.active = true;
            return;
        }

        engine.currentState = engine.STATE_ROULETTE;
        engine.rouletteTimer = 0;
        engine.rouletteIndex = 0;
        engine.rouletteTileType = PaiData.TYPES[0].id;

        engine.rouletteFinished = false;
        engine.rouletteFinishTimer = 0;
        engine.showLastChanceResult = false;
    },

    updateRoulette: function (engine, dt = 1.0) {
        if (engine.rouletteFinished) {
            engine.rouletteFinishTimer += dt;
            if (engine.rouletteFinishTimer > 60) {
                SkillFlows.resolveRouletteResult(engine);
            }
            return;
        }

        const cycleInterval = 4;
        const prevRoulette = Math.floor(engine.rouletteTimer / cycleInterval);
        engine.rouletteTimer += dt;
        const currentRoulette = Math.floor(engine.rouletteTimer / cycleInterval);

        if (currentRoulette > prevRoulette) {
            const skip = currentRoulette - prevRoulette;
            engine.rouletteIndex = (engine.rouletteIndex + skip) % PaiData.TYPES.length;
            engine.rouletteTileType = PaiData.TYPES[engine.rouletteIndex].id;
        }

        if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed()) {
            SkillFlows.finishRoulette(engine);
        }
    },

    // 도박 기믹 — 덱에서 무작위 한 장.
    finishRoulette: function (engine) {
        const randIdx = Math.floor(Math.random() * engine.deck.length);
        const resultTile = engine.deck[randIdx];

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

            engine.sequencing.active = false;
            engine.pendingDamage = { target: 'CPU', amount: score };
            BattleSequencer.startWinSequence(engine, 'TSUMO', 'P1', score);
        } else {
            engine.showPopup('MISS', { blocking: false });

            engine.showLastChanceResult = true;

            engine.sequencing.active = true;
            engine.currentState = engine.STATE_FX_PLAYING;
        }
    },

    // 라운드 시작 시 CPU 자동 패 교환. 가장 안 쓸모 있는 패부터 교체(실제 yaku 평가).
    executeCpuTileExchange: function (engine, skillId) {
        const skill = SkillData[skillId];
        if (!skill) return;

        const hand = engine.cpu.hand, charId = engine.cpu.id;
        if (hand.length === 0) return;

        const ranked = hand.map((tile, i) => {
            const rest = hand.slice(0, i).concat(hand.slice(i + 1));
            return { i, keep: YakuLogic.rateTileForHand(rest, tile, charId, rest, {}) };
        }).sort((a, b) => a.keep - b.keep);

        const count = Math.min(3, Math.floor(engine.cpu.mp / skill.cost), ranked.length);
        if (count === 0) return;

        engine.consumeMp('CPU', count * skill.cost);
        engine.exchangeTiles(engine.cpu, ranked.slice(0, count).map(r => r.i));

        engine.events.push({ type: 'SOUND', id: 'audio/flip' });
        engine.triggerDialogue(skillId, 'cpu');

        engine.timer = -15;
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
        canUse: (engine, who) => {
            const target = engine.getOpponent(who);
            return !(target.buffs && target.buffs.curseDraw > 0);
        },
        execute: (engine, who, user, opponent) => {
            opponent.buffs.curseDraw = 3;
        },
        // 상대 드로우 저주(공격 디버프) — 선제로 깔수록 누적 방해. 중반·상대 리치 시 가중.
        aiScore: (engine, ctx) => {
            let score = 0.45;
            if (ctx.isPlayerRiichi) score += 0.4;
            if (ctx.turn >= 3 && ctx.turn <= 12) score += 0.2;
            score += ((ctx.profile.value != null ? ctx.profile.value : 0.5)) * 0.2;
            return score;
        }
    },

    RECOVERY: {
        multiUse: true,
        canUse: (engine, who, user) => user.hp < user.maxHp,
        execute: (engine, who) => {
            engine.heal(who, 3000);
            engine.playFX('fx/heal', BattleConfig.PORTRAIT[who].x + 100, 300, { scale: 1.5 });
        },
        // HP 낮을수록 강하게.
        aiScore: (engine, ctx) => {
            let score = 0;
            const hpPct = engine.cpu.hp / engine.cpu.maxHp;
            if (hpPct < 0.6) score += 0.5;
            if (hpPct < 0.3) score += 0.5;
            score += ctx.profile.defense * 0.4;
            if (ctx.turn > 10) score += 0.2;
            return score;
        }
    },

    DISCARD_GUARD: {
        multiUse: true,
        canUse: (engine, who, user) => !(user.buffs && user.buffs.discardGuard > 0),
        execute: (engine, who, user) => {
            user.buffs.discardGuard = 5;
        },
        aiScore: (engine, ctx) => _defensiveSkillScore(engine, ctx)
    },

    CRITICAL: {
        canUse: (engine, who, user) => !(user.buffs && user.buffs.attackUp),
        execute: (engine, who, user) => {
            user.buffs.attackUp = true;
        },
        // 라운드 한정 데미지 버프 — 텐파이 + 도달 최고역 큰 손에서만 적극.
        aiScore: (engine, ctx) => {
            if (!ctx.isTenpai) return 0;
            let score = 0.25;
            score += Math.min(_cpuBestYaku(engine) / 8000, 1) * 0.6;
            score += ((ctx.profile.value != null ? ctx.profile.value : 0.5)) * 0.3;
            return score;
        }
    },

    LAST_CHANCE: {
        autoFlow: true
    },

    WATER_MIRROR: {
        canUse: (engine, who, user) => !(user.buffs && user.buffs.defenseUp),
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

    // 셋업 스킬: 라운드 시작(STATE_INIT) 자동 발동. P1은 교환 UI, CPU는 AI 교환 실행.
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
