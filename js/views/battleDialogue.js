const BattleDialogue = {
    states: {
        P1: { active: false, timer: 0, texture: null },
        CPU: { active: false, timer: 0, texture: null }
    },

    // _cacheCanvas는 텍스처 생성 시 공유 임시 버퍼; 최종 결과는 별도 canvas로 복사해 반환
    _cacheCanvas: null,

    init: function () {
        if (!this._cacheCanvas) {
            this._cacheCanvas = document.createElement('canvas');
        }
    },

    show: function (text, owner) {
        if (!text) return;

        this.init();

        const state = this.states[owner];
        if (!state) return;

        state.active = true;
        state.timer = BattleConfig.DIALOGUE.life || 120;
        state.texture = this._generateTexture(text, owner);
    },

    update: function (dt = 1.0) {
        ['P1', 'CPU'].forEach(owner => {
            const state = this.states[owner];
            if (state.active) {
                state.timer -= dt;
                if (state.timer <= 0) {
                    state.active = false;
                    state.texture = null;
                }
            }
        });
    },

    draw: function (ctx) {
        ['P1', 'CPU'].forEach(owner => {
            const state = this.states[owner];
            if (state.active && state.texture) {
                this._drawBubble(ctx, state.texture, owner);
            }
        });
    },

    _drawBubble: function (ctx, texture, owner) {
        const conf = BattleConfig.DIALOGUE;
        const ownerConf = (owner === 'P1') ? conf.P1 : conf.CPU;

        // 도라 중앙 기준 앵커
        const centerX = 320;
        const doraY = 220;

        let x = centerX + ownerConf.offsetX;
        let y = doraY + ownerConf.offsetY;

        const w = texture.width;
        const h = texture.height;

        ctx.drawImage(texture, x - w / 2, y - h / 2);
    },

    _generateTexture: function (text, owner) {
        const conf = BattleConfig.DIALOGUE;
        const bubbleImg = Assets.get(conf.bubblePath);

        const w = bubbleImg ? bubbleImg.width : 200;
        const h = bubbleImg ? bubbleImg.height : 100;

        const canvas = this._cacheCanvas;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        if (bubbleImg) {
            if (owner === 'CPU') {
                // CPU 말풍선은 180도 회전
                ctx.save();
                ctx.translate(w / 2, h / 2);
                ctx.rotate(Math.PI);
                ctx.translate(-w / 2, -h / 2);
                ctx.drawImage(bubbleImg, 0, 0);
                ctx.restore();
            } else {
                ctx.drawImage(bubbleImg, 0, 0);
            }
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
            ctx.strokeRect(0, 0, w, h);
        }

        ctx.font = conf.font;
        ctx.fillStyle = conf.color || 'rgba(0, 0, 0, 1)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const maxWidth = w * 0.8;
        const lineHeight = conf.lineHeight || 20;

        const lines = this._wrapText(ctx, text, maxWidth);

        const totalTextHeight = lines.length * lineHeight;
        let startY = h / 2 - totalTextHeight / 2 + lineHeight / 2;

        const ownerConf = (owner === 'P1') ? conf.P1 : conf.CPU;
        startY += ownerConf.textOffsetY || 0;
        let startX = w / 2 + (ownerConf.textOffsetX || 0);

        lines.forEach((line, i) => {
            ctx.fillText(line, startX, startY + i * lineHeight);
        });

        // _cacheCanvas는 공유이므로 별도 canvas로 복사해 반환
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = w;
        outputCanvas.height = h;
        outputCanvas.getContext('2d').drawImage(canvas, 0, 0);

        return outputCanvas;
    },

    _wrapText: function (ctx, text, maxWidth) {
        const lines = [];
        let currentLine = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (char === '\n') {
                lines.push(currentLine);
                currentLine = '';
                continue;
            }

            const testLine = currentLine + char;
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

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
