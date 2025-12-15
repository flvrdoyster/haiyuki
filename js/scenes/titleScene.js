// Scene Configuration
const TitleConfig = {
    TITLE: { path: 'ui/title.png', y: 80 },
    PUSH_KEY: { path: 'ui/pushok.png', y: 360 },
    COPYRIGHT: { path: 'ui/logo_compile_1998.png', y: 430 },
    MENU: {
        ITEM1: { text: "BATTLE", y: 300 },
        ITEM2: { text: "STORY ONLY", y: 340 },
        ITEM3: { text: "RESET", y: 380 }
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

        // Local Confirm State
        this.confirmActive = false;
        this.confirmSelected = 0; // 0:YES, 1:NO
        this.confirmTimer = 0;
        this.confirmTimer = 0;

        // Start BGM
        // Start BGM
        Assets.playMusic('audio/bgm_title');
    },

    update: function () {
        // Update Local Confirm Dialog
        if (this.confirmActive) {
            this.updateConfirm();
            return;
        }

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
            // Mouse Interaction Logic
            const mx = Input.mouseX;
            const my = Input.mouseY;

            // Helper to check bounds
            const checkHover = (text, y, index) => {
                const w = text.length * 32;
                const h = 32;
                const x = (640 - w) / 2;
                if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
                    return true;
                }
                return false;
            };

            const t1 = TitleConfig.MENU.ITEM1.text;
            const t2 = TitleConfig.MENU.ITEM2.text;
            const t3 = TitleConfig.MENU.ITEM3.text;

            if (checkHover(t1, TitleConfig.MENU.ITEM1.y, 0)) this.menuIndex = 0;
            else if (checkHover(t2, TitleConfig.MENU.ITEM2.y, 1)) this.menuIndex = 1;
            else if (checkHover(t3, TitleConfig.MENU.ITEM3.y, 2)) this.menuIndex = 2;

            if (Input.isJustPressed(Input.UP)) {
                this.menuIndex = (this.menuIndex - 1 + 3) % 3;
            }
            if (Input.isJustPressed(Input.DOWN)) {
                this.menuIndex = (this.menuIndex + 1) % 3;
            }

            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed() || Game.isAutoTest) {
                if (this.menuIndex === 0) {
                    // Battle
                    Assets.stopMusic();
                    Game.changeScene(CharacterSelectScene, { mode: 'STORY' });
                } else if (this.menuIndex === 1) {
                    // Story Only
                    Assets.stopMusic();
                    Game.changeScene(CharacterSelectScene, { mode: 'WATCH' });
                } else if (this.menuIndex === 2) {
                    // Reset Save Data 
                    this.confirmActive = true;
                    this.confirmSelected = 1; // Default to NO for safety
                    this.confirmTimer = 10; // Cooldown
                }
            }

        }
    },

    updateConfirm: function () {
        if (this.confirmTimer > 0) {
            this.confirmTimer--;
            return;
        }

        // --- Mouse Interaction ---
        const mx = Input.mouseX;
        const my = Input.mouseY;

        // Coordinates (Match drawConfirm)
        const boxY = 140;
        const boxH = 200;
        const buttonY = boxY + boxH - 60; // 280
        const buttonW = 100;
        const buttonH = 40;
        const buttonGap = 40;

        const yesX = 320 - buttonW - buttonGap / 2; // 200
        const noX = 320 + buttonGap / 2;            // 340

        const isOverYes = (mx >= yesX && mx <= yesX + buttonW && my >= buttonY && my <= buttonY + buttonH);
        const isOverNo = (mx >= noX && mx <= noX + buttonW && my >= buttonY && my <= buttonY + buttonH);

        if (isOverYes) {
            this.confirmSelected = 0;
            if (Input.isMouseJustPressed()) {
                // YES - Reset Data
                Game.saveData = { unlocked: [], clearedOpponents: [] };
                Game.continueCount = 0;
                Game.save();
                Assets.playSound('audio/riichi'); // Feedback sound
                console.log("Save Data Reset");
                this.confirmActive = false;
                return;
            }
        } else if (isOverNo) {
            this.confirmSelected = 1;
            if (Input.isMouseJustPressed()) {
                this.confirmActive = false;
                return;
            }
        }

        // Left/Right or Up/Down to toggle
        if (Input.isJustPressed(Input.LEFT) || Input.isJustPressed(Input.RIGHT) ||
            Input.isJustPressed(Input.UP) || Input.isJustPressed(Input.DOWN)) {
            this.confirmSelected = (this.confirmSelected === 0) ? 1 : 0;
        }

        // Confirm
        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.ENTER)) {
            if (this.confirmSelected === 0) {
                // YES - Reset Data
                Game.saveData = { unlocked: [], clearedOpponents: [] };
                Game.continueCount = 0;
                Game.save();
                Assets.playSound('audio/riichi'); // Feedback sound
                console.log("Save Data Reset");
            }
            this.confirmActive = false; // Close dialog
        }

        // Cancel
        if (Input.isJustPressed(Input.X) || Input.isJustPressed(Input.ESCAPE)) {
            this.confirmActive = false;
        }
    },

    draw: function (ctx) {
        // 1. Background
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

            // Item 3: RESET SAVE DATA
            const text3 = TitleConfig.MENU.ITEM3.text;
            const color3 = (this.menuIndex === 2) ? 'yellow' : 'orange';
            const x3 = (640 - (text3.length * 32)) / 2;
            Assets.drawAlphabet(ctx, text3, x3, TitleConfig.MENU.ITEM3.y, color3);

            // Draw Pointer
            let targetText, targetY, targetX;
            if (this.menuIndex === 0) {
                targetText = text1;
                targetY = TitleConfig.MENU.ITEM1.y;
            } else if (this.menuIndex === 1) {
                targetText = text2;
                targetY = TitleConfig.MENU.ITEM2.y;
            } else {
                targetText = text3;
                targetY = TitleConfig.MENU.ITEM3.y;
            }
            targetX = (640 - (targetText.length * 32)) / 2;

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

        // 5. Local Confirmation Dialog (drawn on top)
        if (this.confirmActive) {
            this.drawConfirm(ctx);
        }

    },

    drawConfirm: function (ctx) {
        ctx.save();

        // 1. Dimmer (Full Screen)
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 640, 480);

        // 2. Dialog Box
        const boxX = 120;
        const boxY = 140;
        const boxW = 400;
        const boxH = 200;

        Assets.drawWindow(ctx, boxX, boxY, boxW, boxH);

        // 3. Message Text
        ctx.fillStyle = 'white';
        ctx.font = `20px ${FONTS.regular}`;
        ctx.textAlign = 'center';

        const message = '클리어 기록을 리셋할까요?\\n해금된 캐릭터가 사라집니다.';
        const lines = message.split('\\n');
        const lineHeight = 28;
        const startY = boxY + 60;

        lines.forEach((line, i) => {
            ctx.fillText(line, 320, startY + (i * lineHeight));
        });

        // 4. Buttons
        const buttonY = boxY + boxH - 60;
        const buttonW = 100;
        const buttonH = 40;
        const buttonGap = 40;

        const yesX = 320 - buttonW - buttonGap / 2;
        const noX = 320 + buttonGap / 2;

        // Draw YES Button
        Assets.drawButton(ctx, yesX, buttonY, buttonW, buttonH, 'YES', this.confirmSelected === 0, { noBorder: true });

        // Draw NO Button
        Assets.drawButton(ctx, noX, buttonY, buttonW, buttonH, 'NO', this.confirmSelected === 1, { noBorder: true });

        ctx.restore();
    }
};
