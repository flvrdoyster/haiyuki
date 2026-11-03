const AIDecisions = {
    thinkTime: function (engine) {
        return engine.isAutoTest() ? 3 : BattleConfig.SPEED.CPU_THINK_TIME;
    },

    shouldReact: function (engine, who, skillId) {
        if (skillId === 'SUPER_IAI') return true;
        const me = engine.getPlayer(who);
        return me.hp < me.maxHp * 0.8 || engine.rng.ai.random() < 0.8;
    },

    wantsPon: function (engine, who, tile) {
        const me = engine.getPlayer(who);
        const context = { isMenzen: me.isMenzen, turnCount: engine.turnCount };
        return AILogic.shouldPon(me.hand, tile, engine.skillOf(who), me.aiProfile, context);
    },

    firstTenpaiDiscard: function (engine, me) {
        for (let i = 0; i < me.hand.length; i++) {
            const tempHand = [...me.hand];
            tempHand.splice(i, 1);
            if (engine.checkTenpai(tempHand)) return i;
        }
        return -1;
    },

    useActiveSkills: function (engine, who) {
        if (!BattleConfig.RULES.SKILLS_ENABLED) return;
        const me = engine.getPlayer(who);
        if (me.skillsUsedThisTurn) return;

        const opp = engine.getOpponent(who);
        const skills = me.skills || [];
        const profile = CharacterData.find(c => c.id === me.id).aiProfile;
        if (!profile) return;

        const skillUseChance = 0.3 + 0.7 * engine.skillOf(who);

        for (const skillId of skills) {
            const skill = SkillData[skillId];
            if (!skill) continue;
            if (!engine.canUseSkill(skillId, who, true)) continue;

            const entry = SkillRegistry[skillId];
            if (!entry || !entry.aiScore) continue;

            const threshold = 0.6;
            const ctx = {
                who: who,
                isTenpai: engine.canReachTenpai(who),
                isPlayerRiichi: opp.isRiichi,
                turn: engine.turnCount,
                profile: profile
            };
            const score = entry.aiScore(engine, ctx);
            const randomFactor = engine.rng.ai.random() * 0.2;

            if (score + randomFactor > threshold) {
                if (engine.rng.ai.random() < skillUseChance) {
                    engine.useSkill(skillId, who);
                }
                return;
            }
        }
    },

    act: function (engine, who) {
        const me = engine.getPlayer(who);
        const opp = engine.getOpponent(who);

        if (engine.tutorial) {
            engine.discardFor(who, me.hand.length - 1);
            return;
        }

        AIDecisions.useActiveSkills(engine, who);

        if (YakuLogic.checkYaku(engine.getFullHand(me), me.id, engine.isOpen(me))) {
            engine.declareTsumo(who);
            return;
        }

        const returned = me.exchangeReturned;

        if (!returned && !me.isRiichi && me.isMenzen && me.hand.length >= 2 && engine.turnCount < 20) {
            const riichiIdx = AIDecisions.firstTenpaiDiscard(engine, me);
            if (riichiIdx >= 0 && AILogic.shouldRiichi(me.hand, engine.skillOf(who), me.aiProfile)) {
                engine.declareRiichi(who);
                engine.discardFor(who, riichiIdx);
                return;
            }
        }

        let idx;
        if (returned && me.hand.indexOf(returned) !== -1) {
            idx = me.hand.indexOf(SkillFlows.pickRonExchangeTile(engine, me.hand, returned));
        } else if (me.isRiichi) {
            idx = me.hand.length - 1;
            if (me.declaringRiichi) {
                const keep = AIDecisions.firstTenpaiDiscard(engine, me);
                if (keep >= 0) idx = keep;
            }
        } else {
            const context = {
                discards: engine.discards,
                opponentRiichi: opp.isRiichi,
                doras: engine.doras,
                turnCount: engine.turnCount,
                charId: me.id
            };
            idx = AILogic.decideDiscard(me.hand, engine.skillOf(who), me.aiProfile, context);
        }
        engine.discardFor(who, idx);
    }
};

