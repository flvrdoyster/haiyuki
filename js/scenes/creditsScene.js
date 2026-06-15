// Staff roll — mahjong-themed, matching the original. NOT a scroll: each section
// (one '---' block of staff.md: a left-aligned role label + indented name lines) is
// assembled tile-by-tile. Tiles fly in from the RIGHT and land left→right with a
// little upward bounce ("draw").
//
// Typo gimmick (one per line): the line assembles with all-but-the-last correct
// character PLUS one extra WRONG tile inserted among them. Once the whole section is
// shown, every inserted wrong tile rises away together ("discard"); the tiles to its
// right slide LEFT to close the gap; then the final character of each line flies in
// from the right to complete it. The section holds, then every tile DROPS STRAIGHT
// DOWN and the next section assembles. The closing COMPILE line is a pre-made image.
//
// Layout: everything is LEFT-aligned; labels at LABEL_X, names indented to BODY_X;
// lines stacked by tile height (no overlap); the block is centered vertically.

const CreditsConfig = {
    SCREEN_W: 640,
    SCREEN_H: 480,

    LABEL_X: 100,        // left edge of role labels / title
    BODY_X: 280,         // left edge of name lines (indented)
    SECTION_CENTER_Y: 240,   // screen vertical center (SCREEN_H / 2)
    V_MARGIN: 10,        // gap between stacked tiles (on top of tile height)

    ADV: 40,             // per-glyph advance (= cell width)
    CELL_H: 64,

    TITLE_SCALE: 1,
    ROLE_SCALE: 1,
    NAME_SCALE: 1,

    // Closing copyright is a pre-made image ('ui/logo_compile_1998.png'), centered.
    COPY_LOGO_SCALE: 1,
    COPY_Y: 228,
    COPY_FADEIN: 20,

    // Draw-in (fly from right, then bounce up & settle)
    SLIDE: 8,
    SLIDE_DX: 180,
    BOUNCE: 16,
    BOUNCE_H: 20,
    DRAW_STEP: 8,        // delay before the next tile begins

    // Typo gimmick — the wrong tile mirrors the script of the char it sits next to
    // (Korean→Korean, alphanumeric→alphanumeric, Japanese→Japanese), drawn from the
    // atlas's glyphs of that script (see _scriptOf / _pickWrong).
    ASSEMBLE_PAUSE: 20,  // hold the assembled-with-typos state
    DISCARD: 11,         // wrong tiles rise away
    RISE: 90,
    SHIFT: 9,            // right-side tiles slide left to close the gap

    HOLD: 90,
    COPY_HOLD: 120,

    FALL_G: 1.2,         // straight-down gravity
    FALL_DONE: 58,

    FADE_FRAMES: 70,
    END_HOLD: 40,

    // Final message page (image font, drawAlphabet) shown after the staff roll.
    // The staff roll itself is identical for both endings — only this page differs.
    MESSAGE: {
        HOLD: 180,       // hold the page (~3s)
        FADEIN: 20,
        LINES: {
            TRUE: [
                { text: 'COMPLETE!', y: 200, spacing: 32, scale: 1.5 },
                { text: 'THANK YOU FOR PLAYING', y: 262, spacing: 32, scale: 1 }
            ],
            NORMAL: [
                { text: 'CLEAR!', y: 200, spacing: 32, scale: 1.5 },
                { text: 'THANK YOU FOR PLAYING', y: 262, spacing: 32, scale: 1 }
            ]
        }
    }
};

