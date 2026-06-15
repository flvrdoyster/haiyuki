const LoadingScene = {
    isLoaded: false,
    delayTimer: 0,
    blinkTimer: 0,
    showPrompt: true,
    _gateArmed: false,
    starting: false,
    startTimer: 0,
    iconTimer: 0,
    icon: null,

    init: function () {
        this.isLoaded = false;
        this.delayTimer = 0;
        this.blinkTimer = 0;
        this.showPrompt = true;
        this._gateArmed = false;
        this.starting = false;
        this.startTimer = 0;
        this.iconTimer = 0;

        // Loading icon = the title menu cursor (ui/pointer.png, 2-frame face). Loaded
        // on its own since the main asset load isn't ready while this screen draws.
        if (!this.icon) {
            this.icon = new Image();
            this.icon.src = 'assets/ui/pointer.png';
        }

        Assets.load(() => {
            this.isLoaded = true;
        });
    },

    // Begin the start: kick the title BGM INSIDE the user gesture (iOS won't start it
    // from a later RAF). We then hold the loading screen (see update) until the BGM is
    // actually rolling, so the title doesn't appear ahead of its music. Idempotent.
    _beginStart: function () {
        if (this.starting) return;
        this.starting = true;
        this.startTimer = 0;
        Assets.playMusic('audio/bgm_title');
    },

    // Arm the start on the real gesture (covers mouse/touch/keyboard, incl. the
    // overlay gamepad's real touch). One-shot, removed after firing.
    _armStartGesture: function () {
        const start = () => {
            this._beginStart();
            window.removeEventListener('pointerdown', start);
            window.removeEventListener('touchstart', start);
            window.removeEventListener('keydown', start);
        };
        window.addEventListener('pointerdown', start, { passive: true });
        window.addEventListener('touchstart', start, { passive: true });
        window.addEventListener('keydown', start);
    },

    update: function (dt) {
        // Icon animates even while assets are still loading (the guard below).
        this.iconTimer += (dt || 1);

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

        // Once loaded, arm the in-gesture BGM start (fires on the same tap/key).
        if (!this._gateArmed) { this._armStartGesture(); this._gateArmed = true; }

        // Backup trigger (covers any input path the DOM handler might miss).
        if (!this.starting && (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed())) {
            this._beginStart();
        }

        // Hold the loading screen until the title BGM is actually rolling (or a short
        // safety cap), THEN go to the title — so audio is live from the first frame
        // rather than fading in mid-sequence.
        if (this.starting) {
            this.startTimer += dt;
            const bgm = Assets.currentMusic;
            const rolling = bgm && !bgm.paused && bgm.currentTime > 0;
            if (rolling || this.startTimer > 120) { // ~2s cap if it never starts
                Game.changeScene(TitleScene);
            }
        }
    },

    draw: function (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);

        // Loading indicator: the title menu cursor (2-frame face), blinking in place.
        // Drawn at a crisp 2× via nearest-neighbor (no blur).
        const icon = this.icon;
        if (icon && icon.complete && icon.naturalWidth) {
            const fw = 32, fh = 32, scale = 2;
            const dw = fw * scale, dh = fh * scale;
            const frame = Math.floor(this.iconTimer / 10) % 2;
            ctx.save();
            ctx.imageSmoothingEnabled = false; // pixelate (nearest-neighbor)
            ctx.drawImage(icon, frame * fw, 0, fw, fh, 320 - dw / 2, 240 - dh / 2, dw, dh);
            ctx.restore();
        }

        // Once loaded, prompt for the start gesture (blinks) — reuse the title's
        // "PUSH SPACE KEY" graphic.
        if (this.isLoaded && this.showPrompt) {
            const push = Assets.get('ui/pushok.png');
            if (push) ctx.drawImage(push, (640 - push.width) / 2, TitleConfig.PUSH_KEY.y);
        }
    }
};
