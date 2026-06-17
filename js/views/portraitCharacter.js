const BLINK_BASE_SEQ = [1, 0, 1];

class PortraitCharacter {
    constructor(characterData, config, isCpu = false) {
        this.data = characterData;
        this.config = config; // { x, y, w, h, baseW, baseH }
        this.isCpu = isCpu;

        this.animConfig = null;

        this.state = 'idle';
        this.blinkTimer = 0;
        this.blinkSequence = [];
        this.blinkFrameIndex = -1; // -1 = 깜빡이지 않는 상태
        this.currentBlinkFrame = null;

        this.isTalking = false;
        this.talkTimer = 0;
        this.talkSequence = [];
        this.talkFrameIndex = 0;
        this.currentTalkFrame = null;

        this.renderRect = { x: 0, y: 0, w: 0, h: 0 };
        this._sheetCache = new Map();
        this._dirty = true;
    }

    get id() {
        return this.data ? this.data.id : null;
    }

    // GC 줄이기 위해 인스턴스 재사용
    updateCharacter(characterData) {
        if (this.data === characterData) return;
        this.data = characterData;

        this.state = 'idle';
        this.blinkTimer = 0;
        this.blinkFrameIndex = -1;
        this.currentBlinkFrame = null;
        this.isTalking = false;
        this.currentTalkFrame = null;
        this.talkSequence = [];

        this.animConfig = null;
        this._dirty = true;
    }

    setAnimationConfig(config) {
        this.animConfig = config;
        if (!this.animConfig) return;

        if (!this.animConfig.interval) this.animConfig.interval = BattleConfig.ANIMATION.BLINK_INTERVAL;
        if (!this.animConfig.speed) this.animConfig.speed = BattleConfig.ANIMATION.BLINK_SPEED;
        if (!this.animConfig.talkSpeed) this.animConfig.talkSpeed = BattleConfig.ANIMATION.TALK_SPEED;

        if (this.animConfig.base) {
            const base = this.animConfig.base;
            const prefix = base.replace('_base.png', '');

            if (!this.animConfig.blink) {
                const detectedBlinks = [];
                for (let i = 1; i <= 5; i++) {
                    const key = `${prefix}_blink-${i}.png`;
                    if (Assets.get(key)) detectedBlinks.push(key);
                    else break;
                }
                if (detectedBlinks.length > 0) this.animConfig.blink = detectedBlinks;
            }

            if (!this.animConfig.talk) {
                const detectedTalks = [this.animConfig.base];
                for (let i = 1; i <= 5; i++) {
                    const key = `${prefix}_talk-${i}.png`;
                    if (Assets.get(key)) detectedTalks.push(key);
                    else break;
                }

                if (detectedTalks.length > 1) {
                    this.animConfig.talk = detectedTalks;
                    if (detectedTalks.length === 3 && !this.animConfig.talkSequence) {
                        this.animConfig.talkSequence = [0, 2, 1, 2];
                    }
                }
            }

            if (!this.animConfig.smile && Assets.get(`${prefix}_smile.png`)) {
                this.animConfig.smile = `${prefix}_smile.png`;
            }
            if (!this.animConfig.shocked && Assets.get(`${prefix}_shocked.png`)) {
                this.animConfig.shocked = `${prefix}_shocked.png`;
            }
            if (!this.animConfig.idle && Assets.get(`${prefix}_idle.png`)) {
                this.animConfig.idle = `${prefix}_idle.png`;
            }
        }

        this.blinkTimer = Math.floor(Math.random() * this.animConfig.interval);
        this._dirty = true;
    }

    setState(newState) {
        this.state = newState;
    }

    setTalking(talking) {
        // silence 상태에서는 입 모션 억제
        if (this.state === 'silence') {
            talking = false;
        }

        if (this.isTalking === talking) return;
        this.isTalking = talking;

        if (talking) {
            if (!this.startTalk()) this.isTalking = false;
        } else {
            this.currentTalkFrame = null;
        }
    }

