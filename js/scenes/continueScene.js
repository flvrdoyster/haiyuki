const ContinueConfig = {
    BG_COLOR: 'rgba(0, 0, 0, 1)',
    BG_IMAGE: 'bg/OVERBAK.png',
    BG_OVERLAY: 'rgba(0, 0, 0, 0.3)',
    TITLE: {
        text: "GAME OVER",
        x: 320, y: 120,
        color: 'yellow',
        align: 'center',
        scale: 2
    },
    SUBTITLE: {
        text: "CONTINUE?",
        x: 320, y: 260,
        color: 'yellow',
        align: 'center'
    },
    OPTIONS: {
        selectedColor: 'yellow',
        normalColor: 'gray',
        YES: { text: "YES", x: 320, y: 320 },
        NO: { text: "NO", x: 320, y: 360 },
        cursorOffset: 100 // 텍스트 중심~커서 간격(픽셀)
    },
    INFO: {
        text: "진 엔딩 조건을 달성할 수 없습니다.",
        x: 320, y: 440,
        font: `16px ${FONTS.regular}`,
        color: 'rgba(85, 85, 85, 1)'
    },

};

const ContinueScene = {
    selectedOption: 0, // 0: YES, 1: NO
    timer: 0,
    pointerTimer: 0,
    data: null,

    init: function (data) {
        this.data = data || {};
        this.selectedOption = 0;
        this.timer = 0;
        this.pointerTimer = 0;

        Assets.playMusic('audio/bgm_inn', false);
    },

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        this.timer += dt;

        this.pointerTimer += dt;

        if (Input.isJustPressed(Input.UP) || Input.isJustPressed(Input.DOWN)) {
            this.selectedOption = (this.selectedOption + 1) % 2;
            Assets.playSound('audio/select');
        }

        const mx = Input.mouseX;
        const my = Input.mouseY;
        const opts = ContinueConfig.OPTIONS;

        const checkHit = (optY) => {
            if (mx > 270 && mx < 370 && my > optY - 20 && my < optY + 20) return true;
            return false;
        };

        if (checkHit(opts.YES.y)) {
            if (Input.hasMouseMoved()) this.selectedOption = 0;
        }
        if (checkHit(opts.NO.y)) {
            if (Input.hasMouseMoved()) this.selectedOption = 1;
        }

        if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed()) {
            if (this.selectedOption === 0) {
                this.retry();
            } else {
                this.giveUp();
            }
        }
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

    draw: function (ctx) {
        const bgImg = Assets.get(ContinueConfig.BG_IMAGE);
        if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, 640, 480);
            ctx.fillStyle = ContinueConfig.BG_OVERLAY;
            ctx.fillRect(0, 0, 640, 480);
        } else {
            ctx.fillStyle = ContinueConfig.BG_COLOR;
            ctx.fillRect(0, 0, 640, 480);
        }

        const title = ContinueConfig.TITLE;
        const titleText = title.text;
        const charW = 32 * (title.scale || 1);
        const textW = titleText.length * charW;
        const titleX = 320 - (textW / 2);
        Assets.drawAlphabet(ctx, titleText, titleX, title.y - 20, { color: title.color, scale: title.scale || 1 });

        const sub = ContinueConfig.SUBTITLE;
        const subText = sub.text;
        const subW = subText.length * 32;
        const subX = 320 - (subW / 2);
        Assets.drawAlphabet(ctx, subText, subX, sub.y - 20, sub.color);

        const opts = ContinueConfig.OPTIONS;

        const yesText = opts.YES.text;
        const yesColor = (this.selectedOption === 0) ? 'yellow' : 'orange';
        const yesW = yesText.length * 32;
        const yesX = opts.YES.x - (yesW / 2);
        Assets.drawAlphabet(ctx, yesText, yesX, opts.YES.y - 16, yesColor);

        const noText = opts.NO.text;
        const noColor = (this.selectedOption === 1) ? 'yellow' : 'orange';
        const noW = noText.length * 32;
        const noX = opts.NO.x - (noW / 2);
        Assets.drawAlphabet(ctx, noText, noX, opts.NO.y - 16, noColor);

        const frameIndex = Math.floor(this.pointerTimer / 10) % 2;
        const targetY = (this.selectedOption === 0) ? opts.YES.y : opts.NO.y;
        const pointerX = 320 - opts.cursorOffset;
        Assets.drawFrame(ctx, 'ui/pointer.png', pointerX, targetY - 16, frameIndex, 32, 32);

        const info = ContinueConfig.INFO;
        ctx.fillStyle = info.color;
        ctx.font = info.font;
        ctx.textAlign = 'center';
        ctx.fillText(info.text, info.x, info.y);
    }
};