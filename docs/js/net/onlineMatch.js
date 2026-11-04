const OnlineLog = {
    debug: new URLSearchParams(window.location.search).get('debug') === 'net',

    info: function () {
        console.log('[Online]', ...arguments);
    },

    net: function () {
        if (this.debug) console.log('[Online]', ...arguments);
    },

    at: function () {
        if (typeof BattleEngine === 'undefined' || !BattleEngine.online) return 'r- t-';
        return `r${BattleEngine.currentRound} t${BattleEngine.turnCount}`;
    }
};

const OnlineMatch = {
    current: null,
    CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
    CODE_LENGTH: 5,
    HELLO_MS: 500,
    PING_MS: 1000,
    TIMEOUT_MS: 10000,
    SENT_TYPES: ['draw', 'discard', 'pon', 'riichi', 'riichiCancel', 'tsumo', 'ron', 'skill', 'exchange', 'react', 'nagari', 'doraBomb', 'lastChanceStop', 'confirm'],

    makeCode: function () {
        let code = '';
        for (let i = 0; i < this.CODE_LENGTH; i++) {
            code += this.CODE_CHARS[Math.floor(Math.random() * this.CODE_CHARS.length)];
        }
        return code;
    },

    normalizeCode: function (text) {
        return (text || '').toUpperCase().replace(/[^A-HJ-NP-Z]/g, '').slice(0, this.CODE_LENGTH);
    },

    makeTransport: function (code, host) {
        const params = new URLSearchParams(window.location.search);
        const url = params.get('transport') === 'local' ? '' : (params.get('relay') || BattleConfig.ONLINE.RELAY_URL);
        if (url) return new WebSocketTransport(url, code, host ? 'host' : 'guest');
        return new BroadcastChannelTransport(code);
    },

    create: function (opts) {
        if (this.current) this.current.close();
        const m = new Match(opts);
        this.current = m;
        m.open();
        return m;
    }
};

function Match(opts) {
    this.host = !!opts.host;
    this.seat = this.host ? 0 : 1;
    this.code = opts.code;
    this.transport = opts.transport || OnlineMatch.makeTransport(this.code, this.host);
    this.seed = this.host ? ((opts.seed != null ? opts.seed : Rng.randomSeed()) >>> 0) : null;
    this.skills = this.host ? opts.skills !== false : null;
    this.myChar = opts.char != null ? opts.char : null;
    this.peerChar = null;
    this.connected = false;
    this.failed = null;
    this.failInfo = null;
    this.takenOver = null;
    this.ended = false;
    this.rematchMine = false;
    this.rematchPeer = false;
    this.round = 0;
    this.onChange = null;
    this.inbox = [];
    this.seq = 0;
    this.checked = 0;
    this.sent = 0;
    this.summary = null;
    this.lastHeard = 0;
    this.closed = false;
    this.helloSent = 0;
    this.helloRecv = 0;
    this.age = 0;
    this.queuedAt = new WeakMap();
    this.applied = [];
    this._hello = null;
    this._ping = null;
}

