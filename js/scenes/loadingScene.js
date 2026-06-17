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

        // 메인 에셋 로드 완료 전에도 그려야 하므로 아이콘(pointer.png)만 별도 로드
        if (!this.icon) {
            this.icon = new Image();
            this.icon.src = 'assets/ui/pointer.png';
        }

        Assets.load(() => {
            this.isLoaded = true;
        });
    },

    // iOS는 제스처 핸들러 안에서만 오디오 재생 가능 → 제스처 직후 BGM 시작, 멱등
    _beginStart: function () {
        if (this.starting) return;
        this.starting = true;
        this.startTimer = 0;
        Assets.playMusic('audio/bgm_title');
    },

    // 오버레이 패드의 실제 터치 포함, 모든 입력 경로에서 one-shot으로 시작 트리거
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
        this.iconTimer += (dt || 1);

        if (!this.isLoaded) return;

        const mode = new URLSearchParams(window.location.search).get('mode');
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

        // Safari는 제스처 없이 오디오 불가 → 입력 대기 후 시작
        this.blinkTimer += dt;
        if (this.blinkTimer > 40) { this.showPrompt = !this.showPrompt; this.blinkTimer = 0; }

        if (!this._gateArmed) { this._armStartGesture(); this._gateArmed = true; }

        // DOM 핸들러가 놓칠 수 있는 경로를 Input으로 보완
        if (!this.starting && (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed())) {
            this._beginStart();
        }

        // BGM이 실제로 재생 중일 때 타이틀 전환 (최대 2초 안전 캡)
        if (this.starting) {
            this.startTimer += dt;
            const bgm = Assets.currentMusic;
            const rolling = bgm && !bgm.paused && bgm.currentTime > 0;
            if (rolling || this.startTimer > 120) {
                Game.changeScene(TitleScene);
            }
        }
    },

    draw: function (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);

        const icon = this.icon;
        if (icon && icon.complete && icon.naturalWidth) {
            const fw = 32, fh = 32, scale = 2;
            const dw = fw * scale, dh = fh * scale;
            const frame = Math.floor(this.iconTimer / 10) % 2;
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(icon, frame * fw, 0, fw, fh, 320 - dw / 2, 240 - dh / 2, dw, dh);
            ctx.restore();
        }

        if (this.isLoaded && this.showPrompt) {
            const push = Assets.get('ui/pushok.png');
            if (push) ctx.drawImage(push, (640 - push.width) / 2, TitleConfig.PUSH_KEY.y);
        }
    }
};
