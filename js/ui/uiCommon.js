const UI = {
    // Standard Window Drawing
    // Draws typical 9-slice frame with inner dimmer
    drawWindow: function (ctx, x, y, w, h) {
        // 1. Frame
        Assets.drawUIFrame(ctx, x, y, w, h);

        // 2. Inner Dimmer (Standard 4px border)
        const border = 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x + border, y + border, w - (border * 2), h - (border * 2));
    },

    // Standard Button Drawing (Matches Draw Button & Confirm Button styles)
    drawButton: function (ctx, x, y, w, h, label, isSelected, options = {}) {
        ctx.save();
        // 1. Frame
        Assets.drawUIFrame(ctx, x, y, w, h);

        // Fallback: If UI Frame assets missing, draw a border
        if (!Assets.get('ui/frame/corner-lefttop.png')) {
            ctx.strokeStyle = 'white';
            ctx.strokeRect(x, y, w, h);
        }

        // 2. Inner Dimmer / Highlight
        if (isSelected) {
            // Selected: Pink highlight
            // Default pink: rgba(255, 105, 180, 0.5)
            ctx.fillStyle = options.cursorColor || 'rgba(255, 105, 180, 0.5)';
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        } else {
            // Unselected: Dark dimmer
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        }

        // 3. Text
        ctx.fillStyle = isSelected ? '#FFFF00' : 'white';
        // Font size 16px bold is standard for these buttons
        ctx.font = options.font || `bold 16px ${FONTS.bold}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2);
        ctx.restore();
    },



    // Confirmation Dialog Submodule
    Confirm: {
        isActive: false,
        message: '',
        selectedOption: 0, // 0: YES, 1: NO
        onConfirm: null,
        onCancel: null,
        lastMouseX: 0,
        lastMouseY: 0,

        inputCooldown: 0,

        show: function (message, onConfirm, onCancel) {
            this.isActive = true;
            this.message = message;
            this.selectedOption = 0;
            this.onConfirm = onConfirm || function () { };
            this.onCancel = onCancel || function () { };
            this.inputCooldown = 15; // Wait 15 frames (~0.25s) before accepting input
            // Reset last mouse position
            if (window.Input) {
                this.lastMouseX = Input.mouseX;
                this.lastMouseY = Input.mouseY;
            }
        },

        hide: function () {
            this.isActive = false;
            this.message = '';
            this.onConfirm = null;
            this.onCancel = null;
        },

        update: function () {
            if (!this.isActive) return;

            // Input Cooldown
            if (this.inputCooldown > 0) {
                this.inputCooldown--;
                return;
            }

            // Button Layout Calculation (must match draw)
            // Button Layout Calculation (must match draw)
            const boxW = 300;
            const boxH = 160;
            const boxX = (640 - boxW) / 2; // 170
            const boxY = (480 - boxH) / 2; // 160

            const buttonY = boxY + boxH - 50;
            const buttonW = 100;
            const buttonH = 40;
            const buttonGap = 20;

            const yesX = 320 - buttonW - buttonGap / 2;
            const noX = 320 + buttonGap / 2;

            // Mouse Interaction
            const mx = Input.mouseX;
            const my = Input.mouseY;
            const mouseMoved = (mx !== this.lastMouseX || my !== this.lastMouseY);

            if (mouseMoved) {
                this.lastMouseX = mx;
                this.lastMouseY = my;

                // Check YES Button
                if (mx >= yesX && mx <= yesX + buttonW && my >= buttonY && my <= buttonY + buttonH) {
                    this.selectedOption = 0;
                }
                // Check NO Button
                else if (mx >= noX && mx <= noX + buttonW && my >= buttonY && my <= buttonY + buttonH) {
                    this.selectedOption = 1;
                }
            }

            // Mouse Click
            if (Input.isMouseJustPressed()) {
                if (mx >= yesX && mx <= yesX + buttonW && my >= buttonY && my <= buttonY + buttonH) {
                    const callback = this.onConfirm;
                    this.hide();
                    if (callback) callback();
                    return;
                }
                if (mx >= noX && mx <= noX + buttonW && my >= buttonY && my <= buttonY + buttonH) {
                    const callback = this.onCancel;
                    this.hide();
                    if (callback) callback();
                    return;
                }
            }

            // Keyboard Navigation
            if (Input.isJustPressed(Input.LEFT) || Input.isJustPressed(Input.UP)) {
                this.selectedOption = (this.selectedOption === 0) ? 1 : 0;
            }
            if (Input.isJustPressed(Input.RIGHT) || Input.isJustPressed(Input.DOWN)) {
                this.selectedOption = (this.selectedOption === 0) ? 1 : 0;
            }

            // Confirm selection
            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER)) {
                if (this.selectedOption === 0) {
                    // YES
                    const callback = this.onConfirm;
                    this.hide();
                    if (callback) callback();
                } else {
                    // NO
                    const callback = this.onCancel;
                    this.hide();
                    if (callback) callback();
                }
            }

            // Cancel with ESC or X
            if (Input.isJustPressed(Input.ESCAPE) || Input.isJustPressed(Input.X)) {
                const callback = this.onCancel;
                this.hide();
                if (callback) callback();
            }
        },

        draw: function (ctx) {
            if (!this.isActive) return;

            ctx.save();
            // 1. Dimmer
            // UI.drawWindow does inner dimmer, but usually we want Full Screen dimmer for modal.
            // BattleConfig.RESULT dimmerColor
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, 640, 480);

            // 2. Dialog Box
            const boxW = 300;
            const boxH = 160;
            const boxX = (640 - boxW) / 2; // 170
            const boxY = (480 - boxH) / 2; // 160

            UI.drawWindow(ctx, boxX, boxY, boxW, boxH);

            // 3. Message Text
            ctx.fillStyle = 'white';
            ctx.font = `18px ${FONTS.regular}`;
            ctx.textAlign = 'center';

            const lines = this.message.split('\\n');
            const lineHeight = 24;
            // Center text vertically in the upper portion
            // Available height approx 110px.
            const startY = boxY + 50;

            lines.forEach((line, i) => {
                ctx.fillText(line, 320, startY + (i * lineHeight));
            });

            // 4. Buttons
            const buttonY = boxY + boxH - 60;
            const buttonW = 100;
            const gap = 20;
            const yesX = boxX + (boxW / 2) - buttonW - (gap / 2);
            const noX = boxX + (boxW / 2) + (gap / 2);

            UI.drawButton(ctx, yesX, buttonY, buttonW, 40, "예", this.selectedOption === 0);
            UI.drawButton(ctx, noX, buttonY, buttonW, 40, "아니오", this.selectedOption === 1);
            ctx.restore();
        }
    }
};
