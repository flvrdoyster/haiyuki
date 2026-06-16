const Game = {
    canvas: null,
    ctx: null,
    currentScene: null,
    continueCount: 0,
    isTrueEndingPath: false,

    init: function () {
        this.load();
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.continueCount = 0;
        this.isTrueEndingPath = true;

        if (this.isAutoTest) {
            console.log("Auto Test Mode detected. Muting Audio.");
            Assets.setMute(true);
        }

        Input.init(this.canvas);

        const muteBtn = document.getElementById('mute-btn');
        // Speaker icons (note ↔ note-with-slash), swapped on toggle like the
        // gensei-pc98 emulator's mute button.
        const SVG_SOUND_ON = '<svg viewBox="0 0 49.13 70.14" height="22"><path fill="currentColor" d="M7.43,68.29c-2.31-1.26-4.13-3.01-5.45-5.25s-1.98-4.77-1.98-7.58.65-5.41,1.96-7.62c1.3-2.21,3.12-3.93,5.45-5.14,2.33-1.22,4.96-1.82,7.89-1.82s5.45.59,7.73,1.76l-.09-42.63h26.19v14.77h-18.72v40.69c0,2.81-.65,5.34-1.96,7.58-1.3,2.24-3.1,3.99-5.38,5.25s-4.88,1.87-7.78,1.85c-2.93.03-5.55-.59-7.87-1.85Z"/></svg>';
        const SVG_SOUND_OFF = '<svg viewBox="0 0 56.02 70.14" height="22"><rect fill="currentColor" x="26.51" y="-3.04" width="3" height="76.23" transform="translate(-16.59 30.08) rotate(-45)"/><polygon fill="currentColor" points="33.86 35.68 33.86 14.77 52.58 14.77 52.58 0 26.38 0 26.44 28.27 33.86 35.68"/><path fill="currentColor" d="M26.47,42.63c-2.29-1.17-4.86-1.76-7.73-1.76s-5.56.61-7.89,1.82c-2.33,1.22-4.15,2.93-5.45,5.14-1.3,2.21-1.96,4.75-1.96,7.62s.66,5.34,1.98,7.58,3.13,3.99,5.45,5.25c2.31,1.26,4.94,1.87,7.87,1.85,2.9.03,5.49-.59,7.78-1.85s4.08-3.01,5.38-5.25c1.3-2.24,1.96-4.77,1.96-7.58v-9.12l-7.39-7.39v3.68Z"/></svg>';
        const renderMuteIcon = (isMuted) => {
            if (muteBtn) muteBtn.innerHTML = isMuted ? SVG_SOUND_OFF : SVG_SOUND_ON;
        };
        if (muteBtn) {
            muteBtn.onclick = () => {
                renderMuteIcon(Assets.toggleMute());
                muteBtn.blur();
            };
            renderMuteIcon(Assets.muted);
        }

        const skillsBtn = document.getElementById('skills-btn');
        if (skillsBtn) {
            skillsBtn.onclick = () => {
                BattleConfig.RULES.SKILLS_ENABLED = !BattleConfig.RULES.SKILLS_ENABLED;

                const isEnabled = BattleConfig.RULES.SKILLS_ENABLED;
                skillsBtn.classList.remove('toggle-on', 'toggle-off');
                skillsBtn.classList.add(isEnabled ? 'toggle-on' : 'toggle-off');

                skillsBtn.blur();
                console.log(`[Config] Skills Enabled: ${isEnabled}`);
            };
        }

        const difficultyBtn = document.getElementById('difficulty-btn');
        if (difficultyBtn) {
            // 3-segment selector: image shows 쉬움/중간/어려움, highlighting the
            // active one; clicking a segment picks that difficulty directly.
            const segments = ['easy', 'normal', 'hard'];
            const render = () => {
                const key = segments.includes(this.saveData.difficulty) ? this.saveData.difficulty : 'normal';
                difficultyBtn.classList.remove('difficulty-easy', 'difficulty-normal', 'difficulty-hard');
                difficultyBtn.classList.add(`difficulty-${key}`);
            };
            difficultyBtn.onclick = (e) => {
                const rect = difficultyBtn.getBoundingClientRect();
                const seg = Math.floor((e.clientX - rect.left) / (rect.width / 3));
                this.saveData.difficulty = segments[Math.max(0, Math.min(2, seg))];
                this.save();
                render();
                difficultyBtn.blur();
                console.log(`[Config] Difficulty: ${this.saveData.difficulty}`);
            };
            render();
        }

        setTimeout(() => {
            renderMuteIcon(Assets.muted);
            if (skillsBtn) {
                const rulesEnabled = BattleConfig.RULES.SKILLS_ENABLED;
                skillsBtn.classList.remove('toggle-on', 'toggle-off');
                skillsBtn.classList.add(rulesEnabled ? 'toggle-on' : 'toggle-off');
            }
        }, 100);

        const yakuBtn = document.getElementById('yaku-btn');
        const yakuContainer = document.getElementById('yaku-container');
        if (yakuBtn && yakuContainer) {
            yakuBtn.onclick = () => {
                if (window.innerWidth <= 768) {
                    window.open('https://atah.io/haiyuki_manual/index.html#yaku', '_blank');
                    yakuBtn.blur();
                    return;
                }

                const isHidden = yakuContainer.classList.toggle('hidden');

                yakuBtn.classList.remove('toggle-on', 'toggle-off');
                yakuBtn.classList.add(isHidden ? 'toggle-off' : 'toggle-on');

                if (!isHidden) {
                    const iframe = document.getElementById('yaku-frame');
                    if (iframe) {
                        iframe.src = iframe.src;
                    }
                }
                yakuBtn.blur();
            };
        }

        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const gameContainer = document.getElementById('game-container');
        if (fullscreenBtn && gameContainer) {
            fullscreenBtn.onclick = () => {
                const element = gameContainer;
                const requestMethod = element.requestFullscreen ||
                    element.webkitRequestFullscreen ||
                    element.mozRequestFullScreen ||
                    element.msRequestFullscreen;

                const isFullscreen = document.fullscreenElement ||
                    document.webkitFullscreenElement ||
                    document.mozFullScreenElement ||
                    document.msFullscreenElement;

                if (!isFullscreen) {
                    if (requestMethod) {
                        requestMethod.call(element).catch(err => {
                            console.log(`Native fullscreen failed: ${err.message}`);
                            gameContainer.classList.toggle('pseudo-fullscreen');
                        });
                    } else {
                        gameContainer.classList.toggle('pseudo-fullscreen');
                    }
                } else {
                    const exitMethod = document.exitFullscreen ||
                        document.webkitExitFullscreen ||
                        document.mozCancelFullScreen ||
                        document.msExitFullscreen;

                    if (exitMethod) {
                        exitMethod.call(document);
                    }
                }
                fullscreenBtn.blur();
            };

        }

        this.lastTime = performance.now();
        this.changeScene(LoadingScene);
        this.loop(this.lastTime);
    },

    saveData: {
        unlocked: [],
        difficulty: 'normal'
    },

    load: function () {
        const data = localStorage.getItem('haiyuki_save');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                // Minimal schema check so a corrupted save can't poison game state
                if (parsed && Array.isArray(parsed.unlocked)) {
                    this.saveData = parsed;
                    if (!this.saveData.difficulty) this.saveData.difficulty = 'normal';
                    console.log("Save data loaded:", this.saveData);
                } else {
                    console.error("Invalid save data shape, resetting.");
                    this.saveData = { unlocked: [], difficulty: 'normal' };
                }
            } catch (e) {
                console.error("Failed to parse save data, resetting:", e);
                this.saveData = { unlocked: [], difficulty: 'normal' };
            }
        }
    },

    save: function () {
        localStorage.setItem('haiyuki_save', JSON.stringify(this.saveData));
        console.log("Game saved.");
    },

    changeScene: function (scene, data) {
        this.currentScene = scene;

        // 난이도는 BattleScene.init에서 1회만 적용되어 진행 중 매치엔 반영되지 않으므로,
        // 전투 중에는 토글을 잠가 "바꿨는데 왜 안 변하지" 혼란을 막는다. 전투를 벗어나면
        // 자동 해제. (다음 판 난이도 미리 변경은 전투 종료 후 가능.)
        const diffBtn = document.getElementById('difficulty-btn');
        if (diffBtn) {
            diffBtn.disabled = (typeof BattleScene !== 'undefined' && scene === BattleScene);
        }

        if (this.currentScene && this.currentScene.init) {
            this.currentScene.init(data);
        }
    },

    update: function (dt = 1.0) {
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(dt);
        }
        // Input.update() must be called AFTER scene update to properly detect 'just pressed' events
        Input.update();
    },

    // Screen shake — translate the whole #game-container block via CSS transform so the
    // entire screen jitters as one (no in-canvas edge reveal). Triggered on damage.
    _shakeTimer: 0,
    _shakeDur: 1,
    _shakeMag: 0,

    // mag = peak offset (CSS px), frames = duration; amplitude decays linearly to 0.
    shake: function (mag, frames) {
        this._shakeMag = mag;
        this._shakeTimer = frames;
        this._shakeDur = frames;
    },

    _applyShake: function () {
        if (this._shakeTimer <= 0) return;
        const el = this.canvas && this.canvas.parentElement; // #game-container
        if (!el) return;
        // 위아래로만, 매 프레임 방향을 뒤집어 짧고 빠르게(부르르). 진폭은 0까지 선형 감쇠.
        const amp = this._shakeMag * (this._shakeTimer / this._shakeDur);
        const dy = (this._shakeTimer % 2 === 0) ? amp : -amp;
        el.style.transform = `translate(0px, ${dy.toFixed(2)}px)`;
        this._shakeTimer--;
        if (this._shakeTimer <= 0) el.style.transform = '';
    },

    draw: function () {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.currentScene && this.currentScene.draw) {
            this.currentScene.draw(this.ctx);
        }
        this._applyShake();
    },

    isAutoTest: false,
    autoTestOptions: {},

    startAutoTest: function (options = {}) {
        console.log("=== STARTING AUTO-TEST MODE ===");
        this.isAutoTest = true;
        this.autoTestOptions = options;
        if (!this.currentScene) this.init();
    },

    startAutoLoseTest: function () {
        console.log("=== STARTING AUTO-LOSE TEST MODE ===");
        this.startAutoTest({ loseMode: true });
    },

    stopAutoTest: function () {
        console.log("=== STOPPING AUTO-TEST MODE ===");
        this.isAutoTest = false;
        this.autoTestOptions = {};
    },

    lastTime: 0,
    loop: function (currentTime) {
        const elapsed = currentTime - Game.lastTime;
        Game.lastTime = currentTime;

        let dt = elapsed / (1000 / 60);
        // Cap dt to avoid massive jumps (max 250ms / ~15 frames)
        dt = Math.min(15, dt);

        const iterations = Game.isAutoTest ? 10 : 1;

        for (let i = 0; i < iterations; i++) {
            Game.update(dt);
        }

        Game.draw();
        requestAnimationFrame(Game.loop);
    }
};

window.onload = function () {
    // Canvas text does not trigger @font-face loading by itself, so wait for the
    // webfont before the first frame — capped at 3s so a CDN outage can't block the game.
    const fontsReady = (document.fonts && document.fonts.load)
        ? Promise.all([
            document.fonts.load('16px "KoddiUDOnGothic"'),
            document.fonts.load('bold 16px "KoddiUDOnGothic"')
        ])
        : Promise.resolve();

    Promise.race([
        fontsReady,
        new Promise(resolve => setTimeout(resolve, 3000))
    ]).catch(() => { }).then(() => Game.init());
};
