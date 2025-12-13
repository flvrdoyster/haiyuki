const BattleScene = {
    init: function (data) {
        BattleEngine.init(data);
        BattleRenderer.reset(); // Crucial for Layering Optimization
        this.activeFX = [];
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

            // Slide Logic
            if (fx.slideFrom) {
                const slideDur = BattleConfig.FX.slideDuration;
                const p = Math.min(1, (fx.maxLife - fx.life) / slideDur);
                const ease = p * (2 - p); // Quad ease out
                fx.x = fx.startX + (fx.endX - fx.startX) * ease;
                fx.y = fx.startY + (fx.endY - fx.startY) * ease;
            } else if (fx.anim === 'ZOOM_IN') {
                // Zoom In Pulse: 0 -> 1.2 -> 1.0
                const pulseDur = BattleConfig.FX.zoomPulseDuration;
                const settleDur = BattleConfig.FX.zoomSettleDuration;
                const peakScale = BattleConfig.FX.zoomPeakScale;

                const age = fx.maxLife - fx.life;
                if (age < pulseDur) {
                    // 0 -> 1.2
                    const p = age / pulseDur;
                    fx.scale = fx.baseScale * (p * peakScale);
                } else if (age < pulseDur + settleDur) {
                    // 1.2 -> 1.0
                    const p = (age - pulseDur) / settleDur;
                    fx.scale = fx.baseScale * (peakScale - (p * (peakScale - 1.0)));
                } else {
                    fx.scale = fx.baseScale;
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
        // Update ConfirmDialog first (blocks other input)
        UI.Confirm.update();
        if (UI.Confirm.isActive) return;

        this.processEvents(BattleEngine);
        this.updateFX();

        // Check Blocking Status
        const isBlocking = this.activeFX.some(fx => fx.blocking);
        if (isBlocking) return; // Pause Logic and Input

        // Logic Update
        BattleEngine.updateLogic();

        // Input Handling
        const engine = BattleEngine;

        // Global Toggles
        if (Input.isJustPressed(Input.ESC) || Input.isMouseRightClick()) {
            BattleMenuSystem.toggle();
            return;
        }

        if (engine.currentState === engine.STATE_BATTLE_MENU) {
            this.handleBattleMenuInput(engine);
        } else if (engine.currentState === engine.STATE_ACTION_SELECT) {
            this.handleActionSelectInput(engine);
        } else if (engine.currentState === engine.STATE_PLAYER_TURN) {
            this.handlePlayerTurnInput(engine);
        } else if (engine.currentState === engine.STATE_WAIT_FOR_DRAW) {
            // Manual Draw Input
            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER)) {
                engine.confirmDraw();
            } else if (Input.isMouseJustPressed()) {
                if (BattleRenderer.checkDrawButton(Input.mouseX, Input.mouseY)) {
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
        // Mouse Hover using Renderer Helper
        // Mouse Click
        if (Input.isMouseJustPressed()) {
            const hovered = BattleRenderer.getMenuItemAt(Input.mouseX, Input.mouseY, BattleMenuSystem.menuItems);
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
        if (Input.isMouseJustPressed()) {
            const hovered = BattleRenderer.getActionAt(Input.mouseX, Input.mouseY, actions);
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
        // Riichi Locked Input
        if (engine.p1.isRiichi && !engine.p1.declaringRiichi) return;

        // Mouse Interaction
        const groupSize = engine.lastDrawGroupSize || 0;
        // Hover removed per request
        // const hovered = BattleRenderer.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
        // if (hovered !== -1) { engine.hoverIndex = hovered; }

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
                engine.discardTile(engine.hoverIndex);
            }
        }
    },

    draw: function (ctx) {
        // Optimized Draw: Pass BattleEngine directly + ActiveFX argument
        BattleRenderer.draw(ctx, BattleEngine, this.activeFX);

        // Draw Confirmation Dialog on top
        UI.Confirm.draw(ctx);
    }
};
