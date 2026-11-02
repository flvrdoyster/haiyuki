const OnlineMatch = {
    current: null,
    CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
    CODE_LENGTH: 4,
    HELLO_MS: 500,
    PING_MS: 1000,
    TIMEOUT_MS: 10000,
    FAIL_HOLD_TICKS: 120,
    SENT_TYPES: ['draw', 'discard', 'pon', 'riichi', 'tsumo', 'ron', 'skill', 'exchange', 'react', 'nagari', 'doraBomb', 'lastChanceStop'],

    makeCode: function () {
        let code = '';
        for (let i = 0; i < this.CODE_LENGTH; i++) {
            code += this.CODE_CHARS[Math.floor(Math.random() * this.CODE_CHARS.length)];
        }
        return code;
    },

    normalizeCode: function (text) {
        return (text || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, this.CODE_LENGTH);
    },

    create: function (opts) {
        if (this.current) this.current.close();
        const m = new Match(opts);
        this.current = m;
        m.open();
        if (typeof Game !== 'undefined' && Game.syncSkillsButton) Game.syncSkillsButton();
        return m;
    }
};

function Match(opts) {
    this.host = !!opts.host;
    this.seat = this.host ? 0 : 1;
    this.code = opts.code;
    this.transport = opts.transport || new BroadcastChannelTransport(this.code);
    this.seed = this.host ? ((opts.seed != null ? opts.seed : Rng.randomSeed()) >>> 0) : null;
    this.skillsEnabled = this.host ? (opts.skillsEnabled != null ? !!opts.skillsEnabled : BattleConfig.RULES.SKILLS_ENABLED) : null;
    this.myChar = opts.char != null ? opts.char : null;
    this.peerChar = null;
    this.connected = false;
    this.failed = null;
    this.failInfo = null;
    this.failTicks = 0;
    this.inbox = [];
    this.seq = 0;
    this.checked = 0;
    this.sent = 0;
    this.summary = null;
    this.lastHeard = 0;
    this.closed = false;
    this._hello = null;
    this._ping = null;
}

Match.prototype = {
    open: function () {
        this.transport.onMessage(msg => this.receive(msg));
        this.sendHello();
        this._hello = setInterval(() => this.sendHello(), OnlineMatch.HELLO_MS);
    },

    sendHello: function () {
        const payload = { char: this.myChar };
        if (this.host) {
            payload.seed = this.seed;
            payload.skills = this.skillsEnabled;
        }
        this.sendRaw('hello', payload);
    },

    sendRaw: function (type, payload) {
        if (this.closed) return;
        const msg = Object.assign({ type: type, seat: this.seat, seq: this.seq++ }, payload || {});
        this.transport.send(msg);
    },

    sendPick: function (index) {
        this.myChar = index;
        if (this.connected) this.sendRaw('pick', { index: index });
    },

    receive: function (msg) {
        if (!msg || msg.seat === this.seat || this.closed) return;
        this.lastHeard = Date.now();
        if (msg.type === 'hello') {
            if (!this.host) {
                this.seed = msg.seed >>> 0;
                this.skillsEnabled = !!msg.skills;
            }
            if (msg.char != null) this.peerChar = msg.char;
            if (!this.connected) {
                this.connected = true;
                this.lastHeard = Date.now();
                clearInterval(this._hello);
                this._hello = null;
                this.sendHello();
                if (this.myChar != null) this.sendRaw('pick', { index: this.myChar });
                this._ping = setInterval(() => this.tickPing(), OnlineMatch.PING_MS);
            }
            return;
        }
        if (msg.type === 'pick') {
            this.peerChar = msg.index;
            return;
        }
        if (msg.type === 'ping') return;
        this.inbox.push(msg);
    },

    tickPing: function () {
        if (this.closed || this.failed) return;
        this.sendRaw('ping');
        if (Date.now() - this.lastHeard > OnlineMatch.TIMEOUT_MS) this.fail('DISCONNECT');
    },

    ready: function () {
        return this.connected && this.myChar != null && this.peerChar != null;
    },

    onAction: function (engine, entry) {
        if (entry.who !== 'P1' || entry.auto) return;
        if (OnlineMatch.SENT_TYPES.indexOf(entry.type) < 0) return;
        if (entry.type === 'skill' && SkillData[entry.skill] && SkillData[entry.skill].type === 'REACTIVE') return;
        const payload = Object.assign({}, entry);
        delete payload.round;
        delete payload.who;
        delete payload.type;
        payload.hash = engine.stateHash();
        this.sent++;
        this.sendRaw(entry.type, payload);
    },

    fail: function (reason, info) {
        if (this.failed) return;
        this.failed = reason;
        this.failInfo = info || null;
        this.failTicks = 0;
        console.error(`[Online] ${reason}`, info || '');
        if (typeof BattleEngine !== 'undefined' && BattleEngine.online === this) this.finish(BattleEngine);
        if (this._ping) { clearInterval(this._ping); this._ping = null; }
        if (this._hello) { clearInterval(this._hello); this._hello = null; }
    },

    finish: function (engine) {
        if (this.summary) return;
        this.summary = {
            winner: engine.matchWinner || null,
            hp: [engine.p1.hp, engine.cpu.hp],
            actionLog: engine.actionLog.slice(),
            checked: this.checked,
            sent: this.sent,
            failed: this.failed,
            failInfo: this.failInfo
        };
    },

    updateFailure: function (dt) {
        this.failTicks += dt;
        return this.failTicks >= OnlineMatch.FAIL_HOLD_TICKS;
    },

    drawFailure: function (ctx) {
        if (!this.failed) return;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, 640, 480);
        ctx.restore();
        const text = this.failed;
        BitmapFont.drawAlphabet(ctx, text, (640 - text.length * 32) / 2, 224, 'yellow');
    },

    close: function () {
        if (this.closed) return;
        this.closed = true;
        if (this._hello) clearInterval(this._hello);
        if (this._ping) clearInterval(this._ping);
        this._hello = this._ping = null;
        this.transport.close();
        if (OnlineMatch.current === this) OnlineMatch.current = null;
        if (typeof Game !== 'undefined' && Game.syncSkillsButton) Game.syncSkillsButton();
    }
};

window.OnlineMatch = OnlineMatch;
