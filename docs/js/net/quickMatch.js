const QuickMatch = {
    RETRY_MS: 5000,
    ws: null,
    presence: null,
    queued: false,
    onPresence: null,
    onMatch: null,
    onDown: null,

    url: function () {
        const base = OnlineMatch.relayUrl();
        return base ? base.replace(/\/+$/, '') + '/lobby' : '';
    },

    available: function () {
        return !!this.url();
    },

    connect: function () {
        if (this.ws || !this.available()) return;
        clearTimeout(this._retry);
        const ws = new WebSocket(this.url());
        this.ws = ws;
        ws.onopen = () => {
            OnlineLog.info('lobby connected');
            if (this.queued) this.send('queue');
        };
        ws.onmessage = (e) => {
            let msg;
            try { msg = JSON.parse(e.data); } catch (err) { return; }
            if (msg.type === 'presence') {
                this.presence = { online: msg.online, queued: msg.queued };
                if (this.onPresence) this.onPresence(this.presence);
            } else if (msg.type === 'match' && this.queued) {
                this.queued = false;
                OnlineLog.info(`lobby match code=${msg.code} role=${msg.role}`);
                if (this.onMatch) this.onMatch(msg);
            }
        };
        ws.onclose = (e) => {
            if (this.ws !== ws) return;
            this.ws = null;
            this.presence = null;
            OnlineLog.info(`lobby closed code=${e.code} reason=${e.reason || '-'} clean=${e.wasClean} queued=${this.queued} visible=${document.visibilityState}`);
            if (this.onPresence) this.onPresence(null);
            if (this.queued) {
                this.queued = false;
                if (this.onDown) this.onDown();
            }
            this._retry = setTimeout(() => this.connect(), this.RETRY_MS);
        };
    },

    send: function (type) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: type }));
    },

    queue: function () {
        this.queued = true;
        if (this.ws) this.send('queue');
        else this.connect();
    },

    unqueue: function () {
        if (!this.queued) return;
        this.queued = false;
        this.send('unqueue');
    }
};

window.QuickMatch = QuickMatch;
