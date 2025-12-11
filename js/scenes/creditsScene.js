const CreditsConfig = {
    BG_COLOR: 'black',
    SCREEN_CENTER_X: 320,
    EXIT_DELAY: 180, // 3 seconds
    DATA: {
        TRUE: [
            { text: "COMPLETE!", y: 200, color: 'yellow', spacing: 32, scale: 1.5 },
            { text: "THANK YOU FOR PLAYING", y: 262, color: 'yellow', spacing: 32 }
        ],
        NORMAL: [
            { text: "CLEAR!", y: 200, color: 'yellow', spacing: 32, scale: 1.5 },
            { text: "THANK YOU FOR PLAYING", y: 262, color: 'yellow', spacing: 32 }
        ]
    }
};

const CreditsScene = {
    timer: 0,
    endingType: 'NORMAL',

    init: function (params) {
        this.timer = 0;
        this.endingType = (params && params.endingType) ? params.endingType : 'NORMAL';
        console.log(`Credits Scene Initialized. Type: ${this.endingType}`);
    },

    update: function () {
        this.timer++;

        if (this.timer > CreditsConfig.EXIT_DELAY) {
            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed()) {
                Game.changeScene(TitleScene);
            }
        }
    },

    draw: function (ctx) {
        // Background
        ctx.fillStyle = CreditsConfig.BG_COLOR;
        ctx.fillRect(0, 0, 640, 480);

        const config = CreditsConfig.DATA[this.endingType] || CreditsConfig.DATA.NORMAL;
        const cx = CreditsConfig.SCREEN_CENTER_X;

        config.forEach(line => {
            Assets.drawAlphabet(ctx, line.text, cx, line.y, {
                color: line.color,
                spacing: line.spacing, // Base spacing (auto-scaled by Assets)
                scale: line.scale,
                align: 'center'
            });
        });
    }
};
