const TitleConfig = {
    LOGO: {
        x: 4, y: 80,
        back: { x: 30, y: 130 },
        lineTop: { x: 12, y: 100 },
        lineBottom: { x: 12, y: 224 },
        paiY: 114,
        slots: [48, 136, 408, 496]    // 환·세·유·기 PAI 타일 x (center 패 제외)
    },
    LINE_START: 6, LINE_FLY: 18,
    TILE_START: 26, TILE_STAGGER: 7, TILE_FALL: 40,
    TILE_ORIGIN_X: 280, TILE_ORIGIN_Y: -60,
    REST_START: 90, REST_DUR: 90,
    REST_FILL_H: 136,                            // fill-up가 올라오는 높이(px)
    PAI_STRETCH: 22,
    PAI_SILVER: 10,
    PAI_CONVERGE: 40,   // 은색 모자이크 수렴 기간
    PAI_CELL: 12,       // 모자이크 셀 크기(px) — 작을수록 섬세하나 무거움
    PAI_SCATTER: 20,    // 중심 대비 수평 방사 배율
    PAI_JITTER_X: 220,
    PAI_JITTER_Y: 140,
    PAI_TOP_Y: 0,       // 은색 셀이 수렴 전 집결하는 캔버스 상단 Y
    WAVE_AMP: 10,       // 수평 흔들림(px)
    WAVE_FREQ: 0.15,
    WAVE_SPEED: 0.12,
    WAVE_STEP: 2,       // 스트립 높이(px) — 작을수록 부드러움
    WAVE_SETTLE: 70,    // 리플이 멈추기까지 걸리는 프레임
    PUSH_KEY: { path: 'ui/pushok.png', y: 360 },
    COPYRIGHT: { path: 'ui/logo_compile_1998.png', y: 432 },
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
    introTimer: 0,

    menuIndex: 0,
    pointerTimer: 0,

    init: function () {
        this.currentState = this.STATE_PRESS_KEY;
        this.blinkTimer = 0;
        this.showPushKey = true;
        this.introTimer = 0;
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

        this.introTimer += dt;
        this.blinkTimer += dt;
        this.pointerTimer += dt;
        if (this.blinkTimer > 40) {
            this.showPushKey = !this.showPushKey;
            this.blinkTimer = 0;
        }

        if (this.currentState === this.STATE_PRESS_KEY) {
            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed() || Game.isAutoTest) {
                this.currentState = this.STATE_MODE_SELECT;
                this.introTimer = 99999; // 오프닝 스킵 — 로고를 최종 상태로 즉시 고정
            }
        } else if (this.currentState === this.STATE_MODE_SELECT) {
            const mx = Input.mouseX;
            const my = Input.mouseY;
            const prevIndex = this.menuIndex;

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

            if (this.menuIndex !== prevIndex) Assets.playSound('audio/tick');

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
        // ESC 없음 — 방향키로 NO 선택 후 Z(Space)로 닫는다(키맵 일치).
    },

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

        this.drawLogo(ctx);

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

    drawLogo: function (ctx) {
        const L = TitleConfig.LOGO;
        const back = Assets.get('title/BACK.png');
        const line = Assets.get('title/LINE_NARUTO.png');
        const rest = Assets.get('title/LOGO_REST.png');
        const paiTop = Assets.get('title/LOGO_PAI_TOP.png');
        const paiBot = Assets.get('title/LOGO_PAI_BOTTOM.png');
        const pai = Assets.get('title/PAI.png');

        const C = TitleConfig;

        if (back) this._drawWavy(ctx, back, L.back.x, L.back.y);

        if (line) {
            const e = this._ease(this._lineFly());
            if (e > 0) {
                const topX = -line.width + (L.lineTop.x + line.width) * e;
                const botX = 640 - (640 - L.lineBottom.x) * e;
                ctx.drawImage(line, topX, L.lineTop.y);
                ctx.drawImage(line, botX, L.lineBottom.y);
            }
        }

        if (pai) {
            for (let i = 0; i < L.slots.length; i++) {
                const pos = this._tilePos(i);
                if (pos) ctx.drawImage(pai, pos.x, pos.y);
            }
        }

        if (rest && this.introTimer >= C.REST_START) {
            this._drawFillUp(ctx, rest, L.x, L.y, (this.introTimer - C.REST_START) / C.REST_DUR, C.REST_FILL_H);
        }

        const ct = this.introTimer - (C.REST_START + C.REST_DUR);
        if (ct >= 0) {
            if (ct < C.PAI_STRETCH) {
                if (paiBot) {
                    const p = Math.max(0.04, ct / C.PAI_STRETCH);
                    const cyc = L.y + paiBot.height / 2;
                    ctx.save();
                    ctx.translate(0, cyc);
                    ctx.scale(1, p);
                    ctx.translate(0, -cyc);
                    this._drawFillUp(ctx, paiBot, L.x, L.y, p); // fill-up
                    ctx.restore();
                }
            } else {
                if (paiBot) ctx.drawImage(paiBot, L.x, L.y);
                const sct = ct - (C.PAI_STRETCH + C.PAI_SILVER);
                if (sct >= 0 && paiTop) {
                    if (sct < C.PAI_CONVERGE) {
                        this._drawConverge(ctx, paiTop, L.x, L.y, sct / C.PAI_CONVERGE);
                    } else {
                        ctx.drawImage(paiTop, L.x, L.y);
                    }
                }
            }
        }
    },

    _ease: function (p) { return p * (2 - p); }, // ease-out(감속)

    _lineFly: function () {
        const C = TitleConfig;
        const t = this.introTimer - C.LINE_START;
        if (t <= 0) return 0;
        if (t >= C.LINE_FLY) return 1;
        return t / C.LINE_FLY;
    },

    // fillH 높이 밴드 안에서 아래→위로 채워지는 reveal. 밴드 위쪽은 그대로 표시.
    _drawFillUp: function (ctx, img, dx, dy, p, fillH) {
        if (p >= 1) { ctx.drawImage(img, dx, dy); return; }
        const bandH = Math.min(fillH || img.height, img.height);
        const bandTop = img.height - bandH;
        if (bandTop > 0) {
            ctx.drawImage(img, 0, 0, img.width, bandTop, dx, dy, img.width, bandTop);
        }
        const line = bandTop + bandH * (1 - Math.max(0, p));
        const revealH = img.height - line;
        if (revealH > 0) {
            ctx.drawImage(img, 0, line, img.width, revealH, dx, dy + line, img.width, revealH);
        }
        if (line > bandTop) {
            const srcY = Math.min(Math.floor(line), img.height - 1);
            ctx.drawImage(img, 0, srcY, img.width, 1, dx, dy + bandTop, img.width, line - bandTop);
        }
    },

    _drawConverge: function (ctx, img, dx, dy, p) {
        const C = TitleConfig;
        const e = p * (2 - p); // ease-out
        const cx = img.width / 2;
        const cell = C.PAI_CELL;
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.65 * e;
        for (let sy = 0; sy < img.height; sy += cell) {
            for (let sx = 0; sx < img.width; sx += cell) {
                const sw = Math.min(cell, img.width - sx);
                const sh = Math.min(cell, img.height - sy);
                // 셀별 재현 가능한 pseudo-random 지터 (시드 상수 변경 시 산포 패턴 달라짐)
                const h1 = Math.sin(sx * 12.9898 + sy * 78.233) * 43758.5453;
                const h2 = Math.sin(sx * 39.346 + sy * 11.135) * 24634.633;
                const jx = ((h1 - Math.floor(h1)) - 0.5) * C.PAI_JITTER_X;
                const jy = ((h2 - Math.floor(h2)) - 0.5) * C.PAI_JITTER_Y;
                const offX = ((sx + sw / 2 - cx) * C.PAI_SCATTER + jx) * (1 - e);
                const targetY = dy + sy;
                const px = dx + sx + offX;
                const py = targetY + (C.PAI_TOP_Y + jy - targetY) * (1 - e);
                ctx.drawImage(img, sx, sy, sw, sh, px, py, sw, sh);
            }
        }
        ctx.restore();
    },

    // 가장자리 들쭉날쭉함은 PAI 타일 뒤에 숨어 보이지 않음
    _drawWavy: function (ctx, img, dx, dy) {
        const C = TitleConfig;
        const amp = C.WAVE_AMP * Math.max(0, 1 - this.introTimer / C.WAVE_SETTLE);
        if (amp < 0.1) { ctx.drawImage(img, dx, dy); return; }
        const phase = this.introTimer * C.WAVE_SPEED;
        const step = C.WAVE_STEP;
        for (let y = 0; y < img.height; y += step) {
            const sh = Math.min(step, img.height - y);
            const off = amp * Math.sin(y * C.WAVE_FREQ + phase);
            ctx.drawImage(img, 0, y, img.width, sh, dx + off, dy + y, img.width, sh);
        }
    },

    _tilePos: function (i) {
        const C = TitleConfig, L = C.LOGO;
        const t = this.introTimer - (C.TILE_START + i * C.TILE_STAGGER);
        if (t <= 0) return null;
        const tx = L.slots[i], ty = L.paiY;
        if (t >= C.TILE_FALL) return { x: tx, y: ty };
        const p = t / C.TILE_FALL;
        const e = p * (2 - p);
        return { x: C.TILE_ORIGIN_X + (tx - C.TILE_ORIGIN_X) * e, y: C.TILE_ORIGIN_Y + (ty - C.TILE_ORIGIN_Y) * e };
    },

    drawConfirm: function (ctx) {
        const layout = UIHelpers.getConfirmLayout(TitleConfig.RESET_CONFIRM_MSG, { centerY: true });
        UIHelpers.drawConfirmDialog(ctx, layout, this.confirmSelected);
    }
};
