const ContinueConfig = {
    BG_COLOR: 'black',
    BG_IMAGE: 'bg/CHRBAK.png',
    BG_OVERLAY: 'rgba(0, 0, 0, 0.3)',
    TITLE: {
        text: "GAME OVER",
        x: 320, y: 100,
        color: 'yellow',
        align: 'center',
        scale: 1.5
    },
    SUBTITLE: {
        text: "CONTINUE?",
        x: 320, y: 160,
        color: 'yellow',
        align: 'center'
    },
    OPTIONS: {
        selectedColor: 'yellow',
        normalColor: 'gray',
        YES: { text: "YES", x: 320, y: 340 },
        NO: { text: "NO", x: 320, y: 380 },
        cursorOffset: 100 // Dist from text center to cursor
    },
    INFO: {
        text: "진 엔딩 조건을 달성할 수 없습니다.",
        x: 320, y: 440,
        font: `16px ${FONTS.regular}`,
        color: '#555'
    },
    COUNTDOWN: {
        x: 320, y: 200,
        // font removed
        color: 'red',
        start: 9
    }
};

const ContinueScene = {
    // State
    selectedOption: 0, // 0: YES, 1: NO
    timer: 0,
    countdownTimer: 0,
    currentCount: 9,
    pointerTimer: 0,

    // Data passed from BattleScene
    data: null,

    init: function (data) {
        this.data = data || {};
        this.selectedOption = 0;
        this.timer = 0;
        this.countdownTimer = 0;
        this.pointerTimer = 0;
        this.currentCount = ContinueConfig.COUNTDOWN.start;
        console.log("Continue Scene Init", this.data);
    },

    update: function () {
        this.timer++;

        // Pointer anim
        this.pointerTimer++;

        // Countdown Logic (approx 60 frames = 1 sec)
        this.countdownTimer++;
        if (this.countdownTimer >= 60) {
            this.currentCount--;
            this.countdownTimer = 0;
            if (this.currentCount < 0) {
                // Time Over -> Same as NO
                this.giveUp();
                return;
            }
        }

        // Input Handling
        if (Input.isJustPressed(Input.UP) || Input.isJustPressed(Input.DOWN)) {
            this.selectedOption = (this.selectedOption + 1) % 2;
            Assets.playSound('audio/select'); // Optional: Add select sound if available
        }

        // Mouse Hover
        const mx = Input.mouseX;
        const my = Input.mouseY;
        const opts = ContinueConfig.OPTIONS;

        // Simple hit detection for centering
        const checkHit = (optY) => {
            // Approx width 100, height 40 centered at 320
            if (mx > 270 && mx < 370 && my > optY - 20 && my < optY + 20) return true;
            return false;
        };

        if (checkHit(opts.YES.y)) this.selectedOption = 0;
        if (checkHit(opts.NO.y)) this.selectedOption = 1;

        // Confirm
        if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed()) {
            if (this.selectedOption === 0) {
                this.retry();
            } else {
                this.giveUp();
            }
        }
    },

    retry: function () {
        console.log("Continue: YES");
        // Pass data back to BattleScene
        // Ensure HP reset flag is set (BattleEngine sets isNextRound: false usually)
        this.data.isNextRound = false;

        // IMPORTANT: Maintain defeated opponents
        // this.data.defeatedOpponents is already in this.data

        // Restart Battle
        Game.changeScene(BattleScene, this.data);
    },

    giveUp: function () {
        console.log("Continue: NO");

        // Special Case: If giving up against Mayu (True Boss), show Normal Credits
        const cpuData = CharacterData[this.data.cpuIndex];
        if (cpuData && cpuData.id === 'mayu') {
            Game.changeScene(CreditsScene, { endingType: 'NORMAL' });
        } else {
            Game.changeScene(TitleScene);
        }
    },

    draw: function (ctx) {
        // Background
        const bgImg = Assets.get(ContinueConfig.BG_IMAGE);
        if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, 640, 480);
            // Dim overlay
            ctx.fillStyle = ContinueConfig.BG_OVERLAY;
            ctx.fillRect(0, 0, 640, 480);
        } else {
            ctx.fillStyle = ContinueConfig.BG_COLOR;
            ctx.fillRect(0, 0, 640, 480);
        }

        // Title
        const title = ContinueConfig.TITLE;
        const titleText = title.text;

        // Title: Yellow
        const charW = 32 * (title.scale || 1);
        const textW = titleText.length * charW;
        const titleX = 320 - (textW / 2);

        Assets.drawAlphabet(ctx, titleText, titleX, title.y - 20, { color: title.color, scale: title.scale || 1 });

        // Subtitle
        const sub = ContinueConfig.SUBTITLE;
        const subText = sub.text;
        const subW = subText.length * 32; // Assuming 32px width per char
        const subX = 320 - (subW / 2);
        Assets.drawAlphabet(ctx, subText, subX, sub.y - 20, sub.color);

        // Countdown
        const cd = ContinueConfig.COUNTDOWN;
        // Scale
        Assets.drawNumberBig(ctx, Math.ceil(this.currentCount), cd.x, cd.y - 20, { align: 'center', spacing: -10, scale: 2 });

        // Options
        const opts = ContinueConfig.OPTIONS;

        // YES
        const yesText = opts.YES.text; // "YES"
        const yesColor = (this.selectedOption === 0) ? 'yellow' : 'orange';
        const yesW = yesText.length * 32;
        const yesX = opts.YES.x - (yesW / 2);
        Assets.drawAlphabet(ctx, yesText, yesX, opts.YES.y - 16, yesColor);

        // NO
        const noText = opts.NO.text; // "NO"
        const noColor = (this.selectedOption === 1) ? 'yellow' : 'orange';
        const noW = noText.length * 32;
        const noX = opts.NO.x - (noW / 2);
        Assets.drawAlphabet(ctx, noText, noX, opts.NO.y - 16, noColor);

        // Draw Pointer (Copied style from TitleScene)
        // ui/pointer.png, 2 frames 32x32
        const frameIndex = Math.floor(this.pointerTimer / 10) % 2;

        // Determine target Y based on selection
        const targetY = (this.selectedOption === 0) ? opts.YES.y : opts.NO.y;

        // Draw to the left of 320 (center) - offset
        // TitleScene uses targetX - 48. Here we use center - offset.
        // options center x is 320.
        // Let's use cursorOffset logic.
        const pointerX = 320 - opts.cursorOffset;

        // Y needs adjustment. Text Y is baseline-ish? 
        // In drawnAlphabet, Y provided is Top-Left. 
        // YES.y is center of text box in config logic, but passing to drawAlphabet as top-left (y-16).
        // Let's align pointer center to YES.y.
        // Pointer is 32x32. Center is y+16.
        // So pointer raw Y = YES.y - 16.

        Assets.drawFrame(ctx, 'ui/pointer.png', pointerX, targetY - 16, frameIndex, 32, 32);


        // Info
        const info = ContinueConfig.INFO;
        ctx.fillStyle = info.color;
        ctx.font = info.font;
        ctx.textAlign = 'center'; // added center align for info
        ctx.fillText(info.text, info.x, info.y);
    }
};