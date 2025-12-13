const BattleRenderer = {
    // Offscreen Buffers
    bgCanvas: null,
    fgCanvas: null,
    _dirtyStatic: true,

    reset: function () {
        this._dirtyStatic = true;
    },

    initBuffers: function () {
        if (!this.bgCanvas) {
            this.bgCanvas = document.createElement('canvas');
            this.bgCanvas.width = 640;
            this.bgCanvas.height = 480;
        }
        if (!this.fgCanvas) {
            this.fgCanvas = document.createElement('canvas');
            this.fgCanvas.width = 640;
            this.fgCanvas.height = 480;
        }
    },

    updateStaticLayers: function (state) {
        this.initBuffers();

        // 1. Update BG Canvas
        const bgCtx = this.bgCanvas.getContext('2d');
        bgCtx.imageSmoothingEnabled = false;

        // Fill Black
        bgCtx.fillStyle = 'black';
        bgCtx.fillRect(0, 0, 640, 480);

        // Random BG
        const randomBg = Assets.get(state.bgPath);
        if (randomBg) {
            const bgConf = BattleConfig.BG;
            let x = bgConf.x || 320;
            let y = bgConf.y || 240;

            if (bgConf.align === 'center') {
                x -= randomBg.width / 2;
                y -= randomBg.height / 2;
            }
            bgCtx.drawImage(randomBg, x, y);
        }

        // 2. Update FG Canvas (UI BG + Names)
        const fgCtx = this.fgCanvas.getContext('2d');
        fgCtx.imageSmoothingEnabled = false;
        fgCtx.clearRect(0, 0, 640, 480); // Clear previous

        // UI Background
        const uiBg = Assets.get(BattleConfig.UI_BG.path);
        if (uiBg) fgCtx.drawImage(uiBg, 0, 0);

        // Character Names
        this.drawCharacterNames(fgCtx, state);

        this._dirtyStatic = false;
    },

    draw: function (ctx, state, activeFX) {
        // Disable interpolation for pixel art / precise layering
        ctx.imageSmoothingEnabled = false;

        // 0. Check Static Layers
        if (this._dirtyStatic || !this.bgCanvas) {
            this.updateStaticLayers(state);
        }

        // 1. Draw Static BG
        ctx.drawImage(this.bgCanvas, 0, 0);

        // 2. Portraits (Dynamic - animate)
        if (state.p1Character) state.p1Character.draw(ctx);
        if (state.cpuCharacter) state.cpuCharacter.draw(ctx);

        // 3. Draw Static FG (UI BG + Names)
        ctx.drawImage(this.fgCanvas, 0, 0);

        // 4.5 Discards
        this.drawDiscards(ctx, state);

        // 5. Hands
        const tileW = BattleConfig.HAND.tileWidth;
        const tileH = BattleConfig.HAND.tileHeight;
        const gap = BattleConfig.HAND.gap;

        // CPU Hand (Top)
        // CPU Hand (Top)
        const cpuMetrics = this.getVisualMetrics(state.cpu, 0, 'cpu');
        const cpuStartX = cpuMetrics.handStartX;
        const cpuCount = state.cpu.hand.length;

        for (let i = 0; i < cpuCount; i++) {
            let xOffset = 0;
            const x = cpuStartX + i * (tileW + gap) + xOffset;

            // Reveal hand if CPU wins or Nagari or Revealed
            if (state.currentState === state.STATE_LOSE || state.currentState === state.STATE_MATCH_OVER || state.currentState === state.STATE_NAGARI || state.cpu.isRevealed) {
                this.drawTile(ctx, state.cpu.hand[i], x, BattleConfig.HAND.cpuY, tileW, tileH);
            } else {
                this.drawCardBack(ctx, x, BattleConfig.HAND.cpuY, tileW, tileH, 'tiles/back-top.png');
            }
        }

        // Draw CPU Open Sets (Right of hand)
        this.drawOpenSets(ctx, state.cpu.openSets, cpuMetrics.openStartX, BattleConfig.HAND.cpuY, tileW, tileH, true);

        // Player Hand (Bottom)
        const pCount = state.p1.hand.length;
        const groupSize = state.lastDrawGroupSize || 0;
        // Check state constants from state object
        const hasGap = (groupSize > 0) && (state.currentState === state.STATE_PLAYER_TURN || state.currentState === state.STATE_BATTLE_MENU);

        const metrics = this.getVisualMetrics(state.p1, hasGap ? groupSize : 0, 'p1');
        const pStartX = metrics.handStartX;

        for (let i = 0; i < pCount; i++) {
            const pos = this.getPlayerHandPosition(i, pCount, hasGap ? groupSize : 0, pStartX);
            let y = pos.y;
            const isHover = (state.currentState === state.STATE_PLAYER_TURN && i === state.hoverIndex);

            if (isHover) {
                y += BattleConfig.HAND.hoverYOffset;
            }

            const sideImg = Assets.get('tiles/side-top.png');
            if (sideImg) {
                // Draw at Top (y - height)
                // Canvas Scale(1, -1) could verify "flip" but `side-top` is likely pre-flipped.
                // User asked to "flip the side image".
                // If I use side-top, I assume it's the correct asset.
                ctx.drawImage(sideImg, pos.x, y - sideImg.height, tileW, sideImg.height);
            }

            if (state.p1.isRiichi && i === state.riichiTargetIndex) {
                // Riichi indicator if needed
            }

            // Determine Tint (Validity)
            const options = {};
            if (state.p1.isRiichi) {
                // Check validity
                const validIndices = state.validRiichiDiscardIndices;
                if (validIndices && !validIndices.includes(i)) {
                    options.tint = 'rgba(0, 0, 0, 0.6)'; // Darken invalid tiles
                }
            }

            // Draw Face or Back based on state
            if (state.p1.isFaceDown) {
                this.drawCardBack(ctx, pos.x, y, tileW, tileH, 'tiles/pai_back.png');
            } else {
                this.drawTile(ctx, state.p1.hand[i], pos.x, y, tileW, tileH, options);
            }
        }

        // Draw Cursor (Top Layer)
        if (state.currentState === state.STATE_PLAYER_TURN && state.hoverIndex >= 0 && state.hoverIndex < pCount) {
            const i = state.hoverIndex;
            const pos = this.getPlayerHandPosition(i, pCount, hasGap ? groupSize : 0, pStartX);
            let y = pos.y + BattleConfig.HAND.hoverYOffset;

            // Programmatic Cursor (2px Box)
            const sideImg = Assets.get('tiles/side-top.png');
            const sideH = sideImg ? sideImg.height : 14;
            const totalH = tileH + sideH;

            // Adjust rect to include top side
            // Original: y, totalH. (Downwards)
            // New: y - sideH, totalH.
            const cursorY = y - sideH;

            // ... (Color Logic) ...

            // Multi-Color Blink Logic
            const hConf = BattleConfig.HAND;
            if (hConf.hoverColors && hConf.hoverColors.length > 0) {
                const speed = hConf.hoverBlinkSpeed || 10;
                // Use timer (frame count) to cycle colors
                const cIndex = Math.floor(state.timer / speed) % hConf.hoverColors.length;
                ctx.strokeStyle = hConf.hoverColors[cIndex];
            } else {
                ctx.strokeStyle = hConf.hoverColor;
            }
            ctx.lineWidth = BattleConfig.HAND.hoverWidth;

            // Draw Rectangle over Tile Face + Side
            // ctx.strokeRect(pos.x, y, tileW, totalH); // Old
            ctx.strokeRect(pos.x, cursorY, tileW, totalH);
        }

        // Player Open Sets
        // Use calculated openStartX instead of fixed anchor
        this.drawOpenSets(ctx, state.p1.openSets, metrics.openStartX, BattleConfig.HAND.openSetY, tileW, tileH, false);

        // 6. Dora
        this.drawDora(ctx, state.doras, state.uraDoraRevealed);

        // 7. Info (Turn/Round)
        this.drawInfo(ctx, state.turnCount, state.currentRound);

        // 7.5 Riichi Sticks (New UI)
        const riichiConf = BattleConfig.RIICHI_STICK;
        if (riichiConf && Assets.get(riichiConf.path)) {
            const rImg = Assets.get(riichiConf.path);
            const rY = riichiConf.y;
            const rOff = riichiConf.offset;
            const rScale = riichiConf.scale || 1.0;
            const rW = rImg.width * rScale;
            const rH = rImg.height * rScale;
            const cx = BattleConfig.SCREEN.centerX;

            // P1 Riichi (Left of Center)
            // Draw relative to center. explicit offset is gap from center line.
            if (state.p1.isRiichi) {
                // X = Center - Offset - Image Width (to align right edge of image to offset point)
                const rx = cx - rOff - rW;
                ctx.drawImage(rImg, rx, rY, rW, rH);
            }

            // CPU Riichi (Right of Center)
            if (state.cpu.isRiichi) {
                // X = Center + Offset (Align left edge of image to offset point)
                const rx = cx + rOff;
                ctx.drawImage(rImg, rx, rY, rW, rH);
            }
        }

        // 8. Bars
        this.drawBar(ctx, BattleConfig.BARS.P1.x, BattleConfig.BARS.P1.y, state.p1.hp, state.p1.maxHp, "HP");
        this.drawBar(ctx, BattleConfig.BARS.P1.x, BattleConfig.BARS.P1.y + BattleConfig.BARS.height + BattleConfig.BARS.gap, state.p1.mp, state.p1.maxMp, "MP"); // P1 MP

        this.drawBar(ctx, BattleConfig.BARS.CPU.x, BattleConfig.BARS.CPU.y, state.cpu.hp, state.cpu.maxHp, "HP");
        this.drawBar(ctx, BattleConfig.BARS.CPU.x, BattleConfig.BARS.CPU.y + BattleConfig.BARS.height + BattleConfig.BARS.gap, state.cpu.mp, state.cpu.maxMp, "MP"); // CPU MP

        // 9. FX
        // FX handling is usually stateless drawing, but depends on activeFX array
        this.drawFX(ctx, activeFX);

        // Dialogue (Below Result/UI)


        // 10. Overlays / UI
        if (state.currentState === state.STATE_ACTION_SELECT) {
            this.drawActionMenu(ctx, state);
        } else if (state.currentState === state.STATE_WIN || state.currentState === state.STATE_LOSE || state.currentState === state.STATE_NAGARI || state.currentState === state.STATE_MATCH_OVER) {
            // Draw Result uses state variables
            this.drawResult(ctx, state);
        }

        // Battle Menu
        if (state.currentState === state.STATE_BATTLE_MENU) {
            this.drawBattleMenu(ctx, state);
        }

        if (state.currentState === state.STATE_WAIT_FOR_DRAW) {
            this.drawDrawButton(ctx);
        }


    },

    drawCharacterNames: function (ctx, state) {
        const conf = BattleConfig.NAME_DISPLAY;
        if (!conf) return;

        ctx.save();
        ctx.font = conf.font;
        ctx.fillStyle = conf.color;
        ctx.strokeStyle = conf.stroke;
        ctx.lineWidth = conf.strokeWidth;
        ctx.textBaseline = 'alphabetic'; // Explicitly reset baseline prevents jitter

        // Draw P1 Name
        if (state.p1Character && state.p1Character.data) {
            const name = state.p1Character.data.name;
            ctx.textAlign = conf.P1.align || 'left';
            ctx.strokeText(name, conf.P1.x, conf.P1.y);
            ctx.fillText(name, conf.P1.x, conf.P1.y);
        }

        // Draw CPU Name
        if (state.cpuCharacter && state.cpuCharacter.data) {
            const name = state.cpuCharacter.data.name;
            ctx.textAlign = conf.CPU.align || 'right';
            ctx.strokeText(name, conf.CPU.x, conf.CPU.y);
            ctx.fillText(name, conf.CPU.x, conf.CPU.y);
        }
        ctx.restore();
    },

    getVisualMetrics: function (character, groupSize, target) {
        const m = { totalW: 0, startX: 0, handStartX: 0, openStartX: 0, handW: 0, openW: 0 };

        const tileW = BattleConfig.HAND.tileWidth;
        const gap = BattleConfig.HAND.gap;
        const setGap = 15;
        const groupGap = BattleConfig.HAND.groupGap;
        const sectionGap = 20; // Gap between hand and open sets

        // 1. Calculate Hand Width
        const handSize = character.hand.length;
        let handW = handSize * (tileW + gap);
        if (handSize > 0) handW -= gap; // Remove last gap
        if (groupSize > 0) handW += groupGap;

        // 2. Calculate Open Sets Width
        let openW = 0;
        if (character.openSets && character.openSets.length > 0) {
            character.openSets.forEach(set => {
                openW += (set.tiles.length * tileW) + ((set.tiles.length - 1) * gap) + setGap;
            });
            openW -= setGap; // Remove last gap
        }

        // 3. Total Width
        let totalW = handW;
        if (openW > 0) totalW += sectionGap + openW;

        // 4. Start X (Centered)
        // Note: For CPU, we might calculate differently if we want top centered.
        // Current logic centers it the same way.
        const startX = (640 - totalW) / 2;

        // Update Cached Object
        m.totalW = totalW;
        m.startX = startX;
        m.handStartX = startX;
        m.openStartX = startX + handW + sectionGap;
        m.handW = handW;
        m.openW = openW;

        return m;
    },

    _tempPos: { x: 0, y: 0 },

    getPlayerHandPosition: function (index, count, groupSize, startX) {
        const tileW = BattleConfig.HAND.tileWidth;
        const gap = BattleConfig.HAND.gap;
        const groupGap = BattleConfig.HAND.groupGap;

        let x = startX + index * (tileW + gap);
        if (groupSize > 0 && index >= count - groupSize) {
            x += groupGap;
        }

        // Reuse Object
        this._tempPos.x = x;
        this._tempPos.y = BattleConfig.HAND.playerHandY;
        return this._tempPos;
    },

    drawTile: function (ctx, tile, x, y, w, h, options = {}) {
        const img = Assets.get(tile.img);
        if (img) {
            ctx.drawImage(img, x, y, w, h);

            // Tint Overlay
            if (options.tint) {
                ctx.save();
                ctx.fillStyle = options.tint;
                ctx.fillRect(x, y, w, h);
                ctx.restore();
            }
        } else {
            ctx.fillStyle = BattleConfig.FALLBACK.tileBg;
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.font = BattleConfig.FALLBACK.tileTextFont;
            ctx.fillText(tile.type, x + w / 2, y + h / 2);
        }
    },

    drawCardBack: function (ctx, x, y, w, h, path) {
        const img = Assets.get(path) || Assets.get('tiles/back.png'); // Fallback
        if (img) {
            ctx.drawImage(img, x, y, w, h);
        } else {
            // Fallback
            ctx.fillStyle = BattleConfig.FALLBACK.cardBackBg;
            ctx.fillRect(x, y, w, h);
            ctx.lineWidth = 1;
            ctx.strokeStyle = BattleConfig.FALLBACK.cardBackStroke;
            ctx.strokeRect(x, y, w, h);
        }
    },

    // Cached Layout Objects for Discards
    _p1DiscardLayout: { col: 0, row: 0, x: 0, y: 0 },
    _cpuDiscardLayout: { col: 0, row: 0, x: 0, y: 0 },

    drawDiscards: function (ctx, state) {
        const dw = BattleConfig.DISCARDS.tileWidth;
        const dh = BattleConfig.DISCARDS.tileHeight;
        const gap = BattleConfig.DISCARDS.gap;
        const max = BattleConfig.DISCARDS.rowMax;

        const allDiscards = state.discards;

        // Reset & Use Cached Layouts
        const p1Layout = this._p1DiscardLayout;
        p1Layout.col = 0; p1Layout.row = 0;
        p1Layout.x = BattleConfig.DISCARDS.P1.x;
        p1Layout.y = BattleConfig.DISCARDS.P1.y;

        const cpuLayout = this._cpuDiscardLayout;
        cpuLayout.col = 0; cpuLayout.row = 0;
        cpuLayout.x = BattleConfig.DISCARDS.CPU.x;
        cpuLayout.y = BattleConfig.DISCARDS.CPU.y;

        const lastDiscard = allDiscards.length > 0 ? allDiscards[allDiscards.length - 1] : null;

        allDiscards.forEach(t => {
            let layout;
            let isP1 = (t.owner === 'P1' || t.owner === 'p1');

            if (isP1) layout = p1Layout;
            else layout = cpuLayout;

            // Determine effective dimensions for this slot
            // If Riichi, width is Height (rotated 90 deg)
            const slotW = t.isRiichi ? dh : dw;

            // Check Wrap (Pre-check to move to next row if needed? No, standard is Max items per row)
            // But if we wrap, we reset X.
            if (layout.col >= max) {
                layout.col = 0;
                layout.row++;
                layout.x = isP1 ? BattleConfig.DISCARDS.P1.x : BattleConfig.DISCARDS.CPU.x;
                layout.y += dh + gap;
            }

            const dx = layout.x;
            const dy = layout.y;

            // Update Layout for NEXT item
            layout.x += slotW + gap;
            layout.col++;

            // Draw Logic
            // Check if last (Highlight)
            if (t === lastDiscard) {
                // Determine highlight size
                const w = BattleConfig.HAND.tileWidth;
                const h = BattleConfig.HAND.tileHeight;

                // Rotated logic for highlight
                if (t.isRiichi) {
                    // Center based on Visual Width (slotW = dh)
                    // Center of slot
                    const cx = dx + slotW / 2;
                    const cy = dy + dh / 2;

                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(-Math.PI / 2); // Rotate 90 deg CCW

                    // Draw centered
                    this.drawTile(ctx, t, -w / 2, -h / 2, w, h);

                    // Highlight border
                    ctx.strokeStyle = 'yellow';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-w / 2, -h / 2, w, h);

                    ctx.restore();
                } else {
                    // Standard Highlight
                    // Center in slot (dw width)
                    const cx = dx + (dw - w) / 2;
                    const cy = dy + (dh - h) / 2;

                    this.drawTile(ctx, t, cx, cy, w, h);
                    ctx.strokeStyle = 'yellow';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(cx, cy, w, h);
                }
            } else {
                // Normal Draw
                if (t.isRiichi) {
                    // Center in the allocated slot (which is dh wide)
                    const cx = dx + slotW / 2;
                    const cy = dy + dh / 2;

                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(-Math.PI / 2);
                    // Draw normal dimensions (dw x dh) rotated
                    this.drawTile(ctx, t, -dw / 2, -dh / 2, dw, dh);
                    ctx.restore();
                } else {
                    this.drawTile(ctx, t, dx, dy, dw, dh);
                }
            }
        });
    },

    drawOpenSets: function (ctx, openSets, startX, y, tileW, tileH, isCpu) {
        if (!openSets || openSets.length === 0) return;

        const gap = BattleConfig.HAND.openSetTileGap !== undefined ? BattleConfig.HAND.openSetTileGap : 0;
        const setGap = BattleConfig.HAND.openSetGap || 10;

        // P1: Draw from Right to Left? Or Left to Right from Anchor?
        // Original: "openSetRightAnchor: 620"
        // CPU: params passed `cpuStartX + width`.

        // Draw Side Asset if Player (isCpu false)
        const sideImg = !isCpu ? Assets.get('tiles/side-top.png') : null;

        if (isCpu) {
            let currentX = startX;
            openSets.forEach(set => {
                set.tiles.forEach(tile => {
                    this.drawTile(ctx, tile, currentX, y, tileW, tileH);
                    currentX += tileW + gap;
                });
                currentX += setGap;
            });
        } else {
            // P1: Left-to-Right logic to match BattleScene.drawOpenSets
            // Check BattleScene.js logic: it used startX from metrics calculation
            // But here we are passed startX.
            let currentX = startX;
            openSets.forEach(set => {
                set.tiles.forEach(tile => {
                    if (sideImg) {
                        ctx.drawImage(sideImg, currentX, y - sideImg.height, tileW, sideImg.height);
                    }
                    this.drawTile(ctx, tile, currentX, y, tileW, tileH);
                    currentX += tileW + gap;
                });
                currentX += setGap - gap;
            });
        }
    },

    drawDora: function (ctx, doras, isRevealed) {
        // Dora Indicator Frame
        const frameConf = BattleConfig.DORA.frame;
        const frameImg = Assets.get(frameConf.path);

        const cx = BattleConfig.DORA.x;
        const cy = BattleConfig.DORA.y;

        // Draw Frame
        let fx = cx + frameConf.xOffset;
        let fy = cy + frameConf.yOffset;

        if (frameImg) {
            // Apply Alignment
            if (frameConf.align === 'center') {
                fx -= frameImg.width / 2;
                fy -= frameImg.height / 2;
            }
            ctx.drawImage(frameImg, fx, fy);
        }

        // Draw Doras
        const tileW = BattleConfig.DORA.tileWidth;
        const tileH = BattleConfig.DORA.tileHeight;
        const gap = BattleConfig.DORA.gap;

        // Visual Correction: Align Tiles to Frame
        // Recalculate Frame X in case it wasn't drawn (fallback) logic needs check, but FrameImg exists mostly.
        // Copy the fx logic:
        let alignedFrameX = cx + frameConf.xOffset;
        let alignedFrameY = cy + frameConf.yOffset; // Baseline Y

        if (frameImg && frameConf.align === 'center') {
            alignedFrameX -= frameImg.width / 2;
            alignedFrameY -= frameImg.height / 2; // Frame Top Y
        }

        // Use Configured Offsets
        const tOffX = BattleConfig.DORA.tileXOffset || 0;
        const tOffY = BattleConfig.DORA.tileYOffset || 0;

        let startX = alignedFrameX + tOffX;

        // Adjust StartY
        // If Frame is Centered Y, then fy (alignedFrameY) is Top.
        // We calculate clear startY for tiles based on frame.
        let startY = cy;
        if (frameImg && frameConf.align === 'center') {
            // Center vertically in frame by default, then apply offset
            startY = alignedFrameY + (frameImg.height - tileH) / 2 + tOffY;
        } else {
            // Fallback/Legacy: just use cy + offset
            startY = cy + tOffY;
        }
        // Frame Y is cy + yOffset (-8). Frame starts higher.
        // Tiles are usually centered vertically relative to frame or similar.
        // Existing code used 'cy'. Let's stick to 'cy' or adjust if needed.
        // If Frame Y = cy - 8. Tile Y = cy. Tile is 8px "lower" than frame top. seems ok.

        doras.forEach((d, i) => {
            // Ensure we only draw valid doras (up to 2) 
            if (i < 2) {
                const x = startX + i * (tileW + gap);
                if (i === 1 && !isRevealed) {
                    // Hidden Ura Dora
                    this.drawCardBack(ctx, x, startY, tileW, tileH, 'tiles/pai_uradora.png');
                } else {
                    this.drawTile(ctx, d, x, startY, tileW, tileH);
                }
            }
        });
    },

    drawInfo: function (ctx, turn, round) {
        const tConf = BattleConfig.INFO;
        const turnImg = Assets.get(tConf.labels.turnPath);
        const roundImg = Assets.get(tConf.labels.roundPath);

        const cx = 320;
        // Calculate X based on offsets
        const tx = cx - tConf.turnLabel.offset;
        const rx = cx + tConf.roundLabel.offset;

        if (turnImg && roundImg) {
            // Draw Turn Label
            let tX = tx;
            if (tConf.turnLabel.align === 'center') tX -= turnImg.width / 2;
            else if (tConf.turnLabel.align === 'right') tX -= turnImg.width;
            ctx.drawImage(turnImg, tX, tConf.turnLabel.y);

            // Draw Round Label
            let rX = rx;
            if (tConf.roundLabel.align === 'center') rX -= roundImg.width / 2;
            else if (tConf.roundLabel.align === 'right') rX -= roundImg.width;
            ctx.drawImage(roundImg, rX, tConf.roundLabel.y);
        }

        // Cap turn display at 20
        const displayTurn = Math.min(turn, 20);
        // Turn Number X
        const tnx = cx - tConf.turnNumber.offset;
        this.drawNumber(ctx, displayTurn, tnx, tConf.turnNumber.y, tConf.turnNumber.align, tConf.turnNumber.pad || 0);

        // Cap round display at 20
        const displayRound = Math.min(round, 20);
        // Round Number X
        const rnx = cx + tConf.roundNumber.offset;
        this.drawNumber(ctx, displayRound, rnx, tConf.roundNumber.y, tConf.roundNumber.align, tConf.roundNumber.pad || 0);
    },

    drawNumber: function (ctx, number, x, y, align = 'center', pad = 0) {
        let str = number.toString();
        if (pad > 0 && str.length < pad) str = str.padStart(pad, '0');

        const numW = BattleConfig.INFO.numbers.w;
        const gap = BattleConfig.INFO.numbers.gap;
        const img = Assets.get(BattleConfig.INFO.numbers.path);

        if (!img) return;

        const totalW = str.length * numW + (str.length - 1) * gap;
        let startX = x;
        if (align === 'center') startX -= totalW / 2;
        else if (align === 'right') startX -= totalW;

        for (let i = 0; i < str.length; i++) {
            const digit = parseInt(str[i]);
            const sx = digit * (numW + gap);
            ctx.drawImage(img, sx, 0, numW, img.height, startX + i * (numW + gap), y, numW, img.height);
        }
    },

    drawBar: function (ctx, x, y, val, max, label) {
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, BattleConfig.BARS.width, BattleConfig.BARS.height);

        // Fill
        const pct = Math.max(0, Math.min(1, val / max));
        const fillW = Math.floor(BattleConfig.BARS.width * pct);

        const path = label === 'HP' ? BattleConfig.BARS.hpPath : BattleConfig.BARS.mpPath;
        const img = Assets.get(path);

        if (img) {
            // Slice/Stretch logic? 
            // Simple stretch for now
            ctx.drawImage(img, 0, 0, img.width, img.height, x, y, fillW, BattleConfig.BARS.height);
        } else {
            ctx.fillStyle = label === 'HP' ? 'blue' : 'yellow';
            ctx.fillRect(x, y, fillW, BattleConfig.BARS.height);
        }
    },

    drawFX: function (ctx, fxList) {
        if (!fxList) return;
        ctx.save();
        fxList.forEach(fx => {
            if (fx.img) {
                ctx.globalAlpha = fx.alpha;
                const w = fx.img.width * fx.scale;
                const h = fx.img.height * fx.scale;
                ctx.drawImage(fx.img, fx.x - w / 2, fx.y - h / 2, w, h);
            }
        });
        ctx.restore();
    },

    // Cached Action Menu Metrics
    _actionMenuMetrics: {
        totalW: 0,
        startX: 0,
        startY: 0,
        frameX: 0,
        frameY: 0,
        frameW: 0,
        frameH: 0
    },

    drawActionMenu: function (ctx, state) {
        ctx.save(); // Prevent state leak (textBaseline)
        const conf = BattleConfig.ACTION;
        const actions = state.possibleActions;
        const btnW = conf.btnWidth;
        const btnH = conf.btnHeight;
        const gap = conf.gap;
        const padding = conf.padding || 20;

        // Calculate Metrics (using cached object)
        const m = this._actionMenuMetrics;
        m.totalW = actions.length * btnW + (actions.length - 1) * gap;
        m.startX = (640 - m.totalW) / 2;
        m.startY = conf.y;
        m.frameX = m.startX - padding;
        m.frameY = m.startY - padding;
        m.frameW = m.totalW + (padding * 2);
        m.frameH = btnH + (padding * 2);

        Assets.drawUIFrame(ctx, m.frameX, m.frameY, m.frameW, m.frameH);

        // Inner Dimmer
        const border = 4;
        ctx.fillStyle = conf.dimmer || 'rgba(0,0,0,0.5)';
        ctx.fillRect(m.frameX + border, m.frameY + border, m.frameW - (border * 2), m.frameH - (border * 2));


        actions.forEach((act, i) => {
            const x = m.startX + i * (btnW + gap);
            const isSelected = (i === state.selectedActionIndex);

            // Selection Cursor (Pink Bar) - Only draw if selected
            if (isSelected) {
                ctx.fillStyle = conf.cursor;
                ctx.fillRect(x, m.startY, btnW, btnH);
            }

            // Text Color
            ctx.fillStyle = isSelected ? conf.textSelected : conf.textDefault;
            ctx.font = conf.buttonFont;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle'; // Fix vertical alignment
            ctx.fillText(act.label, x + btnW / 2, m.startY + btnH / 2);
        });
        ctx.restore();
    },

    drawResult: function (ctx, state) {
        const conf = BattleConfig.RESULT;

        // 1. Dimmer (Removed per user request)
        // ctx.fillStyle = conf.dimmerColor || 'rgba(0,0,0,0.5)';
        // ctx.fillRect(0, 0, 640, 480);

        // 2. Window Body (Frame)
        // Use defaults if missing in config
        const rx = conf.x !== undefined ? conf.x : 60;
        const ry = conf.y !== undefined ? conf.y : 80;
        const rw = conf.w || 520;
        const rh = conf.h || 320;

        // Draw Window using UI helper
        UI.drawWindow(ctx, rx, ry, rw, rh);

        // 3. Border (Removed/Redundant with Frame, but kept if special overlay needed? No, Frame has border)
        // if (conf.borderWidth > 0) { ... } -> Removed

        // Content Rendering
        const info = state.resultInfo; // { type: 'WIN', score: 1000 }
        if (!info) return;

        const typeConf = conf.TYPES[info.type] || conf.TYPES.LOSE; // Fallback

        // Check if Standard WIN/LOSE/NAGARI for Split Layout
        if (info.type === 'WIN' || info.type === 'LOSE' || info.type === 'NAGARI') {
            // New Split Layout
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle'; // Align vertically center for list items

            // Left Column: Yaku + Bonuses
            ctx.font = conf.yakuFont;
            ctx.fillStyle = conf.yakuColor;

            let currentY = conf.yakuY;

            // const lineHeight = 40; // Removed in favor of conf.lineHeight

            // 1. Draw Main Yaku
            if (info.yakuName) {
                // Name (Left)
                ctx.textAlign = 'left';
                ctx.fillStyle = conf.yakuColor;
                ctx.fillText(info.yakuName, conf.yakuListX, currentY);

                // Score (Right)
                // Use yakuScore if available, else calc base? 
                const s = info.yakuScore || 0;
                // Draw Number Image
                // Scale based on font height (approx 20px)
                // Number image usually has height ~32px? 
                // Let's assume height 20px for target.
                // We need source dimensions. Assets.drawNumberBig calculates it.
                // We can pass scale? or simply height.
                // drawNumberBig uses scale.
                // Let's guess scale = 1.0 if image is close. 
                // Better: drawNumberBig supports scale.

                // Align Right: We pass align:'right'.
                // Center Vertically correction: drawNumberBig draws from Top Y.
                // CurrentY is middle. Image H approx 35px at 1.0. At 0.6 scale ~21px.
                // We should offset Y by -10px.
                Assets.drawNumberBig(ctx, s, conf.scoreListX, currentY - 12, {
                    align: 'right',
                    scale: 0.6, // Adjust this visually. Original is likely bigger. 20px is small. 
                    // image height usually ~40-64. 0.6 => ~24-38. 
                    // Let's try 0.7 for now.
                    spacing: 1,
                    imgId: 'ui/number_yellow.png'
                });

                currentY += conf.lineHeight; // Use Config
            }

            // 2. Draw Bonuses
            if (info.bonuses) {
                // Prepare Bonus Config
                const bonusConf = conf.BONUS || {};
                const bonusFont = bonusConf.font || conf.yakuFont;
                const bonusColor = bonusConf.color || conf.yakuColor;
                const bonusPrefix = bonusConf.prefix || "";

                info.bonuses.forEach(bonus => {
                    // Name (Left)
                    ctx.textAlign = 'left';
                    ctx.fillStyle = bonusColor;
                    ctx.font = bonusFont;
                    ctx.fillText(bonusPrefix + bonus.name, conf.yakuListX, currentY);

                    // Score (Right)
                    // Check if score is number or string (for Nagari Tenpai/Noten status)
                    if (typeof bonus.score === 'number') {
                        Assets.drawNumberBig(ctx, bonus.score, conf.scoreListX, currentY - 12, {
                            align: 'right',
                            scale: 0.6,
                            spacing: 1,
                            imgId: 'ui/number_yellow.png'
                        });
                    } else {
                        // String Score (Text Status)
                        ctx.textAlign = 'right';
                        ctx.fillStyle = conf.scoreColor; // Go back to Gold/White for text?
                        ctx.font = conf.scoreFont; // Use Score Font (20px)
                        ctx.fillText(bonus.score, conf.scoreListX, currentY);
                    }

                    currentY += conf.lineHeight; // Use Config
                });
            }

            // 3. Draw Total Score Line?
            // User requested separating them. The main score is sum.
            // Maybe draw a line and then Total?
            // "Result" header is displayed by logic? Origin game has simple list.
            // Total is prominently displayed at top right usually, but here we list items.
            // Let's draw TOTAL at bottom right for clarity.

            // Separator Line
            // Separator Line
            const separatorY = currentY - (conf.lineHeight / 2) + (conf.separatorGap || 0);

            ctx.beginPath();
            ctx.moveTo(conf.yakuListX, separatorY);
            ctx.lineTo(conf.scoreListX, separatorY);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Total Label
            const damageY = separatorY + (conf.damageGap || 15) + (conf.lineHeight / 2);

            ctx.textAlign = 'left';
            ctx.fillStyle = conf.scoreColor;
            ctx.fillText("데미지", conf.yakuListX, damageY);

            // Total Score
            Assets.drawNumberBig(ctx, info.score, conf.scoreListX, damageY - 12, {
                align: 'right',
                scale: 0.6, // Matched with others (0.6)
                spacing: 1,
                imgId: 'ui/number_yellow.png'
            });

            // Restore Title (WIN / LOSE)
            // Draw relative to Window Top or Conf Title Pos?
            // Conf Title Pos: titleX: 320, titleY: 150.
            // But window might be moved. Config has static titleX/Y.
            // Let's use config titleX/Y but adjust drawing properties.
            ctx.textAlign = "center";
            ctx.fillStyle = typeConf.color;
            ctx.font = conf.titleFont;
            // Draw slightly above the list? Yaku list starts at yakuY (140).
            // TitleY (150) overlaps list. We need to check config.
            // Original config had titleY: 150, but yakuY is 140.
            // We should arguably draw title ABOVE window or at top of window.
            // Let's just use configured titleX/Y and user can tune config if needed.
            // Wait, previous code had `ctx.fillText(typeConf.title, conf.titleX, conf.titleY);` in legacy block.

            // Override Config for now to ensure it's above.
            const safeTitleY = (conf.y !== undefined ? conf.y : 80) + 40;
            // Or just use conf.titleY if conf says so?
            // Let's rely on conf.titleY assuming user tunes it, OR hardcode reasonable position.
            // User asked to "Render Title".
            // Title Position
            // Use conf.titleY if set, otherwise default to slightly above yaku list
            const titleY = conf.titleY !== undefined ? conf.titleY : 120;
            ctx.fillText(typeConf.title, conf.titleX, titleY);

        } else {
            // LEGACY / MATCH RESULT LAYOUT (Centered)
            ctx.textAlign = "center";
            ctx.textBaseline = 'middle'; // Unified baseline with main layout

            // 1. Title
            ctx.fillStyle = typeConf.color;
            ctx.font = conf.titleFont;
            ctx.fillText(typeConf.title, conf.titleX, conf.titleY);

            // 2. Info Text (Score or Message)
            ctx.fillStyle = conf.infoColor;
            ctx.font = conf.infoFont;

            // Template replacement
            let text = typeConf.text || "";
            if (info.score !== undefined) {
                text = text.replace("{score}", info.score);
            }
            if (info.yakuName !== undefined) {
                text = text.replace("{yaku}", info.yakuName);
            } else {
                text = text.replace("{yaku}", "");
            }

            if (info.p1Status !== undefined) text = text.replace("{p1Status}", info.p1Status);
            if (info.cpuStatus !== undefined) text = text.replace("{cpuStatus}", info.cpuStatus);
            if (info.damageMsg !== undefined) text = text.replace("{damageMsg}", info.damageMsg);

            // Append Round History (MATCH_WIN / MATCH_LOSE)
            // We will render this separately after the main text to use different font
            let historyText = "";
            if (info.history && info.history.length > 0) {
                info.history.forEach(h => {
                    if (h.result === '무승부') {
                        historyText += `ROUND ${h.round}: 무승부\n`;
                    } else {
                        historyText += `ROUND ${h.round}: ${h.result} - ${h.yaku}\n`;
                    }
                });
            }

            text = text.trim();

            const lines = text.split('\n');

            lines.forEach((line, i) => {
                ctx.fillText(line, conf.scoreX, conf.scoreY + (i * conf.infoLineHeight));
            });

            // Render History with Custom Font & Limits (Only for Match Results usually)
            if (historyText.length > 0) {
                // ... (History code is fine to leave here if it relies else block)
                // We need to move history logic inside here or duplicate?
                // History logic follows below, but uses logic that depends on `lines`.
                // Let's copy/keep history logic inside valid scope.

                const hFont = typeConf.historyFont || `16px ${FONTS.regular}`;
                const hLineHeight = typeConf.historyLineHeight || 25;
                const hMax = typeConf.historyMaxVisible || 5;

                ctx.font = hFont;
                const historyLines = historyText.split('\n').filter(l => l.trim().length > 0);
                const visibleLines = (historyLines.length > hMax) ? historyLines.slice(-hMax) : historyLines;
                const startY = (typeConf.historyY !== undefined) ? typeConf.historyY : (conf.scoreY + (lines.length * conf.infoLineHeight) + 10);

                visibleLines.forEach((line, i) => {
                    const y = startY + (i * hLineHeight);
                    ctx.fillText(line, conf.scoreX, y);
                });
            }
        }

        // History logic moved into else block


        // 3. Footer "Press Space" (Global for all result types)
        if (state.stateTimer > 120) {
            if (state.stateTimer % 60 < 30) {
                ctx.fillStyle = '#FFFFFF';
                // ctx.font = "16px monospace";
                ctx.font = `bold 16px ${FONTS.bold}`;
                const offset = (conf.pressSpaceOffset !== undefined) ? conf.pressSpaceOffset : 20;
                // Frame Bottom Y = ry + rh
                // Ensure ry/rh are defined. Logic at top set them.
                // We need to access them here or recap.
                const ry = conf.y !== undefined ? conf.y : 80;
                const rh = conf.h || 320;
                const pressY = ry + rh + offset;

                ctx.textAlign = 'center';
                ctx.fillText(conf.TEXTS.pressSpace, 320, pressY);
            }
        }
    },

    drawBattleMenu: function (ctx, state) {
        const conf = BattleConfig.BATTLE_MENU;

        // Use configured dimensions
        const x = conf.x;
        const y = conf.y;
        const w = conf.w;
        const h = conf.h;

        // 1. Draw Window using UI helper
        UI.drawWindow(ctx, x, y, w, h);

        const startX = x + conf.padding;
        const startY = y + conf.padding + 7;
        const innerH = h - (conf.padding * 2);

        // Use Fixed Line Height
        const lineHeight = conf.fixedLineHeight || 28;

        ctx.font = conf.font;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        // Helper to get item height
        const getItemHeight = (item) => {
            if (item.type === 'SEPARATOR') return conf.separatorHeight || 4;
            return lineHeight;
        };

        let currentY = startY;

        BattleMenuSystem.menuItems.forEach((item, i) => {
            const h = getItemHeight(item);

            if (item.type === 'SEPARATOR') {
                // Draw Separator
                const lineY = Math.floor(currentY + (h / 2) + conf.cursorYOffset);
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.lineWidth = 1;
                const linePad = 10;
                ctx.moveTo(startX + linePad, lineY);
                ctx.lineTo(startX + (w - (conf.padding * 2)) - linePad, lineY);
                ctx.stroke();

                currentY += h;
                return; // Skip text rendering
            }

            // Normal Item
            const itemY = Math.floor(currentY + (h / 2) + conf.cursorYOffset);

            // 3. Selection Cursor
            if (i === BattleMenuSystem.selectedMenuIndex) {
                ctx.fillStyle = conf.cursor;
                // Cursor bar width
                const barW = w - (conf.padding * 2);
                ctx.fillRect(startX, Math.floor(currentY + conf.cursorYOffset), barW, h);
                ctx.fillStyle = conf.textSelected;
            } else {
                ctx.fillStyle = conf.textDefault;
            }

            // Handle Objects vs Strings (Transition Support)
            const label = item.label || item;
            const isAuto = (item.id === 'AUTO') || (item === '자동 선택');
            const isDisabled = item.disabled || (isAuto && state.lastStateBeforeMenu !== state.STATE_PLAYER_TURN);

            ctx.fillText(label, startX + conf.textOffsetX, itemY + conf.textOffsetY);

            // Overlay Disabled State (Gray out)
            if (isDisabled) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Semi-transparent dimmer over text
                // Also can re-draw text in gray
                ctx.fillText(label, startX + conf.textOffsetX, itemY + conf.textOffsetY);
            }

            currentY += h;
        });
    },
    /**
     * HIT TESTING HELPERS
     * Centralizes coordinate logic so Scene doesn't need to know layout details.
     */

    drawDrawButton: function (ctx) {
        const conf = BattleConfig.DRAW_BUTTON;
        const x = conf.x;
        const y = conf.y;
        const w = conf.w;
        const h = conf.h;

        // Draw Button using UI helper
        // Map config to match UI.drawButton expectations
        // Is selected/hovered?
        const isHovered = false; // Hover removed per request

        const options = {
            font: conf.font,
            cursorColor: conf.cursor
        };

        UI.drawButton(ctx, x, y, w, h, conf.text, isHovered, options);
    },

    checkDrawButton: function (x, y) {
        const conf = BattleConfig.DRAW_BUTTON;
        if (x >= conf.x && x <= conf.x + conf.w &&
            y >= conf.y && y <= conf.y + conf.h) {
            return true;
        }
        return false;
    },


    getActionAt: function (x, y, actions) {
        const conf = BattleConfig.ACTION;
        const btnW = conf.btnWidth;
        const btnH = conf.btnHeight;
        const gap = conf.gap;
        const startY = conf.y;
        const totalW = actions.length * btnW + (actions.length - 1) * gap;
        const startX = (640 - totalW) / 2;

        // Simple bounding box check
        if (y < startY || y > startY + btnH) return -1;
        if (x < startX || x > startX + totalW) return -1;

        // Determine Index
        const relativeX = x - startX;
        const stride = btnW + gap;
        const index = Math.floor(relativeX / stride);

        // Check Gap (if click falls in gap, it's invalid)
        const offsetInStride = relativeX % stride;
        if (offsetInStride > btnW) return -1; // Clicked in gap

        if (index >= 0 && index < actions.length) return index;
        return -1;
    },

    getMenuItemAt: function (x, y, menuItems) {
        // Use logic matching drawBattleMenu
        const conf = BattleConfig.BATTLE_MENU;
        const xPos = conf.x;
        const yPos = conf.y;
        const w = conf.w;
        const h = conf.h;

        const startX = xPos + conf.padding;
        const startY = yPos + conf.padding + 7;

        // Use Fixed Line Height
        const lineHeight = conf.fixedLineHeight || 28;

        if (x < startX || x > startX + w - (conf.padding * 2)) return -1;

        // Iteration Check
        let currentY = startY;
        const getItemHeight = (item) => {
            if (item.type === 'SEPARATOR') return conf.separatorHeight || 4;
            return lineHeight;
        };

        for (let i = 0; i < menuItems.length; i++) {
            const item = menuItems[i];
            const itemH = getItemHeight(item);

            // Check Y bounds for this item
            if (y >= currentY && y < currentY + itemH) {
                // Return index ONLY if it's not a separator
                if (item.type === 'SEPARATOR') return -1;
                return i;
            }

            currentY += itemH;
        }

        return -1;
    },

    getHandTileAt: function (x, y, player, groupSize) {
        // Reuse getVisualMetrics
        const handSize = player.hand.length;
        const metrics = this.getVisualMetrics(player, groupSize);
        const tileW = BattleConfig.HAND.tileWidth;
        const tileH = BattleConfig.HAND.tileHeight;

        // TIGHTER HITBOX LOGIC
        // Reduce clickable area to prevent edge mis-clicks
        const xPad = tileW * 0.15; // 15% padding on each side (30% total reduction)
        const yPad = tileH * 0.1;  // 10% padding on each side

        // Optimization: Check Y bounds first (with padding)
        const handY = BattleConfig.HAND.playerHandY;
        if (y < handY + yPad || y > handY + tileH - yPad) return -1;

        // Iterate or Calculate?
        // `getPlayerHandPosition` includes group gap logic.
        // Iterating is safer vs complex math inversion.
        for (let i = 0; i < handSize; i++) {
            const pos = this.getPlayerHandPosition(i, handSize, groupSize, metrics.startX);
            // Check X with padding
            if (x >= pos.x + xPad && x < pos.x + tileW - xPad) {
                return i;
            }
        }
        return -1;
    },

    // Helper to check Menu Hit
    getMenuItemAt: function (mouseX, mouseY, menuItems) {
        const conf = BattleConfig.BATTLE_MENU;
        const x = conf.x;
        const y = conf.y;
        const w = conf.w;
        const h = conf.h;
        const startX = x + conf.padding;
        const startY = y + conf.padding + 7;

        // Window Bounds Check
        if (mouseX < x || mouseX > x + w || mouseY < y || mouseY > y + h) return -1;

        const lineHeight = conf.fixedLineHeight || 28;
        const getItemHeight = (item) => {
            if (item.type === 'SEPARATOR') return conf.separatorHeight || 4;
            return lineHeight;
        };

        let currentY = startY;

        for (let i = 0; i < menuItems.length; i++) {
            const item = menuItems[i];
            const itemH = getItemHeight(item);

            if (item.type === 'SEPARATOR') {
                currentY += itemH;
                continue;
            }

            // Hit Check
            if (mouseY >= currentY && mouseY < currentY + itemH) {
                // Check X (roughly)
                if (mouseX >= startX && mouseX <= startX + (w - conf.padding * 2)) {
                    return i;
                }
            }
            currentY += itemH;
        }
        return -1;
    },


};
