const Input = {
    keys: {},
    prevKeys: {},

    // Mouse state
    mouseX: 0,
    mouseY: 0,
    isMouseDown: false,
    prevMouseDown: false,

    // Key mapping (using e.code)
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    UP: 'ArrowUp',
    DOWN: 'ArrowDown',
    Z: 'KeyZ',
    X: 'KeyX',
    ENTER: 'Enter',
    SPACE: 'Space', // User requested fix: ' ' -> 'Space'

    init: function (canvas) {
        window.addEventListener('keydown', (e) => {
            // Prevent default scrolling for arrow keys and space
            if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
                e.preventDefault();
            }
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse events
        if (canvas) {
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                this.mouseX = (e.clientX - rect.left) * scaleX;
                this.mouseY = (e.clientY - rect.top) * scaleY;
            });

            canvas.addEventListener('mousedown', () => {
                this.isMouseDown = true;
            });

            window.addEventListener('mouseup', () => {
                this.isMouseDown = false;
            });

            // Touch Support
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scrolling
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const touch = e.touches[0];
                this.mouseX = (touch.clientX - rect.left) * scaleX;
                this.mouseY = (touch.clientY - rect.top) * scaleY;
                this.isMouseDown = true;
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                if (e.touches.length > 0) {
                    const touch = e.touches[0];
                    this.mouseX = (touch.clientX - rect.left) * scaleX;
                    this.mouseY = (touch.clientY - rect.top) * scaleY;
                }
            }, { passive: false });

            canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.isMouseDown = false;
            }, { passive: false });
        }
    },

    update: function () {
        // Copy current keys to prevKeys for edge detection
        this.prevKeys = { ...this.keys };
        this.prevMouseDown = this.isMouseDown;
    },

    isDown: function (key) {
        return this.keys[key];
    },

    isJustPressed: function (key) {
        return this.keys[key] && !this.prevKeys[key];
    },

    isMouseJustPressed: function () {
        return this.isMouseDown && !this.prevMouseDown;
    }
};
