// 스태프롤: 각 섹션을 타일 단위로 조립. 틀린 타일 삽입→폐기→정답 타일 착지→낙하 순으로 진행.
// 마지막 섹션(copyright)은 미리 만든 이미지.

const CreditsConfig = {
    SCREEN_W: 640,
    SCREEN_H: 480,

    LABEL_X: 100,        // 역할 레이블 좌측 끝
    BODY_X: 280,         // 이름 줄 좌측 끝(들여쓰기)
    SECTION_CENTER_Y: 240,
    V_MARGIN: 10,

    ADV: 40,             // 글자 폭
    CELL_H: 64,

    TITLE_SCALE: 1,
    ROLE_SCALE: 1,
    NAME_SCALE: 1,

    // 클로징 이미지('ui/logo_compile_1998.png')
    COPY_LOGO_SCALE: 1,
    COPY_Y: 228,
    COPY_FADEIN: 20,

    SLIDE: 8,
    SLIDE_DX: 180,
    BOUNCE: 16,
    BOUNCE_H: 20,
    DRAW_STEP: 8,        // 다음 타일 시작 딜레이

    // 틀린 타일은 같은 문자 계통에서 뽑음(_scriptOf / _pickWrong)
    ASSEMBLE_PAUSE: 20,  // 틀린 타일 표시 유지
    DISCARD: 11,         // 틀린 타일 상승 폐기
    RISE: 90,
    SHIFT: 9,            // 빈 자리 메우기

    HOLD: 90,
    COPY_HOLD: 120,

    FALL_G: 1.2,         // 낙하 가속도
    FALL_DONE: 58,

    FADE_FRAMES: 70,
    END_HOLD: 40
};

const STAFF_ROLL = [
    { title: '환세패유기 STAFF' },
    { role: '플래너', names: ['南 千晶', 'さかや☆'] },
    { role: '디자이너', names: ['えびふらい八', '斎藤'] },
    { role: '디자이너', names: ['桜河内 揚羽', 'ごん太'] },
    { role: '프로그래머', names: ['のぞみ', 'どらりゅう'] },
    { role: '사운드 & 이펙트', names: ['324'] },
    { role: '스페셜 땡스', names: ['セニョール河北', 'ぶんたった'] },
    { role: '스페셜 땡스', names: ['ALL', 'COMPILE', 'STAFF'] },
    { role: '디렉터', names: ['のぞみ'] },
    { role: '프로듀서', names: ['不凡'] },
    { role: 'EX. 프로듀서', names: ['MOO仁井谷'] },
    { role: '팬', names: ['맛굴'] },
    { copyright: 'COMPILE 1998' }
];

function _easeOut(p) { return p * (2 - p); }

