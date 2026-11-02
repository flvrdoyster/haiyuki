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

    update: function () {
    },

    confirm: function (engine, msg, resolve) {
        if (engine.scene && engine.scene.showConfirm) {
            engine.scene.showConfirm(msg, () => resolve(true), () => resolve(false));
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

window.AIDecisions = AIDecisions;
window.AIController = AIController;
window.HumanController = HumanController;
