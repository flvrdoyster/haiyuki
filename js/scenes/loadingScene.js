const LoadingScene = {
    isLoaded: false,
    delayTimer: 0,
    blinkTimer: 0,
    showPrompt: true,

    init: function () {
        this.isLoaded = false;
        this.delayTimer = 0;
        this.blinkTimer = 0;
        this.showPrompt = true;

        Assets.load(() => {
            this.isLoaded = true;
        });
    },

    update: function (dt) {
        if (!this.isLoaded) return;

        const mode = new URLSearchParams(window.location.search).get('mode');
        // Watch mode / autotest proceed automatically (no gesture available/needed).
        if (mode === 'story' || mode === 'watch' || Game.isAutoTest) {
            this.delayTimer += dt;
            if (this.delayTimer > 30) {
                if (mode === 'story' || mode === 'watch') {
                    Game.changeScene(CharacterSelectScene, { mode: 'WATCH' });
                } else {
                    Game.changeScene(TitleScene);
                }
            }
            return;
        }

        // Apple/Safari block audio until a user gesture, so gate the opening behind a
        // click/touch/key — the same gesture unlocks audio (Assets' window listeners).
        // The overlay gamepad works too: a real touch on a pad button unlocks audio
        // and dispatches KeyZ, which we accept here.
        this.blinkTimer += dt;
        if (this.blinkTimer > 40) { this.showPrompt = !this.showPrompt; this.blinkTimer = 0; }

        if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed()) {
            Game.changeScene(TitleScene);
        }
    },

    draw: function (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);
        
        const total = Assets.toLoad.length;
        const loaded = Assets.loadedCount;
        const progress = total > 0 ? loaded / total : 0;
        
        const barW = 320;
        const barH = 24;
        const barX = 320 - barW / 2;
        // Bar sits where the title logo will appear; the PUSH prompt sits exactly
        // where the title's PUSH SPACE KEY shows — so loading → title is seamless.
        const barY = 160;
        const radius = 10;
        
        const drawRoundRectPath = (x, y, w, h, r) => {
            if (ctx.roundRect) {
                ctx.roundRect(x, y, w, h, r);
            } else {
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                ctx.lineTo(x + w, y + h - r);
                ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                ctx.lineTo(x + r, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
            }
        };

        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.beginPath();
        drawRoundRectPath(barX + 2, barY + 2, barW, barH, radius);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        drawRoundRectPath(barX, barY, barW, barH, radius);
        ctx.fill();
        ctx.stroke();
        
        if (progress > 0) {
            ctx.save();
            ctx.beginPath();
            drawRoundRectPath(barX, barY, barW, barH, radius);
            ctx.clip();
            
            ctx.fillStyle = 'rgba(255, 215, 0, 1)';
            ctx.fillRect(barX, barY, barW * progress, barH);
            ctx.restore();
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            drawRoundRectPath(barX, barY, barW, barH, radius);
            ctx.stroke();
        }

        // Once loaded, prompt for the start gesture (blinks) — reuse the title's
        // "PUSH SPACE KEY" graphic.
        if (this.isLoaded && this.showPrompt) {
            const push = Assets.get('ui/pushok.png');
            if (push) ctx.drawImage(push, (640 - push.width) / 2, TitleConfig.PUSH_KEY.y);
        }
    }
};
