const BattleScene = {
    init: function (data) {
        QADebug.reset();
        // Difficulty preference is meta-game state (Game.saveData) — inject it
        // here so the rules engine never reads save data itself.
        data = data || {};
        if (!data.difficulty) {
            data.difficulty = (Game.saveData && Game.saveData.difficulty) || 'normal';
        }
        BattleEngine.init(data, this);
        BattleRenderer.reset(); // Crucial for Layering Optimization
        this.initPortraits();
        this.activeFX = [];
        this.confirmData = null; // Local Confirm State { msg, onYes, onNo, selected, timer }
        this._confirmLayout = null; // Cache layout
    },

    // Match settled — meta-game policy: where to go next, unlocks/save, continue
    // count. Owned by the scene so the rules engine stays navigation-free.
    proceedFromMatchOver: function () {
        const e = BattleEngine;

        if (e.matchWinner === 'P1') {
            // Record the win (engine state carries tournament progress)
            e.defeatedOpponents = [...e.defeatedOpponents, e.cpuIndex];

            // True-ending boss beaten? (Mayu is the hidden roster entry)
            const mayuIndex = CharacterData.findIndex(c => c.id === 'mayu');
            if (e.cpuIndex === mayuIndex) {
                if (!Game.saveData.unlocked.includes('mayu')) {
                    Game.saveData.unlocked.push('mayu');
                    Game.save();
                }

                Game.isAutoTest = false; // Stop Auto Test
                Game.changeScene(EncounterScene, {
                    playerIndex: e.playerIndex,
                    cpuIndex: e.cpuIndex,
                    mode: 'TRUE_ENDING',
                    defeatedOpponents: [] // Reset
                });
                return;
            }

            // Proceed to next match
            Assets.stopMusic();
            Game.changeScene(CharacterSelectScene, {
                mode: 'NEXT_MATCH',
                playerIndex: e.playerIndex,
                defeatedOpponents: e.defeatedOpponents
            });
        } else {
            // Game Over → Continue Screen
            Game.continueCount++;
            Game.changeScene(ContinueScene, {
                playerIndex: e.playerIndex,
                cpuIndex: e.cpuIndex,
                defeatedOpponents: e.defeatedOpponents,
                isNextRound: false // Fresh rematch if continued
            });
        }
    },

    // Portraits are view objects: the scene owns them, the renderer draws them,
    // and the engine requests expression changes via EXPRESSION events.
    p1Character: null,
    cpuCharacter: null,
    cpuMasked: false,

    initPortraits: function () {
        const idMap = {
            'ataho': 'ATA',
            'rinxiang': 'RIN',
            'smash': 'SMSH',
            'petum': 'PET',
            'fari': 'FARI',
            'yuri': 'YURI',
            'mayu': 'MAYU'
        };

        // Auto-Detection (Standard face folder only)
        const getAnimConfig = (charData) => {
            if (!charData) return null;
            const prefix = idMap[charData.id] || charData.id.toUpperCase();
            const base = `face/${prefix}_base.png`;
            return Assets.get(base) ? { base: base } : null;
        };

        const p1Data = CharacterData.find(c => c.id === BattleEngine.p1.id);
        const cpuData = CharacterData.find(c => c.id === BattleEngine.cpu.id);

        this.p1Character = new PortraitCharacter(p1Data, {
            ...BattleConfig.PORTRAIT.P1,
            baseW: BattleConfig.PORTRAIT.baseW,
            baseH: BattleConfig.PORTRAIT.baseH,
            isBattle: true
        }, false);
        this.p1Character.setAnimationConfig(getAnimConfig(p1Data));

        // Hidden boss: a non-player Mayu fights masked. The silhouette is drawn
        // directly by BattleRenderer (MAYU_unknown.png, BattleConfig.MASKED_BOSS),
        // NOT this portrait — cpuCharacter is kept only for the event system.
        // Game logic still uses BattleEngine.cpu.id ('mayu'); name → "???".
        this.cpuMasked = (cpuData && cpuData.id === 'mayu' && (!p1Data || p1Data.id !== 'mayu'));

        this.cpuCharacter = new PortraitCharacter(cpuData, {
            ...BattleConfig.PORTRAIT.CPU,
            baseW: BattleConfig.PORTRAIT.baseW,
            baseH: BattleConfig.PORTRAIT.baseH,
            isBattle: true
        }, true);
        this.cpuCharacter.setAnimationConfig(getAnimConfig(cpuData));

        this.p1Character.setState('idle');
        this.cpuCharacter.setState('idle');
    },

    // Layout is recomputed only when the message changes (used every frame for hit detection)
    getConfirmLayout: function (msg) {
        if (this._confirmLayout && this._confirmLayout.msg === msg) return this._confirmLayout;
        this._confirmLayout = UIHelpers.getConfirmLayout(msg);
        return this._confirmLayout;
    },

    processEvents: function (engine) {
        if (!engine.events) return;

        let i = 0;
        // Simple queue scan:
        // Audio -> Play & Remove
        // Visual -> Check Blocking. If blocked, skip (i++). If not, Play & Remove.
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

                if (evt.type === 'EXPRESSION') {
                    const ch = evt.who === 'P1' ? this.p1Character : this.cpuCharacter;
                    if (ch) ch.setState(evt.state);
                    engine.events.splice(i, 1);
                    continue;
                }

                if (evt.type === 'DIALOGUE') {
                    BattleDialogue.show(evt.text, evt.who);
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
                            Assets.playSound('audio/slash');
                        } else {
                            // Random Impact 1-3
                            const r = Math.floor(Math.random() * 3) + 1;
                            Assets.playSound(`audio/impact-${r}`);
                        }
                    } else {
                        // Fallback
                        Assets.playSound(BattleConfig.AUDIO.DAMAGE);
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

    updateFX: function (dt = 1.0) {
        for (let i = this.activeFX.length - 1; i >= 0; i--) {
            const fx = this.activeFX[i];
            fx.life -= dt;
            fx.timer += dt; // If we use timer for any logic

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

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        QADebug.sync(BattleEngine);

        // Local Confirmation Update (Blocks Logic)
        if (this.confirmData) {
            this.updateConfirm(dt);
            return;
        }

        this.processEvents(BattleEngine);
        this.updateFX(dt);
        BattleDialogue.update(dt); // Update Dialogue Timers

        // Portrait animations always run, even while a blocking FX pauses logic
        if (this.p1Character) this.p1Character.update(dt);
        if (this.cpuCharacter) this.cpuCharacter.update(dt);

        // Check Blocking Status
        const isBlocking = this.activeFX.some(fx => fx.blocking);
        if (isBlocking) {
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

            // No battle menu during tile-exchange setup — fall through so
            // handleTileExchangeInput can use ESC as the exchange-confirm key
            // (replaces Enter, per user request).
            if (engine.currentState !== engine.STATE_TILE_EXCHANGE) {
                BattleMenuSystem.toggle();
                return;
            }
        }

        if (engine.currentState === engine.STATE_BATTLE_MENU) {
            this.handleBattleMenuInput(engine);
        } else if (engine.currentState === engine.STATE_PLAYER_TURN) {
            this.handlePlayerTurnInput(engine);
        } else if (engine.currentState === engine.STATE_TILE_EXCHANGE) {
            this.handleTileExchangeInput(engine);
        } else if (engine.currentState === engine.STATE_WAIT_FOR_DRAW) {
            // Manual Draw Input — only the 패 가져오기 action button is available here,
            // so the keyboard cursor rests on it (highlighted) and Z/Space draws. A
            // win/리치 is opt-in via the menu on PLAYER_TURN; drawing forgoes nothing
            // here (you haven't drawn yet).
            engine.actionFocused = true;
            const onButton = BattleRenderer.checkActionButton(Input.mouseX, Input.mouseY);
            engine.actionHover = engine.actionFocused || onButton;

            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z)) {
                engine.confirmDraw();
            } else if (Input.isMouseJustPressed() && onButton) {
                engine.confirmDraw();
            }
        } else if (engine.currentState === engine.STATE_WIN ||
            engine.currentState === engine.STATE_LOSE ||
            engine.currentState === engine.STATE_NAGARI) {

            // Result Screen Input (Delayed 2s)
            // engine.stateTimer ensures we wait before accepting input.
            // Z/Space both require a fresh press (not isDown) so the winning/
            // confirming keypress can't bleed through and skip the result.
            if (engine.stateTimer > 120 && (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed())) {
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
        if (hovered !== -1 && Input.hasMouseMoved()) {
            BattleMenuSystem.selectedMenuIndex = hovered;
        }

        if (Input.isMouseJustPressed()) {
            if (hovered !== -1) {
                BattleMenuSystem.selectedMenuIndex = hovered;
                BattleMenuSystem.handleSelection();
                return;
            }
        }

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE)) {
            BattleMenuSystem.handleSelection();
        }
    },

    handlePlayerTurnInput: function (engine) {
        // Riichi Locked Input: Allow manual discard ONLY when declaring Riichi
        // If Riichi is active AND NOT declaring, input is blocked (Auto Mode)
        if (engine.p1.isRiichi && !engine.p1.declaringRiichi) return;

        const handSize = engine.p1.hand.length;

        // Action-slot button (날 수 있어! / 리치 걸 수 있어!) — single source of truth via
        // getActiveAction. Both just open the battle menu (no auto-win/declare), so the
        // player can decline and keep playing for a higher hand.
        const hasAction = BattleRenderer.getActiveAction(engine) !== null;
        if (!hasAction) engine.actionFocused = false; // can't rest on a button that isn't there

        // Mouse: hovering the action button highlights it; clicking opens the menu.
        const onActionBtn = hasAction && BattleRenderer.checkActionButton(Input.mouseX, Input.mouseY);
        if (onActionBtn && Input.isMouseJustPressed()) {
            BattleMenuSystem.toggle();
            return;
        }

        // Mouse: hovering a hand tile moves the cursor there (off the action button).
        const groupSize = engine.lastDrawGroupSize || 0;
        const hovered = BattleRenderer.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
        if (hovered !== -1 && Input.hasMouseMoved()) {
            engine.hoverIndex = hovered;
            engine.actionFocused = false;
        }

        // Keyboard cursor: the action button sits one step right of the last tile, so
        // pressing → past the rightmost tile lands on it; ← steps back, → wraps to the
        // first tile (0). Only reachable while an action button is actually shown.
        if (Input.isJustPressed(Input.LEFT)) {
            if (engine.actionFocused) {
                engine.actionFocused = false;
                engine.hoverIndex = handSize - 1;
            } else {
                engine.hoverIndex--;
                if (engine.hoverIndex < 0) engine.hoverIndex = handSize - 1;
            }
        }
        if (Input.isJustPressed(Input.RIGHT)) {
            if (engine.actionFocused) {
                engine.actionFocused = false;
                engine.hoverIndex = 0; // wrap past the button to the first tile
            } else if (engine.hoverIndex >= handSize - 1 && hasAction) {
                engine.actionFocused = true; // step onto the action button
            } else {
                engine.hoverIndex++;
                if (engine.hoverIndex >= handSize) engine.hoverIndex = 0;
            }
        }

        // Clamp the tile cursor (only meaningful when not focused on the button)
        if (!engine.actionFocused) {
            if (engine.hoverIndex >= handSize) engine.hoverIndex = handSize - 1;
            if (engine.hoverIndex < 0) engine.hoverIndex = 0;
        }

        // Highlight the button when the keyboard cursor is on it OR the mouse hovers it.
        engine.actionHover = engine.actionFocused || onActionBtn;

        // Select / Discard / Activate
        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE) || Input.isMouseJustPressed()) {

            // Keyboard cursor on the action button → open the menu.
            if (engine.actionFocused && (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE))) {
                BattleMenuSystem.toggle();
                return;
            }

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
            // Keyboard Interaction: Use current hover (only when on a tile, not the button)
            else if (!engine.actionFocused && engine.hoverIndex !== -1 && engine.hoverIndex < handSize) {
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

    updateConfirm: function (dt = 1.0) {
        const d = this.confirmData;
        if (d.timer > 0) {
            d.timer -= dt;
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
            if (Input.hasMouseMoved()) d.selected = 0;
            if (Input.isMouseJustPressed()) {
                if (d.onYes) d.onYes();
                this.confirmData = null;
                return;
            }
        } else if (isOverNo) {
            if (Input.hasMouseMoved()) d.selected = 1;
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

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE)) {
            if (d.selected === 0) {
                if (d.onYes) d.onYes();
            } else {
                if (d.onNo) d.onNo();
            }
            this.confirmData = null;
        }
        // Cancel = leave the selection on NO (default) and press Z/Space, or
        // toggle to NO with the arrows. No separate cancel key (X/ESC) — the
        // dialog is fully operable with 방향키 + Z(Space), matching the keymap.
    },

    drawConfirm: function (ctx) {
        const d = this.confirmData;
        if (!d) return;

        const layout = this.getConfirmLayout(d.msg);
        UIHelpers.drawConfirmDialog(ctx, layout, d.selected);
    },

    handleTileExchangeInput: function (engine) {
        // Reuse Player Turn Hover Logic for selection
        const groupSize = 0; // No group in dealing phase
        const hovered = BattleRenderer.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
        if (hovered !== -1 && Input.hasMouseMoved()) { engine.hoverIndex = hovered; }

        // Keyboard/Mouse Navigation
        const handSize = engine.p1.hand.length;
        if (Input.isJustPressed(Input.LEFT)) {
            engine.hoverIndex--;
            if (engine.hoverIndex < 0) engine.hoverIndex = handSize - 1;
        } else if (Input.isJustPressed(Input.RIGHT)) {
            engine.hoverIndex++;
            if (engine.hoverIndex >= handSize) engine.hoverIndex = 0;
        }

        // Toggle Selection — Z(=Space) marks/unmarks a tile for exchange.
        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE) || (Input.isMouseJustPressed() && hovered !== -1)) {
            if (engine.hoverIndex >= 0 && engine.hoverIndex < handSize) {
                engine.toggleExchangeSelection(engine.hoverIndex);
            }
        }

        // Confirm / Cancel
        // Button Logic?
        // Let's implement Confirm Button Logic too.
        // Reuse Draw Button Area Check for Exchange Button
        const isHoverButton = BattleRenderer.checkExchangeButton(Input.mouseX, Input.mouseY);
        if (Input.hasMouseMoved()) {
            engine.exchangeButtonHover = isHoverButton; // own flag — not the action-slot button
        }

        // Confirm with ESC only — Z is the select/deselect toggle above, so the
        // exchange is committed with ESC (or clicking the confirm button). ESC
        // reaches here because the global menu-toggle skips STATE_TILE_EXCHANGE.
        if (Input.isJustPressed(Input.ESC) || (Input.isMouseJustPressed() && isHoverButton)) {
            engine.confirmTileExchange();
        }
    },

};
