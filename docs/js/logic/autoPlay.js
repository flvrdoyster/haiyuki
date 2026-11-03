const AutoPlay = {
    performSymmetricTurn: function (e) {
        e.checkActiveSkills('P1');

        e.checkSelfActions();
        const tsumoAction = (e.possibleActions || []).find(a => a.type === 'TSUMO');
        if (tsumoAction) {
            e.executeAction(tsumoAction);
            return;
        }

        const exchangeTile = e.p1.exchangeDiscard;
        e.p1.exchangeDiscard = null;
        if (exchangeTile && e.p1.hand.indexOf(exchangeTile) !== -1) {
            e.discardTile(e.p1.hand.indexOf(exchangeTile));
            return;
        }

        if (e.p1.isRiichi) {
            if (e.p1.declaringRiichi && e.validRiichiDiscardIndices && e.validRiichiDiscardIndices.length > 0) {
                e.discardTile(e.validRiichiDiscardIndices[0]);
            } else {
                e.discardTile(e.p1.hand.length - 1);
            }
            return;
        }

        if (e.p1.isMenzen && e.p1.hand.length >= 2 && e.turnCount < 20) {
            let riichiDiscardIndex = -1;
            for (let i = 0; i < e.p1.hand.length; i++) {
                const tempHand = [...e.p1.hand];
                tempHand.splice(i, 1);
                if (e.checkTenpai(tempHand)) {
                    riichiDiscardIndex = i;
                    break;
                }
            }
            if (riichiDiscardIndex >= 0 && AILogic.shouldRiichi(e.p1.hand, e.p1Skill, e.p1.aiProfile)) {
                e.declareRiichi('P1');
                e.discardTile(riichiDiscardIndex);
                return;
            }
        }

        const context = {
            discards: e.discards,
            opponentRiichi: e.cpu.isRiichi,
            doras: e.doras,
            turnCount: e.turnCount,
            charId: e.p1.id
        };
        e.discardTile(AILogic.decideDiscard(e.p1.hand, e.p1Skill, e.p1.aiProfile, context));
    },

    performTurn: function (e) {
        if (e.currentState !== e.STATE_PLAYER_TURN) {
            return;
        }

        if (e.symmetric) {
            AutoPlay.performSymmetricTurn(e);
            return;
        }

        const tsumoAction = (e.possibleActions || []).find(a => a.type === 'TSUMO');
        if (tsumoAction) {
            e.executeAction(tsumoAction);
            return;
        }

        // Riichi Enforcement: Must discard drawn tile (last one)
        if (e.p1.isRiichi) {
            if (e.p1.declaringRiichi && e.validRiichiDiscardIndices && e.validRiichiDiscardIndices.length > 0) {
                e.discardTile(e.validRiichiDiscardIndices[0]);
            } else {
                e.discardTile(e.p1.hand.length - 1);
            }
            return;
        }

        // Auto-Riichi Check
        if (e.p1.isMenzen && e.p1.hand.length >= 2) {
            let canRiichi = false;
            let riichiDiscardIndex = -1;

            for (let i = 0; i < e.p1.hand.length; i++) {
                const tempHand = [...e.p1.hand];
                tempHand.splice(i, 1);
                if (e.checkTenpai(tempHand)) {
                    canRiichi = true;
                    riichiDiscardIndex = i;
                    break;
                }
            }

            if (canRiichi) {
                e.declareRiichi('P1');
                e.discardTile(riichiDiscardIndex);
                return;
            }
        }

        try {
            // Delegate to AI Logic. Player autopilot plays competently and
            // independently of the CPU difficulty setting.
            const context = {
                discards: e.discards,
                opponentRiichi: e.cpu.isRiichi // Auto-play defends against CPU Riichi
            };
            const discardIdx = AILogic.decideDiscard(e.p1.hand, 0.7, null, context);

            if (typeof discardIdx !== 'number' || discardIdx < 0) {
                console.error("AILogic returned invalid index:", discardIdx);
                // Fallback: Discard rightmost tile safely
                e.discardTile(e.p1.hand.length - 1);
                return;
            }

            e.discardTile(discardIdx);
        } catch (err) {
            console.error("Error during Auto-Select:", err);
            console.error(err.stack);
            // Fallback: Discard rightmost tile safely to prevent soft-lock
            if (e.p1.hand.length > 0) {
                e.discardTile(e.p1.hand.length - 1);
            }
        }
    }
};
