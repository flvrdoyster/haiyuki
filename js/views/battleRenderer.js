const BattleRenderer = {
    draw: function (ctx, state, activeFX) {
        // Disable interpolation for pixel art / precise layering
        ctx.imageSmoothingEnabled = false;

        // 1. Random Background (Bottom Layer)
        // Fill with black first
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 640, 480);

        // Draw centered background image
        const randomBg = Assets.get(state.bgPath);
        if (randomBg) {
            const bgConf = BattleConfig.BG;
            let x = bgConf.x || 320;
            let y = bgConf.y || 240;

            // Apply alignment
            if (bgConf.align === 'center') {
                x -= randomBg.width / 2;
                y -= randomBg.height / 2;
            }

            ctx.drawImage(randomBg, x, y);
        }

        // 2. Portraits
        if (state.p1Character) state.p1Character.draw(ctx);
        if (state.cpuCharacter) state.cpuCharacter.draw(ctx);

        // 3. UI Background (Over Characters)
        const uiBg = Assets.get(BattleConfig.UI_BG.path);
        if (uiBg) ctx.drawImage(uiBg, 0, 0);

        // 4.5 Discards
        this.drawDiscards(ctx, state);

        // 5. Hands
        const tileW = BattleConfig.HAND.tileWidth;
        const tileH = BattleConfig.HAND.tileHeight;
        const gap = BattleConfig.HAND.gap;

        // CPU Hand (Top)
        // CPU Hand (Top)
        const cpuMetrics = this.getVisualMetrics(state.cpu, 0);
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

        const metrics = this.getVisualMetrics(state.p1, hasGap ? groupSize : 0);
        const pStartX = metrics.handStartX;

        for (let i = 0; i < pCount; i++) {
            const pos = this.getPlayerHandPosition(i, pCount, hasGap ? groupSize : 0, pStartX);
            let y = pos.y;
            const isHover = (state.currentState === state.STATE_PLAYER_TURN && i === state.hoverIndex);

            if (isHover) {
                y += BattleConfig.HAND.hoverYOffset;
            }

            const sideImg = Assets.get('tiles/side-bottom.png');
            if (sideImg) {
                ctx.drawImage(sideImg, pos.x, y + tileH, tileW, sideImg.height);
            }

            if (state.p1.isRiichi && i === state.riichiTargetIndex) {
                // Riichi indicator if needed
            }

            this.drawTile(ctx, state.p1.hand[i], pos.x, y, tileW, tileH);

            if (isHover) {
                const cursorImg = Assets.get('ui/cursor_yellow.png');
                if (cursorImg) {
                    ctx.drawImage(cursorImg, pos.x, y, tileW, tileH);
                } else {
                    ctx.fillStyle = BattleConfig.HAND.hoverColor;
                    ctx.fillRect(pos.x - 2, y - 2, tileW + 4, tileH + 4);
                }
            }
        }

        // Player Open Sets
        // Use calculated openStartX instead of fixed anchor
        this.drawOpenSets(ctx, state.p1.openSets, metrics.openStartX, BattleConfig.HAND.openSetY, tileW, tileH, false);

        // 6. Dora
        this.drawDora(ctx, state.doras, state.uraDoraRevealed);

        // 7. Info (Turn/Round)
        this.drawInfo(ctx, state.turnCount, state.currentRound);

        // 8. Bars
        this.drawBar(ctx, BattleConfig.BARS.P1.x, BattleConfig.BARS.P1.y, state.p1.hp, state.p1.maxHp, "HP");
        this.drawBar(ctx, BattleConfig.BARS.P1.x, BattleConfig.BARS.P1.y + BattleConfig.BARS.height + BattleConfig.BARS.gap, state.p1.mp, state.p1.maxMp, "MP"); // P1 MP

        this.drawBar(ctx, BattleConfig.BARS.CPU.x, BattleConfig.BARS.CPU.y, state.cpu.hp, state.cpu.maxHp, "HP");
        this.drawBar(ctx, BattleConfig.BARS.CPU.x, BattleConfig.BARS.CPU.y + BattleConfig.BARS.height + BattleConfig.BARS.gap, state.cpu.mp, state.cpu.maxMp, "MP"); // CPU MP

        // 9. FX
        // FX handling is usually stateless drawing, but depends on activeFX array
        this.drawFX(ctx, activeFX);

        // 10. Overlays / UI
        if (state.currentState === state.STATE_ACTION_SELECT) {
            this.drawActionMenu(ctx, state);
        } else if (state.currentState === state.STATE_WIN || state.currentState === state.STATE_LOSE || state.currentState === state.STATE_NAGARI) {
            // Draw Result uses state variables
            this.drawResult(ctx, state);
        }

        // Battle Menu
        if (state.currentState === state.STATE_BATTLE_MENU) {
            this.drawBattleMenu(ctx, state);
        }

        // Wait for Draw Button
        if (state.currentState === state.STATE_WAIT_FOR_DRAW) {
            this.drawDrawButton(ctx);
        }
    },

    // Cached Metrics Object to reduce GC
    _visualMetrics: {
        totalW: 0,
        startX: 0,
        handStartX: 0,
        openStartX: 0,
        handW: 0,
        openW: 0
    },

    getVisualMetrics: function (character, groupSize) {
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
        const startX = (640 - totalW) / 2;

        // Update Cached Object
        const m = this._visualMetrics;
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

    drawTile: function (ctx, tile, x, y, w, h) {
        const img = Assets.get(tile.img);
        if (img) {
            ctx.drawImage(img, x, y, w, h);
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

    drawDiscards: function (ctx, state) {
        const dw = BattleConfig.DISCARDS.tileWidth;
        const dh = BattleConfig.DISCARDS.tileHeight;
        const gap = BattleConfig.DISCARDS.gap;
        const max = BattleConfig.DISCARDS.rowMax;

        const allDiscards = state.discards;

        // Layout State Tracking
        const p1Layout = { col: 0, row: 0, x: BattleConfig.DISCARDS.P1.x, y: BattleConfig.DISCARDS.P1.y };
        const cpuLayout = { col: 0, row: 0, x: BattleConfig.DISCARDS.CPU.x, y: BattleConfig.DISCARDS.CPU.y };

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
        const sideImg = !isCpu ? Assets.get('tiles/side-bottom.png') : null;

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
                        ctx.drawImage(sideImg, currentX, y + tileH, tileW, sideImg.height);
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
        const labelImg = Assets.get(tConf.labels.path);

        if (labelImg) {
            const turnW = 68;
            const gap = 2;
            const roundX = turnW + gap;
            const roundW = labelImg.width - roundX;
            const h = labelImg.height;

            // ROUND Label
            // Draw round label
            ctx.drawImage(labelImg, roundX, 0, roundW, h, tConf.roundLabel.x - roundW / 2, tConf.roundLabel.y, roundW, h);
            // TURN Label
            ctx.drawImage(labelImg, 0, 0, turnW, h, tConf.turnLabel.x - turnW / 2, tConf.turnLabel.y, turnW, h);
        }

        // Cap turn display at 20
        const displayTurn = Math.min(turn, 20);
        this.drawNumber(ctx, displayTurn, tConf.turnNumber.x, tConf.turnNumber.y, tConf.turnNumber.align, tConf.turnNumber.pad || 0);

        // Cap round display at 20
        const displayRound = Math.min(round, 20);
        this.drawNumber(ctx, displayRound, tConf.roundNumber.x, tConf.roundNumber.y, tConf.roundNumber.align, tConf.roundNumber.pad || 0);
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
    },

    drawResult: function (ctx, state) {
        const conf = BattleConfig.RESULT;

        // 1. Dimmer
        ctx.fillStyle = conf.dimmerColor || 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 640, 480);

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

        ctx.textAlign = "center";

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
        // Remove extra newline if yaku is empty and starts with newline? 
        // Or just let it be. If {yaku} is top line and empty, we get empty first line.
        // Ideally trim or handle nicely. But straightforward replacement is fine for now.
        text = text.trim();

        const lines = text.split('\n'); // Use actual newline char since Config might use \n or user typed it? 
        // Previous code split by '\\n' (literal string \n). 
        // If Config object has `\n` in string literal `"{yaku}\nScore..."`, JS parses it as newline char.
        // So split('\n') is correct. 
        // Check if previous code used '\\n' intentionally for literal "\n" string?
        // Config file: `text: "{yaku}\nScore: {score}"`. This is a string literal containing a newline character.
        // So `split('\n')` is correct. The previous code had `split('\\n')` which looks for literal backslash-n.
        // I should fix that too if it was wrong, or check if Config uses double escape.
        // Config: `text: "{yaku}\nScore: {score}"`. Standard JS string.
        // Wait, if I write `\n` in a JS file string, it becomes a newline.
        // Previous code: `const lines = text.split('\\n');` -> This splits by literal `\n` characters (backslash then n).
        // Unless the string was `"{yaku}\\nScore..."`.
        // Let's assume standard newline and fix the split to `\n`.

        lines.forEach((line, i) => {
            ctx.fillText(line, conf.scoreX, conf.scoreY + (i * conf.infoLineHeight));
        });

        // Display Bonuses (Config-based)
        if (info.bonuses && info.bonuses.length > 0) {
            const bonusConf = conf.BONUS;
            ctx.fillStyle = bonusConf.color;
            ctx.font = bonusConf.font;
            const bonusStartY = conf.scoreY + (lines.length * conf.infoLineHeight) + bonusConf.startYOffset;

            info.bonuses.forEach((bonus, i) => {
                ctx.fillText(bonusConf.prefix + bonus, conf.scoreX, bonusStartY + (i * bonusConf.lineHeight));
            });
        }

        // 3. Footer "Press Space"
        // 3. Footer "Press Space"
        // Show only after delay allowed input
        if (state.stateTimer > 120) {
            if (state.stateTimer % 60 < 30) {
                ctx.fillStyle = '#FFFFFF'; // or conf.infoColor
                ctx.font = "16px monospace";
                // Position relative to frame bottom
                const offset = (conf.pressSpaceOffset !== undefined) ? conf.pressSpaceOffset : 20;
                const pressY = ry + rh + offset;
                ctx.fillText(conf.TEXTS.pressSpace, conf.infoX, pressY);
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

        state.menuItems.forEach((item, i) => {
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
            if (i === state.selectedMenuIndex) {
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
        const isHovered = (Input && Input.mouseX >= x && Input.mouseX <= x + w &&
            Input.mouseY >= y && Input.mouseY <= y + h);

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
    }
};
