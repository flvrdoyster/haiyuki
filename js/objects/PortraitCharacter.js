
class PortraitCharacter {
    constructor(characterData, config, isCpu = false) {
        this.data = characterData;
        this.config = config; // { x, y, w, h, baseW, baseH }
        this.isCpu = isCpu;

        this.animConfig = null;

        // Animation State
        this.state = 'idle'; // idle, talk...
        this.blinkTimer = 0;
        this.blinkSequence = [];
        this.blinkFrameIndex = -1; // -1 means not blinking
        this.currentBlinkFrame = null;

        // Talk State
        this.isTalking = false;
        this.talkTimer = 0;
        this.talkSequence = []; // e.g. [0, 1, 2, 1]
        this.talkFrameIndex = 0;
        this.currentTalkFrame = null;
    }

    setAnimationConfig(config) {
        this.animConfig = config;
        if (!this.animConfig) return;

        // --- OPTIMIZATION: Defaults & Auto-Generation ---

        // 1. Scalar Defaults
        if (!this.animConfig.interval) this.animConfig.interval = 80; // Blink Interval
        if (!this.animConfig.speed) this.animConfig.speed = 5;       // Blink Speed
        if (!this.animConfig.talkSpeed) this.animConfig.talkSpeed = 6; // Talk Speed

        // 2. Asset Auto-Generation (Convention over Configuration)
        // If 'base' exists (e.g., ".../NAME_SIDE_base.png"), try to generate blink/talk if missing.
        if (this.animConfig.base) {
            const base = this.animConfig.base;

            // Auto-generate Blink: base("..._base.png") -> "..._blink-1.png", etc.
            if (!this.animConfig.blink) {
                // Check if base ends with "_base.png"
                if (base.endsWith('_base.png')) {
                    const prefix = base.replace('_base.png', '');
                    this.animConfig.blink = [
                        `${prefix}_blink-1.png`,
                        `${prefix}_blink-2.png`,
                        `${prefix}_blink-3.png`
                    ];
                }
            }

            // Auto-generate Talk
            if (!this.animConfig.talk) {
                if (base.endsWith('_base.png')) {
                    const prefix = base.replace('_base.png', '');
                    this.animConfig.talk = [
                        `${prefix}_talk-1.png`,
                        `${prefix}_talk-2.png`,
                        `${prefix}_talk-3.png`
                    ];
                }
            }

            // Auto-generate Expressions
            if (!this.animConfig.smile && base.endsWith('_base.png')) {
                this.animConfig.smile = base.replace('_base.png', '_smile.png');
            }
            if (!this.animConfig.shocked && base.endsWith('_base.png')) {
                this.animConfig.shocked = base.replace('_base.png', '_shocked.png');
            }
        }

        this.blinkTimer = Math.floor(Math.random() * this.animConfig.interval);
    }

    setState(newState) {
        this.state = newState;
    }

    setTalking(talking) {
        this.isTalking = talking;
        if (talking) {
            this.startTalk();
        } else {
            this.currentTalkFrame = null;
        }
    }

    startTalk() {
        if (!this.animConfig || !this.animConfig.talk || this.animConfig.talk.length === 0) {
            console.warn("PortraitCharacter: startTalk failed - No talk config or empty array.", this.animConfig);
            return;
        }
        // Default Loop: 0 -> 1 -> 2 -> 1 -> 0 ...
        this.talkSequence = this.animConfig.talkSequence || [0, 1, 2, 1];
        this.talkFrameIndex = 0;
        this.updateTalkFrame();
        this.talkTimer = this.animConfig.talkSpeed || 6;
        // console.log("PortraitCharacter: Talk Started", this.currentTalkFrame);
    }

    // ... (update method unchanged) ...

    _drawOverlay(ctx, imgKey, offset = { x: 0, y: 0 }) {
        const img = Assets.get(imgKey);
        if (img && this.lastRenderRect) {
            // Apply specific offset for this overlay (e.g. blink/talk misalignment fix)
            const targetX = this.lastRenderRect.x + (offset.x || 0);
            const targetY = this.lastRenderRect.y + (offset.y || 0);

            ctx.drawImage(img, targetX, targetY, this.lastRenderRect.w, this.lastRenderRect.h);
        } else if (img) {
            // Fallback
            ctx.drawImage(img, this.config.x + (offset.x || 0), this.config.y + (offset.y || 0), this.config.w, this.config.h);
        }
    }

    update() {
        if (!this.animConfig) return;

        // Blink Logic
        if (this.blinkFrameIndex === -1) {
            // Waiting to blink
            this.blinkTimer--;
            if (this.blinkTimer <= 0) {
                this.startBlink();
            }
        } else {
            // Blinking
            this.blinkTimer--;
            if (this.blinkTimer <= 0) {
                this.advanceBlink();
            }
        }

        // Talk Logic
        if (this.isTalking) {
            this.talkTimer--;
            if (this.talkTimer <= 0) {
                this.advanceTalk();
            }
        }
    }

    advanceTalk() {
        this.talkFrameIndex++;
        if (this.talkFrameIndex >= this.talkSequence.length) {
            this.talkFrameIndex = 0; // Loop
        }
        this.updateTalkFrame();
        this.talkTimer = this.animConfig.talkSpeed || 6;
    }

    updateTalkFrame() {
        const frameIdx = this.talkSequence[this.talkFrameIndex];
        if (frameIdx < this.animConfig.talk.length) {
            this.currentTalkFrame = this.animConfig.talk[frameIdx];
        }
    }

