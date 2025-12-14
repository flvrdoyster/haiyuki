const BattleDialogue = {
    active: false,
    timer: 0,
    currentTexture: null, // The cached canvas/image
    owner: null, // 'P1' or 'CPU'

    // Offscreen Canvas for caching
    _cacheCanvas: null,

    init: function () {
        if (!this._cacheCanvas) {
            this._cacheCanvas = document.createElement('canvas');
            // Size will be adjusted per bubble
        }
    },

    show: function (text, owner) {
        if (!text) return;
        this.init();

        this.owner = owner;
        this.active = true;
        this.timer = BattleConfig.DIALOGUE.life || 120;

        // Generate Texture
        this.currentTexture = this._generateTexture(text, owner);
    },

    update: function () {
        if (!this.active) return;

        this.timer--;
        if (this.timer <= 0) {
            this.active = false;
            this.currentTexture = null;
        }
    },

    draw: function (ctx, state) {
        if (!this.active || !this.currentTexture) return;

        const conf = BattleConfig.DIALOGUE;
        const ownerConf = (this.owner === 'P1') ? conf.P1 : conf.CPU;

        // Determine Position
        // We need the character's portrait position usually, but simpler to use constant UI positions?
        // Config has offsets. Let's assume standard portrait positions.
        // P1 Portrait: x: -34, y: 60 (BattleConfig.PORTRAIT.P1)
        // CPU Portrait: x: 674, y: 60
        // BUT BattleRenderer draws portraits differently.
        // Let's use fixed anchors from BattleConfig if available or calculate.

        // Anchor to Center/Dora (Matching dialogue_debug.html)
        const centerX = 320;
        const doraY = 220; // 180 + 40 (Dora Y + Offset)

        // Apply Config Offsets
        let x = centerX + ownerConf.offsetX;
        let y = doraY + ownerConf.offsetY;



        // Center the bubble on the anchor? Or Top-Left?
        // Let's assume Top-Left drawing for now, or Center.
        // Texture has the bubble.

        // Let's optimize: Draw center-aligned
        const w = this.currentTexture.width;
        const h = this.currentTexture.height;

        ctx.drawImage(this.currentTexture, x - w / 2, y - h / 2);
    },

    _generateTexture: function (text, owner) {
        const conf = BattleConfig.DIALOGUE;
        const bubbleImg = Assets.get(conf.bubblePath);

        // 1. Setup Canvas
        const w = bubbleImg ? bubbleImg.width : 200;
        const h = bubbleImg ? bubbleImg.height : 100;

        const canvas = this._cacheCanvas;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // 2. Draw Bubble
        if (bubbleImg) {
            // Check Flip for CPU?
            if (owner === 'CPU') {
                // CPU: Rotate 180 (Flip X and Y) to point tail UP-RIGHT
                // (Matches dialogue_debug.html logic)
                ctx.save();
                ctx.translate(w / 2, h / 2);
                ctx.rotate(Math.PI);
                ctx.translate(-w / 2, -h / 2); // Center pivot
                ctx.drawImage(bubbleImg, 0, 0);
                ctx.restore();
            } else {
                ctx.drawImage(bubbleImg, 0, 0);
            }
        } else {
            // Fallback
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(0, 0, w, h);
        }

        // 3. Draw Text
        ctx.font = conf.font; // "18px 'KoddiUDOnGothic-Regular'"
        // Check Font Loading? Assumed loaded by CSS/Assets.

        ctx.fillStyle = conf.color || 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word Wrap Logic
        const maxWidth = w * 0.8; // 80% padding
        const lineHeight = conf.lineHeight || 20;

        const lines = this._wrapText(ctx, text, maxWidth);

        // Center Block vertically
        const totalTextHeight = lines.length * lineHeight;
        let startY = h / 2 - totalTextHeight / 2 + lineHeight / 2;

        // Adjust for specific offsets
        const ownerConf = (owner === 'P1') ? conf.P1 : conf.CPU;
        startY += ownerConf.textOffsetY || 0;
        let startX = w / 2 + (ownerConf.textOffsetX || 0);

        lines.forEach((line, i) => {
            ctx.fillText(line, startX, startY + i * lineHeight);
        });

        // 4. Return as ImageSource (Canvas is valid ImageSource)
        return canvas;
    },

    _wrapText: function (ctx, text, maxWidth) {
        const words = text.split(''); // CJK: Split by char might be better, or standard space split?
        // Korean wraps by char mostly, but let's try space check first.
        // If text has no spaces (common in Korean short phrases), split by char is safer?
        // Let's stick to standard word split for now, but if it's CJK, we might need char split.
        // Actually, simple "add char catch width" is safest for mixed.

        const lines = [];
        let currentLine = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const testLine = currentLine + char;
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            // Handle Newlines explicit
            if (char === '\n') {
                lines.push(currentLine);
                currentLine = '';
                continue;
            }

            if (testWidth > maxWidth && i > 0) {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
        return lines;
    }
};
