const Assets = {
    images: {},
    audio: {}, // New: Audio storage
    currentMusic: null, // Track currently playing music
    muted: false, // Global Mute State

    toLoad: [
        'ui/title.png',
        'ui/pushok.png',   // "PUSH SPACE KEY"
        'ui/logo_compile_1998.png',  // Small Compile Logo?

        // Audio
        { id: 'audio/draw', src: 'assets/audio/draw.mp3', type: 'audio' },
        { id: 'audio/discard', src: 'assets/audio/discard.mp3', type: 'audio' },
        { id: 'audio/bgm_title', src: 'assets/audio/bgm_title.mp3', type: 'audio' },
        { id: 'audio/bgm_chrsel', src: 'assets/audio/bgm_chrsel.mp3', type: 'audio' },
        { id: 'audio/bgm_trail', src: 'assets/audio/bgm_trail.mp3', type: 'audio' },
        { id: 'audio/bgm_basic', src: 'assets/audio/bgm_basic.mp3', type: 'audio' },
        { id: 'audio/bgm_tension', src: 'assets/audio/bgm_tension.mp3', type: 'audio' },
        { id: 'audio/bgm_showdown', src: 'assets/audio/bgm_showdown.mp3', type: 'audio' },
        { id: 'audio/bgm_win', src: 'assets/audio/victory.mp3', type: 'audio' },
        { id: 'audio/bgm_lose', src: 'assets/audio/lose.mp3', type: 'audio' },
        { id: 'audio/lose', src: 'assets/audio/lose.mp3', type: 'audio' },
        { id: 'audio/bgm_ending', src: 'assets/audio/bgm_ending.mp3', type: 'audio' },
        { id: 'audio/pon', src: 'assets/audio/pon.mp3', type: 'audio' },
        { id: 'audio/riichi', src: 'assets/audio/riichi.mp3', type: 'audio' },
        { id: 'audio/fanfare', src: 'assets/audio/fanfare.mp3', type: 'audio' },
        { id: 'audio/gong', src: 'assets/audio/gong.mp3', type: 'audio' }, // Gong Sound
        { id: 'audio/victory', src: 'assets/audio/victory.mp3', type: 'audio' }, // New Victory Sound
        { id: 'audio/hit', src: 'assets/audio/hit-1.mp3', type: 'audio' },
        { id: 'audio/hit-1', src: 'assets/audio/hit-1.mp3', type: 'audio' },
        { id: 'audio/hit-2', src: 'assets/audio/hit-2.mp3', type: 'audio' },
        { id: 'audio/hit-3', src: 'assets/audio/hit-3.mp3', type: 'audio' },
        { id: 'audio/hit-4', src: 'assets/audio/hit-4.mp3', type: 'audio' },
        { id: 'audio/wrong', src: 'assets/audio/wrong.mp3', type: 'audio' },

        // New Dealing Sounds
        { id: 'audio/deal', src: 'assets/audio/draw.mp3', type: 'audio' }, // Alias for deal
        { id: 'audio/flip', src: 'assets/audio/flip.mp3', type: 'audio' },

        // Character Select Assets
        'bg/CHRBAK.png', // Keeping both if needed, or just new one
        'bg/OVERBAK.png',
        'bg/GAMEBG.png',

        // FX
        { id: 'fx/pon', src: 'assets/fx/pon.png', type: 'image' },
        { id: 'fx/ron', src: 'assets/fx/ron.png', type: 'image' },
        { id: 'fx/riichi', src: 'assets/fx/riichi.png', type: 'image' },
        { id: 'fx/tsumo', src: 'assets/fx/tsumo.png', type: 'image' },
        { id: 'fx/nagari', src: 'assets/fx/nagari.png', type: 'image' },
        { id: 'fx/tenpai', src: 'assets/fx/tenpai.png', type: 'image' },
        { id: 'fx/noten', src: 'assets/fx/noten.png', type: 'image' },

        // Random Backgrounds
        'bg/00.png', 'bg/01.png', 'bg/02.png', 'bg/03.png',
        'bg/04.png', 'bg/05.png', 'bg/06.png', 'bg/07.png',
        'bg/08.png', 'bg/09.png', 'bg/10.png', 'bg/11.png',

        'ui/vs.png',
        'ui/long_bubble.png',
        'ui/long_bubble_tail.png',
        'ui/short_bubble.png',
        'ui/battle_menu.png', // Battle Menu Overlay
        'face/CHRSELEF_cursor.png',

        // Individual Select Icons
        'face/CHRSELATA.png', 'face/CHRSELRIN.png', 'face/CHRSELFARI.png',
        'face/CHRSELSMSH.png', 'face/CHRSELPET.png', 'face/CHRSELYURI.png',
        'face/CHRSELMAYU.png',

        // UI Frame
        'ui/frame/corner-lefttop.png', 'ui/frame/corner-righttop.png',
        'ui/frame/corner-leftbottom.png', 'ui/frame/corner-rightbottom.png',
        'ui/frame/line-top.png', 'ui/frame/line-bottom.png',
        'ui/frame/line-left.png', 'ui/frame/line-right.png',

        // Number Fonts
        'ui/number_big.png',

        // Encounter/Dialogue Portraits (Detailed)
        // 0. Ataho
        'face/ATA_base.png',
        'face/ATA_blink-1.png', 'face/ATA_blink-2.png',
        'face/ATA_shocked.png', 'face/ATA_smile.png',

        // 1. Rinxiang
        'face/RIN_base.png',
        'face/RIN_blink-1.png', 'face/RIN_blink-2.png',
        'face/RIN_shocked.png', 'face/RIN_smile.png',
        'face/RIN_talk-1.png', 'face/RIN_talk-2.png',

        // 2. Fari
        'face/FARI_base.png',
        'face/FARI_blink-1.png', 'face/FARI_blink-2.png',
        'face/FARI_shocked.png', 'face/FARI_smile.png',
        'face/FARI_talk-1.png', 'face/FARI_talk-2.png',

        // 3. Smashu
        'face/SMSH.png', 'face/SMSH_base.png', 'face/SMSH_idle.png',
        'face/SMSH_blink-1.png', 'face/SMSH_blink-2.png',
        'face/SMSH_shocked.png', 'face/SMSH_smile.png',
        'face/SMSH_talk-1.png', 'face/SMSH_talk-2.png',

        // 4. Petum
        'face/PET_base.png',
        // 'face/PET_blink-1.png', 'face/PET_blink-2.png', // Petum has no blink frames in directory
        'face/PET_shocked.png', 'face/PET_smile.png',
        'face/PET_talk-1.png', 'face/PET_talk-2.png',

        // 5. Yuri
        'face/YURI_base.png',
        'face/YURI_blink-1.png', 'face/YURI_blink-2.png',
        'face/YURI_shocked.png', 'face/YURI_smile.png',
        'face/YURI_talk-1.png', 'face/YURI_talk-2.png',

        // 6. Mayu
        'face/MAYU_base.png',
        'face/MAYU_blink-1.png', 'face/MAYU_blink-2.png',
        'face/MAYU_shocked.png', 'face/MAYU_smile.png',
        'face/MAYU_unknown.png',

        // Tiles
        'tiles/pai_ata.png', 'tiles/pai_rin.png', 'tiles/pai_smsh.png',
        'tiles/pai_pet.png', 'tiles/pai_fari.png', 'tiles/pai_yuri.png',
        'tiles/pai_punch.png', 'tiles/pai_wand.png', 'tiles/pai_sword.png',
        'tiles/pai_red.png', 'tiles/pai_blue.png', 'tiles/pai_yellow.png', 'tiles/pai_purple.png',

        // Tile Parts
        'tiles/back-top.png', 'tiles/back-bottom.png', 'tiles/pai_back.png',
        'tiles/side-top.png', 'tiles/side-bottom.png',
        'tiles/pai_uradora.png', // Hidden Dora

        // UI
        'ui/number.png',
        'ui/number_yellow.png', // New yellow number font
        'ui/turn.png',
        'ui/round.png',
        'ui/dora.png',
        'ui/riichi.png', // New Riichi stick asset
        'ui/bar_blue.png',
        'ui/bar_yellow.png',
        // 'ui/cursor_yellow.png', // File missing
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
            let src = '';
            let id = '';
            let type = 'image';

            if (typeof item === 'string') {
                src = `assets/${item}`;
                id = item;
            } else {
                src = item.src;
                id = item.id;
                if (item.type) type = item.type;
            }

            if (type === 'audio') {
                const audio = new Audio();
                // Audio doesn't reliably fire onload for preloading in some browsers without interaction,
                // but cancanplaythrough works. However, for simple assets, 'canplaythrough' is good.
                // To avoid blocking if audio fails/hangs, we'll treat it liberally.
                audio.addEventListener('canplaythrough', () => {
                    if (!this.audio[id]) { // Prevent double count
                        this.audio[id] = audio;
                        this.loadedCount++;

                        // OPTIMIZATION: Pre-Warm Pools for Sound Effects
                        // Avoid cloning on first play
                        if (!id.includes('bgm')) {
                            const poolSize = 2; // Pre-create 2 instances
                            this.pools[id] = [];
                            for (let i = 0; i < poolSize; i++) {
                                const clone = audio.cloneNode();
                                clone.volume = 0.5;
                                this.pools[id].push(clone);
                            }
                        }

                        if (this.loadedCount === this.toLoad.length) onComplete();
                    }
                }, { once: true });

                audio.addEventListener('error', (e) => {
                    console.error(`Failed to load audio ${src}`, e);
                    this.loadedCount++;
                    if (this.loadedCount === this.toLoad.length) onComplete();
                });

                audio.src = src;
                audio.load();

            } else {
                // Image
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    this.images[id] = img;
                    this.loadedCount++;
                    if (this.loadedCount === this.toLoad.length) {
                        onComplete();
                    }
                };
                img.onerror = (e) => {
                    console.error(`Failed to load ${src}`, e);
                    this.loadedCount++; // Increment anyway
                    if (this.loadedCount === this.toLoad.length) {
                        onComplete();
                    }
                };
            }
        });
    },

    get: function (id) {
        return this.images[id];
    },

    getAudio: function (id) {
        return this.audio[id];
    },

    pools: {}, // Audio object pools

    playSound: function (id) {
        if (this.muted) return; // Mute Check

        const template = this.getAudio(id);
        if (template) {
            // Initialize pool if needed
            if (!this.pools[id]) {
                this.pools[id] = [];
            }

            const pool = this.pools[id];

            // 1. Try to find a free player (ended or paused)
            let player = pool.find(p => p.paused || p.ended);

            // 2. If no free player, create new one if below limit
            if (!player && pool.length < 5) {
                player = template.cloneNode();
                player.volume = 0.5;
                pool.push(player);
            }

            // 3. Play if valid player found
            if (player) {
                player.currentTime = 0; // Reset
                player.volume = 0.5; // Ensure volume reset
                player.play().catch(e => {
                    // console.warn("Audio play blocked (pool)", e)
                });
            } else {
                // Pool exhausted, skip sound for performance
            }
        } else {
            console.warn(`Audio not found: ${id}`);
        }
    },

    isWaitingForInteraction: false, // Flag to prevent duplicate listeners

    // State tracking for Resume on Unmute
    currentBgmId: null,
    currentBgmLoop: false,

    playMusic: function (id, loop = true) {
        // CRITICAL: Stop current music if playing to prevent overlap
        this.stopMusic();

        // Save Intent
        this.currentBgmId = id;
        this.currentBgmLoop = loop;

        if (this.muted) {
            return;
        }

        const audio = this.getAudio(id);
        if (audio) {
            // Ensure audio is fully reset
            audio.pause();
            audio.currentTime = 0;
            audio.loop = loop;
            audio.volume = 0.5;
            // audio.muted = this.muted; // Apply mute state - handled by setMute/toggleMute logic

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn(`Music play blocked for ${id}. Waiting for interaction...`);

                    if (this.isWaitingForInteraction) {
                        return;
                    }

                    // Add one-time listener to resume/retry
                    const resumeAudio = () => {
                        this.isWaitingForInteraction = false; // Reset flag

                        // Try playing whatever is current intent
                        if (this.currentBgmId && !this.muted) {
                            this.playMusic(this.currentBgmId, this.currentBgmLoop);
                        }

                        // Remove listeners
                        window.removeEventListener('keydown', resumeAudio);
                        window.removeEventListener('click', resumeAudio);
                        window.removeEventListener('touchstart', resumeAudio);
                    };

                    this.isWaitingForInteraction = true;
                    window.addEventListener('keydown', resumeAudio, { once: true });
                    window.addEventListener('click', resumeAudio, { once: true });
                    window.addEventListener('touchstart', resumeAudio, { once: true });
                });
            }
            audio._id = id; // Store ID for state checking
            this.currentMusic = audio;
        } else {
            console.warn(`Music audio not found: ${id}`);
        }
    },

    toggleMute: function () {
        return this.setMute(!this.muted);
    },

    setMute: function (muted) {
        this.muted = muted;

        if (this.muted) {
            // Mute: Stop playback but KEEP intent
            if (this.currentMusic) {
                this.currentMusic.pause();
                this.currentMusic.currentTime = 0;
                this.currentMusic = null;
            }
        } else {
            // Unmute: Restore playback from intent
            if (this.currentBgmId) {
                this.playMusic(this.currentBgmId, this.currentBgmLoop);
            }
        }
        return this.muted;
    },

    stopMusic: function () {
        // Clear Intent
        this.currentBgmId = null;
        this.currentBgmLoop = false;

        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            // Clear the reference immediately to prevent any race conditions
            const stoppedMusic = this.currentMusic;
            this.currentMusic = null;
            // Ensure it's truly stopped
            stoppedMusic.pause();
        }
    },

    stopAll: function () {
        this.stopMusic();
        // Brute force stop all audio instances (except clones which we can't track)
        Object.values(this.audio).forEach(audio => {
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
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

    drawAlphabet: function (ctx, text, x, y, options = {}) {
        const img = this.get('ui/alphabet.png');
        if (!img) return;

        let color = options.color || 'orange';
        // Check if string option was passed
        if (typeof options === 'string') color = options;

        const scale = options.scale || 1.0;
        const frameWidth = 32;
        const frameHeight = 32;

        // Spacing: If configured, use it. Default to frameWidth.
        // We applying scaling to spacing so the text stays proportional.
        const baseSpacing = options.spacing !== undefined ? options.spacing : 32;
        const spacing = baseSpacing * scale;

        // Default space width should be half of char width (16) unless specified
        const baseSpaceWidth = options.spaceWidth !== undefined ? options.spaceWidth : 16;
        const spaceWidth = baseSpaceWidth * scale;
        const align = options.align || 'left';

        const destW = frameWidth * scale;
        const destH = frameHeight * scale;

        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ?.,!";

        // Width Calculation for Alignment
        let totalWidth = 0;
        text = text.toUpperCase();

        // Custom widths (Advance) - Source is still 32px grid
        const charWidths = {
            '.': 12,
            ',': 12,
            '!': 12,
            '?': 32 // Explicit
            // A-Z defaults to 'spacing'
        };

        // Helper to get advance width for a specific char
        const getAdvance = (char) => {
            if (char === ' ') return spaceWidth;
            if (charWidths[char] !== undefined) return charWidths[char] * scale;
            return spacing; // Default 32 * scale
        };

        for (let i = 0; i < text.length; i++) {
            totalWidth += getAdvance(text[i]);
        }

        let currentX = x;
        if (align === 'center') currentX -= totalWidth / 2;
        else if (align === 'right') currentX -= totalWidth;

        // Row map
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
                // Determine centering offset for narrow chars if they are drawn from a wide cell?
                // If the user draws the dot in the center of the 32px grid cell, and we just advance 12px,
                // we might overlap or have large gaps.
                // Assuming user draws "Left Aligned" in the 32px cell? Or "Centered"?
                // Let's stick to drawing it standard.

                const sx = index * frameWidth;
                ctx.drawImage(img, sx, sy, frameWidth, frameHeight, currentX, y, destW, destH);
            }

            currentX += advance;
        }
    },

    /**
     * Draw big number using 'ui/number_big.png'.
     * Assumes horizontal strip of undefined width (auto-calculated) or fixed width.
     * Usually 0-9.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number|string} number 
     * @param {number} x Center X (if align center) or Left X
     * @param {number} y Top Y
     * @param {object} options { align: 'center'|'left', spacing: 0 }
     */
    drawNumberBig: function (ctx, number, x, y, options = {}) {
        const imgId = options.imgId || 'ui/number_big.png';
        const img = this.get(imgId);
        if (!img) return;

        // Determine frame width. 
        // Assume 0-9 (10 digits).
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

        // Calculate total width
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
    },

    /**
     * Draw a 9-slice frame using registered frame assets.
     * Edges are tiled to fill the space.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     */
    drawUIFrame: function (ctx, x, y, w, h) {
        const tl = this.get('ui/frame/corner-lefttop.png');
        const tr = this.get('ui/frame/corner-righttop.png');
        const bl = this.get('ui/frame/corner-leftbottom.png');
        const br = this.get('ui/frame/corner-rightbottom.png');

        const top = this.get('ui/frame/line-top.png');
        const bottom = this.get('ui/frame/line-bottom.png');
        const left = this.get('ui/frame/line-left.png');
        const right = this.get('ui/frame/line-right.png');

        if (!tl || !tr || !bl || !br || !top || !bottom || !left || !right) {
            return; // Assets not loaded yet
        }

        // Draw Corners
        ctx.drawImage(tl, x, y);
        ctx.drawImage(tr, x + w - tr.width, y);
        ctx.drawImage(bl, x, y + h - bl.height);
        ctx.drawImage(br, x + w - br.width, y + h - br.height);

        // Draw Top/Bottom Edges (Tiled)
        const innerX = x + tl.width;
        const innerW = w - tl.width - tr.width;
        if (innerW > 0) {
            // Top
            this.drawTiled(ctx, top, innerX, y, innerW, top.height, 'horizontal');
            // Bottom
            this.drawTiled(ctx, bottom, innerX, y + h - bottom.height, innerW, bottom.height, 'horizontal');
        }

        // Draw Left/Right Edges (Tiled)
        const innerY = y + tl.height; // Assuming corners have same height
        const innerH = h - tl.height - bl.height;

        if (innerH > 0) {
            // Left
            this.drawTiled(ctx, left, x, innerY, left.width, innerH, 'vertical');
            // Right
            this.drawTiled(ctx, right, x + w - right.width, innerY, right.width, innerH, 'vertical');
        }
    },

    /**
     * Get or create a cached pattern for an image.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {HTMLImageElement} img 
     * @param {string} repetition 
     */
    getPattern: function (ctx, img, repetition = 'repeat') {
        if (!img._patterns) img._patterns = {};
        if (!img._patterns[repetition]) {
            img._patterns[repetition] = ctx.createPattern(img, repetition);
        }
        return img._patterns[repetition];
    },

    /**
     * Helper to draw a tiled image efficiently.
     */
    drawTiled: function (ctx, img, x, y, fillW, fillH, direction) {
        // Use cached pattern
        ctx.save();
        ctx.translate(x, y);
        // Use default 'repeat' as the specific direction repeat (repeat-x/y) is rarely needed if we fillRect correctly?
        // Actually, createPattern supports 'repeat', 'repeat-x', 'repeat-y', 'no-repeat'.
        // For 'horizontal' tiling, 'repeat-x' is safer? 
        // Existing code used 'repeat'. Stick to 'repeat' as fillRect limits the area anyway.
        const ptrn = this.getPattern(ctx, img, 'repeat');
        ctx.fillStyle = ptrn;
        ctx.fillRect(0, 0, fillW, fillH);
        ctx.restore();
    }
};
