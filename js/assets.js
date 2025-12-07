const Assets = {
    images: {},
    toLoad: [
        'ui/title.png',
        'ui/pushok.png',   // "PUSH SPACE KEY"
        'ui/logo_compile_1998.png',  // Small Compile Logo?

        // Character Select Assets
        'bg/CHRBAK.png', // Keeping both if needed, or just new one
        'bg/GAMEBG.png',

        // FX
        { id: 'fx/pon', src: 'assets/fx/pon.png' },
        { id: 'fx/ron', src: 'assets/fx/ron.png' },
        { id: 'fx/riichi', src: 'assets/fx/riichi.png' },
        { id: 'fx/tsumo', src: 'assets/fx/tumo.png' },
        { id: 'fx/nagari', src: 'assets/fx/nagari.png' },
        { id: 'fx/tenpai', src: 'assets/fx/tenpai.png' },
        { id: 'fx/noten', src: 'assets/fx/noten.png' },

        // Random Backgrounds
        'bg/00.png', 'bg/01.png', 'bg/02.png', 'bg/03.png',
        'bg/04.png', 'bg/05.png', 'bg/06.png', 'bg/07.png',
        'bg/08.png', 'bg/09.png', 'bg/10.png', 'bg/11.png',

        'ui/vs.png',
        'ui/long_bubble.png',
        'ui/long_bubble_tail.png',
        'ui/short_bubble.png',
        'face/CHRSELEF_cursor.png',

        // Individual Select Icons
        'face/CHRSELATA.png', 'face/CHRSELRIN.png', 'face/CHRSELFARI.png',
        'face/CHRSELSMSH.png', 'face/CHRSELPET.png', 'face/CHRSELYURI.png',
        'face/CHRSELMAYU.png',

        // Big Portraits
        'face/FACEATA.png', 'face/FACERIN.png', 'face/FACEFARI.png',
        'face/FACESMSH.png', 'face/FACEPET.png', 'face/FACEYURI.png',
        'face/FACEMAYU.png',

        // Encounter/Dialogue Portraits (Detailed)
        'face/ATA_base.png',
        'face/ATA_blink-1.png', 'face/ATA_blink-2.png',
        'face/ATA_shocked.png', 'face/ATA_smile.png',

        'face/YURI_base.png',
        'face/YURI_blink-1.png', 'face/YURI_blink-2.png',
        'face/YURI_shocked.png', 'face/YURI_smile.png',
        'face/YURI_talk-1.png', 'face/YURI_talk-2.png',

        'face/FARI_base.png',
        'face/FARI_blink-1.png', 'face/FARI_blink-2.png',
        'face/FARI_shocked.png', 'face/FARI_smile.png',
        'face/FARI_talk-1.png', 'face/FARI_talk-2.png',

        // Smashu Animation Asssets
        'face/SMSH_base.png', 'face/SMSH_idle.png',
        'face/SMSH_blink-1.png', 'face/SMSH_blink-2.png', 'face/SMSH_blink-3.png',
        'face/SMSH_shocked.png', 'face/SMSH_smile.png',
        'face/SMSH_talk-1.png', 'face/SMSH_talk-2.png', 'face/SMSH_talk-3.png',

        // Linxiang Animation Assets
        'face/RIN_base.png',
        'face/RIN_blink-1.png', 'face/RIN_blink-2.png', 'face/RIN_blink-3.png',
        'face/RIN_shocked.png', 'face/RIN_smile.png',
        'face/RIN_talk-1.png', 'face/RIN_talk-2.png', 'face/RIN_talk-3.png',

        'face/btl/RIN_R_base.png',
        'face/btl/RIN_R_blink-1.png', 'face/btl/RIN_R_blink-2.png', 'face/btl/RIN_R_blink-3.png',
        'face/btl/RIN_R_shocked.png', 'face/btl/RIN_R_smile.png',
        'face/btl/RIN_R_talk-1.png', 'face/btl/RIN_R_talk-2.png', 'face/btl/RIN_R_talk-3.png',

        // Tiles
        'tiles/pai_ata.png', 'tiles/pai_rin.png', 'tiles/pai_smsh.png',
        'tiles/pai_pet.png', 'tiles/pai_fari.png', 'tiles/pai_yuri.png',
        'tiles/pai_punch.png', 'tiles/pai_wand.png', 'tiles/pai_sword.png',
        'tiles/pai_red.png', 'tiles/pai_blue.png', 'tiles/pai_yellow.png', 'tiles/pai_purple.png',

        // Tile Parts
        'tiles/back-top.png', 'tiles/back-bottom.png',
        'tiles/side-top.png', 'tiles/side-bottom.png',
        'tiles/pai_uradora.png', // Hidden Dora

        // UI
        'ui/number.png',
        'ui/turn_round.png',
        'ui/dora.png',
        'ui/bar_blue.png',
        'ui/bar_yellow.png',
        'ui/cursor_yellow.png',
        'ui/alphabet.png',
        'ui/pointer.png',

        // Endings
        'ending/ENDATA.png', 'ending/ENDFAR.png', 'ending/ENDMAY.png',
        'ending/ENDRIN.png', 'ending/ENDSMA.png', 'ending/ENDYUR.png',
        'ending/theend.png'
    ],
    loadedCount: 0,

    load: function (onComplete) {
        if (this.toLoad.length === 0) {
            onComplete();
            return;
        }

        this.toLoad.forEach(item => {
            const img = new Image();
            let src = '';
            let id = '';

            if (typeof item === 'string') {
                src = `assets/${item}`;
                id = item;
            } else {
                src = item.src; // Assuming manual path provided is relative to root or full
                id = item.id;
            }

            img.src = src;
            img.onload = () => {
                this.images[id] = img;
                this.loadedCount++;
                console.log(`Loaded: ${id}`);
                if (this.loadedCount === this.toLoad.length) {
                    onComplete();
                }
            };
            img.onerror = (e) => {
                console.error(`Failed to load ${src}`, e);
                this.loadedCount++; // Increment anyway so the game doesn't hang
                if (this.loadedCount === this.toLoad.length) {
                    onComplete();
                }
            };
        });
    },

    get: function (id) {
        return this.images[id];
    },

    /**
     * Draw a specific frame from a spritesheet.
     * Assumes horizontal strip by default.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} filename 
     * @param {number} x - Destination x
     * @param {number} y - Destination y
     * @param {number} frameIndex - 0-based index
     * @param {number} frameWidth 
     * @param {number} frameHeight 
     */
    drawFrame: function (ctx, filename, x, y, frameIndex, frameWidth, frameHeight) {
        const img = this.get(filename);
        if (!img) return;

        // Safety check
        if (!frameWidth || !frameHeight) {
            ctx.drawImage(img, x, y);
            return;
        }

        const sx = frameIndex * frameWidth;
        const sy = 0; // Assume horizontal strip

        // Clip to image bounds (basic check)
        if (sx >= img.width) return;

        ctx.drawImage(img, sx, sy, frameWidth, frameHeight, x, y, frameWidth, frameHeight);
    },

    /**
     * Draw text using 'ui/alphabet.png'.
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text - Text to draw (A-Z, ?)
     * @param {number} x - Start x position
     * @param {number} y - Start y position
     * @param {string} color - 'orange' (default) or 'yellow'
     */
    drawAlphabet: function (ctx, text, x, y, color = 'orange') {
        const img = this.get('ui/alphabet.png');
        if (!img) return;

        const frameWidth = 32;
        const frameHeight = 32;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ?";

        // Row 0 = Orange, Row 1 = Yellow
        const row = (color === 'yellow') ? 1 : 0;
        const sy = row * frameHeight;

        text = text.toUpperCase();

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const index = chars.indexOf(char);

            if (index !== -1) {
                const sx = index * frameWidth;
                ctx.drawImage(img, sx, sy, frameWidth, frameHeight, x + (i * frameWidth), y, frameWidth, frameHeight);
            } else if (char === ' ') {
                // Just advance for space
                // (Loop advances x by i * frameWidth naturally, but if we wanted flexible spacing we'd do it differently. 
                // Here we just draw nothing for space but the next character will be offset correctly by i)
            }
        }
    }
};
