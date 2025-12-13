const Input = {
    keys: {},
    prevKeys: {},

    // Mouse state
    mouseX: 0,
    mouseY: 0,
    isMouseDown: false,
    prevMouseDown: false,
    isRightMouseDown: false,
    prevRightMouseDown: false,

    // Cached Rect
    rect: null,
    scaleX: 1,
    scaleY: 1,

    // Key mapping (using e.code)
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    UP: 'ArrowUp',
    DOWN: 'ArrowDown',
    Z: 'KeyZ',
    X: 'KeyX',
    ENTER: 'Enter',
    SPACE: 'Space',
    ESC: 'Escape',
    D: 'KeyD',

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
            // Helper to update rect cache
            const updateRect = () => {
                this.rect = canvas.getBoundingClientRect();
                this.scaleX = canvas.width / this.rect.width;
                this.scaleY = canvas.height / this.rect.height;
            };
            this.resize = updateRect; // Expose for manual triggering (e.g. layout changes)

            // Update initially and on resize/scroll/fullscreen change
            // Helper to debounce events
            const debounce = (func, wait) => {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            };

            const debouncedUpdate = debounce(updateRect, 200);

            // Update initially
            updateRect();

            // Debounced listeners
            window.addEventListener('resize', debouncedUpdate);
            window.addEventListener('scroll', debouncedUpdate);
            document.addEventListener('fullscreenchange', () => {
                setTimeout(updateRect, 100);
            });

            canvas.addEventListener('mousemove', (e) => {
                if (!this.rect) return;
                this.mouseX = (e.clientX - this.rect.left) * this.scaleX;
                this.mouseY = (e.clientY - this.rect.top) * this.scaleY;
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
                updateRect(); // FORCE update rect to ensure coordinates are fresh (key for mobile)
                this.isTouch = true; // Flag touch interaction
                const touch = e.touches[0];
                this.mouseX = (touch.clientX - this.rect.left) * this.scaleX;
                this.mouseY = (touch.clientY - this.rect.top) * this.scaleY;
                this.isMouseDown = true;
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                this.isTouch = true;
                if (e.touches.length > 0) {
                    const touch = e.touches[0];
                    if (!this.rect) updateRect(); // Ensure rect exists
                    this.mouseX = (touch.clientX - this.rect.left) * this.scaleX;
                    this.mouseY = (touch.clientY - this.rect.top) * this.scaleY;
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