// Top → bottom — one entry per '---' block of staff.md.
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
    endingType: 'NORMAL',   // 'TRUE' | 'NORMAL' — only the final message page differs

    init: function (params) {
        this.t = 0;
        this.idx = 0;
        this.finished = false;
        this.fade = 0;
        this.endingType = (params && params.endingType) ? params.endingType : 'NORMAL';
        this.buildSections();

        // Credits BGM. The ending illustration already plays bgm_ending, so keep it
        // seamless there; on the other paths (continue / true-ending) start it now.
        if (Assets.currentBgmId !== 'audio/bgm_ending') Assets.playMusic('audio/bgm_ending');
    },

    buildSections: function () {
        const C = CreditsConfig;
        this.sections = STAFF_ROLL.map((entry) => {
            // The closing copyright is a single pre-made image, not assembled tiles.
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

            // Vertical layout: stack by tile height (no overlap), centered.
            let totalH = 0;
            lines.forEach(l => { totalH += C.CELL_H * l.scale; });
            totalH += (lines.length - 1) * C.V_MARGIN;
            let cursorY = C.SECTION_CENTER_Y - totalH / 2;

            const tiles = [];
            let order = 0; // assembly sequence across the whole section
            lines.forEach((line) => {
                const ty = cursorY;
                const adv = C.ADV * line.scale;
                const chars = Array.from(line.text);
                const N = chars.length;
                const slotX = (s) => line.x + s * adv;

                // One wrong tile inserted at slot p; the final char is held back to
                // fly in last. Assembly shows chars[0..N-2] with `wrong` spliced in.
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
                // The final character flies in last to complete the line.
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

        // Final message page (COMPLETE!/CLEAR!) — image font, ending-specific.
        this.sections.push({ tiles: [], isMessage: true, holdEnd: CreditsConfig.MESSAGE.HOLD });
    },

    // Script of a glyph: 'kr' (Hangul), 'an' (Latin letters + digits), 'jp' (kana +
    // CJK), or null (symbols / space).
    _scriptOf: function (ch) {
        if (!ch) return null;
        const c = ch.codePointAt(0);
        if (c >= 0xAC00 && c <= 0xD7A3) return 'kr';
        if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A) || (c >= 0x30 && c <= 0x39)) return 'an';
        if ((c >= 0x3040 && c <= 0x30FF) || (c >= 0x4E00 && c <= 0x9FFF)) return 'jp';
        return null;
    },

    // Per-script pools of the atlas glyphs (built once), used to source wrong tiles.
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

    // A random wrong glyph of the given script (≠ exclude).
    _pickWrong: function (script, exclude) {
        const pools = this._pools || this._buildPools();
        const all = pools[script] || [];
        const pool = all.filter(c => c !== exclude);
        const src = pool.length ? pool : all;
        return src.length ? src[Math.floor(Math.random() * src.length)] : exclude;
    },

    // Render state {ch, x, y, alpha} of one tile at the current section clock, or
    // null if it isn't visible. (Falling is handled in draw().)
    _tileState: function (tile, sec) {
        const C = CreditsConfig;
        const t = this.t;
        const slideIn = (p, x) => ({ x: x + (1 - _easeOut(p)) * C.SLIDE_DX, y: tile.ty });
        const bounce = (p, x) => ({ x: x, y: tile.ty - Math.sin(p * Math.PI) * C.BOUNCE_H });

        // Final character: hidden until the gap has closed, then flies in.
        if (tile.isLast) {
            if (t < sec.shiftEnd) return null;
            const lt = t - sec.shiftEnd;
            const pos = lt < C.SLIDE ? slideIn(lt / C.SLIDE, tile.finalX)
                : bounce(Math.min(1, (lt - C.SLIDE) / C.BOUNCE), tile.finalX);
            return { ch: tile.ch, x: pos.x, y: pos.y, alpha: 1 };
        }

        if (t < tile.startT) return null;

        // Phase 1: fly in to the assembly slot.
        const assembleDone = tile.startT + C.SLIDE + C.BOUNCE;
        if (t < assembleDone) {
            const lt = t - tile.startT;
            const pos = lt < C.SLIDE ? slideIn(lt / C.SLIDE, tile.assembleX)
                : bounce((lt - C.SLIDE) / C.BOUNCE, tile.assembleX);
            return { ch: tile.ch, x: pos.x, y: pos.y, alpha: 1 };
        }

        // The inserted wrong tile: holds, then rises away.
        if (tile.isWrong) {
            if (t < sec.typoStart) return { ch: tile.ch, x: tile.assembleX, y: tile.ty, alpha: 1 };
            if (t < sec.discardEnd) {
                const p = (t - sec.typoStart) / C.DISCARD;
                return { ch: tile.ch, x: tile.assembleX, y: tile.ty - _easeOut(p) * C.RISE, alpha: 1 - p };
            }
            return null;
        }

        // Correct assembly tile: slides left during the shift if it sits right of p.
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

        // Skip: jump to the final message page; if already there, end.
        if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed()) {
            const lastIdx = this.sections.length - 1;
            if (this.idx >= lastIdx) {
                this.finished = true;
            } else {
                this.idx = lastIdx;
                this.t = 0;
            }
            return;
        }

        this.t += dt;
        const sec = this.sections[this.idx];

        // Final message page — holds, then ends.
        if (sec.isMessage) {
            if (this.t >= sec.holdEnd) this.finished = true;
            return;
        }

        // Copyright logo — holds, then advances to the message page.
        if (sec.isCopyright) {
            if (this.t >= sec.holdEnd) { this.idx++; this.t = 0; }
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
        if (sec && sec.isMessage) {
            // Final message page on black, image font, ending-specific.
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, C.SCREEN_W, C.SCREEN_H);
            const M = CreditsConfig.MESSAGE;
            const lines = M.LINES[this.endingType] || M.LINES.NORMAL;
            ctx.globalAlpha = Math.min(1, this.t / M.FADEIN);
            lines.forEach(line => {
                Assets.drawAlphabet(ctx, line.text, C.SCREEN_W / 2, line.y, {
                    color: 'yellow', spacing: line.spacing, scale: line.scale, align: 'center'
                });
            });
            ctx.globalAlpha = 1;
        } else if (sec && sec.isCopyright) {
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
                    if (tile.isWrong) continue; // already gone
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
