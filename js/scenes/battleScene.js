// Battle UI Configuration
const BattleConfig = {
    UI_BG: { path: 'bg/GAMEBG.png', color: '#225522' },
    BG: { prefix: 'bg/', min: 0, max: 11 },
    PORTRAIT: {
        P1: { x: 0, y: 80, w: 264, h: 280 },
        CPU: { x: 376, y: 80, w: 264, h: 280 },
        baseW: 264,
        baseH: 280
    },
    BARS: {
        width: 140, height: 10,
        P1: { x: 40, y: 346 },
        CPU: { x: 458, y: 346 },
        gap: 10, // Gap between HP and MP bars
        img: 'bar.png'
    },
    HAND: {
        y: 400,
        cpuY: 20, // Added missing key
        tileWidth: 40,
        tileHeight: 53,
        gap: 0,
        hoverYOffset: -10,
        hoverColor: 'yellow',
        hoverWidth: 2,
        groupGap: 10
    },
    DORA: {
        x: 280, y: 210, gap: 5,
        tileWidth: 40, // Added missing key
        tileHeight: 53, // Added missing key
        labelXOffset: 40, labelYOffset: -10,
        labelFont: 'bold 20px "KoddiUDOnGothic-Bold"'
    },
    INFO: {
        roundX: 320, roundY: 180,
        turnX: 320, turnY: 200,
        roundFont: 'bold 16px "KoddiUDOnGothic-Bold"',
        turnFont: 'bold 16px "KoddiUDOnGothic-Bold"',
        color: 'white',
        stroke: 'black',
        strokeWidth: 3
    },
    ACTION: {
        buttonFont: 'bold 20px "KoddiUDOnGothic-Bold"',
        helpFont: '16px "KoddiUDOnGothic-Bold"'
    },
    OVERLAY: {
        bgColor: 'rgba(0, 0, 0, 0.7)',
        resultFont: 'bold 48px "KoddiUDOnGothic-Bold"',
        subFont: 'bold 32px "KoddiUDOnGothic-Bold"',
        infoFont: '24px "KoddiUDOnGothic-Regular"',
        resultColor: 'white',
        subColor: '#FFFF00',
        infoColor: 'white'
    },
    FALLBACK: {
        tileBg: '#EEE',
        tileTextFont: '12px Arial',
        cardBackBg: '#B22222',
        cardBackStroke: '#FFFFFF',
        cardBackPattern: '#880000',
        unknownBg: '#444',
        unknownStroke: '#888'
    },
    DISCARDS: {
        P1: { x: 214, y: 280 },
        CPU: { x: 214, y: 100 },
        tileWidth: 20,
        tileHeight: 27,
        gap: 2,
        rowMax: 10
    }
};

