
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

        // 1. Scalar Defaults - TUNED FOR SNAPPIER FEEL
        if (!this.animConfig.interval) this.animConfig.interval = 200; // Blink Interval
        if (!this.animConfig.speed) this.animConfig.speed = 5;       // Blink Speed (Reverted to 5)
        if (!this.animConfig.talkSpeed) this.animConfig.talkSpeed = 8; // Talk Speed (Reverted to 8)

        // 2. Asset Auto-Generation (Convention over Configuration)
        // If 'base' exists (e.g., ".../NAME_SIDE_base.png"), try to generate blink/talk if missing.
        if (this.animConfig.base) {
            const base = this.animConfig.base;
            const prefix = base.replace('_base.png', '');

            // Auto-generate Blink
            if (!this.animConfig.blink) {
                const detectedBlinks = [];
                // Look for blink-1, blink-2, blink-3...
                for (let i = 1; i <= 5; i++) {
                    const key = `${prefix}_blink-${i}.png`;
                    if (Assets.get(key)) {
                        detectedBlinks.push(key);
                    } else {
                        break; // Stop at first missing
                    }
                }
                if (detectedBlinks.length > 0) {
                    this.animConfig.blink = detectedBlinks;
                }
            }

            // Auto-generate Talk
            if (!this.animConfig.talk) {
                // Modified: Index 0 is always Base
                const detectedTalks = [this.animConfig.base];

                for (let i = 1; i <= 5; i++) {
                    const key = `${prefix}_talk-${i}.png`;
                    if (Assets.get(key)) {
                        detectedTalks.push(key);
                    } else {
                        break;
                    }
                }

                // If we found any additional talk frames (length > 1)
                if (detectedTalks.length > 1) {
                    this.animConfig.talk = detectedTalks;
                    // Auto-Default Sequence for 2 additional frames (Total 3: Base, Talk1, Talk2)
                    if (detectedTalks.length === 3 && !this.animConfig.talkSequence) {
                        this.animConfig.talkSequence = [0, 2, 1, 2];
                    }
                }
                // console.log(`[PortraitCharacter] Auto-detected Talk for ${prefix}: ${detectedTalks.length - 1} extra frames.`);
            }

            // Auto-generate Expressions
            if (!this.animConfig.smile) {
                const key = `${prefix}_smile.png`;
                if (Assets.get(key)) this.animConfig.smile = key;
            }
            if (!this.animConfig.shocked) {
                const key = `${prefix}_shocked.png`;
                if (Assets.get(key)) this.animConfig.shocked = key;
            }

            // Auto-generate Idle
            if (!this.animConfig.idle) {
                const key = `${prefix}_idle.png`;
                if (Assets.get(key)) this.animConfig.idle = key;
            }
        }
        // console.log(`[PortraitCharacter] Animation Config Set. Blink: ${this.animConfig.blink ? this.animConfig.blink.length : 0}, Talk: ${this.animConfig.talk ? this.animConfig.talk.length : 0}`);

        this.blinkTimer = Math.floor(Math.random() * this.animConfig.interval);

        // Pre-allocate rect to reduce GC
        this.lastRenderRect = { x: 0, y: 0, w: 0, h: 0 };
        // Cache sheet status
        this._sheetCache = {};
    }

    setState(newState) {
        this.state = newState;
    }

    setTalking(talking) {
        if (this.isTalking === talking) return; // Optimization: No state change

        this.isTalking = talking;
        if (talking) {
            // Only remain talking if startTalk succeeds
            if (!this.startTalk()) {
                this.isTalking = false;
            }
        } else {
            this.currentTalkFrame = null;
        }
    }

    startTalk() {
        if (!this.animConfig || !this.animConfig.talk || this.animConfig.talk.length === 0) {
            // No talk assets available
            return false;
        }
        // Default Loop
        if (!this.talkSequence || this.talkSequence.length === 0) {
            // If manual sequence not set, decide based on length
            if (this.animConfig.talkSequence) {
                this.talkSequence = this.animConfig.talkSequence;
            } else if (this.animConfig.talk.length === 3) {
                // Base(0) + Talk1(1) + Talk2(2)
                this.talkSequence = [0, 2, 1, 2];
            } else if (this.animConfig.talk.length === 2) {
                // Base(0) + Talk1(1)
                this.talkSequence = [0, 1, 0, 1];
            } else {
                this.talkSequence = [0, 1]; // Fallback
            }
        }

        this.talkFrameIndex = 0;
        this.updateTalkFrame();
        this.talkTimer = this.animConfig.talkSpeed || 5;
        return true;
    }

    // ... (update method unchanged) ...

    _drawOverlay(ctx, imgKey, offset = { x: 0, y: 0 }) {
        const img = Assets.get(imgKey);
        if (img && this.lastRenderRect.w > 0) {
            // Apply specific offset for this overlay (e.g. blink/talk misalignment fix)
            const targetX = this.lastRenderRect.x + (offset.x || 0);
            const targetY = this.lastRenderRect.y + (offset.y || 0);

            this._drawImageAutoSlice(ctx, img, targetX, targetY, this.lastRenderRect.w, this.lastRenderRect.h);
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
            // Safety check: ensure we actually have talk config
            if (this.animConfig.talk && this.animConfig.talk.length > 0) {
                this.talkTimer--;
                if (this.talkTimer <= 0) {
                    this.advanceTalk();
                }
            } else {
                this.isTalking = false; // Auto-disable if no assets
            }
        }
    }

    advanceTalk() {
        if (!this.talkSequence || this.talkSequence.length === 0) return;

        this.talkFrameIndex++;
        if (this.talkFrameIndex >= this.talkSequence.length) {
            this.talkFrameIndex = 0; // Loop
        }
        this.updateTalkFrame();
        this.talkTimer = this.animConfig.talkSpeed || 5;
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
        this.blinkTimer = this.animConfig.speed || 4;
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
            this.blinkTimer = this.animConfig.speed || 4;
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

        const globalBaseW = BattleConfig.PORTRAIT.baseW || 264;

        // ANIMATION RENDER PATH
        if (this.animConfig) {
            const cx = Math.floor(this.config.x);
            const cy = Math.floor(this.config.y);
            const scale = this.config.scale || 1.0;

            // 1. Draw Base
            if (this.animConfig.base) {
                const baseImg = Assets.get(this.animConfig.base);
                if (baseImg) {
                    // Determine Frame Size using Cached Check
                    if (this._sheetCache[this.animConfig.base] === undefined) {
                        const threshold = globalBaseW * 1.5;
                        this._sheetCache[this.animConfig.base] = (baseImg.width >= threshold);
                    }
                    const isSheet = this._sheetCache[this.animConfig.base];

                    const frameW = isSheet ? (baseImg.width / 2) : baseImg.width;
                    const frameH = baseImg.height;

                    // Calculate Destination Size
                    // Allow specific animConfig scale to override or multiply? 
                    // Let's assume global config scale is primary, animConfig.scale is strictly for specific anim tweaks if needed.
                    // But previous code replaced W/H with animConfig.scale logic.
                    // Simplify: Use Global Config Scale.
                    const destW = frameW * scale;
                    const destH = frameH * scale;

                    // Calculate Alignment
                    let dx = cx;
                    let dy = cy;

                    if (this.config.align === 'right') {
                        dx -= destW;
                    }

                    // Apply Anim Offsets
                    if (this.animConfig.xOffset) dx += this.animConfig.xOffset;
                    if (this.animConfig.yOffset) dy += this.animConfig.yOffset;

                    // Apply Character Data Offsets (Global correction)
                    // Only apply battle offsets if explicitly in Battle Mode
                    if (this.config.isBattle) {
                        if (this.data.battleOffsetX) dx += this.data.battleOffsetX;
                        if (this.data.battleOffsetY) dy += this.data.battleOffsetY;
                    }
                    if (this.isCpu && this.data.cpuOffsetX) dx += this.data.cpuOffsetX;

                    // Update lastRenderRect (In-place update to avoid GC)
                    if (!this.lastRenderRect) this.lastRenderRect = {};
                    this.lastRenderRect.x = dx;
                    this.lastRenderRect.y = dy;
                    this.lastRenderRect.w = destW;
                    this.lastRenderRect.h = destH;

                    // Draw Base
                    this._drawImageAutoSlice(ctx, baseImg, dx, dy, destW, destH);
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
                this._drawOverlay(ctx, this.currentTalkFrame, this.animConfig.talkOffset);
            }

            // 4. Draw Blink (Overlay)
            if (this.currentBlinkFrame) {
                this._drawOverlay(ctx, this.currentBlinkFrame, this.animConfig.blinkOffset);
            }

            return;
        }

        // LEGACY RENDER PATH (Standard Faces)
        let img = null;
        let isFallback = false;

        if (this.isCpu) {
            if (this.data.battleFaceR) img = Assets.get(this.data.battleFaceR);
            else if (this.data.face) isFallback = true;
        } else {
            if (this.data.battleFaceL) img = Assets.get(this.data.battleFaceL);
            else if (this.data.face) isFallback = true;
        }

        const scale = this.config.scale || 1.0;
        let destW = (this.config.baseW || globalBaseW) * scale; // Fallback to baseW if image not ready
        let destH = (this.config.baseH || 280) * scale;

        // Alignment
        let dx = this.config.x;
        let dy = this.config.y;
        if (this.config.align === 'right') dx -= destW;

        // Apply Character Data Offsets (Global correction)
        if (this.data.battleOffsetX) dx += this.data.battleOffsetX;
        if (this.data.battleOffsetY) dy += this.data.battleOffsetY;
        if (this.isCpu && this.data.cpuOffsetX) dx += this.data.cpuOffsetX;

        if (img) {
            // Recalculate based on actual image
            const isSheet = img.width >= (globalBaseW * 1.5);
            const frameW = isSheet ? (img.width / 2) : img.width;
            destW = frameW * scale;
            destH = img.height * scale;

            // Recalculate dx with new width
            dx = this.config.x;
            if (this.config.align === 'right') dx -= destW;

            this._drawImageAutoSlice(ctx, img, dx, dy, destW, destH);
        } else if (isFallback) {
            // Fallback
            const frameIndex = this.isCpu ? 1 : 0;
            // Assume fallback uses standard 48x48 or similar? 
            // Assets.drawFrame logic is specific. 
            // Let's just use the rect we calculated.
            Assets.drawFrame(ctx, this.data.face, dx, dy, frameIndex, destW, destH);
        }
    }

    _drawOverlay(ctx, imgKey, offset) {
        // Safe check for offset
        const xo = (offset && offset.x) ? offset.x : 0;
        const yo = (offset && offset.y) ? offset.y : 0;

        const img = Assets.get(imgKey);
        if (img && this.lastRenderRect && this.lastRenderRect.w > 0) {
            // Apply specific offset for this overlay relative to lastRenderRect
            const targetX = this.lastRenderRect.x + xo;
            const targetY = this.lastRenderRect.y + yo;

            this._drawImageAutoSlice(ctx, img, targetX, targetY, this.lastRenderRect.w, this.lastRenderRect.h);
        }
    }

    /**
     * Draws an image with automatic slicing if it detects a combined sheet (Left+Right).
     * Uses this.isCpu to determine which half to draw (False=Left/0, True=Right/1).
     */
    _drawImageAutoSlice(ctx, img, dx, dy, dw, dh) {
        // Explicit Overrides
        if (this.data && this.data.singleSprite) {
            ctx.drawImage(img, dx, dy, dw, dh);
            return;
        }

        // Use Cached Check if available (populated by primary draw path)
        let isSheet = false;
        if (this._sheetCache && this._sheetCache[img.src] !== undefined) {
            isSheet = this._sheetCache[img.src];
        } else {
            // Calculate and cache
            // CRITICAL FIX: Do NOT cache if image is not loaded (width=0)
            if (img.width > 0) {
                const baselineW = BattleConfig.PORTRAIT.baseW || 264;
                const threshold = baselineW * 1.5;
                isSheet = (img.width >= threshold);
                if (this._sheetCache) this._sheetCache[img.src] = isSheet;
            }
        }

        if (isSheet) {
            const frameIndex = this.isCpu ? 1 : 0;
            // Assume 2 frames exactly
            const frameWidth = img.width / 2;
            const frameHeight = img.height; // Assume horizontal strip

            const sx = frameIndex * frameWidth;

            ctx.drawImage(img, sx, 0, frameWidth, frameHeight, dx, dy, dw, dh);
        } else {
            // Normal Single Image
            ctx.drawImage(img, dx, dy, dw, dh);
        }
    }
}
