const Game = {
    canvas: null,
    ctx: null,
    currentScene: null,
    continueCount: 0,
    isTrueEndingPath: false,

    init: function () {
        this.load(); // Load saved data
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.continueCount = 0;
        this.isTrueEndingPath = true;

        // Initialize modules with canvas for mouse input
        Input.init(this.canvas);

        // Setup Mute Button
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            // Set initial state
            muteBtn.classList.remove('toggle-on', 'toggle-off');
            muteBtn.classList.add(Assets.muted ? 'toggle-off' : 'toggle-on');

            muteBtn.onclick = () => {
                const isMuted = Assets.toggleMute();
                muteBtn.classList.remove('toggle-on', 'toggle-off');
                muteBtn.classList.add(isMuted ? 'toggle-off' : 'toggle-on');
                muteBtn.blur();
            };
        }

        // Setup Yaku Toggle Button
        const yakuBtn = document.getElementById('yaku-btn');
        const yakuContainer = document.getElementById('yaku-container');
        if (yakuBtn && yakuContainer) {
            yakuBtn.onclick = () => {
                // Mobile: Open in new tab
                if (window.innerWidth <= 768) {
                    window.open('https://atah.io/haiyuki_manual/index.html#yaku', '_blank');
                    yakuBtn.blur();
                    return;
                }

                // Desktop: Toggle Iframe
                const isHidden = yakuContainer.classList.toggle('hidden');

                // Update Button State (Red/On = Open, Blue/Off = Closed)
                yakuBtn.classList.remove('toggle-on', 'toggle-off');
                yakuBtn.classList.add(isHidden ? 'toggle-off' : 'toggle-on');

                // Reload iframe if showing (to fix scroll/rendering)
                if (!isHidden) {
                    const iframe = document.getElementById('yaku-frame');
                    if (iframe) {
                        iframe.src = iframe.src;
                    }
                }
                yakuBtn.blur();
            };
        }

        // Load assets
        Assets.load(() => {
            console.log('Assets loaded. Starting game...');
            this.changeScene(TitleScene);
            this.loop();
        });
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

    update: function () {
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update();
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

    // Auto-Test Mode
    isAutoTest: false,
    autoTestOptions: {}, // { loseMode: true }
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

    loop: function () {
        // Speed up in Auto Test Mode (10x speed)
        const iterations = Game.isAutoTest ? 10 : 1;

        for (let i = 0; i < iterations; i++) {
            Game.update();
        }

        Game.draw();
        requestAnimationFrame(Game.loop);
    }
};

// Start the game when the window loads
window.onload = function () {
    Game.init();
};
