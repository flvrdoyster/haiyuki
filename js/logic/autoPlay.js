// 오토 플레이 — Game.isAutoTest일 때 P1을 AI가 대신 둔다.
//
// 실제 대국 규칙이 아니라 테스트·자동 주파용 코드라 BattleEngine 밖에 둔다.
// (BattleEngine.performAutoTurn으로 엔진 한가운데 78줄 박혀 있던 것을 옮긴 것)
//
// **P1은 항상 skill 0.7 고정, aiProfile 없이 둔다.** tests/_ai_fingerprint가
// P1을 "성격 없는 중립 베이스라인"으로 놓고 CPU 캐릭터별 행동 지문을 재기 때문에,
// 이 값을 바꾸면 캐릭터별 측정치가 전부 흔들린다. 난이도 설정과도 무관해야 한다.
const AutoPlay = {
    performTurn: function (e) {
        if (e.currentState !== e.STATE_PLAYER_TURN) {
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
