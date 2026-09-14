// 이미지 폰트 렌더링 — 아틀라스 PNG에서 글자 셀을 잘라 그린다.
//
// Assets 객체 안에 섞여 있던 것을 옮겼다. "에셋 로더"와 "캔버스 드로잉"이 한 이름 뒤에
// 숨어 있어 Assets.drawAlphabet 이 어디 있는지 파일 이름만으론 짐작할 수 없었다.
// 이미지는 Assets.get()으로 받는다 — 로딩은 여전히 Assets 담당.
//
//   drawAlphabet  ui/alphabet.png     A-Z ?.,!  32px 그리드, orange/yellow 2행
//   drawStaffGlyph ending/staff.png   크레딧 전용 16열×8행 40×64, 한자·가나·한글 포함
//   drawNumberBig ui/number_big.png   0-9 10등분
const BitmapFont = {
    drawAlphabet: function (ctx, text, x, y, options = {}) {
        const img = Assets.get('ui/alphabet.png');
        if (!img) return;

        let color = options.color || 'orange';
        if (typeof options === 'string') color = options;

        const scale = options.scale || 1.0;
        const frameWidth = 32;
        const frameHeight = 32;

        const baseSpacing = options.spacing !== undefined ? options.spacing : 32;
        const spacing = baseSpacing * scale;

        // 공백 폭 기본값: 글자 폭의 절반(16)
        const baseSpaceWidth = options.spaceWidth !== undefined ? options.spaceWidth : 16;
        const spaceWidth = baseSpaceWidth * scale;
        const align = options.align || 'left';

        const destW = frameWidth * scale;
        const destH = frameHeight * scale;

        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ?.,!";

        let totalWidth = 0;
        text = text.toUpperCase();

        // 글자별 어드밴스(소스는 32px 그리드). A-Z는 spacing 기본값 사용.
        const charWidths = {
            '.': 12,
            ',': 12,
            '!': 12,
            '?': 32
        };

        const getAdvance = (char) => {
            if (char === ' ') return spaceWidth;
            if (charWidths[char] !== undefined) return charWidths[char] * scale;
            return spacing;
        };

        for (let i = 0; i < text.length; i++) {
            totalWidth += getAdvance(text[i]);
        }

        let currentX = x;
        if (align === 'center') currentX -= totalWidth / 2;
        else if (align === 'right') currentX -= totalWidth;

        // 아틀라스 row: 0=orange, 1=yellow
        const row = (color === 'yellow') ? 1 : 0;
        const sy = row * frameHeight;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const advance = getAdvance(char);

            if (char === ' ') {
                currentX += advance;
                continue;
            }

            const index = chars.indexOf(char);
            if (index !== -1) {
                const sx = index * frameWidth;
                ctx.drawImage(img, sx, sy, frameWidth, frameHeight, currentX, y, destW, destH);
            }

            currentX += advance;
        }
    },

    // ending/staff.png: 크레딧 전용 이미지 폰트. 16열×8행, 셀 40×64. 한자·가나·라틴·한국어 포함.
    STAFF_FONT_ROWS: [
        '幻世牌遊記STAFプランナーログ',
        'マデザイサウド&エフェクトEX.',
        'ュ南千晶さかや☆えびふらい八斎藤',
        '桜河内揚羽ごん太のぞみどりゅう3',
        '24不凡MO仁井谷ぶたっセニョル',
        '北CPIL198ィレタスペシャ',
        '환세패유기플래너디자이프로그머사',
        '운드펙트스페셜땡렉터듀서팬맛굴'
    ],
    _staffFontMap: null,

    _buildStaffFontMap: function () {
        const map = {};
        this.STAFF_FONT_ROWS.forEach((rowStr, row) => {
            Array.from(rowStr).forEach((ch, col) => {
                if (map[ch] === undefined) map[ch] = { col: col, row: row };
            });
        });
        // 공백 = 아틀라스 맨 오른쪽 끝 빈 셀
        map[' '] = { col: 15, row: 7 };
        this._staffFontMap = map;
        return map;
    },

    drawStaffGlyph: function (ctx, ch, x, y, scale) {
        const img = Assets.get('ending/staff.png');
        if (!img) return;
        const map = this._staffFontMap || this._buildStaffFontMap();
        const cell = map[ch];
        if (!cell) return;
        const W = 40, H = 64;
        ctx.drawImage(img, cell.col * W, cell.row * H, W, H, x, y, W * scale, H * scale);
    },

    drawNumberBig: function (ctx, number, x, y, options = {}) {
        const imgId = options.imgId || 'ui/number_big.png';
        const img = Assets.get(imgId);
        if (!img) return;

        // 0–9, 10등분
        const frameWidth = img.width / 10;
        const frameHeight = img.height;
        const spacing = options.spacing || 2;
        const align = options.align || 'center';
        const scale = options.scale || 1.0;

        if (number === undefined || number === null) number = 0;
        const str = number.toString();

        const dw = frameWidth * scale;
        const dh = frameHeight * scale;
        const scaledSpacing = spacing * scale;

        let totalW = (str.length * dw) + ((str.length - 1) * scaledSpacing);

        let startX = x;
        if (align === 'center') {
            startX = x - totalW / 2;
        } else if (align === 'right') {
            startX = x - totalW;
        }

        let currentX = startX;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const val = parseInt(char);

            if (!isNaN(val)) {
                const sx = val * frameWidth;
                ctx.drawImage(img, sx, 0, frameWidth, frameHeight, currentX, y, dw, dh);
            }

            currentX += dw + scaledSpacing;
        }
    }
};
