function BroadcastChannelTransport(roomCode) {
    this.channel = new BroadcastChannel('haiyuki-online-' + roomCode);
    this.cb = null;
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

    close: function () {
        this.cb = null;
        this.channel.close();
    }
};

window.BroadcastChannelTransport = BroadcastChannelTransport;
