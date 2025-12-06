
class BattleCharacter {
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

        // config structure:
        // {
        //   base: 'key',
        //   idle: 'key', // Optional, if base doesn't have face
        //   blink: ['key1', 'key2', 'key3'],
        //   talk: ['key1', ...], talkSpeed: 5
        //   interval: 180, // Frames between blinks
        //   speed: 5 // Frames per blink step
        // }
        this.blinkTimer = Math.floor(Math.random() * (this.animConfig.interval || 180));
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
        if (!this.animConfig || !this.animConfig.talk || this.animConfig.talk.length === 0) return;
        // Default Loop: 0 -> 1 -> 2 -> 1 -> 0 ...
        this.talkSequence = this.animConfig.talkSequence || [0, 1, 2, 1];
        this.talkFrameIndex = 0;
        this.updateTalkFrame();
        this.talkTimer = this.animConfig.talkSpeed || 6; // slightly slower than blink?
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

        // Sequence: 0 -> 1 -> 2 -> 1 -> 0 (Open -> Half -> Closed -> Half -> Open)
        // Assuming blink array is [half, closed] or [half, closed, half]?
        // Assets are blink-1, blink-2, blink-3.
        // Usually 1=Start/Half, 2=Closed, 3=...?
        // Let's assume linear playback for now based on index, or customizable sequence.
        // User: "blink displayed in order looping".
        // Let's assume 1->2->3->2->1 or just 1->2->3 if 3 is open? 
        // Based on filenames blink-1, 2, 3... likely 1 (closing), 2 (closed), 3 (opening).
        // Let's try 0->1->2->End.

        // We will store indices into animConfig.blink array
        this.blinkSequence = this.animConfig.blinkSequence || [0, 1, 2, 1, 0];
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
            this.blinkTimer = this.animConfig.interval || 180;
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

            // 1. Draw Base
            if (this.animConfig.base) {
                const baseImg = Assets.get(this.animConfig.base);
                if (baseImg) ctx.drawImage(baseImg, cx, cy, this.config.w, this.config.h);
            }

            // State Handling (Smile/Shocked override idle/talk/blink)
            if (this.state === 'smile' && this.animConfig.smile) {
                const img = Assets.get(this.animConfig.smile);
                if (img) ctx.drawImage(img, cx, cy, this.config.w, this.config.h);
                return;
            }

            if (this.state === 'shocked' && this.animConfig.shocked) {
                const img = Assets.get(this.animConfig.shocked);
                if (img) ctx.drawImage(img, cx, cy, this.config.w, this.config.h);
                return;
            }

            // Default: 'idle' with optional Talk + Blink

            // 2. Draw Idle (Always draw if available)
            if (this.animConfig.idle) {
                const idleImg = Assets.get(this.animConfig.idle);
                if (idleImg) ctx.drawImage(idleImg, cx, cy, this.config.w, this.config.h);
            }

            // 3. Draw Talk (Overlay if talking)
            if (this.isTalking && this.currentTalkFrame) {
                const talkImg = Assets.get(this.currentTalkFrame);
                if (talkImg) ctx.drawImage(talkImg, cx, cy, this.config.w, this.config.h);
            }

            // 4. Draw Blink (Overlay)
            if (this.currentBlinkFrame) {
                const blinkImg = Assets.get(this.currentBlinkFrame);
                if (blinkImg) ctx.drawImage(blinkImg, cx, cy, this.config.w, this.config.h);
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
}
