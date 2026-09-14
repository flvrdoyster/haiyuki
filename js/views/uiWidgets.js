// UI 위젯과 그 재료가 되는 스프라이트/패턴 프리미티브.
//
// Assets 객체 안에 섞여 있던 것을 옮겼다(BitmapFont 와 같은 이유). 이미지는
// Assets.get()으로 받는다 — 로딩은 여전히 Assets 담당.
//
//   프리미티브: drawFrame(수평 스트립 스프라이트) · getPattern(패턴 캐시) · drawTiled
//   위젯:       drawUIFrame(9-slice 테두리) · drawWindow · drawButton
//
// getPattern 은 패턴을 이미지 객체(img._patterns)에 캐시한다 — ctx 마다 다시 만들 필요 없음.
const UIWidgets = {
    drawFrame: function (ctx, filename, x, y, frameIndex, frameWidth, frameHeight) {
        const img = Assets.get(filename);
        if (!img) return;

        if (!frameWidth || !frameHeight) {
            ctx.drawImage(img, x, y);
            return;
        }

        const sx = frameIndex * frameWidth;
        const sy = 0; // 수평 스트립 가정

        if (sx >= img.width) return;

        ctx.drawImage(img, sx, sy, frameWidth, frameHeight, x, y, frameWidth, frameHeight);
    },

    drawUIFrame: function (ctx, x, y, w, h) {
        const tl = Assets.get('ui/frame/corner-lefttop.png');
        const tr = Assets.get('ui/frame/corner-righttop.png');
        const bl = Assets.get('ui/frame/corner-leftbottom.png');
        const br = Assets.get('ui/frame/corner-rightbottom.png');

        const top = Assets.get('ui/frame/line-top.png');
        const bottom = Assets.get('ui/frame/line-bottom.png');
        const left = Assets.get('ui/frame/line-left.png');
        const right = Assets.get('ui/frame/line-right.png');

        if (!tl || !tr || !bl || !br || !top || !bottom || !left || !right) {
            return;
        }

        ctx.drawImage(tl, x, y);
        ctx.drawImage(tr, x + w - tr.width, y);
        ctx.drawImage(bl, x, y + h - bl.height);
        ctx.drawImage(br, x + w - br.width, y + h - br.height);

        const innerX = x + tl.width;
        const innerW = w - tl.width - tr.width;
        if (innerW > 0) {
            this.drawTiled(ctx, top, innerX, y, innerW, top.height, 'horizontal');
            this.drawTiled(ctx, bottom, innerX, y + h - bottom.height, innerW, bottom.height, 'horizontal');
        }

        const innerY = y + tl.height;
        const innerH = h - tl.height - bl.height;

        if (innerH > 0) {
            this.drawTiled(ctx, left, x, innerY, left.width, innerH, 'vertical');
            this.drawTiled(ctx, right, x + w - right.width, innerY, right.width, innerH, 'vertical');
        }
    },

    getPattern: function (ctx, img, repetition = 'repeat') {
        if (!img._patterns) img._patterns = {};
        if (!img._patterns[repetition]) {
            img._patterns[repetition] = ctx.createPattern(img, repetition);
        }
        return img._patterns[repetition];
    },

    drawTiled: function (ctx, img, x, y, fillW, fillH, direction) {
        ctx.save();
        ctx.translate(x, y);
        // fillRect가 영역을 제한하므로 'repeat'으로 충분
        const ptrn = this.getPattern(ctx, img, 'repeat');
        ctx.fillStyle = ptrn;
        ctx.fillRect(0, 0, fillW, fillH);
        ctx.restore();
    },
    drawWindow: function (ctx, x, y, w, h) {
        ctx.save();
        this.drawUIFrame(ctx, x, y, w, h);

        const border = 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x + border, y + border, w - (border * 2), h - (border * 2));
        ctx.restore();
    },

    drawButton: function (ctx, x, y, w, h, label, isSelected, options = {}) {
        ctx.save();

        if (!options.noBorder) {
            this.drawUIFrame(ctx, x, y, w, h);

            // 프레임 에셋 미로드 시 폴백 테두리
            if (!Assets.get('ui/frame/corner-lefttop.png')) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
                ctx.strokeRect(x, y, w, h);
            }
        }

        if (isSelected) {
            ctx.fillStyle = options.cursorColor || 'rgba(255, 105, 180, 0.5)';
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        }

        ctx.fillStyle = isSelected ? 'rgba(255, 255, 0, 1)' : 'rgba(255, 255, 255, 1)';
        const fontName = (typeof FONTS !== 'undefined') ? FONTS.bold : 'sans-serif';
        ctx.font = options.font || `bold 16px ${fontName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2);

        ctx.restore();
    }
};
