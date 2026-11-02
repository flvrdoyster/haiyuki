const LobbyConfig = {
    TITLE: { text: 'ONLINE', y: 60 },
    MENU: [
        { id: 'CREATE', text: 'CREATE', y: 220 },
        { id: 'JOIN', text: 'JOIN', y: 260 }
    ],
    CODE_LABEL: { text: 'CODE', y: 200 },
    CODE: { y: 240 },
    WAITING: { text: 'WAITING', y: 320 }
};

const OnlineLobbyScene = {
    STATE_MENU: 0,
    STATE_WAITING: 1,
    STATE_JOIN_INPUT: 2,

    currentState: 0,
    menuIndex: 0,
    pointerTimer: 0,
    blinkTimer: 0,
    match: null,

    init: function (data) {
        this.currentState = this.STATE_MENU;
        this.menuIndex = 0;
        this.pointerTimer = 0;
        this.blinkTimer = 0;
        this.match = null;
        this.preset = (data && data.preset) || null;
        if (data && data.match) this.beginWaiting(data.match);
    },

    startFromUrl: function (spec, opts) {
        const m = /^(host|join):([A-Za-z]+)$/.exec(spec || '');
        if (!m) return false;
        const code = OnlineMatch.normalizeCode(m[2]);
        if (code.length !== OnlineMatch.CODE_LENGTH) return false;
        const match = OnlineMatch.create({
            host: m[1] === 'host',
            code: code,
            char: opts.char,
            seed: opts.seed,
            skillsEnabled: opts.skills
        });
        Game.changeScene(OnlineLobbyScene, { match: match });
        return true;
    },

    beginWaiting: function (match) {
        this.match = match;
        this.currentState = this.STATE_WAITING;
        this.hideInput();
    },

    createRoom: function () {
        this.beginWaiting(OnlineMatch.create({ host: true, code: OnlineMatch.makeCode() }));
    },

    joinRoom: function (code) {
        code = OnlineMatch.normalizeCode(code);
        if (code.length !== OnlineMatch.CODE_LENGTH) {
            Assets.playSound('audio/wrong');
            return;
        }
        this.beginWaiting(OnlineMatch.create({ host: false, code: code }));
    },

    inputElement: function () {
        let el = document.getElementById('online-code');
        if (el) return el;
        const container = document.getElementById('game-container');
        if (!container) return null;
        el = document.createElement('input');
        el.id = 'online-code';
        el.type = 'text';
        el.maxLength = OnlineMatch.CODE_LENGTH;
        el.autocomplete = 'off';
        el.autocapitalize = 'characters';
        el.spellcheck = false;
        el.placeholder = LobbyConfig.CODE_LABEL.text;
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.joinRoom(el.value);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelJoin();
            }
        });
        container.appendChild(el);
        return el;
    },

    showInput: function () {
        const el = this.inputElement();
        if (!el) return;
        el.value = '';
        el.classList.add('show');
        Input.keys = {};
        el.focus();
    },

    hideInput: function () {
        const el = document.getElementById('online-code');
        if (!el) return;
        el.classList.remove('show');
        el.blur();
        Input.keys = {};
    },

    cancelJoin: function () {
        this.hideInput();
        this.currentState = this.STATE_MENU;
    },

    leave: function () {
        this.hideInput();
        if (this.match) {
            this.match.close();
            this.match = null;
        }
        Game.changeScene(TitleScene);
    },

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        this.pointerTimer += dt;
        this.blinkTimer += dt;

        if (this.currentState === this.STATE_MENU) {
            const count = LobbyConfig.MENU.length;
            const prevIndex = this.menuIndex;
            const hovered = this.hoveredMenu();
            if (hovered !== -1 && Input.hasMouseMoved()) this.menuIndex = hovered;
            if (Input.isJustPressed(Input.UP)) this.menuIndex = (this.menuIndex - 1 + count) % count;
            if (Input.isJustPressed(Input.DOWN)) this.menuIndex = (this.menuIndex + 1) % count;
            if (this.menuIndex !== prevIndex) Assets.playSound('audio/tick');

            if (Input.isJustPressed(Input.ESC) || Input.isMouseRightClick()) {
                this.leave();
                return;
            }
            if (Input.isConfirmKey() || (Input.isMouseJustPressed() && hovered !== -1)) {
                const id = LobbyConfig.MENU[this.menuIndex].id;
                if (id === 'CREATE') this.createRoom();
                else {
                    this.currentState = this.STATE_JOIN_INPUT;
                    this.showInput();
                }
            }
        } else if (this.currentState === this.STATE_JOIN_INPUT) {
            if (Input.isJustPressed(Input.ESC) || Input.isMouseRightClick()) this.cancelJoin();
        } else if (this.currentState === this.STATE_WAITING) {
            const match = this.match;
            if (match.failed) {
                if (match.updateFailure(dt)) this.leave();
                return;
            }
            if (Input.isJustPressed(Input.ESC) || Input.isMouseRightClick()) {
                this.leave();
                return;
            }
            if (match.connected) {
                Assets.stopMusic();
                Game.changeScene(CharacterSelectScene, { mode: 'ONLINE', match: match });
            }
        }
    },

    hoveredMenu: function () {
        const mx = Input.mouseX, my = Input.mouseY;
        return LobbyConfig.MENU.findIndex(item => {
            const w = item.text.length * 32;
            const x = (640 - w) / 2;
            return mx >= x && mx <= x + w && my >= item.y && my <= item.y + 32;
        });
    },

    drawCentered: function (ctx, text, y, color) {
        BitmapFont.drawAlphabet(ctx, text, (640 - text.length * 32) / 2, y, color);
    },

    draw: function (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, 640, 480);
        this.drawCentered(ctx, LobbyConfig.TITLE.text, LobbyConfig.TITLE.y, 'yellow');

        if (this.currentState === this.STATE_MENU || this.currentState === this.STATE_JOIN_INPUT) {
            LobbyConfig.MENU.forEach((item, i) => {
                const color = (this.menuIndex === i) ? 'yellow' : 'orange';
                this.drawCentered(ctx, item.text, item.y, color);
            });
            const target = LobbyConfig.MENU[this.menuIndex];
            const targetX = (640 - target.text.length * 32) / 2;
            const frameIndex = Math.floor(this.pointerTimer / 10) % 2;
            UIDraw.drawFrame(ctx, 'ui/pointer.png', targetX - 48, target.y, frameIndex, 32, 32);
        } else if (this.currentState === this.STATE_WAITING && this.match) {
            if (this.match.failed) {
                this.match.drawFailure(ctx);
                return;
            }
            if (this.match.host) {
                this.drawCentered(ctx, LobbyConfig.CODE_LABEL.text, LobbyConfig.CODE_LABEL.y, 'orange');
                this.drawCentered(ctx, this.match.code, LobbyConfig.CODE.y, 'yellow');
            }
            if (Math.floor(this.blinkTimer / 30) % 2 === 0) {
                this.drawCentered(ctx, LobbyConfig.WAITING.text, LobbyConfig.WAITING.y, 'orange');
            }
        }
    }
};
