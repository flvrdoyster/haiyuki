const ContinueConfig = {
    BG_IMAGE: 'bg/OVERBAK.png',
    GAMEOVER: { img: 'ui/gameover.png', w: 64, h: 64, count: 9, firstTick: 6, gap: 6, startX: 640, startY: 0, x0: 32, y1: 200, y2: 100, holdTicks: 4 },
    CONTINUE: { img: 'ui/contmoji.png', w: 32, h: 32, count: 9, firstTick: 157, gap: 6, startX: 334, startY: 500, x0: 176, y: 220 },
    YESNO: { img: 'ui/yesno.png', w: 96, h: 32, spawnTick: 212, x: 272, yesY: 280, noY: 340, yesStartX: 640, noStartX: -300, blinkTicks: 3 },
    INPUT_TICK: 233,
    YES: { holdUntil: 42, fadeStart: 43, fadeDur: 30, blackAt: 81, endAt: 86, exitX: { gameover: 700, continue: -500, yes: -300, no: 700 } },
    NO: { fadeStart: 62, fadeDur: 60, blackAt: 132, endAt: 142, floor: 448, vanish: 489, bounces: 3 },
    TRACK_DIV: 4,
    SFX: { toggle: 'audio/flip', confirm: 'audio/continue' },
    BGM: 'audio/bgm_inn',
    INFO: {
        text: "컨티뉴를 선택하면 진 엔딩 조건을 달성할 수 없습니다.",
        x: 320, y: 440,
        font: `16px ${FONTS.regular}`,
        color: 'rgba(255, 255, 255, 0.7)'
    }
};