Match.prototype = {
    open: function () {
        OnlineLog.info(`connect transport=${this.transport.relay ? 'relay' : 'local'} relay=${this.transport.url || '-'} room=${this.code} seat=${this.host ? 'host' : 'guest'}`);
        this.transport.onMessage(msg => this.receive(msg));
        this.transport.onEvent(state => this.onTransportEvent(state));
        if (!this.transport.relay) this.startHello();
    },

    startHello: function () {
        if (this._hello || this.connected) return;
        this.sendHello();
        this._hello = setInterval(() => this.sendHello(), OnlineMatch.HELLO_MS);
    },

    onTransportEvent: function (state) {
        if (this.closed) return;
        OnlineLog.info(`relay event ${state} room=${this.code}`);
        if (state === 'joined') this.startHello();
        else if (state === 'left') this.fail('left');
        else if (state === 'full') this.fail('full');
        else if (state === 'closed') this.fail('disconnect');
    },

    sendHello: function () {
        this.helloSent++;
        const payload = { char: this.myChar };
        if (this.host) {
            payload.seed = this.seed;
            payload.skills = this.skills;
        }
        this.sendRaw('hello', payload);
    },

    sendRaw: function (type, payload) {
        if (this.closed) return;
        const msg = Object.assign({ type: type, seat: this.seat, seq: this.seq++ }, payload || {});
        if (type !== 'ping') OnlineLog.net(`>> ${type} seq=${msg.seq} ${OnlineLog.at()}`);
        this.transport.send(msg);
    },

    sendPick: function (index) {
        this.myChar = index;
        if (this.connected) this.sendRaw('pick', { index: index });
    },

    receive: function (msg) {
        if (!msg || msg.seat === this.seat || this.closed || this.takenOver) return;
        this.lastHeard = Date.now();
        if (msg.type !== 'ping') OnlineLog.net(`<< ${msg.type} seq=${msg.seq} ${OnlineLog.at()}`);
        if (msg.type === 'hello') {
            this.helloRecv++;
            if (!this.host) {
                this.seed = msg.seed >>> 0;
                this.skills = msg.skills !== false;
            }
            if (msg.char != null) this.peerChar = msg.char;
            if (!this.connected) {
                this.connected = true;
                OnlineLog.info(`connected seat=${this.host ? 'host' : 'guest'} seed=${this.seed} skills=${this.skills} hello received=${this.helloRecv} sent=${this.helloSent}`);
                this.lastHeard = Date.now();
                clearInterval(this._hello);
                this._hello = null;
                this.sendHello();
                if (this.myChar != null) this.sendRaw('pick', { index: this.myChar });
                if (!this.transport.relay) this._ping = setInterval(() => this.tickPing(), OnlineMatch.PING_MS);
                this.notify();
            }
            return;
        }
        if (msg.type === 'bye') {
            this.fail('left');
            return;
        }
        if (msg.type === 'rematch') {
            this.rematchPeer = true;
            OnlineLog.info(`rematch requested by peer mine=${this.rematchMine}`);
            this.tryStartRematch();
            this.notify();
            return;
        }
        if (msg.type === 'rematchStart') {
            if (!this.host && this.ended && this.rematchMine) this.beginNext(msg.seed >>> 0);
            return;
        }
        if (msg.type === 'pick') {
            this.peerChar = msg.index;
            OnlineLog.info(`pick mine=${this.myChar} peer=${this.peerChar}`);
            return;
        }
        if (msg.type === 'ping') return;
        this.queuedAt.set(msg, this.age);
        this.inbox.push(msg);
    },

    notify: function () {
        if (this.onChange) this.onChange(this);
    },

    requestRematch: function () {
        if (!this.ended || this.failed || this.closed || this.takenOver || this.rematchMine) return;
        this.rematchMine = true;
        OnlineLog.info(`rematch requested by me peer=${this.rematchPeer}`);
        this.sendRaw('rematch');
        this.tryStartRematch();
        this.notify();
    },

    tryStartRematch: function () {
        if (!this.host || !this.ended || !this.rematchMine || !this.rematchPeer) return;
        const seed = Rng.randomSeed() >>> 0;
        OnlineLog.info(`rematch accepted by both seed=${seed}`);
        this.sendRaw('rematchStart', { seed: seed });
        this.beginNext(seed);
    },

    beginNext: function (seed) {
        OnlineLog.info(`rematch start seed=${seed} match=${this.round + 1}`);
        this.seed = seed;
        this.myChar = null;
        this.peerChar = null;
        this.summary = null;
        this.inbox = [];
        this.checked = 0;
        this.sent = 0;
        this.ended = false;
        this.rematchMine = false;
        this.rematchPeer = false;
        this.round++;
        this.notify();
    },

    tickPing: function () {
        if (this.closed || this.failed || this.takenOver) return;
        this.sendRaw('ping');
        if (Date.now() - this.lastHeard > OnlineMatch.TIMEOUT_MS) this.fail('disconnect');
    },

    ready: function () {
        return this.connected && this.myChar != null && this.peerChar != null;
    },

    onAction: function (engine, entry) {
        if (this.takenOver) return;
        if (entry.who !== 'P1' || entry.auto) return;
        if (OnlineMatch.SENT_TYPES.indexOf(entry.type) < 0) return;
        if (entry.type === 'skill' && SkillData[entry.skill] && SkillData[entry.skill].type === 'REACTIVE') return;
        if (entry.type === 'confirm') OnlineLog.info(`confirm sent win=${entry.win}`);
        const payload = Object.assign({}, entry);
        delete payload.round;
        delete payload.who;
        delete payload.type;
        payload.hash = engine.stateHash();
        this.sent++;
        this.sendRaw(entry.type, payload);
    },

    describeState: function (engine, msg) {
        const key = t => t.type + ':' + t.color;
        const seat = n => {
            const p = engine.playerAt(n);
            return {
                hand: p.hand.map(key).sort().join(','),
                openSets: p.openSets.map(s => s.tiles.map(key).sort().join(',')),
                hp: p.hp,
                mp: p.mp
            };
        };
        return {
            seats: [seat(0), seat(1)],
            discards: engine.discards.map(key).join(','),
            deck: engine.deck.length,
            round: engine.currentRound,
            turn: engine.turnCount,
            state: engine.currentState,
            rng: { deck: engine.rng.deck.calls, fx: engine.rng.fx.calls },
            msg: msg ? { type: msg.type, seq: msg.seq } : null,
            applied: this.applied.slice()
        };
    },

    inBattle: function () {
        return typeof BattleEngine !== 'undefined' && BattleEngine.online === this;
    },

    takeOver: function (reason, info) {
        this.takenOver = reason;
        this.failInfo = info || null;
        this.inbox = [];
        const at = BattleEngine.online === this ? { round: BattleEngine.currentRound, turn: BattleEngine.turnCount, state: BattleEngine.currentState } : {};
        console.error(`[Online] takeover ${reason}`, Object.assign(at, info));
        if (this._ping) { clearInterval(this._ping); this._ping = null; }
        if (this._hello) { clearInterval(this._hello); this._hello = null; }
        BattleEngine.handOverToAI('CPU');
        this.notify();
    },

    fail: function (reason, info) {
        if (this.failed || this.takenOver) return;
        if (this.inBattle() && !this.ended) {
            this.takeOver(reason, info);
            return;
        }
        this.failed = reason;
        this.failInfo = info || null;
        this.failTicks = 0;
        console.error(`[Online] ${reason}`, info || '');
        if (typeof BattleEngine !== 'undefined' && BattleEngine.online === this) this.finish(BattleEngine);
        if (this._ping) { clearInterval(this._ping); this._ping = null; }
        if (this._hello) { clearInterval(this._hello); this._hello = null; }
        this.notify();
    },

    finish: function (engine) {
        if (this.summary) return;
        this.ended = true;
        this.summary = {
            winner: engine.matchWinner || null,
            hp: [engine.p1.hp, engine.cpu.hp],
            rounds: engine.roundHistory.slice(),
            chars: [this.myChar, this.peerChar],
            actionLog: engine.actionLog.slice(),
            checked: this.checked,
            sent: this.sent,
            failed: this.failed,
            takenOver: this.takenOver,
            failInfo: this.failInfo
        };
    },

    close: function () {
        if (this.closed) return;
        if (this.connected && !this.failed && !this.takenOver) this.sendRaw('bye');
        this.closed = true;
        this.onChange = null;
        if (this._hello) clearInterval(this._hello);
        if (this._ping) clearInterval(this._ping);
        this._hello = this._ping = null;
        this.transport.close();
        if (OnlineMatch.current === this) OnlineMatch.current = null;
    }
};

window.OnlineLog = OnlineLog;
window.OnlineMatch = OnlineMatch;