    startTalk() {
        if (!this.animConfig?.talk?.length) return false;

        if (!this.talkSequence || this.talkSequence.length === 0) {
            if (this.animConfig.talkSequence) {
                this.talkSequence = this.animConfig.talkSequence;
            } else if (this.animConfig.talk.length === 3) {
                this.talkSequence = [0, 2, 1, 2];
            } else if (this.animConfig.talk.length === 2) {
                this.talkSequence = [0, 1, 0, 1];
            } else {
                this.talkSequence = [0, 1];
            }
        }

        this.talkFrameIndex = 0;
        this.updateTalkFrame();
        this.talkTimer = (this.animConfig.talkSpeed || BattleConfig.ANIMATION.TALK_SPEED);
        return true;
    }

    update(dt = 1.0) {
        if (!this.animConfig) return;
        if (dt <= 0) return;

        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
            if (this.blinkFrameIndex === -1) {
                this.startBlink();
            } else {
                this.advanceBlink(dt);
            }
        }

        if (this.isTalking) {
            if (this.animConfig.talk?.length > 0) {
                this.talkTimer -= dt;
                if (this.talkTimer <= 0) this.advanceTalk(dt);
            } else {
                this.isTalking = false;
            }
        }
    }

    advanceTalk(dt = 1.0) {
        if (!this.talkSequence?.length) return;
        this.talkFrameIndex = (this.talkFrameIndex + 1) % this.talkSequence.length;
        this.updateTalkFrame();
        this.talkTimer = (this.animConfig.talkSpeed || BattleConfig.ANIMATION.TALK_SPEED);
    }

    updateTalkFrame() {
        const frameIdx = this.talkSequence[this.talkFrameIndex];
        this.currentTalkFrame = (frameIdx < this.animConfig.talk.length) ? this.animConfig.talk[frameIdx] : null;
    }

    startBlink() {
        if (!this.animConfig?.blink?.length) return;

        const isDouble = Math.random() < 0.35; // 35% 확률로 연속 깜빡임

        if (isDouble) {
            this.blinkSequence = [...BLINK_BASE_SEQ, -1, -1, ...BLINK_BASE_SEQ];
        } else {
            this.blinkSequence = BLINK_BASE_SEQ;
        }

        this.blinkFrameIndex = 0;
        this.updateBlinkFrame();
        this.blinkTimer = (this.animConfig.speed || BattleConfig.ANIMATION.BLINK_SPEED);
    }

    advanceBlink(dt = 1.0) {
        this.blinkFrameIndex++;
        if (this.blinkFrameIndex >= this.blinkSequence.length) {
            this.blinkFrameIndex = -1;
            this.currentBlinkFrame = null;
            this.blinkTimer = (this.animConfig.interval || BattleConfig.ANIMATION.BLINK_INTERVAL);
        } else {
            this.updateBlinkFrame();
            this.blinkTimer = (this.animConfig.speed || BattleConfig.ANIMATION.BLINK_SPEED);
        }
    }

    updateBlinkFrame() {
        const frameIdx = this.blinkSequence[this.blinkFrameIndex];
        this.currentBlinkFrame = (frameIdx >= 0 && frameIdx < this.animConfig.blink.length)
            ? this.animConfig.blink[frameIdx]
            : null;
    }

    _updateRenderRect(baseImg) {
        const scale = this.config.scale || 1.0;
        const globalBaseW = BattleConfig.PORTRAIT.baseW || 264;

        // 시트 여부를 캐시로 판단 (가로 1.5배 이상이면 좌우 2프레임 시트)
        if (!this._sheetCache.has(baseImg)) {
            if (baseImg.width > 0) {
                this._sheetCache.set(baseImg, (baseImg.width >= globalBaseW * 1.5));
            }
        }
        const isSheet = !!this._sheetCache.get(baseImg);

        const frameW = isSheet ? (baseImg.width / 2) : baseImg.width;
        const frameH = baseImg.height;

        const destW = frameW * scale;
        const destH = frameH * scale;

        let dx = Math.floor(this.config.x);
        let dy = Math.floor(this.config.y);

        if (this.config.align === 'right') {
            dx -= destW;
        }

        if (this.animConfig) {
            dx += (this.animConfig.xOffset || 0);
            dy += (this.animConfig.yOffset || 0);
        }

        if (this.config.isBattle) {
            dx += (this.data.battleOffsetX || 0);
            dy += (this.data.battleOffsetY || 0);
        }
        if (this.isCpu) {
            dx += (this.data.cpuOffsetX || 0);
        }

        this.renderRect.x = dx;
        this.renderRect.y = dy;
        this.renderRect.w = destW;
        this.renderRect.h = destH;
        this.renderRect.isSheet = isSheet;

        this._dirty = false;
    }

    draw(ctx) {
        if (!this.data) return;

        if (this.animConfig) {
            const baseKey = this.animConfig.base;
            if (baseKey) {
                const baseImg = Assets.get(baseKey);

                if (baseImg) {
                    if (this._dirty || !this.renderRect.w) {
                        this._updateRenderRect(baseImg);
                    }
                    this._drawImageAutoSlice(ctx, baseImg, this.renderRect);
                }
            }

            // smile/shocked가 talk/idle보다 우선
            if (this.state === 'smile' && this.animConfig.smile) {
                this._drawOverlay(ctx, this.animConfig.smile);
                return;
            }
            if (this.state === 'shocked' && this.animConfig.shocked) {
                this._drawOverlay(ctx, this.animConfig.shocked);
                return;
            }

            if (this.animConfig.idle) {
                this._drawOverlay(ctx, this.animConfig.idle);
            }

            if (this.isTalking && this.currentTalkFrame) {
                this._drawOverlay(ctx, this.currentTalkFrame, this.animConfig.talkOffset);
            }

            if (this.currentBlinkFrame) {
                this._drawOverlay(ctx, this.currentBlinkFrame, this.animConfig.blinkOffset);
            }

            return;
        }

        this._drawLegacy(ctx);
    }

    _drawLegacy(ctx) {
        let imgKey = null;
        if (this.isCpu) {
            imgKey = this.data.battleFaceR || ((this.data.face) ? null : null); // Fallback complex
        } else {
            imgKey = this.data.battleFaceL || ((this.data.face) ? null : null);
        }

        const img = imgKey ? Assets.get(imgKey) : null;

        if (!img) {
            if (this.data.face) {
                const globalBaseW = BattleConfig.PORTRAIT.baseW || 264;
                const scale = this.config.scale || 1.0;
                let dx = this.config.x;
                let dy = this.config.y;
                const destW = globalBaseW * scale;
                const destH = 280 * scale;
                if (this.config.align === 'right') dx -= destW;
                Assets.drawFrame(ctx, this.data.face, dx, dy, this.isCpu ? 1 : 0, destW, destH);
            }
            return;
        }

        if (this._dirty || !this.renderRect.w) {
            this._updateRenderRect(img);
        }
        this._drawImageAutoSlice(ctx, img, this.renderRect);
    }

    _drawOverlay(ctx, imgKey, offset) {
        const img = Assets.get(imgKey);
        if (img && this.renderRect.w > 0) {
            const xo = offset?.x || 0;
            const yo = offset?.y || 0;

            const targetX = this.renderRect.x + xo;
            const targetY = this.renderRect.y + yo;

            // 오버레이 이미지 자체의 시트 여부를 별도 확인
            const rect = {
                x: targetX,
                y: targetY,
                w: this.renderRect.w,
                h: this.renderRect.h,
                isSheet: undefined
            };

            this._drawImageAutoSlice(ctx, img, rect);
        }
    }

    _drawImageAutoSlice(ctx, img, rect) {
        if (this.data?.singleSprite) {
            ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
            return;
        }

        let isSheet = rect.isSheet;
        if (isSheet === undefined) {
            if (!this._sheetCache.has(img)) {
                if (img.width > 0) {
                    const globalBaseW = BattleConfig.PORTRAIT.baseW || 264;
                    this._sheetCache.set(img, (img.width >= globalBaseW * 1.5));
                }
            }
            isSheet = !!this._sheetCache.get(img);
        }

        if (isSheet) {
            const frameIndex = this.isCpu ? 1 : 0;
            const frameWidth = img.width / 2;
            const frameHeight = img.height;
            const sx = frameIndex * frameWidth;
            ctx.drawImage(img, sx, 0, frameWidth, frameHeight, rect.x, rect.y, rect.w, rect.h);
        } else {
            ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
        }
    }
}
