function NetController(match) {
    this.match = match;
    this.pendingReact = null;
    this.pendingNagari = null;
    this.pendingDoraBomb = null;
    this.waited = 0;
    this.waitLogged = 0;
}

NetController.WAIT_LIMIT = 3600;

NetController.prototype = {
    onDrawWindow: function () {
    },

    onTurn: function () {
    },

    update: function () {
    },

    onRoundSetup: function () {
    },

    onCounterPrompt: function (engine, who, skillId, resolve) {
        this.pendingReact = resolve;
        this.pendingSkill = skillId;
    },

    release: function (engine, who) {
        const react = this.pendingReact;
        const nagari = this.pendingNagari;
        const bomb = this.pendingDoraBomb;
        this.pendingReact = this.pendingNagari = this.pendingDoraBomb = null;
        if (react) react(AIDecisions.shouldReact(engine, who, this.pendingSkill));
        if (nagari) nagari(SkillFlows.cpuWantsLastChance(engine, who));
        if (bomb) bomb(true);
    },

    onNagari: function (engine, who, resolve) {
        this.pendingNagari = resolve;
    },

    onDoraBomb: function (engine, who, resolve) {
        this.pendingDoraBomb = resolve;
    },

    autoStopRoulette: function () {
        return true;
    },

    rouletteStopAt: function () {
        return Infinity;
    },

    canApply: function (engine, who, msg) {
        switch (msg.type) {
            case 'draw':
            case 'pon':
                return engine.isDrawWindow(who);
            case 'discard':
            case 'riichi':
            case 'riichiCancel':
            case 'tsumo':
            case 'skill':
                return engine.isTurn(who);
            case 'exchange':
                return engine.setupWaiting === who;
            case 'react':
                return !!this.pendingReact;
            case 'nagari':
                return !!this.pendingNagari;
            case 'doraBomb':
                return !!this.pendingDoraBomb;
            case 'confirm':
                return msg.win === engine.resultSeq && engine.isResultState();
            case 'lastChanceStop':
                return !!engine.lastChance && engine.lastChance.who === who && engine.lastChance.phase === 'spin';
            default:
                return true;
        }
    },

    apply: function (engine, who, msg) {
        const me = engine.getPlayer(who);
        switch (msg.type) {
            case 'draw':
                engine.drawFor(who);
                return true;
            case 'pon': {
                const tile = engine.discards[engine.discards.length - 1];
                if (!tile || !engine.drawWindowOptions(who, tile).canPon) return false;
                engine.declarePon(who, tile);
                return true;
            }
            case 'discard': {
                const idx = engine.findHandIndex(who, msg.tile);
                if (idx < 0) return false;
                engine.discardFor(who, idx);
                return true;
            }
            case 'riichi':
                if (!engine.canDeclareRiichi(who)) return false;
                engine.declareRiichi(who);
                return true;
            case 'riichiCancel':
                if (!engine.canCancelRiichi(who)) return false;
                engine.cancelRiichi(who);
                return true;
            case 'tsumo':
                if (msg.auto) return true;
                engine.declareTsumo(who);
                return true;
            case 'skill': {
                const skill = SkillData[msg.skill];
                if (!skill || skill.type === 'REACTIVE') return true;
                return engine.useSkill(msg.skill, who);
            }
            case 'exchange': {
                const used = [];
                for (const key of msg.tiles || []) {
                    const idx = engine.findHandIndex(who, key, used);
                    if (idx < 0) return false;
                    used.push(idx);
                }
                engine.confirmTileExchange(who, used, engine.setupSkillOf(who));
                return engine.setupWaiting !== who;
            }
            case 'react': {
                const resolve = this.pendingReact;
                this.pendingReact = null;
                resolve(!!msg.use);
                return true;
            }
            case 'nagari': {
                const resolve = this.pendingNagari;
                this.pendingNagari = null;
                resolve(!!msg.use);
                return true;
            }
            case 'doraBomb': {
                const resolve = this.pendingDoraBomb;
                this.pendingDoraBomb = null;
                resolve(!!msg.use);
                return true;
            }
            case 'confirm':
                OnlineLog.info(`confirm received win=${msg.win}`);
                engine.confirmResult(who);
                return true;
            case 'lastChanceStop':
                SkillFlows.lastChanceSetStop(engine, msg.shown);
                return true;
            case 'ron':
                console.log(`[Online] ron message from ${who} ignored (auto)`);
                return true;
            default:
                console.warn(`[Online] unknown message ${msg.type}`);
                return true;
        }
    },

    poll: function (engine, who, dt) {
        const match = this.match;
        if (match.failed || match.takenOver) return;
        const inbox = match.inbox;
        match.age += dt;
        while (inbox.length > 0) {
            const msg = inbox[0];
            if (msg.type === 'confirm' && msg.win < engine.resultSeq) {
                inbox.shift();
                continue;
            }
            if (!this.canApply(engine, who, msg)) {
                this.waited += dt;
                if (this.waited > NetController.WAIT_LIMIT) {
                    match.fail('desync', { reason: 'timeout', type: msg.type, state: engine.currentState, detail: match.describeState(engine, msg) });
                    return;
                }
                const sec = Math.floor(this.waited / 60);
                if (sec > this.waitLogged) {
                    this.waitLogged = sec;
                    OnlineLog.net(`.. waiting for ${msg.type} seq=${msg.seq} state=${engine.currentState} ticks=${Math.floor(this.waited)}`);
                }
                return;
            }
            inbox.shift();
            this.waited = 0;
            this.waitLogged = 0;
            if (msg.hash !== undefined && msg.type !== 'ron') {
                const mine = engine.stateHash();
                match.checked++;
                if (mine !== msg.hash) {
                    match.fail('desync', { reason: 'hash', type: msg.type, mine: mine, theirs: msg.hash, round: engine.currentRound, turn: engine.turnCount, detail: match.describeState(engine, msg) });
                    return;
                }
            }
            OnlineLog.net(`applied ${msg.type} seq=${msg.seq} ${OnlineLog.at()} queued=${Math.floor(match.age - (match.queuedAt.get(msg) || 0))} ticks`);
            match.applied.push({ type: msg.type, seq: msg.seq, round: engine.currentRound, turn: engine.turnCount });
            if (match.applied.length > 10) match.applied.shift();
            if (!this.apply(engine, who, msg)) {
                match.fail('desync', { reason: 'apply', type: msg.type, state: engine.currentState, detail: match.describeState(engine, msg) });
                return;
            }
        }
    }
};

window.NetController = NetController;