const OnlineClock = {
    phase: function (e) {
        const o = e.online;
        if (!o || o.takenOver || e.isAutoTest() || e.tutorial) return null;
        const C = BattleConfig.ONLINE;
        if (e.setupWaiting) {
            return { key: 'exchange', who: e.setupWaiting, limit: C.ticks(C.CHOICE_SEC), delay: 0 };
        }
        const net = e.controllerOf('CPU');
        if (net.pendingReact || net.pendingNagari || net.pendingDoraBomb) {
            return { key: 'confirm', who: 'CPU', limit: C.ticks(C.CHOICE_SEC), delay: 0 };
        }
        let st = e.currentState;
        if (st === e.STATE_BATTLE_MENU) st = BattleMenuSystem.lastStateBeforeMenu;
        switch (st) {
            case e.STATE_WAIT_FOR_DRAW:
                if (e.p1.isRiichi) return null;
                return { key: 'draw', who: 'P1', limit: C.ticks(C.CHOICE_SEC), delay: BattleConfig.SPEED.DRAW_INPUT_DELAY };
            case e.STATE_PLAYER_TURN:
                if (e.p1.isRiichi && !e.p1.declaringRiichi) return null;
                return { key: 'turn', who: 'P1', limit: C.ticks(C.DISCARD_SEC), delay: 0 };
            case e.STATE_CPU_TURN:
                if (e.cpu.isRiichi && !e.cpu.declaringRiichi) return null;
                if (e.cpuPhase === 'draw') {
                    return { key: 'draw', who: 'CPU', limit: C.ticks(C.CHOICE_SEC), delay: BattleConfig.SPEED.DRAW_INPUT_DELAY };
                }
                return { key: 'turn', who: 'CPU', limit: C.ticks(C.DISCARD_SEC), delay: 0 };
            case e.STATE_ROULETTE: {
                const lc = e.lastChance;
                if (!lc || lc.phase !== 'spin') return null;
                return { key: 'roulette', who: lc.who, limit: C.ticks(C.CHOICE_SEC), delay: 0 };
            }
            case e.STATE_WIN:
            case e.STATE_LOSE:
            case e.STATE_NAGARI:
                return { key: 'result', who: 'P1', limit: C.ticks(C.CHOICE_SEC), delay: C.RESULT_INPUT_DELAY };
            default:
                return null;
        }
    },

    step: function (e, dt) {
        const p = OnlineClock.phase(e);
        if (!p) {
            e.clock = null;
            return null;
        }
        const c = e.clock;
        if (!c || c.key !== p.key || c.who !== p.who) {
            e.clock = Object.assign(p, { t: 0, fired: false });
        } else {
            c.t += dt;
        }
        return e.clock;
    },

    remaining: function (c) {
        if (!c || c.t < c.delay) return null;
        return Math.max(0, Math.ceil((c.limit - (c.t - c.delay)) / BattleConfig.ONLINE.TICK_RATE));
    },

    expired: function (c) {
        return c.t - c.delay >= c.limit;
    },

    expire: function (e, c) {
        if (e.currentState === e.STATE_BATTLE_MENU) BattleMenuSystem.toggle();
        switch (c.key) {
            case 'draw':
                OnlineLog.info('timeout auto draw');
                e.confirmDraw();
                break;
            case 'turn': {
                const me = e.p1;
                let idx = me.hand.length - 1;
                if (e.riichiTargetIndex >= 0) {
                    idx = e.riichiTargetIndex;
                } else if (me.declaringRiichi) {
                    const valid = e.validRiichiDiscardIndices;
                    if (valid && valid.length && valid.indexOf(idx) < 0) idx = valid[valid.length - 1];
                }
                OnlineLog.info(`timeout auto discard idx=${idx} tile=${me.hand[idx].type}:${me.hand[idx].color}`);
                e.discardTile(idx);
                break;
            }
            case 'exchange':
                OnlineLog.info('timeout auto exchange (none)');
                e.exchangeIndices = [];
                e.confirmTileExchange();
                break;
            case 'roulette':
                if (e.lastChance && e.lastChance.who === 'P1' && e.lastChance.phase === 'spin') {
                    OnlineLog.info('timeout auto roulette stop');
                    SkillFlows.lastChanceJudge(e);
                }
                break;
            case 'result':
                OnlineLog.info('timeout auto confirm result');
                e.confirmResult();
                break;
        }
    }
};

function AIController() {
    this.pending = false;
}

