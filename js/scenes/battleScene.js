const BattleScene = {
    init: function (data) {
        BattleEngine.init(data);
    },

    update: function () {
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
        BattleRenderer.draw(ctx, BattleEngine);
    }
};