const BattleScene = {
    // States
    STATE_INIT: 0,
    STATE_PLAYER_TURN: 1, // Draw -> Discard
    STATE_CPU_TURN: 2,
    STATE_WIN: 3,   // Round Win
    STATE_LOSE: 4,  // Round Lose
    STATE_DRAW: 5,  // Round Draw
    STATE_MATCH_OVER: 6, // Game Over (HP 0)
    STATE_ACTION_SELECT: 7, // Menu for Pon/Ron

    currentState: 0,
    timer: 0,

    playerIndex: 0,
    cpuIndex: 0,

    // Battle Data
    p1: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, hand: [], isRiichi: false },
    cpu: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, hand: [], isRiichi: false },

    deck: [],
    discards: [],

    turnCount: 1,
    currentRound: 1, // New: Round tracking
    doras: [], // Changed from single dora to array
    winningYaku: null, // Store winning yaku info { name, score }

    // Action Logic
    possibleActions: [], // { type: 'PON', tile: ... }
    actionTimer: 0,
    selectedActionIndex: 0,

    init: function (data) {
        this.playerIndex = data.playerIndex || 0;
        this.cpuIndex = data.cpuIndex || 0;
        console.log(`BattleScene Init. P1 Index: ${this.playerIndex}, CPU Index: ${this.cpuIndex}`);
        console.log(`CharacterData Length: ${CharacterData.length}`);
        CharacterData.forEach((c, i) => console.log(`[${i}] ${c.name} (${c.id})`));

        const p1Data = CharacterData[this.playerIndex];
        const cpuData = CharacterData[this.cpuIndex];
        console.log(`BattleScene Resolved. P1: ${p1Data ? p1Data.name : 'null'}, CPU: ${cpuData ? cpuData.name : 'null'}`);

        this.currentState = this.STATE_INIT;
        this.timer = 0;
        this.turnCount = 1;
        this.currentRound = 1;

        // Select Random Background
        const bgIndex = Math.floor(Math.random() * (BattleConfig.BG.max - BattleConfig.BG.min + 1)) + BattleConfig.BG.min;
        const bgName = bgIndex.toString().padStart(2, '0');
        this.bgPath = `${BattleConfig.BG.prefix}${bgName}.png`;
        console.log(`Selected BG: ${this.bgPath}`);

        // Reset Stats (Only if new match)
        if (!data.isNextRound) {
            this.p1.hp = 10000;
            this.cpu.hp = 10000;
            this.p1.maxHp = 10000;
            this.cpu.maxHp = 10000;
        }

        // Store tournament data
        this.defeatedOpponents = data.defeatedOpponents || [];

        this.startRound();
    },

    nextRound: function () {
        console.log("Starting Next Round...");
        this.startRound();
    },

    matchOver: function (winner) {
        console.log(`Match Over! Winner: ${winner}`);
        if (winner === 'P1') {
            // Add current CPU to defeated list
            this.defeatedOpponents.push(this.cpuIndex);

            // Proceed to next match
            Game.changeScene(CharacterSelectScene, {
                mode: 'NEXT_MATCH',
                playerIndex: this.playerIndex,
                defeatedOpponents: this.defeatedOpponents
            });
        } else {
            // Game Over -> Continue Screen
            console.log(`Encounter Finished. Transitioning to Battle. P1: ${this.playerIndex}, CPU: ${this.cpuIndex}`);
            Game.changeScene(BattleScene, {
                playerIndex: this.playerIndex,
                cpuIndex: this.cpuIndex,
                defeatedOpponents: this.defeatedOpponents,
                hasContinued: this.hasContinued || false
            });
        }
    },

    startRound: function () {
        console.log("startRound called");

        // Debug: Check loaded assets
        console.log("Available Assets:", Object.keys(Assets.images));

        this.turnCount = 1;
        this.winningYaku = null;
        this.discards = [];
        this.currentState = this.STATE_INIT;

        // Init Deck
        this.deck = this.generateDeck();
        console.log(`Deck generated. Size: ${this.deck.length}`);

        // Init Hands
        this.p1.hand = this.drawTiles(11);
        console.log(`Player Hand drawn. Size: ${this.p1.hand.length}`);

        this.cpu.hand = this.drawTiles(11);
        this.sortHand(this.p1.hand);

        // 2 Doras
        this.doras = [];
        for (let i = 0; i < 2; i++) {
            const dtype = PaiData.TYPES[Math.floor(Math.random() * PaiData.TYPES.length)];
            this.doras.push({ type: dtype.id, color: dtype.color, img: dtype.img });
        }

        // Reset Riichi
        this.p1.isRiichi = false;
        this.cpu.isRiichi = false;
        this.p1.isMenzen = true; // Reset Menzen (Closed Hand)


        console.log(`Round ${this.currentRound} Start! Visible Dora: ${this.doras[0].type}`);
    },

    drawTile: function (ctx, tile, x, y, w, h) {
        // Just draw the image as requested
        const img = Assets.get(tile.img);
        if (img) {
            ctx.drawImage(img, x, y, w, h);
        } else {
            // Fallback if image missing
            ctx.fillStyle = '#EEE';
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = 'red'; // Changed to red for visibility
            ctx.textAlign = 'center';
            ctx.font = '8px Arial'; // Tiny font to fit path
            ctx.fillText(tile.img, x + w / 2, y + h / 2); // Show path
            ctx.font = '10px Arial';
            ctx.fillStyle = 'black';
            ctx.fillText(tile.type, x + w / 2, y + h / 2 + 10);
        }
    },

    generateDeck: function () {
        const deck = [];

        // Manual: "13 Types... 9 pieces each" -> Modified to 10 for balance
        PaiData.TYPES.forEach(type => {
            for (let i = 0; i < 10; i++) {
                deck.push({
                    type: type.id,
                    color: type.color,
                    img: type.img
                });
            }
        });

        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    },

    drawTiles: function (count) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            if (this.deck.length > 0) drawn.push(this.deck.pop());
        }
        return drawn;
    },

    update: function () {
        this.timer++;

        // Hover Check (always update mouse index)
        this.hoverIndex = -1;
        if (this.currentState === this.STATE_PLAYER_TURN) {
            const mx = Input.mouseX;
            const my = Input.mouseY;
            const tileW = BattleConfig.HAND.tileWidth;
            const tileH = BattleConfig.HAND.tileHeight;
            const gap = BattleConfig.HAND.gap;
            const handSize = this.p1.hand.length;
            const totalW = handSize * (tileW + gap);
            const startX = (640 - totalW) / 2;
            const handY = BattleConfig.HAND.y;

            if (my >= handY && my <= handY + tileH) {
                if (mx >= startX && mx <= startX + totalW) {
                    const index = Math.floor((mx - startX) / (tileW + gap));
                    if (index >= 0 && index < handSize) {
                        this.hoverIndex = index;
                    }
                }
            }
        }

        switch (this.currentState) {
            case this.STATE_INIT:
                if (this.timer > 60) { // Slight delay for Round Start text
                    this.playerDraw();
                    this.currentState = this.STATE_PLAYER_TURN;
                    this.timer = 0;
                }
                break;

            case this.STATE_PLAYER_TURN:
                // Riichi Auto-Discard Logic
                if (this.p1.isRiichi) {
                    if (this.timer > 60) { // ~1 second delay
                        console.log("Riichi Auto-Discard (Delayed)");
                        this.discardTile(this.p1.hand.length - 1);
                    }
                    return; // Skip input handling
                }

                if (Input.isMouseJustPressed()) {
                    // Check if Action Menu is active first? No, Action Select is a different state.
                    // But we want to allow opening Action Menu if Riichi is possible?
                    // Or check immediately after Draw?

                    if (this.hoverIndex !== -1) {
                        // Discard
                        this.discardTile(this.hoverIndex);
                    }
                }
                break;

            case this.STATE_ACTION_SELECT:
                this.updateActionSelect();
                break;

            case this.STATE_CPU_TURN:
                if (this.timer === 30) { // Delay before CPU acts
                    this.cpuDraw();
                }
                break;

            case this.STATE_WIN:
            case this.STATE_LOSE:
            case this.STATE_DRAW:
                if (Input.isJustPressed(Input.SPACE) || Input.isMouseJustPressed()) {
                    this.handleRoundEnd();
                }
                break;

            case this.STATE_MATCH_OVER:
                if (Input.isJustPressed(Input.SPACE) || Input.isMouseJustPressed()) {
                    Game.changeScene(TitleScene);
                }
                break;
        }

        if (this.currentState < this.STATE_WIN) {
            this.checkRoundEnd();
        }
    },

    checkRoundEnd: function () {
        // 1. Deck Exhaustion
        if (this.deck.length === 0) {
            this.calculateTenpaiDamage();
            this.currentState = this.STATE_DRAW;
            console.log("Deck Empty -> DRAW");
            return;
        }

        // 2. Turn Limit
        if (this.turnCount > 20) {
            this.calculateTenpaiDamage();
            this.currentState = this.STATE_DRAW;
            console.log("Turn Limit -> DRAW");
            return;
        }
    },

    calculateTenpaiDamage: function () {
        const p1Tenpai = this.checkTenpai(this.p1.hand);
        const cpuTenpai = this.checkTenpai(this.cpu.hand);
        this.drawResultMsg = "";

        if (p1Tenpai && !cpuTenpai) {
            this.cpu.hp -= 1000;
            this.drawResultMsg = "P1 Tenpai! CPU takes 1000 dmg";
            console.log("P1 Tenpai, CPU Noten -> CPU takes 1000 damage");
        } else if (!p1Tenpai && cpuTenpai) {
            this.p1.hp -= 1000;
            this.drawResultMsg = "CPU Tenpai! P1 takes 1000 dmg";
            console.log("CPU Tenpai, P1 Noten -> P1 takes 1000 damage");
        } else {
            this.drawResultMsg = "Both Tenpai or Noten";
            console.log("Tenpai status equal -> No damage");
        }

        // Clamp HP
        if (this.p1.hp < 0) this.p1.hp = 0;
        if (this.cpu.hp < 0) this.cpu.hp = 0;
    },

    handleRoundEnd: function () {
        // Check HP for Match Over
        if (this.p1.hp <= 0) {
            this.currentState = this.STATE_MATCH_OVER;
            this.matchOver('CPU');
        } else if (this.cpu.hp <= 0) {
            this.currentState = this.STATE_MATCH_OVER;
            this.matchOver('P1');
        } else {
            // Neither dead -> Next Round
            // Automatically proceed to next round
            this.nextRound();
        }
    },

    playerDraw: function () {
        const t = this.drawTiles(1);
        if (t.length > 0) {
            const drawnTile = t[0];
            this.p1.hand.push(drawnTile);

            // Grouping Logic:
            // "New tile not sorted... separated... BUT if same tile exists, bring it next to new one."
            // 1. Find matches (excluding the new one at the end)
            // 2. Move matches to end-1 position
            const hand = this.p1.hand;
            const lastIdx = hand.length - 1;
            let insertPos = lastIdx; // Position to insert matches (shifting new tile right)

            // We want [Others] ... [Matches] [NewTile]
            // So we iterate and move matches to insertPos-1? 
            // Better: Filter out matches, verify count, then reconstruction.

            const others = [];
            const matches = [];
            const newOne = hand[lastIdx];

            for (let i = 0; i < lastIdx; i++) {
                if (hand[i].type === newOne.type) matches.push(hand[i]);
                else others.push(hand[i]);
            }

            if (matches.length > 0) {
                // Reconstruct: Others + Matches + NewOne
                this.p1.hand = [...others, ...matches, newOne];
                this.lastDrawGroupSize = matches.length + 1; // Used for rendering gap
            } else {
                // No matches, just NewOne at end
                this.lastDrawGroupSize = 1;
            }
        }

        // DO NOT SORT HERE. Only on discard or initial deal.

        // Check Win (Tsumo)
        // const win = YakuLogic.checkYaku(this.p1.hand);
        // if (win) { ... } 
        // Move Tsumo check to Action Menu

        // CHECK SELF ACTIONS (Riichi, Tsumo)
        if (this.checkSelfActions()) {
            // Riichi Auto-Win (Tsumo)
            if (this.p1.isRiichi) {
                const tsumoAction = this.possibleActions.find(a => a.type === 'TSUMO');
                if (tsumoAction) {
                    console.log("Riichi Auto-Tsumo!");
                    this.executeAction(tsumoAction);
                    return;
                }
            }

            this.currentState = this.STATE_ACTION_SELECT;
            this.actionTimer = 0;
            this.selectedActionIndex = 0;
        } else {
            // No actions
            if (this.p1.isRiichi) {
                // Auto Discard (Riichi Rule) - Delayed
                // Go to STATE_PLAYER_TURN to allow rendering the drawn tile
                this.currentState = this.STATE_PLAYER_TURN;
                this.timer = 0; // Reset timer for delay
            } else {
                // Normal turn
                this.currentState = this.STATE_PLAYER_TURN;
                this.timer = 0;
            }
        }
    },

    cpuDraw: function () {
        const t = this.drawTiles(1);
        if (t.length > 0) this.cpu.hand.push(t[0]);

        // CPU AI Logic
        const difficulty = AILogic.DIFFICULTY.NORMAL; // Default to Normal for now

        // 1. Check Tsumo
        if (YakuLogic.checkYaku(this.cpu.hand)) {
            console.log("CPU Tsumo!");
            this.winningYaku = YakuLogic.checkYaku(this.cpu.hand);
            this.p1.hp = Math.max(0, this.p1.hp - this.winningYaku.score);
            this.currentState = this.STATE_LOSE;
            return;
        }

        // 2. Check Riichi
        if (!this.cpu.isRiichi && this.cpu.isMenzen && this.cpu.hand.length >= 2) {
            // Check if can Riichi (Tenpai check)
            let canRiichi = false;
            for (let i = 0; i < this.cpu.hand.length; i++) {
                const tempHand = [...this.cpu.hand];
                tempHand.splice(i, 1);
                if (this.checkTenpai(tempHand)) {
                    canRiichi = true;
                    break;
                }
            }

            if (canRiichi && AILogic.shouldRiichi(this.cpu.hand, difficulty)) {
                console.log("CPU Riichi!");
                this.cpu.isRiichi = true;
                // Auto-discard logic will handle the discard below
            }
        }

        // 3. Decide Discard
        // If Riichi, must discard drawn tile (unless Tsumo, checked above)
        if (this.cpu.isRiichi) {
            // Discard last drawn
            const discardIdx = this.cpu.hand.length - 1;
            // Delay? CPU doesn't need visual delay for itself, but for player experience?
            // Let's just discard immediately for now.
            this.discardTileCPU(discardIdx);
        } else {
            const discardIdx = AILogic.decideDiscard(this.cpu.hand, difficulty);
            this.discardTileCPU(discardIdx);
        }
    },

    discardTileCPU: function (index) {
        console.log(`CPU discards index ${index}`);
        const discarded = this.cpu.hand.splice(index, 1)[0];
        discarded.owner = 'cpu';
        this.discards.push(discarded);

        // Check Player Ron/Pon
        if (this.checkPlayerActions(discarded)) {
            console.log("Player has actions on CPU discard");
            // Riichi Auto-Win (Ron)
            if (this.p1.isRiichi) {
                const ronAction = this.possibleActions.find(a => a.type === 'RON');
                if (ronAction) {
                    console.log("Riichi Auto-Ron!");
                    this.executeAction(ronAction);
                    return;
                }
                // Auto-Pass if only Pass available
                console.log("Riichi Auto-Pass");
                this.executeAction({ type: 'PASS' });
                return;
            }

            this.currentState = this.STATE_ACTION_SELECT;
            this.actionTimer = 0;
            this.selectedActionIndex = 0;
        } else {
            this.turnCount++;
            this.playerDraw();
        }
    },

    // Sort: Category -> Color -> ID
    sortHand: function (hand) {
        const catOrder = { 'character': 1, 'weapon': 2, 'mayu': 3 };
        const colorOrder = { 'red': 1, 'blue': 2, 'yellow': 3, 'purple': 4 };

        hand.sort((a, b) => {
            // 0. Get Data to check category
            const typeA = PaiData.TYPES.find(t => t.id === a.type) || {};
            const typeB = PaiData.TYPES.find(t => t.id === b.type) || {};

            const catA = typeA.category || 'unknown';
            const catB = typeB.category || 'unknown';

            if (catOrder[catA] !== catOrder[catB]) {
                return (catOrder[catA] || 99) - (catOrder[catB] || 99);
            }

            // 1. Color
            if (a.color !== b.color) {
                return (colorOrder[a.color] || 99) - (colorOrder[b.color] || 99);
            }
            // 2. ID (Name)
            if (a.type !== b.type) {
                return a.type.localeCompare(b.type);
            }
            return 0;
        });

        this.lastDrawGroupSize = 0; // Reset grouping on sort
    },

    discardTile: function (index) {
        console.log(`Player discards index ${index}`);
        const discarded = this.p1.hand.splice(index, 1)[0];
        discarded.owner = 'p1'; // Mark owner
        this.discards.push(discarded);

        this.currentState = this.STATE_CPU_TURN;
        this.timer = 0;
        this.hoverIndex = -1;
    },

    draw: function (ctx) {
        // 1. Random Background (Bottom Layer)
        const randomBg = Assets.get(this.bgPath);
        if (randomBg) {
            const pattern = ctx.createPattern(randomBg, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, 640, 480);
        } else {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 640, 480);
        }

        const p1Data = CharacterData.find(c => c.index === this.playerIndex) || CharacterData[this.playerIndex];
        const cpuData = CharacterData.find(c => c.index === this.cpuIndex) || CharacterData[this.cpuIndex];

        // 2. Portraits
        // P1 (Left)
        if (p1Data && p1Data.battleFaceL) {
            const img = Assets.get(p1Data.battleFaceL);
            if (img) {
                // Crop base face (Left side)
                ctx.drawImage(img,
                    0, 0, BattleConfig.PORTRAIT.baseW, BattleConfig.PORTRAIT.baseH,
                    BattleConfig.PORTRAIT.P1.x, BattleConfig.PORTRAIT.P1.y, BattleConfig.PORTRAIT.P1.w, BattleConfig.PORTRAIT.P1.h
                );
            }
        } else if (p1Data && p1Data.face) {
            // Fallback
            Assets.drawFrame(ctx, p1Data.face, BattleConfig.PORTRAIT.P1.x, BattleConfig.PORTRAIT.P1.y, 0, BattleConfig.PORTRAIT.P1.w, BattleConfig.PORTRAIT.P1.h);
        }

        // CPU (Right)
        if (cpuData && cpuData.battleFaceR) {
            const img = Assets.get(cpuData.battleFaceR);
            if (img) {
                // Crop base face (Left side of the Right image? Or is the base face always on the left of the sprite sheet?)
                // User said: "Each image has a base face on the left"
                ctx.drawImage(img,
                    0, 0, BattleConfig.PORTRAIT.baseW, BattleConfig.PORTRAIT.baseH,
                    BattleConfig.PORTRAIT.CPU.x, BattleConfig.PORTRAIT.CPU.y, BattleConfig.PORTRAIT.CPU.w, BattleConfig.PORTRAIT.CPU.h
                );
            }
        } else if (cpuData && cpuData.face) {
            // Fallback
            Assets.drawFrame(ctx, cpuData.face, BattleConfig.PORTRAIT.CPU.x, BattleConfig.PORTRAIT.CPU.y, 1, BattleConfig.PORTRAIT.CPU.w, BattleConfig.PORTRAIT.CPU.h);
        }

        // 3. UI Background (Over Characters)
        const uiBg = Assets.get(BattleConfig.UI_BG.path);
        if (uiBg) ctx.drawImage(uiBg, 0, 0);

        // 4. Info (Round, Turn, Dora)
        ctx.fillStyle = BattleConfig.INFO.color;
        ctx.strokeStyle = BattleConfig.INFO.stroke;
        ctx.lineWidth = BattleConfig.INFO.strokeWidth;
        ctx.textAlign = 'center';
        ctx.font = BattleConfig.INFO.roundFont;

        // Round
        ctx.strokeText(`ROUND ${this.currentRound}`, BattleConfig.INFO.roundX, BattleConfig.INFO.roundY);
        ctx.fillText(`ROUND ${this.currentRound}`, BattleConfig.INFO.roundX, BattleConfig.INFO.roundY);

        // Turn
        ctx.textAlign = 'center';
        ctx.font = BattleConfig.INFO.turnFont;
        ctx.strokeText(`TURN ${this.turnCount} / 20`, BattleConfig.INFO.turnX, BattleConfig.INFO.turnY);
        ctx.fillText(`TURN ${this.turnCount} / 20`, BattleConfig.INFO.turnX, BattleConfig.INFO.turnY);

        // DEBUG: Show CPU Index and Name
        ctx.font = '12px Arial';
        ctx.fillStyle = 'yellow';
        ctx.textAlign = 'right';
        ctx.fillText(`CPU Idx: ${this.cpuIndex} (${this.cpu.hand.length})`, 630, 470);
        const cpuName = CharacterData[this.cpuIndex] ? CharacterData[this.cpuIndex].name : 'Unknown';
        ctx.fillText(`CPU Name: ${cpuName}`, 630, 455);

        // Dora Label (Removed as per request)
        // ctx.font = BattleConfig.DORA.labelFont;
        // const doraLblX = BattleConfig.DORA.x + BattleConfig.DORA.labelXOffset;
        // const doraLblY = BattleConfig.DORA.y + BattleConfig.DORA.labelYOffset;
        // ctx.strokeText("DORA", doraLblX, doraLblY);
        // ctx.fillText("DORA", doraLblX, doraLblY);

        // Render 2 Doras
        // 1st: Visible
        if (this.doras[0]) {
            this.drawTile(ctx, this.doras[0], BattleConfig.DORA.x, BattleConfig.DORA.y, BattleConfig.DORA.tileWidth, BattleConfig.DORA.tileHeight);
        }
        // 2nd: Hidden (Shown as ?) until Win? OR always visible as per user "Hidden Dora (until 2 pieces)" phrasing?
        // User said: "도라(숨김 도라까지 2개) 표시" -> "Display Dora (2 pieces including hidden dora)".
        // So display 2 slots. 2nd one is '?' unless Riichi-win.
        // For now, let's render it as a 'Back' or '?' tile.
        // Assuming I don't have '?' asset yet, I'll draw a rect with '?'.

        // Only show 2nd dora if condition met?
        // Manual 229: "Hidden dora is indicated by ?, revealed only if winning with Riichi."
        // So normally it IS '?'
        if (this.doras[1]) {
            const dx = BattleConfig.DORA.x + BattleConfig.DORA.tileWidth + BattleConfig.DORA.gap;

            // Check if we should reveal (Win State + Riichi - not impl yet. Just reveal on Win for now for testing?)
            // For now, always '?'
            this.drawUnknownTile(ctx, dx, BattleConfig.DORA.y, BattleConfig.DORA.tileWidth, BattleConfig.DORA.tileHeight);
        }

        // 4. HP/MP Bars (Moved to end)



        // 4.5 Discards
        this.drawDiscards(ctx);

        // 5. Hands
        const tileW = BattleConfig.HAND.tileWidth;
        const tileH = BattleConfig.HAND.tileHeight;
        const gap = BattleConfig.HAND.gap;

        // CPU Hand (Top)
        const cpuCount = this.cpu.hand.length;
        const cpuStartX = (640 - (cpuCount * (tileW + gap))) / 2;

        for (let i = 0; i < cpuCount; i++) {
            // Use gap for draw?
            let xOffset = 0;
            const x = cpuStartX + i * (tileW + gap) + xOffset;

            // Reveal hand if CPU wins (STATE_LOSE for player)
            if (this.currentState === this.STATE_LOSE) {
                this.drawTile(ctx, this.cpu.hand[i], x, BattleConfig.HAND.cpuY, tileW, tileH);
            } else {
                // Hidden
                this.drawCardBack(ctx, x, BattleConfig.HAND.cpuY, tileW, tileH, 'tiles/back-top.png');
            }
        }

        // Player Hand (Bottom)
        const pCount = this.p1.hand.length;
        const handY = BattleConfig.HAND.y;

        // Calculate Width considering gap
        // If lastDrawGroupSize > 0, we have a gap before indices [length - groupSize]
        const groupSize = this.lastDrawGroupSize || 0;
        const hasGap = (this.currentState === this.STATE_PLAYER_TURN && groupSize > 0);

        let totalW = (pCount * (tileW + gap));
        if (hasGap) totalW += BattleConfig.HAND.groupGap; // Extra Gap

        let pStartX = (640 - totalW) / 2;

        this.p1.hand.forEach((tile, i) => {
            let x = pStartX + i * (tileW + gap);

            // Add gap offset if we are in the group
            if (hasGap && i >= pCount - groupSize) {
                x += BattleConfig.HAND.groupGap;
            }

            // Highlight hover
            const isHover = (i === this.hoverIndex);

            // 3D effect: Draw side-bottom if hovered?
            // "Display 'side-bottom.png' right below the mouse-overed player tile"

            const yOffset = isHover ? BattleConfig.HAND.hoverYOffset : 0;

            // Draw Side first if hovering (below the tile visually, meaning Y+height?)
            // "Right below the tile".
            if (isHover) {
                const sideImg = Assets.get('tiles/side-bottom.png');
                if (sideImg) {
                    // Adjust Y to be at bottom of tile
                    // Tile is at y + yOffset. Height is tileH.
                    // Side should be at y + yOffset + tileH?
                    ctx.drawImage(sideImg, x, handY + yOffset + tileH, tileW, sideImg.height);
                }
            }

            this.drawTile(ctx, tile, x, handY + yOffset, tileW, tileH);

            if (isHover) {
                ctx.strokeStyle = BattleConfig.HAND.hoverColor;
                ctx.lineWidth = BattleConfig.HAND.hoverWidth;
                ctx.strokeRect(x, handY + yOffset, tileW, tileH);
            }
        });

        // 6. HP/MP Bars (Rendered here to be above Hands/Discards)
        // HP
        this.drawBar(ctx, BattleConfig.BARS.P1.x, BattleConfig.BARS.P1.y, this.p1.hp, this.p1.maxHp, 'HP');
        // MP
        this.drawBar(ctx, BattleConfig.BARS.P1.x, BattleConfig.BARS.P1.y + BattleConfig.BARS.height + BattleConfig.BARS.gap, this.p1.mp, this.p1.maxMp, 'MP');

        // CPU HP
        this.drawBar(ctx, BattleConfig.BARS.CPU.x, BattleConfig.BARS.CPU.y, this.cpu.hp, this.cpu.maxHp, 'HP');
        // CPU MP
        this.drawBar(ctx, BattleConfig.BARS.CPU.x, BattleConfig.BARS.CPU.y + BattleConfig.BARS.height + BattleConfig.BARS.gap, this.cpu.mp, this.cpu.maxMp, 'MP');


        // Action Menu
        if (this.currentState === this.STATE_ACTION_SELECT) {
            this.drawActionMenu(ctx);
        }

        // Overlay...
        if (this.currentState >= this.STATE_WIN && this.currentState <= this.STATE_MATCH_OVER) {
            ctx.fillStyle = BattleConfig.OVERLAY.bgColor;
            ctx.fillRect(0, 0, 640, 480);
            ctx.fillStyle = BattleConfig.OVERLAY.resultColor;
            ctx.textAlign = 'center';
            ctx.font = BattleConfig.OVERLAY.resultFont;

            let msg = "";
            let subMsg = "";
            if (this.currentState === this.STATE_WIN) {
                msg = "VICTORY!";
                if (this.winningYaku) subMsg = `${this.winningYaku.name} (+${this.winningYaku.score})`;
            } else if (this.currentState === this.STATE_LOSE) {
                msg = "DEFEAT...";
                if (this.winningYaku) subMsg = `${this.winningYaku.name} (-${this.winningYaku.score})`;
            } else {
                msg = "DRAW GAME";
                if (this.drawResultMsg) subMsg = this.drawResultMsg;
            }

            ctx.fillText(msg, 320, 240);
            if (subMsg) {
                ctx.font = BattleConfig.OVERLAY.subFont;
                ctx.fillStyle = BattleConfig.OVERLAY.subColor;
                ctx.fillText(subMsg, 320, 290);
            }
            ctx.fillStyle = BattleConfig.OVERLAY.infoColor;
            ctx.font = BattleConfig.OVERLAY.infoFont;
            ctx.fillText("Press Action to Return", 320, 340);
        }
    },

    checkPlayerActions: function (discardedTile) {
        this.possibleActions = [];
        const hand = this.p1.hand;

        // 1. Check PON (Pair matches discard)
        let matchCount = 0;
        hand.forEach(t => {
            if (t.type === discardedTile.type) matchCount++;
        });
        if (matchCount >= 2) {
            this.possibleActions.push({ type: 'PON', label: '펑' });
        }

        // 3. Check RON (Win)
        // Rule: "When Riichi is declared... Ron"
        if (this.p1.isRiichi) {
            const tempHand = [...hand, discardedTile];
            if (YakuLogic.checkYaku(tempHand)) {
                this.possibleActions.push({ type: 'RON', label: '론' });
            }
        }

        // 4. Pass
        if (this.possibleActions.length > 0) {
            this.possibleActions.push({ type: 'PASS', label: '패스' });
            return true;
        }
        return false;
    },

    checkSelfActions: function () {
        this.possibleActions = [];
        const hand = this.p1.hand;

        // 1. Tsumo
        if (YakuLogic.checkYaku(hand)) {
            this.possibleActions.push({ type: 'TSUMO', label: '쯔모' });
        }

        // 2. Riichi
        // Cond: Closed hand (isMenzen), Not already Riichi
        // Rule: "Have 11 tiles" -> Draw 1 -> 12. Discard -> 11.
        // Riichi is declared before discard.
        if (!this.p1.isRiichi && this.p1.isMenzen && hand.length >= 2) {
            // Check if any discard leads to Tenpai
            // We have 12 tiles now (after draw).
            // We need to check if discarding any tile results in a hand that is Tenpai (1 away from win).

            let canRiichi = false;
            // Iterate all tiles in hand to simulate discard
            for (let i = 0; i < hand.length; i++) {
                // Create temp hand without this tile
                const tempHand = [...hand];
                tempHand.splice(i, 1); // Remove 1 tile -> 11 tiles

                if (this.checkTenpai(tempHand)) {
                    canRiichi = true;
                    break;
                }
            }

            if (canRiichi) {
                this.possibleActions.push({ type: 'RIICHI', label: '리치' });
            }
        }

        if (this.possibleActions.length > 0) {
            this.possibleActions.push({ type: 'PASS_SELF', label: '패스' }); // Pass on declaring actions
            // Debug: Manually select CPU
            console.log("Possible self actions:", this.possibleActions.map(a => a.type)); // Added log
            return true;
        }
        return false;
    },

    updateActionSelect: function () {
        const actions = this.possibleActions;
        const btnW = 80;
        const btnH = 40;
        const gap = 10;
        const totalW = actions.length * btnW + (actions.length - 1) * gap;
        const startX = (640 - totalW) / 2;
        const startY = 320;

        // Mouse Input
        const mx = Input.mouseX;
        const my = Input.mouseY;

        // Check hover
        for (let i = 0; i < actions.length; i++) {
            const x = startX + i * (btnW + gap);
            if (mx >= x && mx <= x + btnW && my >= startY && my <= startY + btnH) {
                this.selectedActionIndex = i; // Auto-select on hover
                if (Input.isMouseJustPressed()) {
                    this.executeAction(actions[i]);
                    return;
                }
            }
        }

        // Keyboard Input
        if (Input.isJustPressed(Input.LEFT)) {
            this.selectedActionIndex--;
            if (this.selectedActionIndex < 0) this.selectedActionIndex = this.possibleActions.length - 1;
        } else if (Input.isJustPressed(Input.RIGHT)) {
            this.selectedActionIndex++;
            if (this.selectedActionIndex >= this.possibleActions.length) this.selectedActionIndex = 0;
        }

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.ENTER)) {
            const action = this.possibleActions[this.selectedActionIndex];
            this.executeAction(action);
        }
    },

    executeAction: function (action) {
        console.log(`Executing Action: ${action.type}`);

        if (action.type === 'PASS' || action.type === 'PASS_SELF') {
            // Pass logic
            if (this.currentState === this.STATE_ACTION_SELECT && action.type === 'PASS_SELF') {
                // Return to player turn for discard
                this.currentState = this.STATE_PLAYER_TURN;
            } else {
                // Pass on opponent discard -> Next turn (draw)
                this.turnCount++;
                this.playerDraw();
                // this.currentState = this.STATE_PLAYER_TURN; // playerDraw sets this check
            }
        } else if (action.type === 'PON') {
            console.log("PON implementation pending");
            this.p1.isMenzen = false; // Pon breaks Menzen
            this.turnCount++;
            this.playerDraw();
            this.currentState = this.STATE_PLAYER_TURN;
        } else if (action.type === 'RIICHI') {
            this.p1.isRiichi = true;
            // Play sound? Effect?
            // Go to discard
            this.currentState = this.STATE_PLAYER_TURN;
            console.log("Riichi Declared!");
        } else if (action.type === 'TSUMO') {
            const win = YakuLogic.checkYaku(this.p1.hand);
            if (win) {
                this.winningYaku = win;
                this.cpu.hp = Math.max(0, this.cpu.hp - win.score);
                this.currentState = this.STATE_WIN;
            }
        } else if (action.type === 'RON') {
            const win = YakuLogic.checkYaku([...this.p1.hand, this.discards[this.discards.length - 1]]);
            if (win) {
                this.winningYaku = win;
                this.cpu.hp = Math.max(0, this.cpu.hp - win.score);
                this.currentState = this.STATE_WIN;
            }
        }
    },

    drawActionMenu: function (ctx) {
        const actions = this.possibleActions;
        const btnW = 80;
        const btnH = 40;
        const gap = 10;
        const totalW = actions.length * btnW + (actions.length - 1) * gap;
        const startX = (640 - totalW) / 2;
        const startY = 320;

        actions.forEach((act, i) => {
            const x = startX + i * (btnW + gap);
            const isSelected = (i === this.selectedActionIndex);

            ctx.fillStyle = isSelected ? '#FFFF00' : 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(x, startY, btnW, btnH);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, startY, btnW, btnH);

            ctx.fillStyle = isSelected ? 'black' : 'white';
            ctx.font = BattleConfig.ACTION.buttonFont;
            ctx.textAlign = 'center';
            ctx.fillText(act.label, x + btnW / 2, startY + btnH / 2 + 7);
        });

        ctx.fillStyle = 'white';
        ctx.font = BattleConfig.ACTION.helpFont;
        ctx.textAlign = 'center';
        ctx.fillText("Select Action!", 320, 300);
    },

    drawTile: function (ctx, tile, x, y, w, h) {
        // Just draw the image as requested
        const img = Assets.get(tile.img);
        if (img) {
            ctx.drawImage(img, x, y, w, h);
        } else {
            // Fallback if image missing
            ctx.fillStyle = BattleConfig.FALLBACK.tileBg;
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center'; // Ensure text is centered for fallback
            ctx.font = BattleConfig.FALLBACK.tileTextFont; // Smaller font for fallback
            ctx.fillText(tile.type, x + w / 2, y + h / 2);
        }
    },

    drawBar: function (ctx, x, y, val, max, label) {
        // Bar bg (Removed)
        // ctx.fillStyle = BattleConfig.BARS.BG_COLOR;
        // ctx.fillRect(x, y, BattleConfig.BARS.width, BattleConfig.BARS.height);

        // Bar fill (Pattern)
        const pct = Math.max(0, Math.min(1, val / max));
        const fillW = Math.floor(BattleConfig.BARS.width * pct);

        if (fillW > 0) {
            const barImg = Assets.get(BattleConfig.BARS.img);
            if (barImg) {
                ctx.save();
                // Translate so pattern starts at bar position
                ctx.translate(x, y);
                const pattern = ctx.createPattern(barImg, 'repeat');
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, fillW, BattleConfig.BARS.height);
                ctx.restore();
            } else {
                // Fallback
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(x, y, fillW, BattleConfig.BARS.height);
            }
        }

        // Border
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, BattleConfig.BARS.width, BattleConfig.BARS.height);
    },
    drawUnknownTile: function (ctx, x, y, w, h) {
        // Use pai_uradora.png for hidden dora
        this.drawCardBack(ctx, x, y, w, h, 'tiles/pai_uradora.png');
    },

    drawCardBack: function (ctx, x, y, w, h, assetPath) {
        // Default to back-top if not specified
        const path = assetPath || 'tiles/back-top.png';
        const img = Assets.get(path);

        if (img) {
            ctx.drawImage(img, x, y, w, h);
        } else {
            // Fallback
            ctx.fillStyle = BattleConfig.FALLBACK.cardBackBg;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = BattleConfig.FALLBACK.cardBackStroke;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, w, h);

            // X Pattern
            ctx.beginPath();
            ctx.strokeStyle = BattleConfig.FALLBACK.cardBackPattern;
            ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
            ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
            ctx.stroke();

            // Debug text
            ctx.fillStyle = 'white';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("IMG?", x + w / 2, y + h / 2);
        }
    },

    drawDiscards: function (ctx) {
        const p1Discards = this.discards.filter(d => d.owner === 'p1');
        const cpuDiscards = this.discards.filter(d => d.owner === 'cpu');

        // Draw P1 Discards
        p1Discards.forEach((tile, i) => {
            const row = Math.floor(i / BattleConfig.DISCARDS.rowMax);
            const col = i % BattleConfig.DISCARDS.rowMax;
            const x = BattleConfig.DISCARDS.P1.x + col * (BattleConfig.DISCARDS.tileWidth + BattleConfig.DISCARDS.gap);
            const y = BattleConfig.DISCARDS.P1.y + row * (BattleConfig.DISCARDS.tileHeight + BattleConfig.DISCARDS.gap);
            this.drawTile(ctx, tile, x, y, BattleConfig.DISCARDS.tileWidth, BattleConfig.DISCARDS.tileHeight);
        });

        // Draw CPU Discards
        cpuDiscards.forEach((tile, i) => {
            const row = Math.floor(i / BattleConfig.DISCARDS.rowMax);
            const col = i % BattleConfig.DISCARDS.rowMax;
            const x = BattleConfig.DISCARDS.CPU.x + col * (BattleConfig.DISCARDS.tileWidth + BattleConfig.DISCARDS.gap);
            const y = BattleConfig.DISCARDS.CPU.y + row * (BattleConfig.DISCARDS.tileHeight + BattleConfig.DISCARDS.gap);
            this.drawTile(ctx, tile, x, y, BattleConfig.DISCARDS.tileWidth, BattleConfig.DISCARDS.tileHeight);
        });
    },

    checkTenpai: function (hand) {
        // Hand should be 11 tiles.
        // We try adding every possible tile (13 types).
        // If any addition results in a Win (Yaku), then we are Tenpai.

        for (const type of PaiData.TYPES) {
            // Create a temp tile
            const tile = { type: type.id, color: type.color, img: type.img };

            // Add to hand -> 12 tiles
            const tempHand = [...hand, tile];

            // Check Win
            if (YakuLogic.checkYaku(tempHand)) {
                return true;
            }
        }
        return false;
    }
};

