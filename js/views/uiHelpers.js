// Shared canvas UI helpers used by multiple scenes (confirm dialog layout/drawing).
const UIHelpers = {
    /**
     * Compute the layout for a confirm dialog: window box, message lines,
     * and YES/NO button rects. Message lines are split on a literal "\n"
     * (backslash + n) to match the dialogue data format.
     * @param {string} msg
     * @param {object} opts - { centerY: true } ignores BattleConfig.CONFIRM.y
     *                        and centers the box vertically (title screen behavior).
     */
    getConfirmLayout: function (msg, opts = {}) {
        const conf = BattleConfig.CONFIRM || {
            minWidth: 320, minHeight: 160, padding: { x: 40, y: 30 },
            font: '20px sans-serif', lineHeight: 28,
            buttonHeight: 40, buttonWidth: 100, buttonGap: 40, buttonMarginTop: 30
        };

        const lines = msg.split('\\n');

        // Rough text measurement (no ctx here): CJK ~16px, ASCII ~9px per char.
        let maxLineWidth = 0;
        lines.forEach(line => {
            let width = 0;
            for (let i = 0; i < line.length; i++) {
                width += (line.charCodeAt(i) > 255) ? 16 : 9;
            }
            if (width > maxLineWidth) maxLineWidth = width;
        });

        const textH = lines.length * conf.lineHeight;
        const buttonAreaH = conf.buttonMarginTop + conf.buttonHeight;

        const boxW = Math.max(maxLineWidth + (conf.padding.x * 2), conf.minWidth);
        const boxH = Math.max(textH + (conf.padding.y * 2) + buttonAreaH, conf.minHeight);

        const boxX = (640 - boxW) / 2;
        const boxY = (!opts.centerY && conf.y !== undefined) ? conf.y : (480 - boxH) / 2;

        const buttonY = boxY + boxH - conf.padding.y - conf.buttonHeight;
        const totalBtnW = (conf.buttonWidth * 2) + conf.buttonGap;
        const startBtnX = 320 - (totalBtnW / 2);

        return {
            msg: msg,
            box: { x: boxX, y: boxY, w: boxW, h: boxH },
            text: { startY: boxY + conf.padding.y + conf.lineHeight, lines: lines, lineHeight: conf.lineHeight },
            yesBtn: { x: startBtnX, y: buttonY, w: conf.buttonWidth, h: conf.buttonHeight },
            noBtn: { x: startBtnX + conf.buttonWidth + conf.buttonGap, y: buttonY, w: conf.buttonWidth, h: conf.buttonHeight }
        };
    },

    /**
     * Draw a confirm dialog: full-screen dimmer, window, message, YES/NO buttons.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} layout - result of getConfirmLayout
     * @param {number} selectedIndex - 0 = yes, 1 = no
     */
    drawConfirmDialog: function (ctx, layout, selectedIndex) {
        const conf = BattleConfig.CONFIRM || {};

        ctx.save();

        // Dimmer
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 640, 480);

        // Dialog Box
        Assets.drawWindow(ctx, layout.box.x, layout.box.y, layout.box.w, layout.box.h);

        // Message Text
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        const fontName = (typeof FONTS !== 'undefined') ? FONTS.regular : 'sans-serif';
        ctx.font = conf.font || `20px ${fontName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        layout.text.lines.forEach((line, i) => {
            ctx.fillText(line, 320, layout.text.startY + (i * layout.text.lineHeight));
        });

        // Buttons
        const yesLabel = (conf.labels && conf.labels.yes) ? conf.labels.yes : 'YES';
        const noLabel = (conf.labels && conf.labels.no) ? conf.labels.no : 'NO';
        const yes = layout.yesBtn;
        const no = layout.noBtn;

        Assets.drawButton(ctx, yes.x, yes.y, yes.w, yes.h, yesLabel, selectedIndex === 0, { noBorder: true });
        Assets.drawButton(ctx, no.x, no.y, no.w, no.h, noLabel, selectedIndex === 1, { noBorder: true });

        ctx.restore();
    }
};
