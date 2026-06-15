const LoadingScene = {
    isLoaded: false,
    delayTimer: 0,
    blinkTimer: 0,
    showPrompt: true,
    _gateArmed: false,
    starting: false,
    startTimer: 0,
    spinAngle: 0,
    tile: null,

    init: function () {
        this.isLoaded = false;
        this.delayTimer = 0;
        this.blinkTimer = 0;
        this.showPrompt = true;
        this._gateArmed = false;
        this.starting = false;
        this.startTimer = 0;
        this.spinAngle = 0;

        // Spinner tile — loaded on its own (the main asset load isn't ready yet while
        // this screen is drawing), so it can spin from the first frame.
        if (!this.tile) {
            this.tile = new Image();
            this.tile.src = 'assets/title/PAI.png';
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
        // Spinner advances even while assets are still loading (the guard below).
        this.spinAngle += (dt || 1) * 0.1;

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

        // Loading indicator: a single blank tile spinning in place.
        const tile = this.tile;
        if (tile && tile.complete && tile.naturalWidth) {
            const w = tile.naturalWidth, h = tile.naturalHeight;
            ctx.save();
            ctx.translate(320, 190);
            ctx.rotate(this.spinAngle);
            ctx.drawImage(tile, -w / 2, -h / 2);
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
