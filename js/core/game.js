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
        if (muteBtn) {
            muteBtn.onclick = () => {
                const isMuted = Assets.toggleMute();
                muteBtn.classList.remove('toggle-on', 'toggle-off');
                muteBtn.classList.add(isMuted ? 'toggle-off' : 'toggle-on');
                muteBtn.blur();
            };
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

        setTimeout(() => {
            if (muteBtn) {
                muteBtn.classList.remove('toggle-on', 'toggle-off');
                muteBtn.classList.add(Assets.muted ? 'toggle-off' : 'toggle-on');
            }
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
                            fullscreenBtn.classList.toggle('toggle-on');
                            fullscreenBtn.classList.toggle('toggle-off');
                        });
                    } else {
                        gameContainer.classList.toggle('pseudo-fullscreen');
                        fullscreenBtn.classList.toggle('toggle-on');
                        fullscreenBtn.classList.toggle('toggle-off');
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

            document.addEventListener('fullscreenchange', () => {
                const isFullscreen = !!document.fullscreenElement;
                fullscreenBtn.classList.remove('toggle-on', 'toggle-off');
                fullscreenBtn.classList.add(isFullscreen ? 'toggle-on' : 'toggle-off');
            });
        }

        console.log('Starting LoadingScene...');
        this.lastTime = performance.now();
        this.changeScene(LoadingScene);
        this.loop(this.lastTime);
    },

    saveData: {
        unlocked: []
    },

    load: function () {
        const data = localStorage.getItem('haiyuki_save');
        if (data) {
            try {
                this.saveData = JSON.parse(data);
                console.log("Save data loaded:", this.saveData);
            } catch (e) {
                console.error("Failed to parse save data:", e);
            }
        }
    },

    save: function () {
        localStorage.setItem('haiyuki_save', JSON.stringify(this.saveData));
        console.log("Game saved.");
    },

    changeScene: function (scene, data) {
        this.currentScene = scene;
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

    draw: function () {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.currentScene && this.currentScene.draw) {
            this.currentScene.draw(this.ctx);
        }
    },

    isAutoTest: false,
    autoTestOptions: {},
    testLogs: [],

    startAutoTest: function (options = {}) {
        console.log("=== STARTING AUTO-TEST MODE ===");
        this.isAutoTest = true;
        this.autoTestOptions = options;
        this.testLogs = [];
        if (!this.currentScene) this.init();
    },

    startAutoLoseTest: function () {
        console.log("=== STARTING AUTO-LOSE TEST MODE ===");
        this.startAutoTest({ loseMode: true });
    },

    stopAutoTest: function () {
        console.log("=== STOPPING AUTO-TEST MODE ===");
        console.log("Test Results:", this.testLogs);
        this.isAutoTest = false;
        this.autoTestOptions = {};
    },

    triggerMayu: function () {
        console.log("!!! Debug: Triggering Mayu Intrusion !!!");
        this.changeScene(EncounterScene, {
            playerIndex: this.currentScene && this.currentScene.playerIndex !== undefined ? this.currentScene.playerIndex : 0,
            cpuIndex: 6,
            mode: 'CHALLENGER',
            defeatedOpponents: this.currentScene && this.currentScene.defeatedOpponents ? this.currentScene.defeatedOpponents : []
        });
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
    Game.init();
};
