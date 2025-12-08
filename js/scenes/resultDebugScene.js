const ResultDebugScene = {
    mockState: {
        currentState: 0, // 0: NONE, 1: WIN, 2: LOSE, 3: NAGARI
        winningYaku: {
            score: 12000,
            yaku: ['비오의', '올스타즈']
        },
        drawResultMsg: "NAGARI\nNo Winner"
    },

    // Real Yaku List from YakuLogic.js
    yakuPool: [
        '입에 담을 수도 없는 엄청난 기술', '비오의', '팔보채', '오의', '주호',
        '순일색', '육법전서', '진 눈썹개', '크로스 콤비네이션', '마구 때리기',
        '초일색', '남탕', '여탕', '취호전', '포물장', '자유박애평등', '필살기', '사천요리',
        '스페셜 콤비네이션', '초 눈썹개', '변태개', '일색', '눈썹개', '더블 콤비네이션',
        '콤비네이션', '색 하나씩', '장기', '삼도립', '올스타즈', '삼연격'
    ],

    init: function () {
        console.log("[ResultDebugScene] Initialized");
        // Expose API for UI Debug Page
        window.ResultDebugSceneAPI = {
            toggleState: this.toggleState.bind(this),
            adjustScore: this.adjustScore.bind(this),
            addRandomYaku: this.addRandomYaku.bind(this),
            removeYaku: this.removeYaku.bind(this),
            toggleObject: this.toggleObject.bind(this)
        };
    },

    update: function () {
        // No keyboard input - controlled via external UI
    },

    draw: function (ctx) {
        // Map Mock State to Renderer Constants
        const STATE_WIN = 5; // From BattleEngine (approx)
        const STATE_LOSE = 6;
        const STATE_NAGARI = 7;

        let engineState = STATE_WIN;
        if (this.mockState.currentState === 2) engineState = STATE_LOSE;
        if (this.mockState.currentState === 3) engineState = STATE_NAGARI;

        // Mocking the engine instance needed for drawResult
        const mockEngine = {
            currentState: engineState,
            winningYaku: this.mockState.winningYaku,
            drawResultMsg: this.mockState.drawResultMsg,
            STATE_WIN: STATE_WIN,
            STATE_LOSE: STATE_LOSE,
            STATE_NAGARI: STATE_NAGARI
        };

        BattleRenderer.drawResult(ctx, mockEngine);

        // Draw Overlay Info
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, 300, 100);
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Mode: ${this.getStateName()}`, 10, 20);
        ctx.fillText(`Score: ${this.mockState.winningYaku ? this.mockState.winningYaku.score : 'N/A'}`, 10, 40);
        ctx.fillText(`Yaku Count: ${this.mockState.winningYaku ? this.mockState.winningYaku.yaku.length : 'N/A'}`, 10, 60);
        ctx.fillText(`Obj: ${this.mockState.winningYaku ? 'Valid' : 'NULL'}`, 10, 80);
    },

    // API Methods
    toggleState: function () {
        this.mockState.currentState++;
        if (this.mockState.currentState > 3) this.mockState.currentState = 1;
        // Update fallback msg
        if (this.mockState.currentState === 3) this.mockState.drawResultMsg = "NAGARI\nNo Winner";
        else this.mockState.drawResultMsg = "WINNER!\n(Fallback)";
    },

    adjustScore: function (delta) {
        if (this.mockState.winningYaku) {
            this.mockState.winningYaku.score += delta;
        }
    },

    addRandomYaku: function () {
        if (this.mockState.winningYaku) {
            const yaku = this.yakuPool[Math.floor(Math.random() * this.yakuPool.length)];
            this.mockState.winningYaku.yaku.push(yaku);
        }
    },

    removeYaku: function () {
        if (this.mockState.winningYaku && this.mockState.winningYaku.yaku.length > 0) {
            this.mockState.winningYaku.yaku.pop();
        }
    },

    toggleObject: function () {
        if (this.mockState.winningYaku) {
            this._cachedYaku = this.mockState.winningYaku;
            this.mockState.winningYaku = null;
        } else {
            this.mockState.winningYaku = this._cachedYaku || { score: 1000, yaku: ['Test'] };
        }
    },

    getStateName: function () {
        switch (this.mockState.currentState) {
            case 1: return "WIN";
            case 2: return "LOSE";
            case 3: return "NAGARI";
            default: return "UNKNOWN";
        }
    }
};
