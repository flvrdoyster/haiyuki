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

// Helper: Calculate Confirm Layout (Ported from BattleScene)
// Ideally this should be in Assets or a Shared Utils, but for now we duplicate efficiently
function getConfirmLayout(msg) {
    const conf = BattleConfig.CONFIRM || {
        minWidth: 320, minHeight: 160, padding: { x: 40, y: 30 },
        font: '20px sans-serif', lineHeight: 28,
        buttonHeight: 40, buttonWidth: 100, buttonGap: 40, buttonMarginTop: 30
    };

    const lines = msg.split('\\n');
    let maxLineWidth = 0;
    lines.forEach(line => {
        let width = 0;
        for (let i = 0; i < line.length; i++) {
            width += (line.charCodeAt(i) > 255) ? 16 : 9;
        }
        if (width > maxLineWidth) maxLineWidth = width;
    });

    const textW = maxLineWidth;
    const textH = lines.length * conf.lineHeight;
    const buttonAreaH = conf.buttonMarginTop + conf.buttonHeight;

    let boxW = textW + (conf.padding.x * 2);
    let boxH = textH + (conf.padding.y * 2) + buttonAreaH;

    boxW = Math.max(boxW, conf.minWidth);
    boxH = Math.max(boxH, conf.minHeight);

    const boxX = (640 - boxW) / 2;
    const boxY = (240 - boxH / 2); // Center Y

    const buttonY = boxY + boxH - conf.padding.y - conf.buttonHeight;
    const totalBtnW = (conf.buttonWidth * 2) + conf.buttonGap;
    const startBtnX = 320 - (totalBtnW / 2);

    // Reverse button order? Battle uses YES (Left), NO (Right)
    const yesBtn = { x: startBtnX, y: buttonY, w: conf.buttonWidth, h: conf.buttonHeight };
    const noBtn = { x: startBtnX + conf.buttonWidth + conf.buttonGap, y: buttonY, w: conf.buttonWidth, h: conf.buttonHeight };

    return {
        msg: msg,
        box: { x: boxX, y: boxY, w: boxW, h: boxH },
        text: { startY: boxY + conf.padding.y + conf.lineHeight, lines: lines, lineHeight: conf.lineHeight },
        yesBtn: yesBtn,
        noBtn: noBtn
    };
}

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

            if (checkHover(t1, TitleConfig.MENU.ITEM1.y, 0)) {
                if (Input.hasMouseMoved()) this.menuIndex = 0;
            } else if (checkHover(t2, TitleConfig.MENU.ITEM2.y, 1)) {
                if (Input.hasMouseMoved()) this.menuIndex = 1;
            } else if (checkHover(t3, TitleConfig.MENU.ITEM3.y, 2)) {
                if (Input.hasMouseMoved()) this.menuIndex = 2;
            }

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

        const message = '클리어 기록을 리셋할까요?\\n해금된 캐릭터가 사라집니다.';
        const layout = getConfirmLayout(message);

        // --- Mouse Interaction ---
        const mx = Input.mouseX;
        const my = Input.mouseY;

        const yes = layout.yesBtn;
        const no = layout.noBtn;

        const isOverYes = (mx >= yes.x && mx <= yes.x + yes.w && my >= yes.y && my <= yes.y + yes.h);
        const isOverNo = (mx >= no.x && mx <= no.x + no.w && my >= no.y && my <= no.y + no.h);

        if (isOverYes) {
            if (Input.hasMouseMoved()) this.confirmSelected = 0;
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
            if (Input.hasMouseMoved()) this.confirmSelected = 1;
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
        const message = '클리어 기록을 리셋할까요?\\n해금된 캐릭터가 사라집니다.';
        const layout = getConfirmLayout(message);

        // 1. Dimmer (Full Screen)
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 640, 480);

        // 2. Dialog Box
        Assets.drawWindow(ctx, layout.box.x, layout.box.y, layout.box.w, layout.box.h);

        // 3. Message Text
        ctx.fillStyle = 'white';
        const fontName = (typeof FONTS !== 'undefined') ? FONTS.regular : 'sans-serif';
        const conf = BattleConfig.CONFIRM || {};
        ctx.font = conf.font || `20px ${fontName}`;
        ctx.textAlign = 'center';

        layout.text.lines.forEach((line, i) => {
            ctx.fillText(line, 320, layout.text.startY + (i * layout.text.lineHeight));
        });

        // 4. Buttons
        const yes = layout.yesBtn;
        const no = layout.noBtn;

        // Use BattleConfig Labels: '그래', '아니' based on user request (which matched Config default)
        const yesLabel = (conf.labels && conf.labels.yes) ? conf.labels.yes : 'YES';
        const noLabel = (conf.labels && conf.labels.no) ? conf.labels.no : 'NO';

        // Draw YES Button
        Assets.drawButton(ctx, yes.x, yes.y, yes.w, yes.h, yesLabel, this.confirmSelected === 0, { noBorder: true });

        // Draw NO Button
        Assets.drawButton(ctx, no.x, no.y, no.w, no.h, noLabel, this.confirmSelected === 1, { noBorder: true });

        ctx.restore();
    }
};
