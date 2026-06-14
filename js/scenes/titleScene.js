const TitleConfig = {
    TITLE: { path: 'ui/title.png', y: 80 },
    PUSH_KEY: { path: 'ui/pushok.png', y: 360 },
    COPYRIGHT: { path: 'ui/logo_compile_1998.png', y: 430 },
    MENU: {
        ITEM1: { text: "BATTLE", y: 300 },
        ITEM2: { text: "STORY ONLY", y: 340 },
        ITEM3: { text: "RESET", y: 380 }
    },
    RESET_CONFIRM_MSG: '클리어 기록을 리셋할까요?\\n해금된 캐릭터가 사라집니다.'
};

const TitleScene = {
    STATE_PRESS_KEY: 0,
    STATE_MODE_SELECT: 1,

    currentState: 0,
    blinkTimer: 0,
    showPushKey: true,

    menuIndex: 0,
    pointerTimer: 0,

    init: function () {
        this.currentState = this.STATE_PRESS_KEY;
        this.blinkTimer = 0;
        this.showPushKey = true;
        this.menuIndex = 0;
        this.pointerTimer = 0;

        this.confirmActive = false;
        this.confirmSelected = 0;
        this.confirmTimer = 0;

        Assets.playMusic('audio/bgm_title');
    },

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        if (this.confirmActive) {
            this.updateConfirm(dt);
            return;
        }

        this.blinkTimer += dt;
        this.pointerTimer += dt;
        if (this.blinkTimer > 40) {
            this.showPushKey = !this.showPushKey;
            this.blinkTimer = 0;
        }

        if (this.currentState === this.STATE_PRESS_KEY) {
            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed() || Game.isAutoTest) {
                this.currentState = this.STATE_MODE_SELECT;
            }
        } else if (this.currentState === this.STATE_MODE_SELECT) {
            const mx = Input.mouseX;
            const my = Input.mouseY;

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

            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed() || Game.isAutoTest) {
                if (this.menuIndex === 0) {
                    Assets.stopMusic();
                    Game.changeScene(CharacterSelectScene, { mode: 'STORY' });
                } else if (this.menuIndex === 1) {
                    Assets.stopMusic();
                    Game.changeScene(CharacterSelectScene, { mode: 'WATCH' });
                } else if (this.menuIndex === 2) {
                    this.confirmActive = true;
                    this.confirmSelected = 1;
                    this.confirmTimer = 10;
                }
            }
        }
    },

    updateConfirm: function (dt = 1.0) {
        if (this.confirmTimer > 0) {
            this.confirmTimer -= dt;
            return;
        }

        const layout = UIHelpers.getConfirmLayout(TitleConfig.RESET_CONFIRM_MSG, { centerY: true });

        const mx = Input.mouseX;
        const my = Input.mouseY;

        const yes = layout.yesBtn;
        const no = layout.noBtn;

        const isOverYes = (mx >= yes.x && mx <= yes.x + yes.w && my >= yes.y && my <= yes.y + yes.h);
        const isOverNo = (mx >= no.x && mx <= no.x + no.w && my >= no.y && my <= no.y + no.h);

        if (isOverYes) {
            if (Input.hasMouseMoved()) this.confirmSelected = 0;
            if (Input.isMouseJustPressed()) {
                this.resetSaveData();
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

        if (Input.isJustPressed(Input.LEFT) || Input.isJustPressed(Input.RIGHT) ||
            Input.isJustPressed(Input.UP) || Input.isJustPressed(Input.DOWN)) {
            this.confirmSelected = (this.confirmSelected === 0) ? 1 : 0;
        }

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE)) {
            if (this.confirmSelected === 0) {
                this.resetSaveData();
            }
            this.confirmActive = false;
        }
        // No separate cancel key — 방향키로 NO 선택 + Z(Space)로 닫는다(키맵 일치).
    },

    // Wipe progress — mouse-YES and keyboard-YES both route here (single source).
    resetSaveData: function () {
        Game.saveData = { unlocked: [], clearedOpponents: [], difficulty: Game.saveData.difficulty || 'normal' };
        Game.continueCount = 0;
        Game.save();
        Assets.playSound('audio/riichi');
        console.log("Save data reset");
    },

    draw: function (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, 640, 480);

        const title = Assets.get(TitleConfig.TITLE.path);
        if (title) {
            ctx.drawImage(title, (640 - title.width) / 2, TitleConfig.TITLE.y);
        }

        if (this.currentState === this.STATE_PRESS_KEY) {
            if (this.showPushKey) {
                const push = Assets.get(TitleConfig.PUSH_KEY.path);
                if (push) {
                    ctx.drawImage(push, (640 - push.width) / 2, TitleConfig.PUSH_KEY.y);
                }
            }
        } else if (this.currentState === this.STATE_MODE_SELECT) {
            const text1 = TitleConfig.MENU.ITEM1.text;
            const color1 = (this.menuIndex === 0) ? 'yellow' : 'orange';
            const x1 = (640 - (text1.length * 32)) / 2;
            Assets.drawAlphabet(ctx, text1, x1, TitleConfig.MENU.ITEM1.y, color1);

            const text2 = TitleConfig.MENU.ITEM2.text;
            const color2 = (this.menuIndex === 1) ? 'yellow' : 'orange';
            const x2 = (640 - (text2.length * 32)) / 2;
            Assets.drawAlphabet(ctx, text2, x2, TitleConfig.MENU.ITEM2.y, color2);

            const text3 = TitleConfig.MENU.ITEM3.text;
            const color3 = (this.menuIndex === 2) ? 'yellow' : 'orange';
            const x3 = (640 - (text3.length * 32)) / 2;
            Assets.drawAlphabet(ctx, text3, x3, TitleConfig.MENU.ITEM3.y, color3);

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

            const frameIndex = Math.floor(this.pointerTimer / 10) % 2;
            Assets.drawFrame(ctx, 'ui/pointer.png', targetX - 48, targetY, frameIndex, 32, 32);
        }

        const copy = Assets.get(TitleConfig.COPYRIGHT.path);
        if (copy) {
            ctx.drawImage(copy, (640 - copy.width) / 2, TitleConfig.COPYRIGHT.y);
        }

        if (this.confirmActive) {
            this.drawConfirm(ctx);
        }
    },

    drawConfirm: function (ctx) {
        const layout = UIHelpers.getConfirmLayout(TitleConfig.RESET_CONFIRM_MSG, { centerY: true });
        UIHelpers.drawConfirmDialog(ctx, layout, this.confirmSelected);
    }
};
