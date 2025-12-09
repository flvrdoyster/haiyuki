const BattleScene = {
    init: function (data) {
        BattleEngine.init(data);
        this.activeFX = [];
    },

    processEvents: function (engine) {
        if (!engine.events) return;

        let i = 0;
        // Simple queue scan:
        // 1. Audio -> Play & Remove
        // 2. Visual -> Check Blocking. If blocked, skip (i++). If not, Play & Remove.
        while (i < engine.events.length) {
            const evt = engine.events[i];
            const isAudio = (evt.type === 'MUSIC' || evt.type === 'SOUND' || evt.type === 'STOP_MUSIC');

            if (isAudio) {
                if (evt.type === 'MUSIC') {
                    console.log(`[Scene] Play Music: ${evt.id}`);
                    Assets.playMusic(evt.id, evt.loop);
                } else if (evt.type === 'SOUND') {
                    Assets.playSound(evt.id);
                } else if (evt.type === 'STOP_MUSIC') {
                    Assets.stopMusic();
                }
                engine.events.splice(i, 1);
                continue;
            }

            // Visual Event (FX)
            const isBlocked = this.activeFX.some(fx => fx.blocking);
            if (!isBlocked) {
                if (evt.type === 'FX') {
                    this.spawnFX(evt.asset, evt.x, evt.y, evt.options);
                }
                engine.events.splice(i, 1);
                // Note: If we just spawned a blocking FX, isBlocked will be true for subsequent items in this loop
                continue;
            } else {
                // Blocked: Leave in queue, move to next item check
                i++;
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
            const fadeInDur = 10;
            if (fx.maxLife - fx.life <= fadeInDur) {
                fx.alpha = (fx.maxLife - fx.life) / fadeInDur;
            }

            // Slide Logic
            if (fx.slideFrom) {
                const slideDur = 20;
                const p = Math.min(1, (fx.maxLife - fx.life) / slideDur);
                const ease = p * (2 - p); // Quad ease out
                fx.x = fx.startX + (fx.endX - fx.startX) * ease;
                fx.y = fx.startY + (fx.endY - fx.startY) * ease;
            } else if (fx.anim === 'ZOOM_IN') {
                // Zoom In Pulse: 0 -> 1.2 -> 1.0
                const age = fx.maxLife - fx.life;
                if (age < 20) {
                    // 0 -> 1.2
                    const p = age / 20;
                    fx.scale = fx.baseScale * (p * 1.2);
                } else if (age < 30) {
                    // 1.2 -> 1.0
                    const p = (age - 20) / 10;
                    fx.scale = fx.baseScale * (1.2 - (p * 0.2));
                } else {
                    fx.scale = fx.baseScale;
                }
            }

            // Fade Out (Last 20 frames)
            if (fx.life < 20) {
                fx.alpha = fx.life / 20;
            } else {
                if (fx.maxLife - fx.life > fadeInDur) fx.alpha = 1.0;
            }

            if (fx.life <= 0) {
                this.activeFX.splice(i, 1);
            }
        }
    },

    update: function () {
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
        if (Input.isJustPressed(Input.ESC)) {
            engine.toggleBattleMenu();
            return;
        }

        if (engine.currentState === engine.STATE_BATTLE_MENU) {
            this.handleBattleMenuInput(engine);
        } else if (engine.currentState === engine.STATE_ACTION_SELECT) {
            this.handleActionSelectInput(engine);
        } else if (engine.currentState === engine.STATE_PLAYER_TURN) {
            this.handlePlayerTurnInput(engine);
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

    handleBattleMenuInput: function (engine) {
        if (Input.isJustPressed(Input.UP)) {
            engine.selectedMenuIndex--;
            if (engine.selectedMenuIndex < 0) engine.selectedMenuIndex = engine.menuItems.length - 1;
        }
        if (Input.isJustPressed(Input.DOWN)) {
            engine.selectedMenuIndex++;
            if (engine.selectedMenuIndex >= engine.menuItems.length) engine.selectedMenuIndex = 0;
        }

        // Mouse Hover using Renderer Helper
        const hovered = BattleRenderer.getMenuItemAt(Input.mouseX, Input.mouseY, engine.menuItems.length);
        if (hovered !== -1) {
            engine.selectedMenuIndex = hovered;
            if (Input.isMouseJustPressed()) {
                engine.handleMenuSelection(engine.menuItems[hovered]);
                return;
            }
        }

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isJustPressed(Input.SPACE)) {
            engine.handleMenuSelection(engine.menuItems[engine.selectedMenuIndex]);
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
        const hovered = BattleRenderer.getActionAt(Input.mouseX, Input.mouseY, actions);
        if (hovered !== -1) {
            engine.selectedActionIndex = hovered;
            if (Input.isMouseJustPressed()) {
                console.log("Action Clicked:", actions[hovered]);
                engine.executeAction(actions[hovered]);
                return;
            }
        }

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.ENTER)) {
            console.log("Action Selected Key:", actions[engine.selectedActionIndex]);
            engine.executeAction(actions[engine.selectedActionIndex]);
        }
    },

    handlePlayerTurnInput: function (engine) {
        // Riichi Locked Input
        if (engine.p1.isRiichi) return;

        // Mouse Interaction
        const groupSize = engine.lastDrawGroupSize || 0;
        const hovered = BattleRenderer.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);

        if (hovered !== -1) {
            engine.hoverIndex = hovered;
        }

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
            if (engine.hoverIndex !== -1 && engine.hoverIndex < handSize) {
                engine.discardTile(engine.hoverIndex);
            }
        }
    },

    draw: function (ctx) {
        const renderState = Object.create(BattleEngine); // Prototype chain or shallow copy? 
        // BattleRenderer likely reads properties directly.
        // It's safer to just pass BattleEngine and override activeFX if possible, 
        // OR pass a proxy object.
        // BattleEngine is a singleton object, not a class instance unless we treat it so.
        // Let's assume BattleRenderer reads `state.activeFX`.

        // We can temporarily attach activeFX to BattleEngine before drawing? 
        // Or better, BattleRenderer.draw accepts an options or we wrap it.
        // But since JS objects are mutable...
        BattleEngine.activeFX = this.activeFX;

        BattleRenderer.draw(ctx, BattleEngine);

        // Cleanup? 
        // No need, BattleEngine doesn't use it.
    }
};
