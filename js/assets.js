const Assets = {
    images: {},
    toLoad: [
        'TITLE.png',
        'TITLMOJI.png',
        'TTBAK.png',
        'TTMOJI.png',
        'TTMOJI2.png',
        'TTHAI.png',
        'TTNARUTO.png',
        'OPMENU2.png', // Menu background?
        'OPMOJI.png',  // Menu text?
        'POINTCUR.png', // Cursor
        'PUSHOK.png',   // "PUSH SPACE KEY"
        'COMPLOGO.png', // "COMPILE 1998"
        'SCMPLOGO.png',  // Small Compile Logo?

        // Character Select Assets
        'face/CHRBAK.png',
        'bg/CHRBAK.png', // Keeping both if needed, or just new one
        'bg/GAMEBG.png',
        // Random Backgrounds
        'bg/00.png', 'bg/01.png', 'bg/02.png', 'bg/03.png',
        'bg/04.png', 'bg/05.png', 'bg/06.png', 'bg/07.png',
        'bg/08.png', 'bg/09.png', 'bg/10.png', 'bg/11.png',

        'bar.png',
        'VS.png',
        'FUKIDASI.png', // Keeping for legacy reference or removal? Let's keep for now.
        'LONG_BUBBLE.png',
        'LONG_BUBBLE_TAIL.png',
        'TTBAK.png',
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
        'face/PARTMAYU.png'
    ],
    loadedCount: 0,

    load: function (onComplete) {
        if (this.toLoad.length === 0) {
            onComplete();
            return;
        }

        this.toLoad.forEach(filename => {
            const img = new Image();
            img.src = `assets/${filename}`;
            img.onload = () => {
                this.images[filename] = img;
                this.loadedCount++;
                console.log(`Loaded: ${filename}`);
                if (this.loadedCount === this.toLoad.length) {
                    onComplete();
                }
            };
            img.onerror = (e) => {
                console.error(`Failed to load ${filename}`, e);
                this.loadedCount++; // Increment anyway so the game doesn't hang
                if (this.loadedCount === this.toLoad.length) {
                    onComplete();
                }
            };
        });
    },

    get: function (filename) {
        return this.images[filename];
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
    }
};
