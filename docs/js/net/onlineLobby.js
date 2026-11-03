const OnlineStageScene = {
    init: function () {
    },

    update: function () {
    },

    draw: function (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, 640, 480);
    }
};

const OnlineLobby = {
    MESSAGES: {
        disconnect: '연결이 끊어졌습니다',
        desync: '동기가 어긋났습니다'
    },

    match: null,
    view: 'start',
    ready: false,

    isPage: function () {
        return document.body.classList.contains('online-page');
    },

    el: function (id) {
        return document.getElementById(id);
    },

    begin: function () {
        const params = new URLSearchParams(window.location.search);
        const num = (k) => params.get(k) != null && params.get(k) !== '' ? Number(params.get(k)) : null;
        this.char = num('char');
        this.seed = num('seed');
        BattleConfig.RULES.SKILLS_ENABLED = true;
        Assets.stopMusic();
        Game.changeScene(OnlineStageScene);
        this.bind();
        this.ready = true;
        const room = OnlineMatch.normalizeCode(params.get('room'));
        if (room.length === OnlineMatch.CODE_LENGTH) this.joinRoom(room);
        else this.show('start');
    },

    bind: function () {
        if (this.bound) return;
        this.bound = true;
        const input = this.el('online-join-input');
        input.addEventListener('input', () => {
            input.value = OnlineMatch.normalizeCode(input.value);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.joinRoom(input.value);
            }
        });
        this.el('online-create').onclick = () => this.createRoom();
        this.el('online-join').onclick = () => this.joinRoom(input.value);
        this.el('online-copy').onclick = () => this.copyLink();
        this.el('online-cancel').onclick = () => this.leave();
        this.el('online-rematch').onclick = () => {
            if (this.match) this.match.requestRematch();
        };
        this.el('online-leave').onclick = () => this.leave();
        window.addEventListener('pagehide', () => {
            if (OnlineMatch.current) OnlineMatch.current.close();
        });
    },

    inviteLink: function (code) {
        return window.location.href.split(/[?#]/)[0] + '?room=' + code;
    },

    attach: function (match) {
        this.match = match;
        match.onChange = (m) => this.onChange(m);
    },

    createRoom: function () {
        this.attach(OnlineMatch.create({
            host: true,
            code: OnlineMatch.makeCode(),
            char: this.char,
            seed: this.seed
        }));
        this.show('wait');
    },

    joinRoom: function (code) {
        code = OnlineMatch.normalizeCode(code);
        if (code.length !== OnlineMatch.CODE_LENGTH) {
            this.setMessage('');
            this.el('online-join-input').focus();
            return;
        }
        this.attach(OnlineMatch.create({ host: false, code: code, char: this.char }));
        this.show('wait');
    },

    copyLink: function () {
        const field = this.el('online-link');
        const btn = this.el('online-copy');
        const select = () => {
            field.focus();
            field.select();
        };
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            select();
            return;
        }
        navigator.clipboard.writeText(field.value).then(() => {
            btn.classList.add('done');
            setTimeout(() => btn.classList.remove('done'), 1200);
        }, select);
    },

    setMessage: function (text) {
        const el = this.el('online-message');
        el.textContent = text || '';
        el.hidden = !text;
    },

    show: function (view) {
        this.view = view;
        const panel = this.el('online-panel');
        panel.hidden = view === 'hidden';
        panel.dataset.view = view;
        if (view === 'hidden') {
            if (panel.contains(document.activeElement)) document.activeElement.blur();
            return;
        }
        if (view === 'start') {
            this.el('online-join-input').value = '';
        } else if (view === 'wait') {
            const m = this.match;
            panel.dataset.role = m.host ? 'host' : 'guest';
            this.el('online-room-code').textContent = m.code;
            this.el('online-link').value = this.inviteLink(m.code);
        } else if (view === 'ended') {
            const m = this.match;
            const won = m.summary && m.summary.winner === 'P1';
            this.el('online-result').textContent = won ? '승리' : '패배';
        }
        this.refresh();
    },

    refresh: function () {
        const m = this.match;
        const waitingRematch = this.view === 'ended' && !!m && m.rematchMine;
        this.el('online-rematch').disabled = waitingRematch;
        this.el('online-rematch-wait').hidden = !waitingRematch;
    },

    onChange: function (m) {
        if (m !== this.match) return;
        if (this.view === 'wait' && m.connected) {
            this.startSelect();
        } else if (this.view === 'ended') {
            if (m.failed) this.fail(m);
            else if (!m.ended) this.startSelect();
            else this.refresh();
        }
    },

    startSelect: function () {
        this.show('hidden');
        Assets.stopMusic();
        Game.changeScene(CharacterSelectScene, { mode: 'ONLINE', match: this.match });
    },

    returnFromMatch: function (match) {
        Game.changeScene(OnlineStageScene);
        this.attach(match);
        if (match.failed) this.fail(match);
        else this.show('ended');
    },

    fail: function (match) {
        const text = this.MESSAGES[match.failed] || '';
        this.dispose();
        this.setMessage(text);
        this.show('start');
    },

    dispose: function () {
        if (this.match) {
            this.match.close();
            this.match = null;
        }
    },

    leave: function () {
        this.dispose();
        this.setMessage('');
        Game.changeScene(OnlineStageScene);
        this.show('start');
    }
};

window.OnlineLobby = OnlineLobby;
