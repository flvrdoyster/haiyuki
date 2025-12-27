const BattleScene = {
    init: function (data) {
        BattleEngine.init(data, this);
        BattleRenderer.reset(); // Crucial for Layering Optimization
        this.activeFX = [];
        this.activeFX = [];
        this.confirmData = null; // Local Confirm State { msg, onYes, onNo, selected, timer }
        this._confirmLayout = null; // Cache layout
    },

    // Helper to calculate dynamic layout
    getConfirmLayout: function (msg) {
        if (this._confirmLayout && this._confirmLayout.msg === msg) return this._confirmLayout;

        const conf = BattleConfig.CONFIRM || {
            minWidth: 320, minHeight: 160, padding: { x: 40, y: 30 },
            font: '20px sans-serif', lineHeight: 28,
            buttonHeight: 40, buttonWidth: 100, buttonGap: 40, buttonMarginTop: 30
        };

        const lines = msg.split('\\n');

        // Measure Text Width (Approximate or use Canvas)
        // Since we are in Logic/Scene, we can't easily access Canvas Context without passed arg.
        // But we can estimate or lazy load in draw. 
        // Best hack: Calculate in draw? But update needs it too.
        // Solution: Use a temporary canvas or approximation. 
        // 20px font => avg char width ~12px (CJK ~20px). 
        // Let's assume CJK wide.
        let maxLineWidth = 0;
        lines.forEach(line => {
            // Rough CJK estimation: 1 char = 1em. 
            // Better: use simple length * fontSize. 
            // canvas measureText is ideal. Let's create a temp ctx if needed or assume width.
            // Since we need it for Hit detection in update(), we assume standard width.
            const len = line.length;
            // Count non-ascii vs ascii
            let width = 0;
            for (let i = 0; i < len; i++) {
                const code = line.charCodeAt(i);
                // Refined estimation for 16px font:
                // CJK: ~16px, ASCII: ~9px
                width += (code > 255) ? 16 : 9;
            }
            if (width > maxLineWidth) maxLineWidth = width;
        });

        const textW = maxLineWidth;
        const textH = lines.length * conf.lineHeight;

        const buttonAreaH = conf.buttonMarginTop + conf.buttonHeight;

        // Calculate Box Size
        let boxW = textW + (conf.padding.x * 2);
        let boxH = textH + (conf.padding.y * 2) + buttonAreaH;

        // Min Size
        boxW = Math.max(boxW, conf.minWidth);
        boxH = Math.max(boxH, conf.minHeight);

        // Center X, Locked Y or Center Y
        const boxX = (640 - boxW) / 2;
        const boxY = (conf.y !== undefined) ? conf.y : (480 - boxH) / 2;

        // Button Positions
        const buttonY = boxY + boxH - conf.padding.y - conf.buttonHeight;
        const totalBtnW = (conf.buttonWidth * 2) + conf.buttonGap;
        const startBtnX = 320 - (totalBtnW / 2);

        const yesBtn = { x: startBtnX, y: buttonY, w: conf.buttonWidth, h: conf.buttonHeight };
        const noBtn = { x: startBtnX + conf.buttonWidth + conf.buttonGap, y: buttonY, w: conf.buttonWidth, h: conf.buttonHeight };

        const layout = {
            msg: msg,
            box: { x: boxX, y: boxY, w: boxW, h: boxH },
            text: { startY: boxY + conf.padding.y + (conf.lineHeight), lines: lines, lineHeight: conf.lineHeight },
            yesBtn: yesBtn,
            noBtn: noBtn
        };

        this._confirmLayout = layout;
        return layout;
    },

    processEvents: function (engine) {
        if (!engine.events) return;

        let i = 0;
        // Simple queue scan:
        // 1. Audio -> Play & Remove
        // 2. Visual -> Check Blocking. If blocked, skip (i++). If not, Play & Remove.
        while (i < engine.events.length) {
            try {
                const evt = engine.events[i];
                const isAudio = (evt.type === 'MUSIC' || evt.type === 'SOUND' || evt.type === 'STOP_MUSIC');

                if (isAudio) {
                    if (evt.type === 'MUSIC') {
                        Assets.playMusic(evt.id, evt.loop);
                    } else if (evt.type === 'SOUND') {
                        Assets.playSound(evt.id);
                    } else if (evt.type === 'STOP_MUSIC') {
                        Assets.stopMusic();
                    }
                    engine.events.splice(i, 1);
                    continue;
                }

                if (evt.type === 'DAMAGE') {
                    // Play Damage Sound Customized by Attacker Character (Source of Damage)
                    let attackerId = null;
                    if (evt.target === 'P1') {
                        attackerId = engine.cpu.id; // CPU attacked P1
                    } else if (evt.target === 'CPU') {
                        attackerId = engine.p1.id; // P1 attacked CPU
                    }

                    if (attackerId) {
                        const isSword = (attackerId === 'smash' || attackerId === 'yuri');
                        if (isSword) {
                            Assets.playSound('audio/hit-4');
                        } else {
                            // Random 1-3
                            const r = Math.floor(Math.random() * 3) + 1;
                            Assets.playSound(`audio/hit-${r}`);
                        }
                    } else {
                        // Fallback
                        Assets.playSound('audio/hit-1');
                    }

                    engine.events.splice(i, 1);
                    continue;
                }

                if (evt.type === 'DRAW') {
                    Assets.playSound(BattleConfig.AUDIO.DRAW);
                    engine.events.splice(i, 1);
                    continue;
                }

                if (evt.type === 'DISCARD') {
                    Assets.playSound(BattleConfig.AUDIO.DISCARD);
                    engine.events.splice(i, 1);
                    continue;
                }

                // Visual Event (FX)
                const isBlocked = this.activeFX.some(fx => fx.blocking);
                if (!isBlocked) {
                    if (evt.type === 'FX') {
                        // Check for Popup Type Sound
                        if (evt.options && evt.options.popupType) {
                            const conf = BattleConfig.POPUP.TYPES[evt.options.popupType];
                            if (conf && conf.sound) {
                                Assets.playSound(conf.sound);
                            }
                        }
                        this.spawnFX(evt.asset, evt.x, evt.y, evt.options);
                    }
                    engine.events.splice(i, 1);
                    // Note: If we just spawned a blocking FX, isBlocked will be true for subsequent items in this loop
                    continue;
                } else {
                    // Blocked: Leave in queue, move to next item check
                    i++;
                }
            } catch (e) {
                console.error("Error processing event:", e);
                engine.events.splice(i, 1); // Remove problematic event
            }
        }
    },

    spawnFX: function (type, x, y, options = {}) {
        const img = Assets.get(type);
        if (img) {
            const life = options.life || 45;
            const scale = options.scale || 1.0;
            const slideFrom = options.slideFrom;
            const anim = options.anim; // New: Animation Type
            const blocking = options.blocking || false;

            // Prevent Overlap: REMOVED per user request
            // if (blocking) {
            //    this.activeFX = [];
            // }

            let startX = x;
            let endX = x;
            let startY = y;
            let endY = y;

            if (slideFrom === 'LEFT') {
                startX = -img.width * scale;
                endX = x;
            } else if (slideFrom === 'RIGHT') {
                startX = 640 + img.width * scale;
                endX = x;
            } else if (slideFrom === 'TOP') {
                startY = -img.height * scale;
                endY = y;
            } else if (slideFrom === 'BOTTOM') {
                startY = 480 + img.height * scale;
                endY = y;
            }

            this.activeFX.push({
                type: type, img: img,
                x: startX, y: startY,
                startX: startX, startY: startY,
                endX: endX, endY: endY,
                timer: 0, life: life, maxLife: life,
                scale: scale, alpha: 0,
                baseScale: scale, // Store original target scale
                anim: anim,
                slideFrom: slideFrom,
                blocking: blocking
            });
        }
    },

    updateFX: function () {
        for (let i = this.activeFX.length - 1; i >= 0; i--) {
            const fx = this.activeFX[i];
            fx.life--;

            // Animation Logic
            // Fade In (0-10)
            const fadeInDur = BattleConfig.FX.fadeInDuration;
            if (fx.maxLife - fx.life <= fadeInDur) {
                fx.alpha = (fx.maxLife - fx.life) / fadeInDur;
            }

            // Slide Logic (Improved Easing)
            if (fx.slideFrom) {
                const slideDur = BattleConfig.FX.slideDuration;
                const p = Math.min(1, (fx.maxLife - fx.life) / slideDur);
                // EaseOutCubic: 1 - (1-x)^3. Much smoother than Quad for UI slides.
                const ease = 1 - Math.pow(1 - p, 3);
                fx.x = fx.startX + (fx.endX - fx.startX) * ease;
                fx.y = fx.startY + (fx.endY - fx.startY) * ease;
            } else if (fx.anim === 'ZOOM_IN') {
                // Natural Pop (BackOut Easing)
                const popDur = BattleConfig.FX.zoomPopDuration;
                const age = fx.maxLife - fx.life;
                const overshoot = BattleConfig.FX.zoomOvershoot;

                if (age < popDur) {
                    let p = age / popDur;
                    p = p - 1;
                    // Cubic Back Out
                    const scaleP = p * p * ((overshoot + 1) * p + overshoot) + 1;
                    fx.scale = fx.baseScale * scaleP;
                } else {
                    fx.scale = fx.baseScale;
                }
            } else if (fx.anim === 'BOUNCE_UP') {
                // "Drop and Bounce" Logic
                // Phase 1: Drop from Sky (StartOffset) to Floor (ImpactOffset)
                // Phase 2: Bounce from Floor to Target (0,0 relative)

                const age = fx.maxLife - fx.life;
                const dropDur = BattleConfig.FX.bounceDropDuration;
                const bounceDur = BattleConfig.FX.bounceUpDuration;
                const startOffX = BattleConfig.FX.bounceStartOffsetX;
                const startOffY = BattleConfig.FX.bounceStartOffsetY;
                const floorOffY = BattleConfig.FX.bounceFloorOffsetY; // The "floor" below target
                const impactOffX = BattleConfig.FX.bounceImpactOffsetX;

                if (age < dropDur) {
                    // Phase 1: Falling Down (Ease In Quad - Gravity)
                    const p = age / dropDur;
                    const easeIn = p * p; // Gravity accelerating

                    // Lerp from Start to Impact
                    fx.x = (fx.endX + startOffX) + (impactOffX - startOffX) * p; // X usually linear
                    fx.y = (fx.endY + startOffY) + (floorOffY - startOffY) * easeIn;

                    fx.alpha = Math.min(1, age / 4);

                    // Add squash scale at impact? (Optional polish)
                    if (p > 0.9) fx.scaleY = fx.baseScale * 0.8;
                    else fx.scaleY = fx.baseScale;

                } else {
                    // Phase 2: Bouncing Up to Target (Ease Out Quad/Back)
                    const bounceAge = age - dropDur;
                    let p = Math.min(1, bounceAge / bounceDur);

                    // Ease Out Back for "Snap" to position
                    // or Ease Out Quad for simple gravity
                    const easeOut = p * (2 - p);

                    // Interpolate from Impact(Floor) to Target(0 offset)
                    fx.x = (fx.endX + impactOffX) + (0 - impactOffX) * easeOut;
                    fx.y = (fx.endY + floorOffY) + (0 - floorOffY) * easeOut;

                    // Restore scale
                    fx.scaleY = fx.baseScale;
                    fx.alpha = 1.0;
                }
                // Ensure final position
                if (age >= dropDur + bounceDur) {
                    fx.x = fx.endX;
                    fx.y = fx.endY;
                }
            } else if (fx.anim === 'SLIDE') {
                // Explicit Slide (Same as above)
                const slideDur = BattleConfig.FX.slideDuration + 4;
                const age = fx.maxLife - fx.life;

                if (age <= slideDur) {
                    const p = age / slideDur;
                    const ease = 1 - Math.pow(1 - p, 4); // Quartic Out (Snappier)
                    fx.x = fx.startX + (fx.endX - fx.startX) * ease;
                    fx.y = fx.startY + (fx.endY - fx.startY) * ease;
                } else {
                    fx.x = fx.endX;
                    fx.y = fx.endY;
                }
            }

            // Fade Out (Last 20 frames)
            const fadeOutDur = BattleConfig.FX.fadeOutDuration;
            if (fx.life < fadeOutDur) {
                fx.alpha = fx.life / fadeOutDur;
            } else {
                if (fx.maxLife - fx.life > fadeInDur) fx.alpha = 1.0;
            }

            if (fx.life <= 0) {
                this.activeFX.splice(i, 1);
            }
        }
    },

    update: function () {

        // Local Confirmation Update (Blocks Logic)
        if (this.confirmData) {
            this.updateConfirm();
            return;
        }

        this.processEvents(BattleEngine);
        this.updateFX();
        BattleDialogue.update(); // Update Dialogue Timers

        // Check Blocking Status
        const isBlocking = this.activeFX.some(fx => fx.blocking);
        if (isBlocking) {
            // Even if blocking logic, visual animations (Characters) should continue
            if (BattleEngine.p1Character) BattleEngine.p1Character.update();
            if (BattleEngine.cpuCharacter) BattleEngine.cpuCharacter.update();
            return; // Pause Logic and Input
        }

        // Logic Update
        BattleEngine.updateLogic();

        // Input Handling
        const engine = BattleEngine;

        // Global Toggles
        if (Input.isJustPressed(Input.ESC) || Input.isMouseRightClick()) {
            // Block Menu during Riichi (Auto-discard)
            if (engine.p1 && engine.p1.isRiichi) return;

            BattleMenuSystem.toggle();
            return;
        }

        if (engine.currentState === engine.STATE_BATTLE_MENU) {
            this.handleBattleMenuInput(engine);
        } else if (engine.currentState === engine.STATE_ACTION_SELECT) {
            this.handleActionSelectInput(engine);
        } else if (engine.currentState === engine.STATE_PLAYER_TURN) {
            this.handlePlayerTurnInput(engine);
        } else if (engine.currentState === engine.STATE_TILE_EXCHANGE) {
            this.handleTileExchangeInput(engine);
        } else if (engine.currentState === engine.STATE_WAIT_FOR_DRAW) {
            // Manual Draw Input

            // Check Hover
            engine.drawButtonHover = BattleRenderer.checkDrawButton(Input.mouseX, Input.mouseY);

            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER)) {
                engine.confirmDraw();
            } else if (Input.isMouseJustPressed()) {
                if (engine.drawButtonHover) {
                    engine.confirmDraw();
                }
            }
        } else if (engine.currentState === engine.STATE_WIN ||
            engine.currentState === engine.STATE_LOSE ||
            engine.currentState === engine.STATE_NAGARI) {

            // Result Screen Input (Delayed 2s)
            // engine.stateTimer ensures we wait before accepting input
            if (engine.stateTimer > 120 && (Input.isDown(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed())) {
                engine.confirmResult();
            }
        }
    },

    handleBattleMenuInput: function () {
        // Keyboard
        if (Input.isJustPressed(Input.UP)) {
            BattleMenuSystem.selectedMenuIndex--;
            if (BattleMenuSystem.selectedMenuIndex < 0) BattleMenuSystem.selectedMenuIndex = BattleMenuSystem.menuItems.length - 1;
        } else if (Input.isJustPressed(Input.DOWN)) {
            BattleMenuSystem.selectedMenuIndex++;
            if (BattleMenuSystem.selectedMenuIndex >= BattleMenuSystem.menuItems.length) BattleMenuSystem.selectedMenuIndex = 0;
        }

        // Mouse Hover using Renderer Helper
        // Mouse Click
        const hovered = BattleRenderer.getMenuItemAt(Input.mouseX, Input.mouseY, BattleMenuSystem.menuItems);
        if (hovered !== -1) {
            BattleMenuSystem.selectedMenuIndex = hovered;
        }

        if (Input.isMouseJustPressed()) {
            // const hovered = BattleRenderer.getMenuItemAt(Input.mouseX, Input.mouseY, BattleMenuSystem.menuItems); // Redundant calc but OK
            if (hovered !== -1) {
                BattleMenuSystem.selectedMenuIndex = hovered;
                BattleMenuSystem.handleSelection();
                return;
            }
        }

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isJustPressed(Input.SPACE)) {
            BattleMenuSystem.handleSelection();
        }
    },

    handleActionSelectInput: function (engine) {
        // Keyboard
        const actions = engine.possibleActions;
        if (Input.isJustPressed(Input.LEFT)) {
            engine.selectedActionIndex--;
            if (engine.selectedActionIndex < 0) engine.selectedActionIndex = actions.length - 1;
        } else if (Input.isJustPressed(Input.RIGHT)) {
            engine.selectedActionIndex++;
            if (engine.selectedActionIndex >= actions.length) engine.selectedActionIndex = 0;
        }

        // Mouse Hover using Renderer Helper
        // Mouse Click
        const hovered = BattleRenderer.getActionAt(Input.mouseX, Input.mouseY, actions);
        if (hovered !== -1) {
            engine.selectedActionIndex = hovered;
        }

        if (Input.isMouseJustPressed()) {
            if (hovered !== -1) {
                engine.selectedActionIndex = hovered;
                engine.executeAction(actions[hovered]);
                return;
            }
        }

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.ENTER)) {
            engine.executeAction(actions[engine.selectedActionIndex]);
        }
    },

    handlePlayerTurnInput: function (engine) {
        // Riichi Locked Input: Allow manual discard ONLY when declaring Riichi
        // If Riichi is active AND NOT declaring, input is blocked (Auto Mode)
        if (engine.p1.isRiichi && !engine.p1.declaringRiichi) return;

        // Mouse Interaction
        const groupSize = engine.lastDrawGroupSize || 0;
        // Hover removed per request
        const hovered = BattleRenderer.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
        if (hovered !== -1) { engine.hoverIndex = hovered; }

        // Keyboard
        const handSize = engine.p1.hand.length;
        if (Input.isJustPressed(Input.LEFT)) {
            engine.hoverIndex--;
            if (engine.hoverIndex < 0) engine.hoverIndex = handSize - 1;
        }
        if (Input.isJustPressed(Input.RIGHT)) {
            engine.hoverIndex++;
            if (engine.hoverIndex >= handSize) engine.hoverIndex = 0;
        }

        // Clamp
        if (engine.hoverIndex >= handSize) engine.hoverIndex = handSize - 1;
        if (engine.hoverIndex < 0) engine.hoverIndex = 0;

        // Select / Discard
        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE) || Input.isMouseJustPressed()) {

            // Mouse Interaction: Strict Check
            if (Input.isMouseJustPressed()) {
                const clickIndex = BattleRenderer.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
                if (clickIndex !== -1) {
                    // Check Strict Target (Riichi Auto-Move)
                    if (engine.riichiTargetIndex !== -1 && engine.riichiTargetIndex !== clickIndex) {
                        return;
                    }

                    // Riichi Manual Discard Validation (Specifically during Declaration)
                    if (engine.p1.declaringRiichi) {
                        const validIndices = engine.validRiichiDiscardIndices;
                        if (!validIndices || !validIndices.includes(clickIndex)) {
                            // Invalid Discard (Breaks Tenpai) - Block
                            Assets.playSound('audio/wrong'); // Error sound
                            return;
                        }
                    }

                    engine.hoverIndex = clickIndex; // Select the clicked tile
                    engine.discardTile(clickIndex);
                } else {
                    // Clicked empty space -> Clear selection to prevent accidents
                    engine.hoverIndex = -1;
                }
            }
            // Keyboard Interaction: Use current hover
            else if (engine.hoverIndex !== -1 && engine.hoverIndex < handSize) {
                // Check Strict Target
                if (engine.riichiTargetIndex !== -1 && engine.riichiTargetIndex !== engine.hoverIndex) {
                    return;
                }

                // Riichi Manual Discard Validation (Specifically during Declaration)
                if (engine.p1.declaringRiichi) {
                    const validIndices = engine.validRiichiDiscardIndices;
                    if (!validIndices || !validIndices.includes(engine.hoverIndex)) {
                        // Invalid Discard (Breaks Tenpai) - Block
                        Assets.playSound('audio/wrong'); // Error sound
                        return;
                    }
                }

                engine.discardTile(engine.hoverIndex);
            }
        }
    },

    draw: function (ctx) {
        // Optimized Draw: Pass BattleEngine directly + ActiveFX argument
        // New: Pass Ura Doras
        BattleRenderer.draw(ctx, BattleEngine, this.activeFX);

        // Draw Local Confirmation Dialog on top
        if (this.confirmData) {
            this.drawConfirm(ctx);
        }
    },

    showConfirm: function (msg, onYes, onNo, options = {}) {
        this.confirmData = {
            msg: msg,
            onYes: onYes,
            onNo: onNo,
            selected: 1, // Default to NO
            timer: 10, // Cooldown
            cost: options.cost || 0 // Store cost
        };
        this._confirmLayout = null; // Reset cache
    },

    updateConfirm: function () {
        const d = this.confirmData;
        if (d.timer > 0) {
            d.timer--;
            return;
        }

        // --- Mouse Interaction ---
        const mx = Input.mouseX;
        const my = Input.mouseY;

        // Use Layout
        const layout = this.getConfirmLayout(d.msg);
        const yes = layout.yesBtn;
        const no = layout.noBtn;

        const isOverYes = (mx >= yes.x && mx <= yes.x + yes.w && my >= yes.y && my <= yes.y + yes.h);
        const isOverNo = (mx >= no.x && mx <= no.x + no.w && my >= no.y && my <= no.y + no.h);

        if (isOverYes) {
            d.selected = 0;
            if (Input.isMouseJustPressed()) {
                if (d.onYes) d.onYes();
                this.confirmData = null;
                return;
            }
        } else if (isOverNo) {
            d.selected = 1;
            if (Input.isMouseJustPressed()) {
                if (d.onNo) d.onNo();
                this.confirmData = null;
                return;
            }
        }

        // --- Keyboard Interaction ---
        if (Input.isJustPressed(Input.LEFT) || Input.isJustPressed(Input.RIGHT) ||
            Input.isJustPressed(Input.UP) || Input.isJustPressed(Input.DOWN)) {
            d.selected = (d.selected === 0) ? 1 : 0;
            // Optional: Play tick sound
        }

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.ENTER)) {
            if (d.selected === 0) {
                if (d.onYes) d.onYes();
            } else {
                if (d.onNo) d.onNo();
            }
            this.confirmData = null;
        }

        if (Input.isJustPressed(Input.X) || Input.isJustPressed(Input.ESCAPE)) {
            if (d.onNo) d.onNo();
            this.confirmData = null;
        }
    },

    drawConfirm: function (ctx) {
        const d = this.confirmData;
        if (!d) return;

        const layout = this.getConfirmLayout(d.msg);

        ctx.save();

        // 1. Dimmer
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 640, 480);

        // 2. Dialog Box
        Assets.drawWindow(ctx, layout.box.x, layout.box.y, layout.box.w, layout.box.h);

        // 3. Message Text
        ctx.fillStyle = 'white';
        const fontName = (typeof FONTS !== 'undefined') ? FONTS.regular : 'sans-serif';
        const conf = BattleConfig.CONFIRM || {}; // Fallback if undefined? Should be defined
        ctx.font = conf.font || `20px ${fontName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic'; // Reset baseline

        // Calculate Text Block Start Y to center securely
        // Using layout line props
        let currentY = layout.text.startY;

        layout.text.lines.forEach((line, i) => {
            ctx.fillText(line, 320, currentY + (i * layout.text.lineHeight));
        });

        // 4. Buttons
        const yes = layout.yesBtn;
        const no = layout.noBtn;

        const yesLabel = (conf.labels && conf.labels.yes) ? conf.labels.yes : 'YES';
        const noLabel = (conf.labels && conf.labels.no) ? conf.labels.no : 'NO';

        Assets.drawButton(ctx, yes.x, yes.y, yes.w, yes.h, yesLabel, d.selected === 0, { noBorder: true });
        Assets.drawButton(ctx, no.x, no.y, no.w, no.h, noLabel, d.selected === 1, { noBorder: true });

        ctx.restore();
    },

    handleTileExchangeInput: function (engine) {
        // Reuse Player Turn Hover Logic for selection
        const groupSize = 0; // No group in dealing phase
        const hovered = BattleRenderer.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
        if (hovered !== -1) { engine.hoverIndex = hovered; }

        // Keyboard/Mouse Navigation
        const handSize = engine.p1.hand.length;
        if (Input.isJustPressed(Input.LEFT)) {
            engine.hoverIndex--;
            if (engine.hoverIndex < 0) engine.hoverIndex = handSize - 1;
        } else if (Input.isJustPressed(Input.RIGHT)) {
            engine.hoverIndex++;
            if (engine.hoverIndex >= handSize) engine.hoverIndex = 0;
        }

        // Toggle Selection
        if (Input.isJustPressed(Input.SPACE) || (Input.isMouseJustPressed() && hovered !== -1)) {
            if (engine.hoverIndex >= 0 && engine.hoverIndex < handSize) {
                engine.toggleExchangeSelection(engine.hoverIndex);
            }
        }

        // Confirm / Cancel
        // Button Logic?
        // Let's implement Confirm Button Logic too.
        // Reuse Draw Button Area Check for Exchange Button
        const isHoverButton = BattleRenderer.checkExchangeButton(Input.mouseX, Input.mouseY);
        engine.drawButtonHover = isHoverButton; // Reuse this flag or new one? Reuse OK.

        if (Input.isJustPressed(Input.ENTER) || Input.isJustPressed(Input.Z) || (Input.isMouseJustPressed() && isHoverButton)) {
            engine.confirmTileExchange();
        }
        // ESC Removed as per user request
    },

};
