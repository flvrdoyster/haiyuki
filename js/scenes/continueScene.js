const ContinueConfig = {
    BG_COLOR: 'black',
    TITLE: {
        text: "CONTINUE?",
        x: 320, y: 150,
        font: 'bold 48px "KoddiUDOnGothic-Bold"',
        color: 'white',
        align: 'center'
    },
    OPTIONS: {
        font: 'bold 32px "KoddiUDOnGothic-Bold"',
        selectedColor: 'yellow',
        normalColor: 'gray',
        YES: { text: "YES", x: 320, y: 270, hitX: 220, hitY: 240, hitW: 200, hitH: 40 },
        NO: { text: "NO", x: 320, y: 330, hitX: 220, hitY: 300, hitW: 200, hitH: 40 },
        cursor: "▶",
        cursorOffset: 80 // Distance from center to left
    },
    INFO: {
        text: "True Ending will be disabled.",
        x: 320, y: 400,
        font: '16px "KoddiUDOnGothic-Regular"',
        color: '#888'
    }
};

const ContinueScene = {
    // State
    selectedOption: 0, // 0: YES, 1: NO
    timer: 0,

    // Data passed from BattleScene
    data: null,

    init: function (data) {
        this.data = data;
        this.selectedOption = 0;
        this.timer = 0;
        console.log("Continue Scene Init", data);
    },

    update: function () {
        this.timer++;

        // Input Handling
        if (Input.isKeyPressed('ArrowUp') || Input.isKeyPressed('ArrowDown')) {
            this.selectedOption = (this.selectedOption + 1) % 2;
        }

        // Mouse Hover
        const opts = ContinueConfig.OPTIONS;
        if (Input.mouse.x > opts.YES.hitX && Input.mouse.x < opts.YES.hitX + opts.YES.hitW) {
            if (Input.mouse.y > opts.YES.hitY && Input.mouse.y < opts.YES.hitY + opts.YES.hitH) {
                this.selectedOption = 0;
            } else if (Input.mouse.y > opts.NO.hitY && Input.mouse.y < opts.NO.hitY + opts.NO.hitH) {
                this.selectedOption = 1;
            }
        }

        // Confirm
        if (Input.isKeyPressed('Enter') || Input.isKeyPressed('z') || (Input.isMousePressed && this.timer > 30)) {
            if (this.selectedOption === 0) {
                // YES -> Restart Battle
                console.log("Continue: YES");
                this.data.hasContinued = true;
                this.data.isNextRound = false; // Reset HP
                Game.changeScene(BattleScene, this.data);
            } else {
                // NO -> Title
                console.log("Continue: NO");
                Game.changeScene(TitleScene);
            }
        }
    },

    draw: function (ctx) {
        // Background
        ctx.fillStyle = ContinueConfig.BG_COLOR;
        ctx.fillRect(0, 0, 640, 480);

        // Title
        const title = ContinueConfig.TITLE;
        ctx.fillStyle = title.color;
        ctx.font = title.font;
        ctx.textAlign = title.align;
        ctx.fillText(title.text, title.x, title.y);

        // Options
        const opts = ContinueConfig.OPTIONS;
        ctx.font = opts.font;

        // YES
        ctx.fillStyle = this.selectedOption === 0 ? opts.selectedColor : opts.normalColor;
        ctx.fillText(opts.YES.text, opts.YES.x, opts.YES.y);
        if (this.selectedOption === 0) {
            ctx.fillText(opts.cursor, opts.YES.x - opts.cursorOffset, opts.YES.y);
        }

        // NO
        ctx.fillStyle = this.selectedOption === 1 ? opts.selectedColor : opts.normalColor;
        ctx.fillText(opts.NO.text, opts.NO.x, opts.NO.y);
        if (this.selectedOption === 1) {
            ctx.fillText(opts.cursor, opts.NO.x - opts.cursorOffset, opts.NO.y);
        }

        // Info
        const info = ContinueConfig.INFO;
        ctx.fillStyle = info.color;
        ctx.font = info.font;
        ctx.fillText(info.text, info.x, info.y);
    }
};
