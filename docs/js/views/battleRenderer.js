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

        const bgCtx = this.bgCanvas.getContext('2d');
        bgCtx.imageSmoothingEnabled = false;

        bgCtx.fillStyle = 'rgba(0, 0, 0, 1)';
        bgCtx.fillRect(0, 0, 640, 480);

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

        const fgCtx = this.fgCanvas.getContext('2d');
        fgCtx.imageSmoothingEnabled = false;
        fgCtx.clearRect(0, 0, 640, 480);

        const uiBg = Assets.get(BattleConfig.UI_BG.path);
        if (uiBg) fgCtx.drawImage(uiBg, 0, 0);

        this.drawCharacterNames(fgCtx, state);

        this._dirtyStatic = false;
    },

    draw: function (ctx, state, activeFX) {
        ctx.imageSmoothingEnabled = false;
        this._lookRects = { dora: null, uraDora: null, lastDiscard: null, drawn: null, hand: [] };

        if (this._dirtyStatic || !this.bgCanvas) {
            this.updateStaticLayers(state);
        }

        ctx.drawImage(this.bgCanvas, 0, 0);

        if (BattleScene.p1Character) BattleScene.p1Character.draw(ctx);
        if (BattleScene.cpuMasked) {
            // 마유가 숨겨진 보스로 등장할 때 실루엣 표시; smile 상태만 별도 이미지 존재
            const smiling = BattleScene.cpuCharacter && BattleScene.cpuCharacter.state === 'smile';
            const sil = Assets.get(smiling ? 'face/MAYU_unknown_smile.png' : 'face/MAYU_unknown.png');
            const m = BattleConfig.MASKED_BOSS;
            if (sil && m) ctx.drawImage(sil, m.x, m.y, sil.width * m.scale, sil.height * m.scale);
        } else if (BattleScene.cpuCharacter) {
            BattleScene.cpuCharacter.draw(ctx);
        }

        ctx.drawImage(this.fgCanvas, 0, 0);

        this.drawBuffIndicators(ctx, state);

        this.drawDiscards(ctx, state);

        const tileW = BattleConfig.HAND.tileWidth;
        const tileH = BattleConfig.HAND.tileHeight;
        const gap = BattleConfig.HAND.tileGap;

        const cpuMetrics = BattleLayout.getVisualMetrics(state.cpu, 0, 'cpu');
        const cpuStartX = cpuMetrics.handStartX;
        const cpuCount = state.cpu.hand.length;

        for (let i = 0; i < cpuCount; i++) {
            const x = cpuStartX + i * (tileW + gap);

            // CPU 승리/나가리/패 공개 시 손패 공개
            if (state.currentState === state.STATE_LOSE || state.currentState === state.STATE_MATCH_OVER || state.currentState === state.STATE_NAGARI || state.cpu.isRevealed) {
                this.drawTile(ctx, state.cpu.hand[i], x, BattleConfig.HAND.cpuY, tileW, tileH);
            } else {
                this.drawCardBack(ctx, x, BattleConfig.HAND.cpuY, tileW, tileH, 'tiles/back-top.png');
            }
        }

        this.drawOpenSets(ctx, state.cpu.openSets, cpuMetrics.openStartX, BattleConfig.HAND.cpuY, tileW, tileH, true);

        const pCount = state.p1.hand.length;
        const groupSize = state.lastDrawGroupSize || 0;
        const hasGap = (groupSize > 0) && (state.currentState === state.STATE_PLAYER_TURN || state.currentState === state.STATE_BATTLE_MENU);

        const metrics = BattleLayout.getVisualMetrics(state.p1, hasGap ? groupSize : 0, 'p1');
        const pStartX = metrics.handStartX;

        for (let i = 0; i < pCount; i++) {
            const pos = BattleLayout.getPlayerHandPosition(i, pCount, hasGap ? groupSize : 0, pStartX);
            let y = pos.y;
            const isHover = ((state.currentState === state.STATE_PLAYER_TURN || state.currentState === state.STATE_TILE_EXCHANGE) && i === state.hoverIndex);

            if (isHover) {
                y += BattleConfig.HAND.hoverYOffset;
            }

            const isExchanging = state.exchangeIndices && state.exchangeIndices.includes(i);
            const useBackSide = state.p1.isFaceDown || isExchanging;

            const sideAsset = useBackSide ? 'tiles/side-top-back.png' : 'tiles/side-top.png';
            const sideImg = Assets.get(sideAsset);

            if (sideImg) {
                const sy = y - sideImg.height;
                ctx.drawImage(sideImg, pos.x, sy, tileW, sideImg.height);
            }

            const options = {};
            if (state.tutorial) {
                const choosing = state.currentState === state.STATE_PLAYER_TURN || state.currentState === state.STATE_BATTLE_MENU;
                if (choosing && !state.narration && !state.tutorialCanDiscard(i)) options.tint = 'rgba(0, 0, 0, 0.6)';
            } else if (state.p1.isRiichi) {
                // 리치 후 버릴 수 없는 패 어둡게
                const validIndices = state.validRiichiDiscardIndices;
                if (validIndices && !validIndices.includes(i)) {
                    options.tint = 'rgba(0, 0, 0, 0.6)';
                }
            }

            if (state.p1.isFaceDown || isExchanging) {
                this.drawCardBack(ctx, pos.x, y, tileW, tileH, 'tiles/pai_back.png');
            } else {
                this.drawTile(ctx, state.p1.hand[i], pos.x, y, tileW, tileH, options);
                const sideH = sideImg ? sideImg.height : 0;
                const rect = { type: state.p1.hand[i].type, x: pos.x, y: y - sideH, w: tileW, h: tileH + sideH };
                this._lookRects.hand.push(rect);
                if (i === pCount - 1) this._lookRects.drawn = rect;
            }
        }

        if ((state.currentState === state.STATE_PLAYER_TURN || state.currentState === state.STATE_TILE_EXCHANGE) && state.hoverIndex >= 0 && state.hoverIndex < pCount) {
            const i = state.hoverIndex;
            const pos = BattleLayout.getPlayerHandPosition(i, pCount, hasGap ? groupSize : 0, pStartX);
            let y = pos.y + BattleConfig.HAND.hoverYOffset;

            const sideImg = Assets.get('tiles/side-top.png');
            const sideH = sideImg ? sideImg.height : 14;
            const totalH = tileH + sideH;
            const cursorY = y - sideH;

            const hConf = BattleConfig.HAND;
            if (hConf.hoverColors && hConf.hoverColors.length > 0) {
                const speed = hConf.hoverBlinkSpeed || 10;
                // 타이머로 색상 순환 (프레임 기반)
                const cIndex = Math.floor(state.timer / speed) % hConf.hoverColors.length;
                ctx.strokeStyle = hConf.hoverColors[cIndex];
            } else {
                ctx.strokeStyle = hConf.hoverColor;
            }
            ctx.lineWidth = BattleConfig.HAND.hoverWidth;
            ctx.strokeRect(pos.x, cursorY, tileW, totalH);
        }

        this.drawOpenSets(ctx, state.p1.openSets, metrics.openStartX, BattleConfig.HAND.playerY, tileW, tileH, false);

        this.drawDora(ctx, state.doras, state.uraDoras, state.uraDoraRevealed);

        this.drawInfo(ctx, state.turnCount, state.currentRound, !!state.tutorial);

        const riichiConf = BattleConfig.RIICHI_STICK;
        [['P1', state.p1], ['CPU', state.cpu]].forEach(([who, p]) => {
            if (!p.isRiichi) return;
            const rImg = Assets.get(riichiConf.paths[p.riichiStick || 0]);
            if (rImg) ctx.drawImage(rImg, riichiConf[who].x, riichiConf[who].y);
        });

        // 스킬 대화는 승리 시퀀스 중에도 표시되므로 항상 그림
        BattleDialogue.draw(ctx, state);

        this.drawBar(ctx, BattleConfig.BARS.P1.x, BattleConfig.BARS.P1.y, state.p1.hp, state.p1.maxHp, "HP");

        let p1PreviewCost = 0;
        if (typeof BattleScene !== 'undefined' && BattleScene.confirmData && BattleScene.confirmData.cost) {
            p1PreviewCost = BattleScene.confirmData.cost;
        }

        this.drawBar(ctx, BattleConfig.BARS.P1.x, BattleConfig.BARS.P1.y + BattleConfig.BARS.height + BattleConfig.BARS.gap, state.p1.mp, state.p1.maxMp, "MP", p1PreviewCost);

        this.drawBar(ctx, BattleConfig.BARS.CPU.x, BattleConfig.BARS.CPU.y, state.cpu.hp, state.cpu.maxHp, "HP");
        this.drawBar(ctx, BattleConfig.BARS.CPU.x, BattleConfig.BARS.CPU.y + BattleConfig.BARS.height + BattleConfig.BARS.gap, state.cpu.mp, state.cpu.maxMp, "MP");

        this.drawFX(ctx, activeFX);

        if (state.currentState === state.STATE_WIN || state.currentState === state.STATE_LOSE || state.currentState === state.STATE_NAGARI) {
            // 라운드별 결과 창만 — 매치 종료는 블랙 페이드로 처리
            if (!this._lookUnderResult(state)) this.drawResult(ctx, state);
        }

        if (state.currentState === state.STATE_BATTLE_MENU) {
            this.drawBattleMenu(ctx, state);
        }

        this.drawActionButton(ctx, state);

        if (state.narration) {
            this.drawNarration(ctx, state);
            this.drawLook(ctx, state);
        }

        if (state.currentState === state.STATE_TILE_EXCHANGE) {
            this.drawExchangeWindow(ctx, state);
        } else if (state.lastChance) {
            this.drawRoulette(ctx, state);
        }

    },

    drawRoulette: function (ctx, state) {
        const lc = state.lastChance;
        if (!lc || !lc.tile) return;
        const player = lc.who === 'CPU' ? state.cpu : state.p1;
        const start = BattleLayout.getVisualMetrics(player, 0).handStartX;
        const count = player.hand.length;
        const x = BattleLayout.getPlayerHandPosition(count, count + 1, 1, start).x;
        const tileW = BattleConfig.HAND.tileWidth;
        const tileH = BattleConfig.HAND.tileHeight;
        if (lc.who === 'CPU') {
            this.drawTile(ctx, lc.tile, x, BattleConfig.HAND.cpuY, tileW, tileH);
            return;
        }
        const y = BattleConfig.HAND.playerY;
        const sideImg = Assets.get('tiles/side-top.png');
        if (sideImg) ctx.drawImage(sideImg, x, y - sideImg.height, tileW, sideImg.height);
        this.drawTile(ctx, lc.tile, x, y, tileW, tileH);
    },

    drawCharacterNames: function (ctx, state) {
        const conf = BattleConfig.NAME_DISPLAY;
        if (!conf) return;

        ctx.save();
        ctx.font = conf.font;
        ctx.fillStyle = conf.color;
        ctx.strokeStyle = conf.stroke;
        ctx.lineWidth = conf.strokeWidth;
        ctx.textBaseline = 'alphabetic'; // 기준선 명시: 프레임 간 흔들림 방지

        if (state.p1 && state.p1.name) {
            const name = state.p1.name;
            ctx.textAlign = conf.P1.align || 'left';
            ctx.strokeText(name, conf.P1.x, conf.P1.y);
            ctx.fillText(name, conf.P1.x, conf.P1.y);
        }

        if (state.cpu && state.cpu.name) {
            const name = BattleRenderer.maskedCpuName(state);
            ctx.textAlign = conf.CPU.align || 'right';
            ctx.strokeText(name, conf.CPU.x, conf.CPU.y);
            ctx.fillText(name, conf.CPU.x, conf.CPU.y);
        }
        ctx.restore();
    },

    // 플레이어가 마유가 아닐 때 CPU 마유는 "???" 표기 (숨겨진 보스)
    maskedCpuName: function (s) {
        if (s && !s.online && s.cpu && s.cpu.id === 'mayu' && s.p1 && s.p1.id !== 'mayu') return '???';
        return (s && s.cpu && s.cpu.name) ? s.cpu.name : '';
    },

    drawBuffIndicators: function (ctx, engine) {
        const conf = BattleConfig.BUFF_DISPLAY;
        if (!conf) return;

        const nameConf = BattleConfig.NAME_DISPLAY;

        ctx.save();
        ctx.font = conf.font;
        ctx.fillStyle = conf.color;
        ctx.strokeStyle = conf.stroke;
        ctx.lineWidth = conf.strokeWidth;
        ctx.textBaseline = 'alphabetic';

        const p1 = engine.p1;
        if (p1 && p1.buffs) {
            const buffs = p1.buffs;
            const indicators = [];
            if (buffs.discardGuard > 0) indicators.push(`${conf.icons.discardGuard}${buffs.discardGuard}`);
            if (buffs.curseDraw > 0) indicators.push(`${conf.icons.curseDraw}${buffs.curseDraw}`);
            if (buffs.spiritTimer > 0) indicators.push(`${conf.icons.spiritTimer}${buffs.spiritTimer}`);
            if (buffs.guaranteedWin === true) indicators.push(`${conf.icons.guaranteedWin}1`);

            if (indicators.length > 0) {
                ctx.save();
                ctx.font = nameConf.font;
                const nameWidth = ctx.measureText(p1.name || "").width;
                ctx.restore();

                const text = indicators.join(' ');
                const x = nameConf.P1.x + nameWidth + conf.P1.offsetX;
                const y = nameConf.P1.y + conf.P1.offsetY;
                ctx.textAlign = 'left';
                ctx.strokeText(text, x, y);
                ctx.fillText(text, x, y);
            }
        }

        const cpu = engine.cpu;
        if (cpu && cpu.buffs) {
            const buffs = cpu.buffs;
            const indicators = [];
            if (buffs.discardGuard > 0) indicators.push(`${conf.icons.discardGuard}${buffs.discardGuard}`);
            if (buffs.curseDraw > 0) indicators.push(`${conf.icons.curseDraw}${buffs.curseDraw}`);
            if (buffs.spiritTimer > 0) indicators.push(`${conf.icons.spiritTimer}${buffs.spiritTimer}`);
            if (buffs.guaranteedWin === true) indicators.push(`${conf.icons.guaranteedWin}1`);

            if (indicators.length > 0) {
                ctx.save();
                ctx.font = nameConf.font;
                const nameWidth = ctx.measureText(BattleRenderer.maskedCpuName(engine)).width;
                ctx.restore();

                const text = indicators.join(' ');
                const x = nameConf.CPU.x - nameWidth - conf.CPU.offsetX;
                const y = nameConf.CPU.y + conf.CPU.offsetY;
                ctx.textAlign = 'right';
                ctx.strokeText(text, x, y);
                ctx.fillText(text, x, y);
            }
        }

        ctx.restore();
    },

    drawTile: function (ctx, tile, x, y, w, h, options = {}) {
        const img = Assets.get(tile.img);
        if (img) {
            ctx.drawImage(img, x, y, w, h);

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
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            ctx.textAlign = 'center';
            ctx.font = BattleConfig.FALLBACK.tileTextFont;
            ctx.fillText(tile.type, x + w / 2, y + h / 2);
        }
    },

    drawCardBack: function (ctx, x, y, w, h, path) {
        const img = Assets.get(path) || Assets.get('tiles/back.png');
        if (img) {
            ctx.drawImage(img, x, y, w, h);
        } else {
            ctx.fillStyle = BattleConfig.FALLBACK.cardBackBg;
            ctx.fillRect(x, y, w, h);
            ctx.lineWidth = 1;
            ctx.strokeStyle = BattleConfig.FALLBACK.cardBackStroke;
            ctx.strokeRect(x, y, w, h);
        }
    },

    _p1DiscardLayout: { col: 0, row: 0, x: 0, y: 0 },
    _cpuDiscardLayout: { col: 0, row: 0, x: 0, y: 0 },

    drawDiscards: function (ctx, state) {
        const dw = BattleConfig.DISCARDS.tileWidth;
        const dh = BattleConfig.DISCARDS.tileHeight;
        const gap = BattleConfig.DISCARDS.gap;
        const max = BattleConfig.DISCARDS.rowMax;

        const allDiscards = state.discards;

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

            // 리치 버림패는 90도 회전 → 슬롯 폭이 높이값
            const slotW = t.isRiichi ? dh : dw;

            if (layout.col >= max) {
                layout.col = 0;
                layout.row++;
                layout.x = isP1 ? BattleConfig.DISCARDS.P1.x : BattleConfig.DISCARDS.CPU.x;
                layout.y += dh + gap;
            }

            const dx = layout.x;
            const dy = layout.y;

            layout.x += slotW + gap;
            layout.col++;

            if (t === lastDiscard) {
                const w = BattleConfig.HAND.tileWidth;
                const h = BattleConfig.HAND.tileHeight;

                if (t.isRiichi) {
                    const cx = dx + slotW / 2;
                    const cy = dy + dh / 2;

                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(-Math.PI / 2);
                    this.drawTile(ctx, t, -w / 2, -h / 2, w, h);
                    ctx.strokeStyle = 'yellow';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-w / 2, -h / 2, w, h);
                    ctx.restore();
                    this._lookRects.lastDiscard = { x: cx - h / 2, y: cy - w / 2, w: h, h: w };
                } else {
                    const cx = dx + (dw - w) / 2;
                    const cy = dy + (dh - h) / 2;
                    this.drawTile(ctx, t, cx, cy, w, h);
                    ctx.strokeStyle = 'yellow';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(cx, cy, w, h);
                    this._lookRects.lastDiscard = { x: cx, y: cy, w: w, h: h };
                }
            } else {
                if (t.isRiichi) {
                    const cx = dx + slotW / 2;
                    const cy = dy + dh / 2;
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(-Math.PI / 2);
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

        const gap = BattleConfig.HAND.tileGap;
        const setGap = BattleConfig.HAND.tileGap;

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

    drawDora: function (ctx, doras, uraDoras, isRevealed) {
        const frameConf = BattleConfig.DORA.frame;
        const frameImg = Assets.get(frameConf.path);

        const cx = BattleConfig.DORA.x;
        const cy = BattleConfig.DORA.y;

        let fx = cx + frameConf.xOffset;
        let fy = cy + frameConf.yOffset;

        if (frameImg) {
            if (frameConf.align === 'center') {
                fx -= frameImg.width / 2;
                fy -= frameImg.height / 2;
            }
            ctx.drawImage(frameImg, fx, fy);
        }

        const tileW = BattleConfig.DORA.tileWidth;
        const tileH = BattleConfig.DORA.tileHeight;
        const gap = BattleConfig.DORA.gap;

        let alignedFrameX = cx + frameConf.xOffset;
        let alignedFrameY = cy + frameConf.yOffset;

        if (frameImg && frameConf.align === 'center') {
            alignedFrameX -= frameImg.width / 2;
            alignedFrameY -= frameImg.height / 2;
        }

        const tOffX = BattleConfig.DORA.tileXOffset || 0;
        const tOffY = BattleConfig.DORA.tileYOffset || 0;

        let startX = alignedFrameX + tOffX;

        let startY = cy;
        if (frameImg && frameConf.align === 'center') {
            startY = alignedFrameY + (frameImg.height - tileH) / 2 + tOffY;
        } else {
            startY = cy + tOffY;
        }

        if (doras.length > 0) {
            this.drawTile(ctx, doras[0], startX, startY, tileW, tileH);
            this._lookRects.dora = { x: startX, y: startY, w: tileW, h: tileH };
        }

        if (uraDoras && uraDoras.length > 0) {
            const x = startX + (tileW + gap);
            this._lookRects.uraDora = { x: x, y: startY, w: tileW, h: tileH };
            if (isRevealed) {
                this.drawTile(ctx, uraDoras[0], x, startY, tileW, tileH);
            } else {
                this.drawCardBack(ctx, x, startY, tileW, tileH, 'tiles/pai_uradora.png');
            }
        }
    },

    drawInfo: function (ctx, turn, round, isLesson) {
        const tConf = BattleConfig.INFO;
        const turnImg = Assets.get(tConf.labels.turnPath);
        const roundImg = Assets.get(isLesson ? tConf.labels.lessonPath : tConf.labels.roundPath);

        const cx = 320;
        const tx = cx - tConf.turnLabel.offset;
        const rx = cx + tConf.roundLabel.offset;

        if (turnImg && roundImg) {
            let tX = tx;
            if (tConf.turnLabel.align === 'center') tX -= Math.floor(turnImg.width / 2);
            else if (tConf.turnLabel.align === 'right') tX -= turnImg.width;
            ctx.drawImage(turnImg, tX, tConf.turnLabel.y);

            let rX = rx;
            if (tConf.roundLabel.align === 'center') rX -= Math.floor(roundImg.width / 2);
            else if (tConf.roundLabel.align === 'right') rX -= roundImg.width;
            ctx.drawImage(roundImg, rX, tConf.roundLabel.y);
        }

        // 최대 20턴 표시 (스프라이트 시트 범위)
        const displayTurn = Math.min(turn, 20);
        const tnx = cx - tConf.turnNumber.offset;
        this.drawNumber(ctx, displayTurn, tnx, tConf.turnNumber.y, tConf.turnNumber.align, tConf.turnNumber.pad || 0);

        const displayRound = Math.min(round, 20);
        const rnx = cx + tConf.roundNumber.offset;
        this.drawNumber(ctx, displayRound, rnx, tConf.roundNumber.y, tConf.roundNumber.align, tConf.roundNumber.pad || 0);
    },

    drawClock: function (ctx, who, seconds, kind) {
        const clock = kind === 'turn' ? BattleConfig.ONLINE.CLOCK.turn : BattleConfig.ONLINE.CLOCK.other;
        const img = Assets.get(clock.digits);
        if (!img) return;
        const H = BattleConfig.HAND;
        const y = who === 'P1' ? H.playerY + Math.floor((H.tileHeight - img.height) / 2) : H.cpuY + Math.floor((H.tileHeight - img.height) / 2);
        this.drawNumber(ctx, seconds, 6, y, 'left', 0, clock.digits);
        ctx.save();
        ctx.font = `bold 12px ${FONTS.bold}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = clock.color;
        ctx.fillText(clock.label, 6, y - 2);
        ctx.restore();
    },

    drawNumber: function (ctx, number, x, y, align = 'center', pad = 0, path = BattleConfig.INFO.numbers.path) {
        let str = number.toString();
        if (pad > 0 && str.length < pad) str = str.padStart(pad, '0');

        const numW = BattleConfig.INFO.numbers.w;
        const gap = BattleConfig.INFO.numbers.gap;
        const srcX = BattleConfig.INFO.numbers.sx;
        const img = Assets.get(path);

        if (!img) return;

        const totalW = str.length * numW + (str.length - 1) * gap;
        let startX = x;
        if (align === 'center') startX -= totalW / 2;
        else if (align === 'right') startX -= totalW;

        for (let i = 0; i < str.length; i++) {
            const digit = parseInt(str[i]);
            ctx.drawImage(img, srcX[digit], 0, numW, img.height, startX + i * (numW + gap), y, numW, img.height);
        }
    },

    drawBar: function (ctx, x, y, val, max, label, previewCost = 0) {
        const pct = Math.max(0, Math.min(1, val / max));
        const fillW = Math.floor(BattleConfig.BARS.width * pct);

        const path = label === 'HP' ? BattleConfig.BARS.hpPath : BattleConfig.BARS.mpPath;
        const img = Assets.get(path);

        if (img) {
            if (previewCost > 0) {
                // previewCost 구간은 빨간색 점멸: [잔여][비용(점멸)][빈칸]
                const safeVal = Math.max(0, val - previewCost);
                const safePct = Math.max(0, Math.min(1, safeVal / max));
                const safeW = Math.floor(BattleConfig.BARS.width * safePct);

                if (safeW > 0) {
                    ctx.drawImage(img, 0, 0, img.width, img.height, x, y, safeW, BattleConfig.BARS.height);
                }

                if (val > safeVal) {
                    const costW = fillW - safeW;
                    const alpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = 'red';
                    ctx.fillRect(x + safeW, y, costW, BattleConfig.BARS.height);
                    ctx.restore();
                }
            } else {
                ctx.drawImage(img, 0, 0, img.width, img.height, x, y, fillW, BattleConfig.BARS.height);
            }
        } else {
            ctx.fillStyle = label === 'HP' ? 'blue' : 'yellow';
            ctx.fillRect(x, y, fillW, BattleConfig.BARS.height);

            if (previewCost > 0) {
                const safeVal = Math.max(0, val - previewCost);
                const safePct = Math.max(0, Math.min(1, safeVal / max));
                const safeW = Math.floor(BattleConfig.BARS.width * safePct);
                const costW = fillW - safeW;

                ctx.fillStyle = 'red';
                ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
                ctx.fillRect(x + safeW, y, costW, BattleConfig.BARS.height);
                ctx.globalAlpha = 1.0;
            }
        }
    },

    drawFX: function (ctx, fxList) {
        if (!fxList) return;
        ctx.save();
        fxList.forEach(fx => {
            if (fx.timeline) {
                fx.pieces.forEach(pc => {
                    if (!pc.visible) return;
                    ctx.drawImage(pc.img, pc.sx, pc.sy, pc.sw, pc.sh,
                        Math.round(pc.x - pc.sw / 2), Math.round(pc.y - pc.sh / 2), pc.sw, pc.sh);
                });
                fx.labels.forEach(lb => {
                    if (!lb.visible) return;
                    ctx.drawImage(lb.img, Math.round(lb.x - lb.img.width / 2), Math.round(lb.y - lb.img.height / 2));
                });
            } else if (fx.img) {
                ctx.globalAlpha = fx.alpha;
                const w = fx.img.width * fx.scale;
                const h = fx.img.height * fx.scale;
                ctx.drawImage(fx.img, fx.x - w / 2, fx.y - h / 2, w, h);
                ctx.globalAlpha = 1;
            }
        });
        ctx.restore();
    },

    damageStages: function (info) {
        const stages = [];
        const push = v => { if (stages[stages.length - 1] !== v) stages.push(v); };
        const hasYaku = info.yakuScore != null && info.baseScore != null;
        if (hasYaku) {
            push(info.yakuScore);
            push(info.baseScore);
            if (typeof info.bonusScore === 'number' && info.bonusScore > 0) push(info.baseScore + info.bonusScore);
        }
        push(info.score || 0);
        return stages;
    },

    rollDamage: function (stages, t, roll, start) {
        let from = 0;
        let at = start;
        for (const to of stages) {
            if (t < at) return from;
            if (t < at + roll.ticks) {
                const p = (t - at) / roll.ticks;
                const ease = 1 - (1 - p) * (1 - p);
                if (Math.floor(t / roll.soundEvery) > Math.floor((t - 1) / roll.soundEvery)) {
                    Assets.playSound(BattleConfig.AUDIO.TICK);
                }
                return Math.round((from + (to - from) * ease) / 10) * 10;
            }
            from = to;
            at += roll.ticks + roll.gap;
        }
        return from;
    },

    drawResult: function (ctx, state) {
        const conf = BattleConfig.RESULT;

        const rx = conf.x !== undefined ? conf.x : 60;
        const ry = conf.y !== undefined ? conf.y : 80;
        const rw = conf.w || 520;
        const rh = conf.h || 320;

        // 창이 세로 중심에서 위아래로 펼쳐진 뒤에 내용을 그린다.
        const unfoldH = Math.min(rh, 16 + state.stateTimer * conf.unfoldPerTick);
        if (unfoldH < rh) {
            UIDraw.drawWindow(ctx, rx, ry + (rh - unfoldH) / 2, rw, unfoldH);
            return;
        }
        UIDraw.drawWindow(ctx, rx, ry, rw, rh);

        const info = state.resultInfo;
        if (!info) return;

        // LOSE 폴백: 타입 미등록 시 LOSE 스타일 적용
        const typeConf = conf.TYPES[info.type] || conf.TYPES.LOSE;

        if (info.type === 'WIN' || info.type === 'LOSE' || info.type === 'NAGARI') {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = conf.yakuFont;
            ctx.fillStyle = conf.yakuColor;

            let currentY = conf.yakuY;

            if (info.yakuName) {
                ctx.textAlign = 'left';
                ctx.fillStyle = conf.yakuColor;
                ctx.fillText(info.yakuName, conf.yakuListX, currentY);

                const s = info.yakuScore || 0;
                // scale 0.6: 스프라이트 높이 ~40px 기준 렌더 크기 ~24px
                BitmapFont.drawNumberBig(ctx, s, conf.scoreListX, currentY - 12, {
                    align: 'right',
                    scale: 0.6,
                    spacing: 1,
                    imgId: 'ui/number_yellow.png'
                });

                currentY += conf.lineHeight;
            }

            if (info.bonuses) {
                const bonusConf = conf.BONUS || {};
                const bonusFont = bonusConf.font || conf.yakuFont;
                const bonusColor = bonusConf.color || conf.yakuColor;
                const bonusPrefix = bonusConf.prefix || "";

                info.bonuses.forEach(bonus => {
                    ctx.textAlign = 'left';
                    ctx.fillStyle = bonusColor;
                    ctx.font = bonusFont;
                    ctx.fillText(bonusPrefix + bonus.name, conf.yakuListX, currentY);

                    // 나가리 텐파이/노텐은 문자열로 올 수 있음
                    if (typeof bonus.score === 'number') {
                        BitmapFont.drawNumberBig(ctx, bonus.score, conf.scoreListX, currentY - 12, {
                            align: 'right',
                            scale: 0.6,
                            spacing: 1,
                            imgId: 'ui/number_yellow.png'
                        });
                    } else {
                        ctx.textAlign = 'right';
                        ctx.fillStyle = conf.scoreColor;
                        ctx.font = conf.scoreFont;
                        ctx.fillText(bonus.score, conf.scoreListX, currentY);
                    }

                    currentY += conf.lineHeight;
                });
            }

            const separatorY = currentY - (conf.lineHeight / 2) + (conf.separatorGap || 0);

            ctx.beginPath();
            ctx.moveTo(conf.yakuListX, separatorY);
            ctx.lineTo(conf.scoreListX, separatorY);
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.lineWidth = 2;
            ctx.stroke();

            const damageY = separatorY + (conf.damageGap || 15) + (conf.lineHeight / 2);

            ctx.textAlign = 'left';
            ctx.fillStyle = conf.scoreColor;
            ctx.fillText("데미지", conf.yakuListX, damageY);

            const displayScore = this.rollDamage(this.damageStages(info), state.stateTimer, conf.damageRoll, state.tutorial ? conf.damageRoll.tutorialStart : conf.damageRoll.start);

            BitmapFont.drawNumberBig(ctx, displayScore, conf.scoreListX, damageY - 12, {
                align: 'right',
                scale: 0.6,
                spacing: 1,
                imgId: 'ui/number_yellow.png'
            });

            ctx.textAlign = "center";
            ctx.fillStyle = typeConf.color;
            ctx.font = conf.titleFont;
            // conf.titleY 미설정 시 야쿠 리스트 위 여백 확보
            const titleY = conf.titleY !== undefined ? conf.titleY : 120;
            ctx.fillText(typeConf.title, conf.titleX, titleY);

        }

        if (state.stateTimer > 120) {
            if (Math.floor(state.stateTimer / 30) % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 1)';
                ctx.font = `bold 16px ${FONTS.bold}`;
                const offset = (conf.pressSpaceOffset !== undefined) ? conf.pressSpaceOffset : 20;
                const ry = conf.y !== undefined ? conf.y : 0;
                const rh = conf.h || 320;
                const pressY = ry + rh + offset;

                ctx.textAlign = 'center';
                ctx.fillText(conf.TEXTS.pressSpace, 320, pressY);
            }
        }
    },

    // Menu layout metrics. Height is dynamic (grows with item count) and the menu
    // is bottom-anchored at conf.y + conf.h, so the always-listed declaration
    // commands (아가리/펑/리치) push the window UP rather than off the canvas bottom.
    drawBattleMenu: function (ctx, state) {
        const conf = BattleConfig.BATTLE_MENU;
        const m = BattleLayout.getMenuMetrics(BattleMenuSystem.menuItems);
        const x = m.x, y = m.y, w = m.w, h = m.h;

        UIDraw.drawWindow(ctx, x, y, w, h);

        const startX = m.startX;
        const startY = m.startY;
        const lineHeight = m.lineHeight;

        ctx.font = conf.font;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        const getItemHeight = (item) => {
            if (item.type === 'SEPARATOR') return conf.separatorHeight || 4;
            return lineHeight;
        };

        let currentY = startY;

        BattleMenuSystem.menuItems.forEach((item, i) => {
            const h = getItemHeight(item);

            if (item.type === 'SEPARATOR') {
                const lineY = Math.floor(currentY + (h / 2) + conf.cursorYOffset);
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.lineWidth = 1;
                const linePad = 10;
                ctx.moveTo(startX + linePad, lineY);
                ctx.lineTo(startX + (w - (conf.padding * 2)) - linePad, lineY);
                ctx.stroke();

                currentY += h;
                return;
            }

            const itemY = Math.floor(currentY + (h / 2) + conf.cursorYOffset);

            if (i === BattleMenuSystem.selectedMenuIndex) {
                ctx.fillStyle = conf.cursor;
                const barW = w - (conf.padding * 2);
                ctx.fillRect(startX, Math.floor(currentY + conf.cursorYOffset), barW, h);
                ctx.fillStyle = conf.textSelected;
            } else {
                ctx.fillStyle = conf.textDefault;
            }

            const label = item.label || item;
            const isDisabled = item.disabled;

            ctx.fillText(label, startX + conf.textOffsetX, itemY + conf.textOffsetY);

            if (isDisabled) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillText(label, startX + conf.textOffsetX, itemY + conf.textOffsetY);
            }

            currentY += h;
        });
    },

    drawNarration: function (ctx, state) {
        const box = Assets.get('ui/long_bubble.png');
        if (!box) return;
        const text = EncounterLayout.DIALOGUE.text;
        const x = (BattleConfig.SCREEN.width - box.width) / 2;
        const y = BattleConfig.NARRATION.bottom - box.height;

        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.drawImage(box, x, y);
        ctx.globalAlpha = 1;

        ctx.font = text.font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        const lines = this._wrapNarration(ctx, state.narrationPage().text, box.width - text.xPadding * 2);
        const top = y + box.height / 2 - (lines.length * text.lineHeight) / 2 + text.lineHeight * 0.7 + text.baselineCorrection;
        lines.forEach((line, i) => {
            let cx = x + text.xPadding;
            line.forEach(c => {
                ctx.fillStyle = c.highlight ? BattleConfig.NARRATION.highlight : 'rgba(255, 255, 255, 1)';
                ctx.fillText(c.ch, cx, top + i * text.lineHeight);
                cx += c.w;
            });
        });

        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        if (state.narration.age > 10 && Math.floor(state.narration.age / 30) % 2 === 0) {
            const tx = x + box.width - text.xPadding;
            const ty = y + box.height - 24;
            ctx.beginPath();
            ctx.moveTo(tx - 12, ty - 8);
            ctx.lineTo(tx, ty - 8);
            ctx.lineTo(tx - 6, ty);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    },

    lookRects: function (state) {
        const page = state.narration ? state.narrationPage() : null;
        if (!page || !this._lookRects) return [];
        const rects = [];
        page.look.forEach(target => {
            if (target.startsWith('hand:')) {
                const type = target.slice(5);
                this._lookRects.hand.forEach(r => { if (r.type === type) rects.push(r); });
            } else if (target === 'actionButton') {
                if (this._actionRect) rects.push(this._actionRect);
            } else if (this._lookRects[target]) {
                rects.push(this._lookRects[target]);
            }
        });
        return rects;
    },

    _lookUnderResult: function (state) {
        const r = BattleConfig.RESULT;
        return this.lookRects(state).some(t =>
            t.x < r.x + r.w && t.x + t.w > r.x && t.y < r.y + r.h && t.y + t.h > r.y);
    },

    _lookCoversButton: function (state, button) {
        if (!state.narration || state.narrationPage().look.includes('actionButton')) return false;
        return this.lookRects(state).some(t => {
            const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
            return cx >= button.x && cx <= button.x + button.w && cy >= button.y && cy <= button.y + button.h;
        });
    },

    drawLook: function (ctx, state) {
        const conf = BattleConfig.NARRATION.look;
        const img = Assets.get(conf.path);
        if (!img) return;
        const sx = (Math.floor(state.narration.age / conf.ticks) % conf.frames) * conf.w;
        this.lookRects(state).forEach(r => {
            ctx.drawImage(img, sx, 0, conf.w, conf.h, Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2), conf.w, conf.h);
        });
    },

    _wrapNarration: function (ctx, text, maxWidth) {
        const lines = [[]];
        let width = 0;
        let highlight = false;
        for (const ch of text) {
            if (ch === '{' || ch === '}') {
                highlight = ch === '{';
                continue;
            }
            if (ch === '\n') {
                lines.push([]);
                width = 0;
                continue;
            }
            const w = ctx.measureText(ch).width;
            if (width + w > maxWidth && lines[lines.length - 1].length > 0) {
                lines.push([]);
                width = 0;
            }
            lines[lines.length - 1].push({ ch, w, highlight });
            width += w;
        }
        return lines;
    },

    // 츠모만 선택 가능 (론은 리치 필수, 리치는 자동 승리)
    canWinNow: function (state) {
        return (state.possibleActions || []).some(a => a.type === 'TSUMO');
    },

    // 리치 선언 가능 여부; 이미 리치 중이면 possibleActions에 RIICHI가 남아 있어도 false
    canRiichiNow: function (state) {
        if (state.p1 && state.p1.isRiichi) return false;
        return (state.possibleActions || []).some(a => a.type === 'RIICHI');
    },

    // 액션 버튼 단일 진실 출처: 'draw'/'win'/'riichi'/null
    // 승리 > 리치 우선순위; Renderer·마우스·키보드 모두 이 함수를 참조
    getActiveAction: function (state) {
        const st = state.currentState;
        if (st === state.STATE_PLAYER_TURN) {
            if (this.canWinNow(state)) return 'win';
            if (this.canRiichiNow(state)) return 'riichi';
            return null;
        }
        if (st === state.STATE_WAIT_FOR_DRAW) return state.p1 && state.p1.isRiichi ? null : 'draw';
        return null;
    },

    // 텍스트 폭 기반 동적 크기; ctx 필요 → 렌더 시 계산 후 _actionRect에 캐싱
    _actionButtonRect: function (ctx, conf) {
        const box = BattleConfig.ACTION_BUTTON_BOX;
        ctx.save();
        ctx.font = conf.font;
        const tw = ctx.measureText(conf.text).width;
        ctx.restore();
        const w = Math.ceil(tw) + box.padX * 2;
        return { x: box.right - w, y: box.y, w: w, h: box.h };
    },

    drawActionButton: function (ctx, state) {
        const key = this.getActiveAction(state);
        if (!key) { this._actionRect = null; this._actionKey = null; return; }
        const conf = BattleConfig.ACTION_BUTTONS[key];
        const r = this._actionButtonRect(ctx, conf);
        this._actionKey = key;
        if (this._lookCoversButton(state, r)) { this._actionRect = null; return; }
        this._actionRect = r;
        const isHovered = state ? !!state.actionHover : false;
        UIDraw.drawButton(ctx, r.x, r.y, r.w, r.h, conf.text, isHovered, {
            font: conf.font,
            cursorColor: conf.cursor,
            selectedText: conf.selectedText
        });
    },

    checkActionButton: function (x, y) {
        const r = this._actionRect;
        return !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    },


    drawExchangeWindow: function (ctx, state) {
        const conf = BattleConfig.CONFIRM;

        ctx.save();
        ctx.font = conf.font;

        const skillId = state.skillId || 'EXCHANGE_TILE';
        const msgFn = BattleConfig.MESSAGES.SKILL_CONFIRM[skillId];
        const text = msgFn ? msgFn(0) : "바꿀 패를 선택하세요.";
        const textMetrics = ctx.measureText(text);
        const textW = textMetrics.width;
        const textH = conf.lineHeight || 24;

        const buttonAreaH = (conf.buttonMarginTop || 14) + conf.buttonHeight;
        let h = textH + (conf.padding.y * 2) + buttonAreaH;

        const minW = conf.minWidth || 200;
        const minH = conf.minHeight || 80;
        h = Math.max(h, minH);

        const paddingX = 60;
        const w = Math.max(minW, textW + paddingX);

        const x = (640 - w) / 2;
        const y = (conf.y !== undefined) ? conf.y : (480 - h) / 2;

        UIDraw.drawWindow(ctx, x, y, w, h);

        const count = state.exchangeIndices ? state.exchangeIndices.length : 0;

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillText(text, x + w / 2, y + conf.padding.y + textH);

        const btnW = 140;
        const btnH = conf.buttonHeight;
        const btnX = x + (w - btnW) / 2;
        const btnY = y + h - conf.padding.y - btnH;

        // 레이블 출처: BattleConfig.CONFIRM.labelsExchange (단일 진실 출처)
        const lab = conf.labelsExchange;
        const keyHint = lab.key ? ` (${lab.key})` : '';
        const label = (count === 0 ? lab.cancel : lab.confirm) + keyHint;

        const isHover = state.exchangeButtonHover;
        UIDraw.drawButton(ctx, btnX, btnY, btnW, btnH, label, isHover, { noBorder: true });

        if (count > 0) {
            this.drawMpPreview(ctx, state, count);
        }

        this._exchangeBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

        ctx.restore();
    },

    drawMpPreview: function (ctx, state, count) {
        // 마유 4MP/타일, 나머지 6MP/타일 (캐릭터별 고정값)
        const charId = state.p1.id || 'smash';
        const costPerTile = (charId === 'mayu') ? 4 : 6;
        const totalCost = count * costPerTile;

        const barX = BattleConfig.BARS.P1.x;
        const barY = BattleConfig.BARS.P1.y + BattleConfig.BARS.height + BattleConfig.BARS.gap;
        const maxMp = state.p1.maxMp || 100;
        const currentMp = state.p1.mp || 0;

        const costPct = Math.min(1, totalCost / maxMp);
        const costW = Math.floor(BattleConfig.BARS.width * costPct);

        const currentPct = Math.min(1, currentMp / maxMp);
        const currentW = Math.floor(BattleConfig.BARS.width * currentPct);

        // cost > current이면 currentW로 clamp
        const renderCostW = Math.min(costW, currentW);
        const startX = barX + currentW - renderCostW;

        ctx.save();
        ctx.fillStyle = (Math.floor(state.timer / 10) % 2 === 0) ? 'rgba(255, 50, 50, 0.8)' : 'rgba(200, 50, 50, 0.8)';
        ctx.fillRect(startX, barY, renderCostW, BattleConfig.BARS.height);
        ctx.restore();
    },

    checkExchangeButton: function (x, y) {
        if (!this._exchangeBtnRect) return false;
        const b = this._exchangeBtnRect;
        return (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    }


};