AIController.prototype = {
    onDrawWindow: function (engine, who, info) {
        this.pending = false;
        if (engine.tutorial || !info.tile || !info.canPon) return;
        if (AIDecisions.wantsPon(engine, who, info.tile)) {
            engine.declarePon(who, info.tile);
        }
    },

    onTurn: function (engine, who, info) {
        if (info.drew) {
            this.pending = false;
            AIDecisions.act(engine, who);
        } else {
            this.pending = true;
        }
    },

    update: function (engine, who) {
        if (engine.timer <= AIDecisions.thinkTime(engine)) return;
        if (engine.isDrawWindow(who)) {
            engine.drawFor(who);
        } else if (this.pending) {
            this.pending = false;
            AIDecisions.act(engine, who);
        }
    },

    onCounterPrompt: function (engine, who, skillId, resolve) {
        resolve(AIDecisions.shouldReact(engine, who, skillId));
    },

    onRoundSetup: function (engine, who, skillId) {
        SkillFlows.executeCpuTileExchange(engine, skillId, who);
    },

    onNagari: function (engine, who, resolve) {
        resolve(SkillFlows.cpuWantsLastChance(engine, who));
    },

    onDoraBomb: function (engine, who, resolve) {
        resolve(true);
    },

    autoStopRoulette: function () {
        return true;
    },

    rouletteStopAt: function (engine) {
        return 20 + engine.rng.ai.int(10);
    }
};

function HumanController() {
}

HumanController.prototype = {
    onDrawWindow: function () {
    },

    onTurn: function () {
    },

    update: function (engine, who, dt) {
        if (!engine.online) return;
        const c = OnlineClock.step(engine, dt);
        if (c && c.who === who && !c.fired && OnlineClock.expired(c)) {
            c.fired = true;
            OnlineClock.expire(engine, c);
        }
    },

    confirm: function (engine, msg, resolve) {
        if (engine.scene && engine.scene.showConfirm) {
            const options = engine.online && !engine.online.takenOver
                ? { limit: BattleConfig.ONLINE.ticks(BattleConfig.ONLINE.CHOICE_SEC) }
                : {};
            engine.scene.showConfirm(msg, () => resolve(true), () => resolve(false), options);
        } else {
            resolve(false);
        }
    },

    onCounterPrompt: function (engine, who, skillId, resolve) {
        if (engine.symmetric) {
            resolve(AIDecisions.shouldReact(engine, who, skillId));
            return;
        }
        const skill = SkillData[skillId];
        let msg = `${skill.name}을(를) 사용하여 방어하시겠습니까? (MP: ${skill.cost})`;
        const confirmMsgs = BattleConfig.MESSAGES && BattleConfig.MESSAGES.SKILL_CONFIRM;
        if (confirmMsgs) {
            const msgFunc = confirmMsgs[skillId] || confirmMsgs['DEFAULT'];
            if (msgFunc) msg = msgFunc(skill.cost, skill.name);
        }
        this.confirm(engine, msg, resolve);
    },

    onRoundSetup: function (engine, who, skillId) {
        if (engine.symmetric) {
            SkillFlows.executeCpuTileExchange(engine, skillId, who);
            return;
        }
        engine.enterTileExchangeState();
    },

    onDoraBomb: function (engine, who, resolve) {
        if (engine.symmetric) {
            resolve(true);
            return;
        }
        this.confirm(engine, '도라폭진을 사용하시겠습니까?', resolve);
    },

    onNagari: function (engine, who, resolve) {
        if (engine.symmetric) {
            resolve(SkillFlows.cpuWantsLastChance(engine, who));
            return;
        }
        const skillId = 'LAST_CHANCE';
        const skill = SkillData[skillId];
        const confirmMsgs = BattleConfig.MESSAGES && BattleConfig.MESSAGES.SKILL_CONFIRM;
        const msg = (confirmMsgs && confirmMsgs[skillId]) ? confirmMsgs[skillId](skill.cost) : skill.name;
        this.confirm(engine, msg, resolve);
    },

    autoStopRoulette: function (engine) {
        return engine.symmetric || engine.isAutoTest();
    },

    rouletteStopAt: function (engine) {
        return 20 + engine.rng.ai.int(10);
    }
};

window.OnlineClock = OnlineClock;
window.AIDecisions = AIDecisions;
window.AIController = AIController;
window.HumanController = HumanController;