const ContinueScene = {
    selectedOption: 0, // 0: YES, 1: NO
    phase: 'enter',    // enter → input → yes → no
    tick: 0,
    acc: 0,
    sprites: [],
    fadeAlpha: 0,
    data: null,

    init: function (data) {
        this.data = data || {};
        this.selectedOption = 0;
        this.phase = 'enter';
        this.tick = 0;
        this.acc = 0;
        this.sprites = [];
        this.fadeAlpha = 0;
        this.confirmTick = 0;

        Assets.playMusic(ContinueConfig.BGM, false);

        if (Game.isAutoTest) {
            this.skipEntry();
        }
    },

    skipEntry: function () {
        const G = ContinueConfig.GAMEOVER, C = ContinueConfig.CONTINUE;
        for (let i = 0; i < G.count; i++) { const s = this.spawnGameOver(i); s.stage = 2; s.ty = G.y2; }
        for (let i = 0; i < C.count; i++) this.spawnContinue(i);
        this.spawnYesNo();
        for (const s of this.sprites) { s.x = s.tx; s.y = s.ty; s.arrived = true; }
        this.tick = ContinueConfig.INPUT_TICK;
        this.phase = 'input';
    },

    spawn: function (kind, img, frame, w, h, x, y, tx, ty, z) {
        const s = { kind, img, frame, w, h, x, y, tx, ty, z, arrived: false, atTarget: 0, blink: 0, drop: null };
        this.sprites.push(s);
        return s;
    },

    spawnGameOver: function (i) {
        const G = ContinueConfig.GAMEOVER;
        const s = this.spawn('gameover', G.img, i, G.w, G.h, G.startX, G.startY, G.x0 + G.w * i, G.y1, 200 + i);
        s.stage = 1;
        return s;
    },

    spawnContinue: function (i) {
        const C = ContinueConfig.CONTINUE;
        return this.spawn('continue', C.img, i, C.w, C.h, C.startX - C.w * i, C.startY, C.x0 + C.w * i, C.y, 100 + i);
    },

    spawnYesNo: function () {
        const Y = ContinueConfig.YESNO;
        this.spawn('yes', Y.img, 0, Y.w, Y.h, Y.yesStartX, Y.yesY, Y.x, Y.yesY, 200);
        this.spawn('no', Y.img, 1, Y.w, Y.h, Y.noStartX, Y.noY, Y.x, Y.noY, 200);
    },

    update: function (dt = 1.0) {
        this.acc += dt || 1.0;
        while (this.acc >= 1) {
            this.acc -= 1;
            this.step();
        }
        if (this.phase === 'input') this.handleInput();
    },

    step: function () {
        this.tick++;
        const t = this.tick;
        const G = ContinueConfig.GAMEOVER, C = ContinueConfig.CONTINUE, Y = ContinueConfig.YESNO;

        if (this.phase === 'enter') {
            for (let i = 0; i < G.count; i++) if (t === G.firstTick + G.gap * i) this.spawnGameOver(i);
            for (let i = 0; i < C.count; i++) if (t === C.firstTick + C.gap * i) this.spawnContinue(i);
            if (t === Y.spawnTick) this.spawnYesNo();
            if (t === ContinueConfig.INPUT_TICK) this.phase = 'input';
        } else if (this.phase === 'yes') {
            this.stepYes();
        } else if (this.phase === 'no') {
            this.stepNo();
        }

        for (const s of this.sprites) {
            if (s.drop) this.dropSprite(s);
            else if (!(this.phase === 'yes' && this.tick - this.confirmTick < ContinueConfig.YES.holdUntil)) this.trackSprite(s);
            if (s.kind === 'yes' || s.kind === 'no') s.blink++;
        }
        this.sprites = this.sprites.filter(s => !s.dead);
    },

    trackSprite: function (s) {
        const div = ContinueConfig.TRACK_DIV;
        if (s.kind === 'gameover' && s.stage === 1 && s.arrived && s.atTarget >= ContinueConfig.GAMEOVER.holdTicks) {
            s.stage = 2;
            s.ty = ContinueConfig.GAMEOVER.y2;
            s.arrived = false;
        }
        const dx = s.tx - s.x, dy = s.ty - s.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            s.x = s.tx; s.y = s.ty;
            if (!s.arrived) { s.arrived = true; s.atTarget = 0; }
            s.atTarget++;
            return;
        }
        s.x += Math.trunc(dx / div * 65536) / 65536;
        s.y += Math.trunc(dy / div * 65536) / 65536;
    },

    rectOf: function (s) {
        return { x: s.x, y: s.y, w: s.w, h: s.h };
    },

    hitSprite: function (kind) {
        const s = this.sprites.find(sp => sp.kind === kind);
        if (!s) return false;
        const mx = Input.mouseX, my = Input.mouseY;
        return mx >= s.x && mx < s.x + s.w && my >= s.y && my < s.y + s.h;
    },

    handleInput: function () {
        const I = Input;
        if (I.isJustPressed(I.UP) || I.isJustPressed(I.DOWN) || I.isJustPressed(I.LEFT) || I.isJustPressed(I.RIGHT)) {
            this.selectedOption = 1 - this.selectedOption;
            Assets.playSound(ContinueConfig.SFX.toggle);
        }

        if (I.hasMouseMoved()) {
            if (this.hitSprite('yes')) this.selectedOption = 0;
            else if (this.hitSprite('no')) this.selectedOption = 1;
        }

        const mouseOk = I.isMouseJustPressed() && (this.hitSprite('yes') || this.hitSprite('no'));
        if (I.isConfirmKey() || mouseOk) {
            Assets.playSound(ContinueConfig.SFX.confirm);
            this.confirmTick = this.tick;
            if (this.selectedOption === 0) {
                this.phase = 'yes';
            } else {
                this.phase = 'no';
                for (const s of this.sprites) this.initDrop(s);
            }
            if (Game.isAutoTest) {
                if (this.selectedOption === 0) this.retry(); else this.giveUp();
            }
        }
    },

    stepYes: function () {
        const Yc = ContinueConfig.YES;
        const f = this.tick - this.confirmTick;
        if (f === Yc.holdUntil) {
            for (const s of this.sprites) { s.tx = Yc.exitX[s.kind]; s.arrived = false; }
        }
        if (f >= Yc.fadeStart) this.fadeAlpha = Math.min(1, (f - Yc.fadeStart) / Yc.fadeDur);
        if (f >= Yc.blackAt) this.fadeAlpha = 1;
        if (f === Yc.endAt) this.retry();
    },

    initDrop: function (s) {
        const r = (n) => Math.floor(Math.random() * n);
        s.drop = { wait: r(30), vx: (r(10) - 5) * 0.5, n: 0, bounces: 0 };
    },

    dropSprite: function (s) {
        const N = ContinueConfig.NO;
        const d = s.drop;
        if (d.wait > 0) { d.wait--; return; }
        s.x += d.vx;
        s.y += Math.trunc(d.n * 40 / 60);
        d.n++;
        if (s.y > N.floor && d.bounces < N.bounces) {
            s.y = N.floor;
            d.n = Math.trunc(-2 * d.n / 3);
            d.bounces++;
        } else if (d.bounces >= N.bounces && s.y > N.vanish) {
            s.dead = true;
        }
    },

    stepNo: function () {
        const N = ContinueConfig.NO;
        const f = this.tick - this.confirmTick;
        if (f >= N.fadeStart) this.fadeAlpha = Math.min(1, (f - N.fadeStart) / N.fadeDur);
        if (f >= N.blackAt) this.fadeAlpha = 1;
        if (f === N.endAt) this.giveUp();
    },

    retry: function () {
        this.data.isNextRound = false;
        Game.changeScene(BattleScene, this.data);
    },

    giveUp: function () {
        // mayu 포기 시 진엔딩 대신 일반 크레딧
        const cpuData = CharacterData[this.data.cpuIndex];
        if (cpuData && cpuData.id === 'mayu') {
            Game.changeScene(CreditsScene);
        } else {
            Game.changeScene(TitleScene);
        }
    },

    frameOf: function (s) {
        if (s.kind !== 'yes' && s.kind !== 'no') return s.frame;
        const base = s.kind === 'yes' ? 0 : 1;
        const selected = (s.kind === 'yes') === (this.selectedOption === 0);
        if (!selected) return base;
        const lit = Math.floor(s.blink / ContinueConfig.YESNO.blinkTicks) % 2 === 1;
        return lit ? base + 2 : base;
    },

    draw: function (ctx) {
        const bgImg = Assets.get(ContinueConfig.BG_IMAGE);
        if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, 640, 480);
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            ctx.fillRect(0, 0, 640, 480);
        }

        const sorted = this.sprites.slice().sort((a, b) => a.z - b.z);
        for (const s of sorted) {
            const img = Assets.get(s.img);
            if (!img) continue;
            const frame = this.frameOf(s);
            const vertical = img.width === s.w;
            const sx = vertical ? 0 : frame * s.w;
            const sy = vertical ? frame * s.h : 0;
            ctx.drawImage(img, sx, sy, s.w, s.h, Math.trunc(s.x), Math.trunc(s.y), s.w, s.h);
        }

        const info = ContinueConfig.INFO;
        ctx.fillStyle = info.color;
        ctx.font = info.font;
        ctx.textAlign = 'center';
        ctx.fillText(info.text, info.x, info.y);

        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, 640, 480);
        }
    }
};
