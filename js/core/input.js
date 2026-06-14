const Input = {
    keys: {},
    prevKeys: {},

    // Mouse state
    mouseX: 0,
    mouseY: 0,
    prevMouseX: 0,
    prevMouseY: 0,
    isMouseDown: false,
    prevMouseDown: false,
    isRightMouseDown: false,
    prevRightMouseDown: false,

    // Key mapping (using e.code)
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    UP: 'ArrowUp',
    DOWN: 'ArrowDown',
    Z: 'KeyZ',
    SPACE: 'Space',
    ESC: 'Escape',

    init: function (canvas) {
        if (this.initialized) return;
        this.initialized = true;

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
            this.canvas = canvas;

            // Map a client (screen) coordinate to internal canvas coordinates.
            // The rect is read fresh on every pointer event: getBoundingClientRect
            // on a single element inside a read-only handler is cheap, and it makes
            // coordinates immune to any layout shift (CSS transforms, panel toggles,
            // mobile browser chrome) without needing to invalidate a cached rect.
            this.mapToCanvas = (clientX, clientY) => {
                const rect = canvas.getBoundingClientRect();
                this.mouseX = (clientX - rect.left) * (canvas.width / rect.width);
                this.mouseY = (clientY - rect.top) * (canvas.height / rect.height);
            };

            canvas.addEventListener('mousemove', (e) => {
                this.mapToCanvas(e.clientX, e.clientY);
            });

            canvas.addEventListener('mousedown', (e) => {
                if (e.button === 0) {
                    this.isMouseDown = true;
                } else if (e.button === 2) {
                    this.isRightMouseDown = true;
                }
            });

            window.addEventListener('mouseup', (e) => {
                if (e.button === 0) {
                    this.isMouseDown = false;
                } else if (e.button === 2) {
                    this.isRightMouseDown = false;
                }
            });

            // Touch Support
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scrolling
                this.isTouch = true; // Flag touch interaction
                const touch = e.touches[0];
                this.mapToCanvas(touch.clientX, touch.clientY);
                this.isMouseDown = true;
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                this.isTouch = true;
                if (e.touches.length > 0) {
                    const touch = e.touches[0];
                    this.mapToCanvas(touch.clientX, touch.clientY);
                }
            }, { passive: false });

            canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.isTouch = true;
                this.isMouseDown = false;
            }, { passive: false });
        }
    },

    update: function () {
        // Copy current keys to prevKeys for edge detection
        this.prevKeys = { ...this.keys };
        this.prevMouseDown = this.isMouseDown;
        this.prevRightMouseDown = this.isRightMouseDown;

        // Mouse move tracking
        this.prevMouseX = this.mouseX;
        this.prevMouseY = this.mouseY;
    },

    hasMouseMoved: function () {
        return Math.abs(this.mouseX - this.prevMouseX) > 0.1 || Math.abs(this.mouseY - this.prevMouseY) > 0.1;
    },

    isDown: function (key) {
        return this.keys[key];
    },

    isJustPressed: function (key) {
        return this.keys[key] && !this.prevKeys[key];
    },

    isMouseJustPressed: function () {
        return this.isMouseDown && !this.prevMouseDown;
    },

    isMouseRightClick: function () { // Just Pressed check for Right Click
        return this.isRightMouseDown && !this.prevRightMouseDown;
    }
};
