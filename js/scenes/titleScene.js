// Scene Configuration
const TitleConfig = {
    TITLE: { path: 'ui/title.png', y: 80, centered: true },
    PUSH_KEY: { path: 'ui/pushok.png', y: 360, centered: true },
    COPYRIGHT: { path: 'ui/logo_compile_1998.png', y: 430, centered: true },
    MENU: {
        ITEM1: { text: "BATTLE MODE", y: 300 },
        ITEM2: { text: "STORY ONLY", y: 340 }
    }
};

const TitleScene = {
    // States
    STATE_PRESS_KEY: 0,
    STATE_MODE_SELECT: 1,

    currentState: 0,
    blinkTimer: 0,
    showPushKey: true,

    menuIndex: 0, // 0: Start, 1: Watch
    pointerTimer: 0,

    init: function () {
        this.currentState = this.STATE_PRESS_KEY;
        this.blinkTimer = 0;
        this.showPushKey = true;
        this.menuIndex = 0;
        this.pointerTimer = 0;

        // Start BGM
        Assets.playMusic('audio/bgm_title');
    },

    update: function () {
        this.blinkTimer++;
        if (this.blinkTimer > 40) { // Slower blink
            this.showPushKey = !this.showPushKey;
            this.blinkTimer = 0;
        }

        if (this.currentState === this.STATE_PRESS_KEY) {
            // Space to start
            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed() || Game.isAutoTest) {
                this.currentState = this.STATE_MODE_SELECT;
                // Game.changeScene(CharacterSelectScene);
            }
        } else if (this.currentState === this.STATE_MODE_SELECT) {
            if (Input.isJustPressed(Input.UP) || Input.isJustPressed(Input.DOWN)) {
                this.menuIndex = (this.menuIndex === 0) ? 1 : 0;
            }

            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed() || Game.isAutoTest) {
                const mode = (this.menuIndex === 0) ? 'STORY' : 'WATCH';
                Assets.stopMusic(); // Ensure title music stops
                Game.changeScene(CharacterSelectScene, { mode: mode });
            }

            this.pointerTimer++;
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
            // Draw Retro Font Menu

            // Item 1: BATTLE MODE
            const text1 = TitleConfig.MENU.ITEM1.text;
            const color1 = (this.menuIndex === 0) ? 'yellow' : 'orange';
            const x1 = (640 - (text1.length * 32)) / 2;
            Assets.drawAlphabet(ctx, text1, x1, TitleConfig.MENU.ITEM1.y, color1);

            // Item 2: STORY ONLY
            const text2 = TitleConfig.MENU.ITEM2.text;
            const color2 = (this.menuIndex === 1) ? 'yellow' : 'orange';
            const x2 = (640 - (text2.length * 32)) / 2;
            Assets.drawAlphabet(ctx, text2, x2, TitleConfig.MENU.ITEM2.y, color2);

            // Draw Pointer
            let targetText = (this.menuIndex === 0) ? text1 : text2;
            let targetY = (this.menuIndex === 0) ? TitleConfig.MENU.ITEM1.y : TitleConfig.MENU.ITEM2.y;
            let targetX = (640 - (targetText.length * 32)) / 2;

            // Pointer Animation
            const frameIndex = Math.floor(this.pointerTimer / 10) % 2;
            // Draw to the left of the text
            Assets.drawFrame(ctx, 'ui/pointer.png', targetX - 48, targetY, frameIndex, 32, 32);
        }

        // 4. Copyright
        const copy = Assets.get(TitleConfig.COPYRIGHT.path);
        if (copy) {
            ctx.drawImage(copy, (640 - copy.width) / 2, TitleConfig.COPYRIGHT.y);
        }
    }
};