const CreditsScene = {
    t: 0,
    idx: 0,
    sections: [],
    finished: false,
    fade: 0,
    _pools: null,

    init: function () {
        this.t = 0;
        this.idx = 0;
        this.finished = false;
        this.fade = 0;
        this.buildSections();

        // 엔딩 씬에서 이미 bgm_ending을 재생 중이면 이어서; 그 외 경로는 여기서 시작
        if (Assets.currentBgmId !== 'audio/bgm_ending') Assets.playMusic('audio/bgm_ending');
    },

    buildSections: function () {
        const C = CreditsConfig;
        this.sections = STAFF_ROLL.map((entry) => {
            if (entry.copyright !== undefined) {
                return { tiles: [], isCopyright: true, holdEnd: C.COPY_HOLD };
            }

            let lines;
            if (entry.title !== undefined) {
                lines = [{ text: entry.title, scale: C.TITLE_SCALE, x: C.LABEL_X }];
            } else {
                lines = [{ text: entry.role, scale: C.ROLE_SCALE, x: C.LABEL_X }]
                    .concat(entry.names.map(n => ({ text: n, scale: C.NAME_SCALE, x: C.BODY_X })));
            }

            let totalH = 0;
            lines.forEach(l => { totalH += C.CELL_H * l.scale; });
            totalH += (lines.length - 1) * C.V_MARGIN;
            let cursorY = C.SECTION_CENTER_Y - totalH / 2;

            const tiles = [];
            let order = 0;
            lines.forEach((line) => {
                const ty = cursorY;
                const adv = C.ADV * line.scale;
                const chars = Array.from(line.text);
                const N = chars.length;
                const slotX = (s) => line.x + s * adv;

                const p = Math.floor(Math.random() * N);
                const script = this._scriptOf(chars[p]) || this._dominantScript(chars) || 'jp';
                const wrongCh = this._pickWrong(script, chars[p]);
                for (let j = 0; j < N; j++) {
                    let ch, isWrong = false, finalX;
                    if (j < p) { ch = chars[j]; finalX = slotX(j); }
                    else if (j === p) { ch = wrongCh; isWrong = true; finalX = null; }
                    else { ch = chars[j - 1]; finalX = slotX(j - 1); }
                    tiles.push({
                        ch: ch, ty: ty, scale: line.scale,
                        assembleX: slotX(j), finalX: finalX,
                        isWrong: isWrong, isLast: false,
                        startT: order * C.DRAW_STEP, fallDelay: Math.random() * 5
                    });
                    order++;
                }
                // 마지막 글자는 폐기·이동 후 가장 나중에 착지
                tiles.push({
                    ch: chars[N - 1], ty: ty, scale: line.scale,
                    assembleX: null, finalX: slotX(N - 1),
                    isWrong: false, isLast: true,
                    startT: null, fallDelay: Math.random() * 5
                });

                cursorY += C.CELL_H * line.scale + C.V_MARGIN;
            });

            let assembleEnd = 0;
            tiles.forEach(t => { if (t.startT !== null) assembleEnd = Math.max(assembleEnd, t.startT + C.SLIDE + C.BOUNCE); });
            const typoStart = assembleEnd + C.ASSEMBLE_PAUSE;
            const discardEnd = typoStart + C.DISCARD;
            const shiftEnd = discardEnd + C.SHIFT;
            const completeEnd = shiftEnd + C.SLIDE + C.BOUNCE;

            return {
                tiles: tiles, isCopyright: false,
                typoStart: typoStart, discardEnd: discardEnd, shiftEnd: shiftEnd,
                holdEnd: completeEnd + C.HOLD
            };
        });
    },

    // 'kr'(한글) / 'an'(라틴+숫자) / 'jp'(가나·한자) / null(기호·공백)
    _scriptOf: function (ch) {
        if (!ch) return null;
        const c = ch.codePointAt(0);
        if (c >= 0xAC00 && c <= 0xD7A3) return 'kr';
        if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A) || (c >= 0x30 && c <= 0x39)) return 'an';
        if ((c >= 0x3040 && c <= 0x30FF) || (c >= 0x4E00 && c <= 0x9FFF)) return 'jp';
        return null;
    },

    // 아틀라스 글리프에서 계통별 풀 구축(최초 1회)
    _buildPools: function () {
        const pools = { kr: [], an: [], jp: [] };
        const seen = {};
        (Assets.STAFF_FONT_ROWS || []).forEach(row => {
            for (const ch of Array.from(row)) {
                const s = this._scriptOf(ch);
                if (s && !seen[ch]) { seen[ch] = 1; pools[s].push(ch); }
            }
        });
        this._pools = pools;
        return pools;
    },

    _dominantScript: function (chars) {
        const cnt = { kr: 0, an: 0, jp: 0 };
        chars.forEach(ch => { const s = this._scriptOf(ch); if (s) cnt[s]++; });
        let best = null, max = 0;
        for (const k in cnt) if (cnt[k] > max) { max = cnt[k]; best = k; }
        return best;
    },

    _pickWrong: function (script, exclude) {
        const pools = this._pools || this._buildPools();
        const all = pools[script] || [];
        const pool = all.filter(c => c !== exclude);
        const src = pool.length ? pool : all;
        return src.length ? src[Math.floor(Math.random() * src.length)] : exclude;
    },

    _tileState: function (tile, sec) {
        const C = CreditsConfig;
        const t = this.t;
        const slideIn = (p, x) => ({ x: x + (1 - _easeOut(p)) * C.SLIDE_DX, y: tile.ty });
        const bounce = (p, x) => ({ x: x, y: tile.ty - Math.sin(p * Math.PI) * C.BOUNCE_H });

        // 마지막 글자: 갭이 닫힌 뒤 착지
        if (tile.isLast) {
            if (t < sec.shiftEnd) return null;
            const lt = t - sec.shiftEnd;
            const pos = lt < C.SLIDE ? slideIn(lt / C.SLIDE, tile.finalX)
                : bounce(Math.min(1, (lt - C.SLIDE) / C.BOUNCE), tile.finalX);
            return { ch: tile.ch, x: pos.x, y: pos.y, alpha: 1 };
        }

        if (t < tile.startT) return null;

        const assembleDone = tile.startT + C.SLIDE + C.BOUNCE;
        if (t < assembleDone) {
            const lt = t - tile.startT;
            const pos = lt < C.SLIDE ? slideIn(lt / C.SLIDE, tile.assembleX)
                : bounce((lt - C.SLIDE) / C.BOUNCE, tile.assembleX);
            return { ch: tile.ch, x: pos.x, y: pos.y, alpha: 1 };
        }

        if (tile.isWrong) {
            if (t < sec.typoStart) return { ch: tile.ch, x: tile.assembleX, y: tile.ty, alpha: 1 };
            if (t < sec.discardEnd) {
                const p = (t - sec.typoStart) / C.DISCARD;
                return { ch: tile.ch, x: tile.assembleX, y: tile.ty - _easeOut(p) * C.RISE, alpha: 1 - p };
            }
            return null;
        }

        // 위치가 안 바뀌는 타일은 그대로
        if (tile.finalX === tile.assembleX) return { ch: tile.ch, x: tile.assembleX, y: tile.ty, alpha: 1 };
        if (t < sec.discardEnd) return { ch: tile.ch, x: tile.assembleX, y: tile.ty, alpha: 1 };
        if (t < sec.shiftEnd) {
            const p = (t - sec.discardEnd) / C.SHIFT;
            return { ch: tile.ch, x: tile.assembleX + (tile.finalX - tile.assembleX) * _easeOut(p), y: tile.ty, alpha: 1 };
        }
        return { ch: tile.ch, x: tile.finalX, y: tile.ty, alpha: 1 };
    },

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        const C = CreditsConfig;

        if (this.finished) {
            this.fade += dt;
            if (this.fade > C.FADE_FRAMES + C.END_HOLD) Game.changeScene(TitleScene);
            return;
        }

        if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed()) {
            this.finished = true;
            return;
        }

        this.t += dt;
        const sec = this.sections[this.idx];

        if (sec.isCopyright) {
            if (this.t >= sec.holdEnd) this.finished = true;
            return;
        }

        if (this.t >= sec.holdEnd + C.FALL_DONE) {
            this.idx++;
            if (this.idx >= this.sections.length) this.finished = true;
            else this.t = 0;
        }
    },

    draw: function (ctx) {
        const C = CreditsConfig;

        const bg = Assets.get('bg/STAFFBAK.png');
        if (bg) ctx.drawImage(bg, 0, 0, C.SCREEN_W, C.SCREEN_H);
        else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H); }

        const sec = this.sections[this.idx];
        if (sec && sec.isCopyright) {
            const logo = Assets.get('ui/logo_compile_1998.png');
            if (logo) {
                const w = logo.width * C.COPY_LOGO_SCALE, h = logo.height * C.COPY_LOGO_SCALE;
                ctx.globalAlpha = Math.min(1, this.t / C.COPY_FADEIN);
                ctx.drawImage(logo, (C.SCREEN_W - w) / 2, C.COPY_Y, w, h);
                ctx.globalAlpha = 1;
            }
        } else if (sec) {
            const falling = this.t >= sec.holdEnd;
            const fallT = this.t - sec.holdEnd;

            for (const tile of sec.tiles) {
                if (falling) {
                    if (tile.isWrong) continue;
                    const ft = Math.max(0, fallT - tile.fallDelay);
                    const y = tile.ty + 0.5 * C.FALL_G * ft * ft;
                    if (y > C.SCREEN_H + 80) continue;
                    Assets.drawStaffGlyph(ctx, tile.ch, tile.finalX, y, tile.scale);
                    continue;
                }
                const st = this._tileState(tile, sec);
                if (!st) continue;
                if (st.alpha < 1) ctx.globalAlpha = st.alpha;
                Assets.drawStaffGlyph(ctx, st.ch, st.x, st.y, tile.scale);
                if (st.alpha < 1) ctx.globalAlpha = 1;
            }
        }

        if (this.finished) {
            const a = Math.min(1, this.fade / C.FADE_FRAMES);
            ctx.fillStyle = `rgba(0, 0, 0, ${a})`;
            ctx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);
        }
    }
};