    startBlink() {
        if (!this.animConfig || !this.animConfig.blink || this.animConfig.blink.length === 0) return;

        // Logic for Random Double Blink (approx 1 in 3)
        // Use -1 to indicate "No Overlay" (Open/Base eyes)
        const isDouble = Math.random() < 0.35;
        // Standard Base Sequence: Half(1) -> Closed(0) -> Half(1)
        // This is now the universal standard.
        const baseSeq = [1, 0, 1];

        if (isDouble) {
            // Blink -> Pause (Open) -> Blink
            this.blinkSequence = [...baseSeq, -1, -1, ...baseSeq];
        } else {
            this.blinkSequence = baseSeq;
        }

        this.blinkFrameIndex = 0;
        this.updateBlinkFrame();
        this.blinkTimer = this.animConfig.speed || 5;
    }

    advanceBlink() {
        this.blinkFrameIndex++;
        if (this.blinkFrameIndex >= this.blinkSequence.length) {
            // End Blink
            this.blinkFrameIndex = -1;
            this.currentBlinkFrame = null;
            this.blinkTimer = this.animConfig.interval || 80;
        } else {
            this.updateBlinkFrame();
            this.blinkTimer = this.animConfig.speed || 5;
        }
    }

    updateBlinkFrame() {
        const frameIdx = this.blinkSequence[this.blinkFrameIndex];
        // Safety check
        if (frameIdx < this.animConfig.blink.length) {
            this.currentBlinkFrame = this.animConfig.blink[frameIdx];
        }
    }

    draw(ctx) {
        // Safe check if data exists
        if (!this.data) return;

        // ANIMATION RENDER PATH
        if (this.animConfig) {
            const cx = Math.floor(this.config.x);
            const cy = Math.floor(this.config.y);

            // Initialize lastRenderRect to default (Stretched) box
            // This ensures overlays have a valid reference frame even if Base draw fails or is skipped.
            this.lastRenderRect = {
                x: cx,
                y: cy,
                w: this.config.w,
                h: this.config.h
            };

            // 1. Draw Base
            if (this.animConfig.base) {
                const baseImg = Assets.get(this.animConfig.base);
                if (baseImg) {
                    // Default to config size (Stretching)
                    let dw = this.config.w;
                    let dh = this.config.h;
                    let dx = cx;
                    let dy = cy;

                    // Apply Custom Config if present
                    if (this.animConfig.scale) {
                        dw = baseImg.width * this.animConfig.scale;
                        dh = baseImg.height * this.animConfig.scale;
                    }
                    if (this.animConfig.xOffset) dx += this.animConfig.xOffset;
                    if (this.animConfig.yOffset) dy += this.animConfig.yOffset;

                    // If we want to align bottom-center by default when custom sizing is used:
                    if (this.animConfig.center) {
                        dx = cx + (this.config.w - dw) / 2;
                        dy = cy + (this.config.h - dh) / 2;
                    }

                    // Update lastRenderRect with the ACTUAL base placement
                    this.lastRenderRect = { x: dx, y: dy, w: dw, h: dh };

                    ctx.drawImage(baseImg, this.lastRenderRect.x, this.lastRenderRect.y, this.lastRenderRect.w, this.lastRenderRect.h);
                }
            }

            // State Handling (Smile/Shocked override idle/talk/blink)
            if (this.state === 'smile' && this.animConfig.smile) {
                this._drawOverlay(ctx, this.animConfig.smile);
                return;
            }

            if (this.state === 'shocked' && this.animConfig.shocked) {
                this._drawOverlay(ctx, this.animConfig.shocked);
                return;
            }

            // Default: 'idle' with optional Talk + Blink

            // 2. Draw Idle
            if (this.animConfig.idle) {
                this._drawOverlay(ctx, this.animConfig.idle);
            }

            // 3. Draw Talk (Overlay if talking)
            if (this.isTalking && this.currentTalkFrame) {
                // Pass talkOffset if defined
                this._drawOverlay(ctx, this.currentTalkFrame, this.animConfig.talkOffset);
            }

            // 4. Draw Blink (Overlay)
            if (this.currentBlinkFrame) {
                // Pass blinkOffset if defined
                this._drawOverlay(ctx, this.currentBlinkFrame, this.animConfig.blinkOffset);
            }

            return;
        }

        // LEGACY RENDER PATH
        // Determine image to draw
        let img = null;
        let isFallback = false;

        if (this.isCpu) {
            // CPU (Right)
            if (this.data.battleFaceR) {
                img = Assets.get(this.data.battleFaceR);
            } else if (this.data.face) {
                isFallback = true;
                // Fallback logic uses Assets.drawFrame which handles getting the image internally
            }
        } else {
            // Player (Left)
            if (this.data.battleFaceL) {
                img = Assets.get(this.data.battleFaceL);
            } else if (this.data.face) {
                isFallback = true;
            }
        }

        if (img) {
            ctx.drawImage(img,
                0, 0, this.config.baseW || 264, this.config.baseH || 280,
                this.config.x, this.config.y, this.config.w, this.config.h
            );
        } else if (isFallback) {
            // Fallback using face index
            const frameIndex = this.isCpu ? 1 : 0;
            Assets.drawFrame(ctx, this.data.face, this.config.x, this.config.y, frameIndex, this.config.w, this.config.h);
        }
    }

    _drawOverlay(ctx, imgKey, offset) {
        // Safe check for offset
        const xo = (offset && offset.x) ? offset.x : 0;
        const yo = (offset && offset.y) ? offset.y : 0;

        const img = Assets.get(imgKey);
        if (img && this.lastRenderRect) {
            // Apply specific offset for this overlay relative to lastRenderRect
            const targetX = this.lastRenderRect.x + xo;
            const targetY = this.lastRenderRect.y + yo;

            ctx.drawImage(img, targetX, targetY, this.lastRenderRect.w, this.lastRenderRect.h);
        }
    }
}
