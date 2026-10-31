// 오토 플레이 — Game.isAutoTest일 때 P1을 AI가 대신 둔다.
// P1은 aiProfile 없이 skill 0.7 고정. tests/_ai_fingerprint가 이 값을 중립 베이스라인으로 쓴다.
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
            if (e.p1.declaringRiichi && e.p1.validRiichiDiscardIndices) {
                e.discardTile(e.p1.validRiichiDiscardIndices[0]);
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
                e.p1.isRiichi = true;
                e.p1.declaringRiichi = true;
                e.showPopup('RIICHI', { blocking: true, slideFrom: 'LEFT' });
                e.updateBattleMusic();
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
            if (e.p1.declaringRiichi && e.p1.validRiichiDiscardIndices) {
                const validIdx = e.p1.validRiichiDiscardIndices[0];
                e.discardTile(validIdx);
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
                e.p1.isRiichi = true;
                e.p1.declaringRiichi = true;
                e.showPopup('RIICHI', { blocking: true, slideFrom: 'LEFT' });
                // Sound handled by showPopup -> View (popupType check)
                e.updateBattleMusic();
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
