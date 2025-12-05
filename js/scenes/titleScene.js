// Scene Configuration
const TitleConfig = {
    TITLE: { path: 'TITLE.png', y: 80, centered: true },
    PUSH_KEY: { path: 'PUSHOK.png', y: 360, centered: true },
    COPYRIGHT: { path: 'COMPLOGO.png', y: 430, centered: true }
};

const TitleScene = {
    // States
    STATE_PRESS_KEY: 0,

    currentState: 0,
    blinkTimer: 0,
    showPushKey: true,

    init: function () {
        this.currentState = this.STATE_PRESS_KEY;
        this.blinkTimer = 0;
        this.showPushKey = true;
    },

    update: function () {
        this.blinkTimer++;
        if (this.blinkTimer > 40) { // Slower blink
            this.showPushKey = !this.showPushKey;
            this.blinkTimer = 0;
        }

        // Space to start
        if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed()) {
            Game.changeScene(CharacterSelectScene);
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

        // 3. Press Key
        if (this.showPushKey) {
            const push = Assets.get(TitleConfig.PUSH_KEY.path);
            if (push) {
                ctx.drawImage(push, (640 - push.width) / 2, TitleConfig.PUSH_KEY.y);
            }
        }

        // 4. Copyright
        const copy = Assets.get(TitleConfig.COPYRIGHT.path);
        if (copy) {
            ctx.drawImage(copy, (640 - copy.width) / 2, TitleConfig.COPYRIGHT.y);
        }
    }
};
