function BroadcastChannelTransport(roomCode) {
    this.channel = new BroadcastChannel('haiyuki-online-' + roomCode);
    this.cb = null;
    this.relay = false;
    this.channel.onmessage = (e) => {
        if (this.cb) this.cb(e.data);
    };
}

BroadcastChannelTransport.prototype = {
    send: function (msg) {
        this.channel.postMessage(msg);
    },

    onMessage: function (cb) {
        this.cb = cb;
    },

    onEvent: function () {},

    close: function () {
        this.cb = null;
        this.channel.close();
    }
};

function WebSocketTransport(relayUrl, roomCode, role) {
    this.relay = true;
    this.cb = null;
    this.evCb = null;
    this.closed = false;
    const base = String(relayUrl).replace(/\/+$/, '').replace(/^http/, 'ws');
    this.url = base;
    this.ws = new WebSocket(`${base}/room/${roomCode}?role=${role}`);
    this.ws.onmessage = (e) => {
        if (typeof e.data !== 'string') return;
        let msg;
        try { msg = JSON.parse(e.data); } catch (err) { return; }
        if (msg && msg.type === 'peer') {
            this.emit(msg.state);
            return;
        }
        if (this.cb) this.cb(msg);
    };
    this.ws.onclose = () => this.emit('closed');
    this.ws.onerror = () => this.emit('closed');
}

WebSocketTransport.prototype = {
    send: function (msg) {
        if (this.closed || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify(msg));
    },

    onMessage: function (cb) {
        this.cb = cb;
    },

    onEvent: function (cb) {
        this.evCb = cb;
    },

    emit: function (state) {
        if (!this.closed && this.evCb) this.evCb(state);
    },

    close: function () {
        this.closed = true;
        this.cb = null;
        this.evCb = null;
        try { this.ws.close(); } catch (err) { }
    }
};

window.BroadcastChannelTransport = BroadcastChannelTransport;
window.WebSocketTransport = WebSocketTransport;
