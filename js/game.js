const Game = {
    canvas: null,
    ctx: null,
    currentScene: null,

    init: function () {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize modules with canvas for mouse input
        Input.init(this.canvas);

        // Load assets
        Assets.load(() => {
            console.log('Assets loaded. Starting game...');
            this.changeScene(TitleScene);
            this.loop();
        });
    },

    changeScene: function (scene, data) {
        this.currentScene = scene;
        if (this.currentScene.init) {
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
