const Input = {
    keys: {},
    prevKeys: {},

    mouseX: 0,
    mouseY: 0,
    prevMouseX: 0,
    prevMouseY: 0,
    isMouseDown: false,
    prevMouseDown: false,
    isRightMouseDown: false,
    prevRightMouseDown: false,

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

        // Enter·NumpadEnter를 Z(확인키)로 정규화 — 모든 isDown/isJustPressed가 자동 반응
        const normalize = (code) => (code === 'Enter' || code === 'NumpadEnter') ? this.Z : code;

        window.addEventListener('keydown', (e) => {
            if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
                e.preventDefault();
            }
            this.keys[normalize(e.code)] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[normalize(e.code)] = false;
        });

        if (canvas) {
            this.canvas = canvas;

            // rect을 매번 새로 읽어 레이아웃 변화(CSS transform·모바일 크롬바 등)에 면역
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

            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.isTouch = true;
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
        this.prevKeys = { ...this.keys };
        this.prevMouseDown = this.isMouseDown;
        this.prevRightMouseDown = this.isRightMouseDown;
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

    isMouseRightClick: function () {
        return this.isRightMouseDown && !this.prevRightMouseDown;
    }
};
