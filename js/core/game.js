const Game = {
    canvas: null,
    ctx: null,
    currentScene: null,
    continueCount: 0,
    isTrueEndingPath: false,

    init: function () {
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

    loop: function () {
        Game.update();
        Game.draw();
        requestAnimationFrame(Game.loop);
    }
};

// Start the game when the window loads
window.onload = function () {
    Game.init();
};
