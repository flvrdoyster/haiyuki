const BattleRenderer = {
    draw: function (ctx, state) {
        // Disable interpolation for pixel art / precise layering
        ctx.imageSmoothingEnabled = false;

        // 1. Random Background (Bottom Layer)
        // state.bgPath must be accessible
        const randomBg = Assets.get(state.bgPath);
        if (randomBg) {
            const pattern = ctx.createPattern(randomBg, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, 640, 480);
        } else {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 640, 480);
        }

        // 2. Portraits
        if (state.p1Character) state.p1Character.draw(ctx);
        if (state.cpuCharacter) state.cpuCharacter.draw(ctx);

        // 3. UI Background (Over Characters)
        const uiBg = Assets.get(BattleUIConfig.UI_BG.path);
        if (uiBg) ctx.drawImage(uiBg, 0, 0);

        // 4.5 Discards
        this.drawDiscards(ctx, state);

        // 5. Hands
        const tileW = BattleUIConfig.HAND.tileWidth;
        const tileH = BattleUIConfig.HAND.tileHeight;
        const gap = BattleUIConfig.HAND.gap;

        // CPU Hand (Top)
        const cpuCount = state.cpu.hand.length;
        const cpuStartX = (640 - (cpuCount * (tileW + gap))) / 2;

        for (let i = 0; i < cpuCount; i++) {
            let xOffset = 0;
            const x = cpuStartX + i * (tileW + gap) + xOffset;

            // Reveal hand if CPU wins or Nagari or Revealed
            if (state.currentState === state.STATE_LOSE || state.currentState === state.STATE_NAGARI || state.cpu.isRevealed) {
                this.drawTile(ctx, state.cpu.hand[i], x, BattleUIConfig.HAND.cpuY, tileW, tileH);
            } else {
                this.drawCardBack(ctx, x, BattleUIConfig.HAND.cpuY, tileW, tileH, 'tiles/back-top.png');
            }
        }

        // Draw CPU Open Sets (Right of hand)
        this.drawOpenSets(ctx, state.cpu.openSets, cpuStartX + cpuCount * (tileW + gap), BattleUIConfig.HAND.cpuY, tileW, tileH, true);

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
                y += BattleUIConfig.HAND.hoverYOffset;
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
                    ctx.fillStyle = BattleUIConfig.HAND.hoverColor;
                    ctx.fillRect(pos.x - 2, y - 2, tileW + 4, tileH + 4);
                }
            }
        }

        // Player Open Sets
        // Use calculated openStartX instead of fixed anchor
        this.drawOpenSets(ctx, state.p1.openSets, metrics.openStartX, BattleUIConfig.HAND.openSetY, tileW, tileH, false);

        // 6. Dora
        this.drawDora(ctx, state.doras, state.uraDoraRevealed);

        // 7. Info (Turn/Round)
        this.drawInfo(ctx, state.turnCount, state.currentRound);

        // 8. Bars
        this.drawBar(ctx, BattleUIConfig.BARS.P1.x, BattleUIConfig.BARS.P1.y, state.p1.hp, state.p1.maxHp, "HP");
        this.drawBar(ctx, BattleUIConfig.BARS.P1.x, BattleUIConfig.BARS.P1.y + BattleUIConfig.BARS.height + BattleUIConfig.BARS.gap, state.p1.mp, state.p1.maxMp, "MP"); // P1 MP

        this.drawBar(ctx, BattleUIConfig.BARS.CPU.x, BattleUIConfig.BARS.CPU.y, state.cpu.hp, state.cpu.maxHp, "HP");
        this.drawBar(ctx, BattleUIConfig.BARS.CPU.x, BattleUIConfig.BARS.CPU.y + BattleUIConfig.BARS.height + BattleUIConfig.BARS.gap, state.cpu.mp, state.cpu.maxMp, "MP"); // CPU MP

        // 9. FX
        // FX handling is usually stateless drawing, but depends on activeFX array
        this.drawFX(ctx, state.activeFX);

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
    },

    getVisualMetrics: function (character, groupSize) {
        const tileW = BattleUIConfig.HAND.tileWidth;
        const gap = BattleUIConfig.HAND.gap;
        const setGap = 15;
        const groupGap = BattleUIConfig.HAND.groupGap;
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

        return {
            totalW,
            startX, // Logic: Hand is first, so startX is handStartX
            handStartX: startX,
            openStartX: startX + handW + sectionGap,
            handW,
            openW
        };
    },

    getPlayerHandPosition: function (index, count, groupSize, startX) {
        const tileW = BattleUIConfig.HAND.tileWidth;
        const gap = BattleUIConfig.HAND.gap;
        const groupGap = BattleUIConfig.HAND.groupGap;

        let x = startX + index * (tileW + gap);
        if (groupSize > 0 && index >= count - groupSize) {
            x += groupGap;
        }

        return { x: x, y: BattleUIConfig.HAND.playerHandY };
    },

    drawTile: function (ctx, tile, x, y, w, h) {
        const img = Assets.get(tile.img);
        if (img) {
            ctx.drawImage(img, x, y, w, h);
        } else {
            ctx.fillStyle = BattleUIConfig.FALLBACK.tileBg;
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.font = BattleUIConfig.FALLBACK.tileTextFont;
            ctx.fillText(tile.type, x + w / 2, y + h / 2);
        }
    },

    drawCardBack: function (ctx, x, y, w, h, path) {
        const img = Assets.get(path) || Assets.get('tiles/back.png'); // Fallback
        if (img) {
            ctx.drawImage(img, x, y, w, h);
        } else {
            // Fallback
            ctx.fillStyle = BattleUIConfig.FALLBACK.cardBackBg;
            ctx.fillRect(x, y, w, h);
            ctx.lineWidth = 1;
            ctx.strokeStyle = BattleUIConfig.FALLBACK.cardBackStroke;
            ctx.strokeRect(x, y, w, h);
        }
    },

    drawDiscards: function (ctx, state) {
        const dw = BattleUIConfig.DISCARDS.tileWidth;
        const dh = BattleUIConfig.DISCARDS.tileHeight;
        const gap = BattleUIConfig.DISCARDS.gap;
        const max = BattleUIConfig.DISCARDS.rowMax;

        const allDiscards = state.discards;
        let p1Idx = 0;
        let cpuIdx = 0;

        // Visual enhancement: Draw highlighted last discard
        const lastDiscard = allDiscards.length > 0 ? allDiscards[allDiscards.length - 1] : null;

        allDiscards.forEach(t => {
            let dx, dy;
            let isP1 = (t.owner === 'P1' || t.owner === 'p1'); // Handle both cases just in case

            if (isP1) {
                const row = Math.floor(p1Idx / max);
                const col = p1Idx % max;
                dx = BattleUIConfig.DISCARDS.P1.x + col * (dw + gap);
                dy = BattleUIConfig.DISCARDS.P1.y + row * (dh + gap);
                p1Idx++;
            } else {
                const row = Math.floor(cpuIdx / max);
                const col = cpuIdx % max;
                dx = BattleUIConfig.DISCARDS.CPU.x + col * (dw + gap);
                // CPU fills downwards
                dy = BattleUIConfig.DISCARDS.CPU.y + row * (dh + gap);
                cpuIdx++;
            }

            // Check if last
            if (t === lastDiscard) {
                // Draw Larger centered on slot
                const w = BattleUIConfig.HAND.tileWidth;
                const h = BattleUIConfig.HAND.tileHeight;
                const cx = dx + (dw - w) / 2;
                const cy = dy + (dh - h) / 2;
                // Draw highlight effect?
                this.drawTile(ctx, t, cx, cy, w, h);
                // Highlight border
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 2;
                ctx.strokeRect(cx, cy, w, h);
            } else {
                this.drawTile(ctx, t, dx, dy, dw, dh);
            }
        });
    },

    drawOpenSets: function (ctx, openSets, startX, y, tileW, tileH, isCpu) {
        if (!openSets || openSets.length === 0) return;

        const gap = BattleUIConfig.HAND.openSetTileGap !== undefined ? BattleUIConfig.HAND.openSetTileGap : 0;
        const setGap = BattleUIConfig.HAND.openSetGap || 10;

        // P1: Draw from Right to Left? Or Left to Right from Anchor?
        // Original: "openSetRightAnchor: 620"
        // CPU: params passed `cpuStartX + width`.

        // Draw Side Asset if Player (isCpu false)
        const sideImg = !isCpu ? Assets.get('tiles/side-bottom.png') : null;

        if (isCpu) {
            let currentX = startX + setGap;
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
        const frameConf = BattleUIConfig.DORA.frame;
        const frameImg = Assets.get(frameConf.path);

        const cx = BattleUIConfig.DORA.x;
        const cy = BattleUIConfig.DORA.y;

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
        const tileW = BattleUIConfig.DORA.tileWidth;
        const tileH = BattleUIConfig.DORA.tileHeight;
        const gap = BattleUIConfig.DORA.gap;

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
        const tOffX = BattleUIConfig.DORA.tileXOffset || 0;
        const tOffY = BattleUIConfig.DORA.tileYOffset || 0;

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
        const tConf = BattleUIConfig.INFO;
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

        this.drawNumber(ctx, turn, tConf.turnNumber.x, tConf.turnNumber.y, tConf.turnNumber.align, tConf.turnNumber.pad || 0);
        this.drawNumber(ctx, round, tConf.roundNumber.x, tConf.roundNumber.y, tConf.roundNumber.align, tConf.roundNumber.pad || 0);
    },

    drawNumber: function (ctx, number, x, y, align = 'center', pad = 0) {
        let str = number.toString();
        if (pad > 0 && str.length < pad) str = str.padStart(pad, '0');

        const numW = BattleUIConfig.INFO.numbers.w;
        const gap = BattleUIConfig.INFO.numbers.gap;
        const img = Assets.get(BattleUIConfig.INFO.numbers.path);

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
        ctx.fillRect(x, y, BattleUIConfig.BARS.width, BattleUIConfig.BARS.height);

        // Fill
        const pct = Math.max(0, Math.min(1, val / max));
        const fillW = Math.floor(BattleUIConfig.BARS.width * pct);

        const path = label === 'HP' ? BattleUIConfig.BARS.hpPath : BattleUIConfig.BARS.mpPath;
        const img = Assets.get(path);

        if (img) {
            // Slice/Stretch logic? 
            // Simple stretch for now
            ctx.drawImage(img, 0, 0, img.width, img.height, x, y, fillW, BattleUIConfig.BARS.height);
        } else {
            ctx.fillStyle = label === 'HP' ? 'blue' : 'yellow';
            ctx.fillRect(x, y, fillW, BattleUIConfig.BARS.height);
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

    drawActionMenu: function (ctx, state) {
        const conf = BattleUIConfig.ACTION;
        const actions = state.possibleActions;
        const btnW = conf.btnWidth;
        const btnH = conf.btnHeight;
        const gap = conf.gap;

        const totalW = actions.length * btnW + (actions.length - 1) * gap;
        const startX = (640 - totalW) / 2;
        const startY = conf.y;

        actions.forEach((act, i) => {
            const x = startX + i * (btnW + gap);
            const isSelected = (i === state.selectedActionIndex);

            ctx.fillStyle = isSelected ? conf.colors.selected : conf.colors.normal;
            ctx.fillRect(x, startY, btnW, btnH);
            ctx.strokeStyle = conf.colors.stroke;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, startY, btnW, btnH);

            ctx.fillStyle = isSelected ? conf.colors.selectedText : conf.colors.text;
            ctx.font = conf.buttonFont;
            ctx.textAlign = 'center';
            ctx.fillText(act.label, x + btnW / 2, startY + btnH / 2 + 7);
        });

        ctx.fillStyle = 'white';
        ctx.font = conf.helpFont;
        ctx.textAlign = 'center';
        ctx.fillText("Select Action!", 320, startY - 20);
    },

    drawResult: function (ctx, state) {
        const conf = BattleUIConfig.RESULT;

        // 1. Dimmer
        ctx.fillStyle = conf.dimmerColor || 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 640, 480);

        // 2. Window Body
        // Use defaults if missing in config
        const rx = conf.x !== undefined ? conf.x : 60;
        const ry = conf.y !== undefined ? conf.y : 80;
        const rw = conf.w || 520;
        const rh = conf.h || 320;

        ctx.fillStyle = conf.windowColor || 'rgba(0,0,0,0.9)';
        ctx.fillRect(rx, ry, rw, rh);

        // 3. Border
        if (conf.borderWidth > 0) {
            ctx.strokeStyle = conf.borderColor || 'white';
            ctx.lineWidth = conf.borderWidth;
            ctx.strokeRect(rx, ry, rw, rh);
        }

        ctx.fillStyle = conf.resultColor;
        ctx.font = conf.titleFont;
        ctx.textAlign = 'center';

        const title = (state.currentState === state.STATE_WIN) ? "WINNER!" :
            (state.currentState === state.STATE_LOSE) ? "DEFEAT..." : "NAGARI";

        ctx.fillText(title, conf.titleX, conf.titleY);

        // STRUCTURED DISPLAY (Priority)
        if (state.winningYaku) {
            ctx.font = conf.scoreFont;
            ctx.fillStyle = conf.subColor;
            ctx.fillText(`${state.winningYaku.score} PTS`, conf.scoreX, conf.scoreY);

            ctx.font = conf.infoFont;
            ctx.fillStyle = conf.infoColor;
            state.winningYaku.yaku.forEach((y, i) => {
                ctx.fillText(y, conf.infoX, conf.infoY + (i * conf.infoLineHeight));
            });

            // STRING MESSAGE FALLBACK (If winningYaku missing but msg exists)
        } else if (state.drawResultMsg) {
            ctx.font = conf.scoreFont;
            ctx.fillStyle = conf.subColor;
            const lines = state.drawResultMsg.split('\n');
            // Skip Title logic if reusing msg, but msg includes title usually.
            // drawResultMsg = "WIN\nScore:...\nPress..."
            lines.forEach((line, i) => {
                if (i === 0) return; // Skip title specific line from msg if similar
                ctx.fillText(line, conf.scoreX, conf.scoreY + (i * 40));
            });
        }

        // "Press Space" (Blinking)
        if (state.timer % 60 < 30) {
            ctx.fillStyle = 'white';
            ctx.font = "16px monospace";
            ctx.fillText("Press SPACE to Continue", 320, 420);
        }
    },

    drawBattleMenu: function (ctx, state) {
        const bg = Assets.get('ui/battle_menu.png');
        if (!bg) return;
        const conf = BattleUIConfig.BATTLE_MENU;

        const x = 640 - bg.width;
        const y = 480 - bg.height;

        // 1. Draw Menu Asset
        ctx.drawImage(bg, x, y);

        // 2. Dimmer
        ctx.fillStyle = conf.dimmer;
        ctx.fillRect(x + conf.padding, y + conf.padding, bg.width - (conf.padding * 2), bg.height - (conf.padding * 2));

        const startX = x + conf.padding;
        const startY = y + conf.padding + 7;
        const h = bg.height - (conf.padding * 2);
        const lineHeight = h / conf.lineHeightRatio;

        ctx.font = conf.font;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        state.MENU_ITEMS.forEach((item, i) => {
            const itemY = startY + (i * lineHeight) + (lineHeight / 2) + conf.cursorYOffset;

            // 3. Selection Cursor
            if (i === state.selectedMenuIndex) {
                ctx.fillStyle = conf.cursor;
                ctx.fillRect(startX, startY + (i * lineHeight) + conf.cursorYOffset, bg.width - (conf.padding * 2), lineHeight);
                ctx.fillStyle = conf.textSelected;
            } else {
                ctx.fillStyle = conf.textDefault;
            }

            ctx.fillText(item, startX + conf.textOffsetX, itemY + conf.textOffsetY);
        });
    }
};
