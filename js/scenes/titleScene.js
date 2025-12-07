// Scene Configuration
const TitleConfig = {
    TITLE: { path: 'TITLE.png', y: 80, centered: true },
    PUSH_KEY: { path: 'PUSHOK.png', y: 360, centered: true },
    COPYRIGHT: { path: 'SCMPLOGO.png', y: 430, centered: true }
};

const TitleScene = {
    // States
    STATE_PRESS_KEY: 0,
    STATE_MODE_SELECT: 1,

    currentState: 0,
    blinkTimer: 0,
    showPushKey: true,

    menuIndex: 0, // 0: Start, 1: Watch

    init: function () {
        this.currentState = this.STATE_PRESS_KEY;
        this.blinkTimer = 0;
        this.showPushKey = true;
        this.menuIndex = 0;
    },

    update: function () {
        this.blinkTimer++;
        if (this.blinkTimer > 40) { // Slower blink
            this.showPushKey = !this.showPushKey;
            this.blinkTimer = 0;
        }

        if (this.currentState === this.STATE_PRESS_KEY) {
            // Space to start
            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed()) {
                this.currentState = this.STATE_MODE_SELECT;
                // Game.changeScene(CharacterSelectScene);
            }
        } else if (this.currentState === this.STATE_MODE_SELECT) {
            if (Input.isJustPressed(Input.UP) || Input.isJustPressed(Input.DOWN)) {
                this.menuIndex = (this.menuIndex === 0) ? 1 : 0;
            }

            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed()) {
                const mode = (this.menuIndex === 0) ? 'STORY' : 'WATCH';
                Game.changeScene(CharacterSelectScene, { mode: mode });
            }
        }
    },

    draw: function (ctx) {
        // 1. Background
        // Simplification: User removed background config, use simple black style or default
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 640, 480);

        // 2. Title
        const title = Assets.get(TitleConfig.TITLE.path);
        if (title) {
            ctx.drawImage(title, (640 - title.width) / 2, TitleConfig.TITLE.y);
        }

        // 3. Press Key or Menu
        if (this.currentState === this.STATE_PRESS_KEY) {
            if (this.showPushKey) {
                const push = Assets.get(TitleConfig.PUSH_KEY.path);
                if (push) {
                    ctx.drawImage(push, (640 - push.width) / 2, TitleConfig.PUSH_KEY.y);
                }
            }
        } else if (this.currentState === this.STATE_MODE_SELECT) {
            // Draw Simple Menu
            ctx.save();
            ctx.font = 'bold 24px "KoddiUDOnGothic-Bold", sans-serif';
            ctx.textAlign = 'center';

            // Item 1: Start Game
            ctx.fillStyle = (this.menuIndex === 0) ? '#FFFF00' : '#FFFFFF';
            ctx.fillText("게임 시작", 320, 360);

            // Item 2: Conversation View
            ctx.fillStyle = (this.menuIndex === 1) ? '#FFFF00' : '#FFFFFF';
            ctx.fillText("대화만 보기", 320, 400);

            ctx.restore();
        }

        // 4. Copyright
        const copy = Assets.get(TitleConfig.COPYRIGHT.path);
        if (copy) {
            ctx.drawImage(copy, (640 - copy.width) / 2, TitleConfig.COPYRIGHT.y);
        }
    }
};
