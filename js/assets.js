const Assets = {
    images: {},
    toLoad: [
        'ui/title.png',
        'ui/pushok.png',   // "PUSH SPACE KEY"
        'ui/logo_compile_1998.png',  // Small Compile Logo?

        // Character Select Assets
        // 'face/CHRBAK.png', // Invalid path, removed
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
        'face/CHRSELEF_face.png',
        'face/CHRSELEF_cursor.png',

        // Individual Select Icons
        'face/CHRSELATA.png', 'face/CHRSELRIN.png', 'face/CHRSELFARI.png',
        'face/CHRSELSMSH.png', 'face/CHRSELPET.png', 'face/CHRSELYURI.png',
        'face/CHRSELMAYU.png',

        // Big Portraits
        'face/FACEATA.png', 'face/FACERIN.png', 'face/FACEFARI.png',
        'face/FACESMSH.png', 'face/FACEPET.png', 'face/FACEYURI.png',
        'face/FACEMAYU.png',

        // Battle Portraits (BTLCHR)
        'face/BTLCHRATA_L.png', 'face/BTLCHRATA_R.png',
        'face/BTLCHRRIN_L.png', 'face/BTLCHRRIN_R.png',
        'face/BTLCHRFARI_L.png', 'face/BTLCHRFARI_R.png',
        'face/BTLCHRSMSH_L.png', 'face/BTLCHRSMSH_R.png',
        'face/BTLCHRPET_L.png', 'face/BTLCHRPET_R.png',
        'face/BTLCHRYURI_L.png', 'face/BTLCHRYURI_R.png',
        'face/BTLCHRMAYU_L.png', 'face/BTLCHRMAYU_R.png',

        // Smashu Animation Asssets
        'face/btl/SMSH_L_base.png', 'face/btl/SMSH_L_idle.png',
        'face/btl/SMSH_L_blink-1.png', 'face/btl/SMSH_L_blink-2.png', 'face/btl/SMSH_L_blink-3.png',
        'face/btl/SMSH_L_shocked.png', 'face/btl/SMSH_L_smile.png',
        'face/btl/SMSH_L_talk-1.png', 'face/btl/SMSH_L_talk-2.png', 'face/btl/SMSH_L_talk-3.png',

        'face/btl/SMSH_R_base.png', 'face/btl/SMSH_R_idle.png',
        'face/btl/SMSH_R_blink-1.png', 'face/btl/SMSH_R_blink-2.png', 'face/btl/SMSH_R_blink-3.png',
        'face/btl/SMSH_R_shocked.png', 'face/btl/SMSH_R_smile.png',
        'face/btl/SMSH_R_talk-1.png', 'face/btl/SMSH_R_talk-2.png', 'face/btl/SMSH_R_talk-3.png',

        // Ataho Animation Assets
        'face/btl/ATA_L_base.png',
        'face/btl/ATA_L_blink-1.png', 'face/btl/ATA_L_blink-2.png', 'face/btl/ATA_L_blink-3.png',
        'face/btl/ATA_L_shocked.png', 'face/btl/ATA_L_smile.png',

        // Battle Sprites
        'face/PARTATA.png',
        'face/PARTRIN.png',
        'face/PARTSMSH.png',
        'face/PARTPET.png',
        'face/PARTFARI.png',
        'face/PARTYURI.png',
        'face/PARTMAYU.png',
        'face/CHRSELEF.png',
        // Tiles
        'tiles/pai_ata.png', 'tiles/pai_rin.png', 'tiles/pai_smsh.png',
        'tiles/pai_pet.png', 'tiles/pai_fari.png', 'tiles/pai_yuri.png',
        'tiles/pai_punch.png', 'tiles/pai_wand.png', 'tiles/pai_sword.png',
        'tiles/pai_red.png', 'tiles/pai_blue.png', 'tiles/pai_yellow.png', 'tiles/pai_purple.png',

        // Tile Parts
        'tiles/back-top.png', 'tiles/back-bottom.png',
        'tiles/side-top.png', 'tiles/side-bottom.png',
        'tiles/pai_uradora.png', // Hidden Dora

        // Small Icons
        'face/PARTATA.png', 'face/PARTRIN.png', 'face/PARTFARI.png',
        'face/PARTSMSH.png', 'face/PARTPET.png', 'face/PARTYURI.png',
        'face/PARTMAYU.png',

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
