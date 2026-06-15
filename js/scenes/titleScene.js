const TitleConfig = {
    // Layered 환세패유기 logo (assets in assets/title/). LOGO_REST / LOGO_PAI_* are
    // full 632×184 canvases, drawn at the same (x, y); BACK + 回 bands sit behind,
    // cream PAI tiles sit behind the gold characters.
    LOGO: {
        x: 4, y: 80,                 // LOGO_REST / LOGO_PAI_* top-left
        back: { x: 30, y: 130 },      // BACK green tray (580×86)
        lineTop: { x: 12, y: 100 },   // LINE_NARUTO 回 band (616×22)
        lineBottom: { x: 12, y: 224 },
        paiY: 114,                    // cream PAI tiles top-left y
        slots: [48, 136, 408, 496]    // PAI tile x for 환 · 세 · 유 · 기 (center 패 excluded)
    },
    // Intro sequence (frames): ① BACK ripples & settles ② 回 bands fly in from the
    // sides ③ PAI tiles scatter in ④ LOGO_REST expands ⑤ center 패 red → silver.
    LINE_START: 6, LINE_FLY: 18,                 // 回 bands fly in
    TILE_START: 26, TILE_STAGGER: 7, TILE_FALL: 40,
    TILE_ORIGIN_X: 280, TILE_ORIGIN_Y: -60,      // top-center point the tiles fly out from
    REST_START: 90, REST_DUR: 90,                // LOGO_REST fill-up start / duration
    REST_FILL_H: 136,                            // height (px) the fill rises through
    // Center 패 reveal: red stretches from a line to full, then the silver glyph
    // gathers in from scattered mosaic cells onto the red shadow.
    PAI_STRETCH: 22,
    PAI_SILVER: 10,
    PAI_CONVERGE: 40,   // silver mosaic-gather duration
    PAI_CELL: 12,       // mosaic cell size (px) — smaller = finer, but heavier
    PAI_SCATTER: 20,    // horizontal radial spread from centre (× distance)
    PAI_JITTER_X: 220,  // random horizontal scatter spread (px)
    PAI_JITTER_Y: 140,  // random vertical scatter spread (px) around PAI_TOP_Y
    PAI_TOP_Y: 0,       // canvas-top Y the silver cells scatter to before settling
    // Green tray water ripple — wobbles, then settles still over WAVE_SETTLE.
    WAVE_AMP: 10,       // sideways shift (px)
    WAVE_FREQ: 0.15,    // vertical wavelength
    WAVE_SPEED: 0.12,   // travel speed
    WAVE_STEP: 2,       // strip height (px) — smaller = smoother
    WAVE_SETTLE: 70,    // frames until the ripple stops
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
                this.introTimer = 99999; // skip the opening — snap the logo to its final state
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

            // Cursor-move blip (keyboard or mouse), same as the character-select scene.
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

    // Layered 환세패유기 logo. Cream PAI tiles drop in behind the gold characters,
    // then the center 패 reveals: red (LOGO_PAI_BOTTOM) stretches vertically from a
    // line to full size, then silver (LOGO_PAI_TOP) completes it.
    drawLogo: function (ctx) {
        const L = TitleConfig.LOGO;
        const back = Assets.get('title/BACK.png');
        const line = Assets.get('title/LINE_NARUTO.png');
        const rest = Assets.get('title/LOGO_REST.png');
        const paiTop = Assets.get('title/LOGO_PAI_TOP.png');
        const paiBot = Assets.get('title/LOGO_PAI_BOTTOM.png');
        const pai = Assets.get('title/PAI.png');

        const C = TitleConfig;

        // 2. BACK — ripples like water, then settles (position stays fixed).
        if (back) this._drawWavy(ctx, back, L.back.x, L.back.y);

        // 3. 回 bands fly in from the sides (top from left, bottom from right).
        if (line) {
            const e = this._ease(this._lineFly());
            if (e > 0) {
                const topX = -line.width + (L.lineTop.x + line.width) * e;
                const botX = 640 - (640 - L.lineBottom.x) * e;
                ctx.drawImage(line, topX, L.lineTop.y);
                ctx.drawImage(line, botX, L.lineBottom.y);
            }
        }

        // 4. Cream PAI tiles scatter in from the top-centre to each slot.
        if (pai) {
            for (let i = 0; i < L.slots.length; i++) {
                const pos = this._tilePos(i);
                if (pos) ctx.drawImage(pai, pos.x, pos.y);
            }
        }

        // 5. LOGO_REST — gold characters expand from the centre line outward.
        if (rest && this.introTimer >= C.REST_START) {
            this._drawFillUp(ctx, rest, L.x, L.y, (this.introTimer - C.REST_START) / C.REST_DUR, C.REST_FILL_H);
        }

        // 6/7. Center 패 — red stretches in (shadow), then silver gathers on top.
        const ct = this.introTimer - (C.REST_START + C.REST_DUR);
        if (ct >= 0) {
            if (ct < C.PAI_STRETCH) {
                // Red appears with BOTH effects: vertical stretch (scale from the
                // centre line) AND the #5 fill-up (rises from the bottom).
                if (paiBot) {
                    const p = Math.max(0.04, ct / C.PAI_STRETCH);
                    const cyc = L.y + paiBot.height / 2;
                    ctx.save();
                    ctx.translate(0, cyc);
                    ctx.scale(1, p);          // stretch
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
                        ctx.drawImage(paiTop, L.x, L.y); // sharp, final
                    }
                }
            }
        }
    },

    _ease: function (p) { return p * (2 - p); }, // ease-out

    // 回 band fly-in progress 0→1.
    _lineFly: function () {
        const C = TitleConfig;
        const t = this.introTimer - C.LINE_START;
        if (t <= 0) return 0;
        if (t >= C.LINE_FLY) return 1;
        return t / C.LINE_FLY;
    },

    // Bottom-up fill reveal within a band of height `fillH` (default = full image)
    // anchored at the image bottom: the real image fills in from the BOTTOM up, the
    // area above the rising line (inside the band) shows that leading edge row, and
    // anything above the band is shown as-is.
    _drawFillUp: function (ctx, img, dx, dy, p, fillH) {
        if (p >= 1) { ctx.drawImage(img, dx, dy); return; }
        const bandH = Math.min(fillH || img.height, img.height);
        const bandTop = img.height - bandH;
        // Region above the band: shown as-is.
        if (bandTop > 0) {
            ctx.drawImage(img, 0, 0, img.width, bandTop, dx, dy, img.width, bandTop);
        }
        const line = bandTop + bandH * (1 - Math.max(0, p)); // rises img.height → bandTop
        const revealH = img.height - line;
        if (revealH > 0) {
            ctx.drawImage(img, 0, line, img.width, revealH, dx, dy + line, img.width, revealH);
        }
        if (line > bandTop) {
            const srcY = Math.min(Math.floor(line), img.height - 1);
            ctx.drawImage(img, 0, srcY, img.width, 1, dx, dy + bandTop, img.width, line - bandTop);
        }
    },

    // Silver 패 gather-in: draw the glyph as mosaic cells that start scattered
    // (pushed radially outward + jitter) and converge to their real positions.
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
                // stable per-cell pseudo-random jitter (scatter spread is tunable)
                const h1 = Math.sin(sx * 12.9898 + sy * 78.233) * 43758.5453;
                const h2 = Math.sin(sx * 39.346 + sy * 11.135) * 24634.633;
                const jx = ((h1 - Math.floor(h1)) - 0.5) * C.PAI_JITTER_X;
                const jy = ((h2 - Math.floor(h2)) - 0.5) * C.PAI_JITTER_Y;
                // X: spread radially from the centre. Y: cells start scattered near
                // the canvas top (PAI_TOP_Y) and settle down into place.
                const offX = ((sx + sw / 2 - cx) * C.PAI_SCATTER + jx) * (1 - e);
                const targetY = dy + sy;
                const px = dx + sx + offX;
                const py = targetY + (C.PAI_TOP_Y + jy - targetY) * (1 - e);
                ctx.drawImage(img, sx, sy, sw, sh, px, py, sw, sh);
            }
        }
        ctx.restore();
    },

    // Green tray ripple — shift each horizontal strip sideways by a travelling sine
    // so the texture wobbles like water. (Ragged side edges hide behind the tiles.)
    _drawWavy: function (ctx, img, dx, dy) {
        const C = TitleConfig;
        // Amplitude ramps to 0 over WAVE_SETTLE — ripples, then holds still.
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

    // PAI tile i position: flies from the top-center origin out to its slot.
    // Returns null until the tile is emitted (staggered).
    _tilePos: function (i) {
        const C = TitleConfig, L = C.LOGO;
        const t = this.introTimer - (C.TILE_START + i * C.TILE_STAGGER);
        if (t <= 0) return null;
        const tx = L.slots[i], ty = L.paiY;
        if (t >= C.TILE_FALL) return { x: tx, y: ty };
        const p = t / C.TILE_FALL;
        const e = p * (2 - p); // ease-out (thrown from center, settles)
        return { x: C.TILE_ORIGIN_X + (tx - C.TILE_ORIGIN_X) * e, y: C.TILE_ORIGIN_Y + (ty - C.TILE_ORIGIN_Y) * e };
    },

    drawConfirm: function (ctx) {
        const layout = UIHelpers.getConfirmLayout(TitleConfig.RESET_CONFIRM_MSG, { centerY: true });
        UIHelpers.drawConfirmDialog(ctx, layout, this.confirmSelected);
    }
};
