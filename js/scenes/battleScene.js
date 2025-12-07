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
        hpPath: 'ui/bar_blue.png',
        mpPath: 'ui/bar_yellow.png',
        P1: { x: 41, y: 347 },
        CPU: { x: 459, y: 347 },
        gap: 8, // Gap between HP and MP bars
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
        x: 320, y: 180, // x is now center if align is center
        gap: 5,
        align: 'center',
        tileWidth: 40, // Added missing key
        tileHeight: 53, // Added missing key
        frame: { path: 'ui/dora.png', xOffset: -10, yOffset: -8, align: 'left' }
    },
    INFO: {
        // Explicit coordinates for adjustable layout
        turnLabel: { x: 230, y: 180 },
        turnNumber: { x: 230, y: 200, align: 'center' },
        roundLabel: { x: 420, y: 180 },
        roundNumber: { x: 420, y: 200, align: 'center' },
        roundFont: 'bold 16px "KoddiUDOnGothic-Bold"',
        turnFont: 'bold 16px "KoddiUDOnGothic-Bold"',
        color: 'white',
        stroke: 'black',
        strokeWidth: 3,
        numbers: { path: 'ui/number.png', w: 14, gap: 2 },
        labels: { path: 'ui/turn_round.png' }
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
    STATE_NAGARI: 5,  // Round Draw (Nagari)
    STATE_MATCH_OVER: 6, // Game Over (HP 0)
    STATE_ACTION_SELECT: 7, // Menu for Pon/Ron
    STATE_FX_PLAYING: 8, // New: Block input during FX sequences

    currentState: 0,
    timer: 0,

    sequencing: { active: false, steps: [], currentStep: 0, timer: 0 }, // New: Sequence manager

    playerIndex: 0,
    cpuIndex: 0,

    // Battle Data
    p1: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, hand: [], isRiichi: false },
    cpu: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, hand: [], isRiichi: false, isRevealed: false },

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

        const p1Data = CharacterData.find(c => c.index === this.playerIndex) || CharacterData[this.playerIndex];
        const cpuData = CharacterData.find(c => c.index === this.cpuIndex) || CharacterData[this.cpuIndex];
        console.log(`BattleScene Resolved. P1: ${p1Data ? p1Data.name : 'null'}, CPU: ${cpuData ? cpuData.name : 'null'}`);

        this.activeFX = [];
        this.sequencing = { active: false, steps: [], currentStep: 0, timer: 0 };

        // Init Characters
        this.p1Character = new PortraitCharacter(p1Data, {
            ...BattleConfig.PORTRAIT.P1,
            baseW: BattleConfig.PORTRAIT.baseW,
            baseH: BattleConfig.PORTRAIT.baseH
        }, false);

        // Apply Animation Config if available (P1 = Left)
        if (typeof AnimConfig !== 'undefined' && p1Data && AnimConfig[p1Data.id] && AnimConfig[p1Data.id].L) {
            this.p1Character.setAnimationConfig(AnimConfig[p1Data.id].L);
        }

        this.debugTenpaiStrings = []; // Init
        this.recommendedDiscards = []; // Init logic


        this.cpuCharacter = new PortraitCharacter(cpuData, {
            ...BattleConfig.PORTRAIT.CPU,
            baseW: BattleConfig.PORTRAIT.baseW,
            baseH: BattleConfig.PORTRAIT.baseH
        }, true);

        // Apply Animation Config if available (CPU = Right)
        if (typeof AnimConfig !== 'undefined' && cpuData && AnimConfig[cpuData.id] && AnimConfig[cpuData.id].R) {
            this.cpuCharacter.setAnimationConfig(AnimConfig[cpuData.id].R);
        }

        // Ensure Expressions are Reset
        if (this.p1Character) this.p1Character.setState('idle');
        if (this.cpuCharacter) this.cpuCharacter.setState('idle');

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

    playFX: function (type, x, y, options = {}) {
        // Default duration reduced to 45 frames (approx 0.75s at 60fps)
        const img = Assets.get(type);
        if (img) {
            const life = options.life || 45;
            const scale = options.scale || 1.0;
            const slideFrom = options.slideFrom;

            let startX = x;
            let endX = x;
            let startY = y;
            let endY = y;

            if (slideFrom === 'LEFT') {
                startX = -img.width * scale; // Start off-screen left
                endX = x;
            } else if (slideFrom === 'RIGHT') {
                startX = 640 + img.width * scale; // Start off-screen right
                endX = x;
            } else if (slideFrom === 'TOP') {
                startY = -img.height * scale; // Start off-screen top
                endY = y;
            } else if (slideFrom === 'BOTTOM') {
                startY = 480 + img.height * scale; // Start off-screen bottom
                endY = y;
            }

            this.activeFX.push({
                type: type, img: img,
                x: startX, y: startY,
                startX: startX, startY: startY,
                endX: endX, endY: endY,
                timer: 0, life: life, maxLife: life,
                scale: scale, alpha: 0,
                slideFrom: slideFrom
            });
        }
    },

    startWinSequence: function (type, who, score) {
        console.log(`Starting Win Sequence: ${type} by ${who}`);

        // Sort CPU Hand if revealed
        if (who === 'CPU' || type === 'RON') { // If CPU wins or we win (Ron from CPU?), usually we only show CPU hand if WE win (Ron/Tsumo) or CPU wins.
            this.sortHand(this.cpu.hand);
        } else {
            this.sortHand(this.cpu.hand); // Always sort just in case
        }

        // Set Expressions
        if (who === 'P1') {
            this.p1Character.setState('smile');
            this.cpuCharacter.setState('shocked');
        } else {
            this.p1Character.setState('shocked');
            this.cpuCharacter.setState('smile');
        }

        const fxType = type === 'TSUMO' ? 'fx/tsumo' : 'fx/ron'; // Adjust for asset names if needed. User asked "Riichi, Tsumo, Ron".

        this.currentState = this.STATE_FX_PLAYING;
        this.sequencing = {
            active: true,
            timer: 0,
            currentStep: 0,
            steps: [
                { type: 'FX', asset: fxType, x: 320, y: 240 },
                { type: 'WAIT', duration: 60 },
                { type: 'STATE', state: (who === 'P1' ? this.STATE_WIN : this.STATE_LOSE), score: score }
            ] // Note: score processing might need to happen before or passed along
        };
    },

    startNagariSequence: function () {
        console.log("Starting Nagari Sequence");
        this.currentState = this.STATE_FX_PLAYING;

        this.sortHand(this.cpu.hand); // Sort CPU hand

        // Calculate P1 Tenpai/Noten
        const p1Tenpai = this.checkTenpai(this.p1.hand);
        const cpuTenpai = this.checkTenpai(this.cpu.hand);
        const p1Fx = p1Tenpai ? 'fx/tenpai' : 'fx/noten';
        const cpuFx = cpuTenpai ? 'fx/tenpai' : 'fx/noten';

        // Positions
        const p1X = BattleConfig.PORTRAIT.P1.x + BattleConfig.PORTRAIT.P1.w / 2;
        const p1Y = BattleConfig.PORTRAIT.P1.y + BattleConfig.PORTRAIT.P1.h / 2;
        const cpuX = BattleConfig.PORTRAIT.CPU.x + BattleConfig.PORTRAIT.CPU.w / 2;
        const cpuY = BattleConfig.PORTRAIT.CPU.y + BattleConfig.PORTRAIT.CPU.h / 2;

        this.sequencing = {
            active: true,
            timer: 0,
            currentStep: 0,
            steps: [
                { type: 'FX', asset: 'fx/nagari', x: 320, y: 240 },
                { type: 'WAIT', duration: 60 },
                { type: 'REVEAL_HAND' }, // Reveal CPU hand
                {
                    type: 'FX_PARALLEL', items: [
                        { asset: p1Fx, x: p1X, y: p1Y, slideFrom: 'LEFT' },
                        { asset: cpuFx, x: cpuX, y: cpuY, slideFrom: 'RIGHT' }
                    ]
                },
                { type: 'WAIT', duration: 90 }, // Longer wait for status check
                { type: 'STATE_NAGARI' } // Finally show result overlay
            ]
        };
    },

    updateSequence: function () {
        if (!this.sequencing.active) return;

        const step = this.sequencing.steps[this.sequencing.currentStep];
        if (!step) {
            this.sequencing.active = false;
            return;
        }

        if (step.type === 'WAIT') {
            this.sequencing.timer++;
            if (this.sequencing.timer >= step.duration) {
                this.sequencing.timer = 0;
                this.sequencing.currentStep++;
            }
        } else if (step.type === 'FX') {
            this.playFX(step.asset, step.x, step.y, { scale: step.scale, slideFrom: step.slideFrom });
            this.sequencing.currentStep++;
        } else if (step.type === 'FX_PARALLEL') {
            step.items.forEach(item => {
                this.playFX(item.asset, item.x, item.y, { scale: item.scale, slideFrom: item.slideFrom });
            });
            this.sequencing.currentStep++;
        } else if (step.type === 'REVEAL_HAND') {
            this.cpu.isRevealed = true;
            this.sequencing.currentStep++;
        } else if (step.type === 'STATE') {
            this.currentState = step.state;

            // Set Result Message
            const winType = (step.state === this.STATE_WIN) ? "WIN" : "LOSE";
            // Use score if provided, else default
            const scoreMsg = step.score ? `Score: ${step.score}` : "";
            this.drawResultMsg = `${winType}\n${scoreMsg}\nPress Space to Continue`;

            this.sequencing.active = false;
        } else if (step.type === 'STATE_NAGARI') {
            // FIX: Must set state to NAGARI to allow input (Next Round)
            this.currentState = this.STATE_NAGARI;
            this.calculateTenpaiDamage(true); // skipFX = true
            this.sequencing.active = false;
        }
    },
    updateFX: function () {
        for (let i = this.activeFX.length - 1; i >= 0; i--) {
            const fx = this.activeFX[i];
            fx.life--;

            // Animation Logic
            // Fade In (0-10)
            const fadeInDur = 10;
            const progress = (fx.maxLife - fx.life) / fx.maxLife; // 0.0 to 1.0

            if (fx.maxLife - fx.life <= fadeInDur) {
                fx.alpha = (fx.maxLife - fx.life) / fadeInDur;
            }

            // Slide Logic
            if (fx.slideFrom) {
                // Easing? Linear for now.
                // Interpolate x from startX to endX
                // progress: 0 (Start) -> 1 (End)
                // We want slide to finish quickly? Or over whole duration?
                // User said "slide in... same duration". Let's slide over first 20 frames?
                // Or whole duration? Usually "slide in" implies entry.
                // Let's slide over the first 0.3 seconds (18 frames).
                const slideDur = 20;
                const p = Math.min(1, (fx.maxLife - fx.life) / slideDur);
                // Ease out?
                const ease = p * (2 - p); // Quad ease out
                fx.x = fx.startX + (fx.endX - fx.startX) * ease;
                fx.y = fx.startY + (fx.endY - fx.startY) * ease; // Also slide Y
            }
            // Fade Out (Last 20 frames)
            else if (fx.life < 20) {
                fx.alpha = fx.life / 20;
            } else {
                fx.alpha = 1.0;
            }

            if (fx.life <= 0) {
                this.activeFX.splice(i, 1);
            }
        }
    },

    drawFX: function (ctx) {
        if (!this.activeFX) return;
        ctx.save();
        this.activeFX.forEach(fx => {
            if (fx.img) {
                ctx.globalAlpha = fx.alpha;
                const w = fx.img.width * fx.scale;
                const h = fx.img.height * fx.scale;
                ctx.drawImage(fx.img, fx.x - w / 2, fx.y - h / 2, w, h);
            }
        });
        ctx.restore();
    },

    nextRound: function () {
        console.log("Starting Next Round...");
        this.currentRound++;
        this.startRound();
    },

    matchOver: function (winner) {
        console.log(`Match Over! Winner: ${winner}`);
        if (winner === 'P1') {
            // Add current CPU to defeated list
            this.defeatedOpponents.push(this.cpuIndex);

            // SPECIAL: If we just beat Mayu (True Ending Boss)
            // Check if CPU was Mayu
            const mayuInfo = CharacterData.find(c => c.id === 'mayu');
            if (mayuInfo && (this.cpuIndex === mayuInfo.index || this.cpuIndex === 6)) { // 6 is Mayu index
                console.log("TRUE ENDING COMPLETED!");
                // Return to Title (or show another ending screen if we had one)
                Game.changeScene(TitleScene);
                return;
            }

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
                defeatedOpponents: this.defeatedOpponents,
                hasContinued: true // Mark continue used
            });
            // Update Global Continue Count
            Game.continueCount++;
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
        this.cpu.isRevealed = false; // Reset reveal status
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

        // Reset Character Expressions
        if (this.p1Character) this.p1Character.setState('idle');
        if (this.cpuCharacter) this.cpuCharacter.setState('idle');


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

    drawNumber: function (ctx, number, x, y, align = 'center', pad = 0) {
        let str = number.toString();
        // Zero Padding if requested (e.g. pad=2, number=1 -> "01")
        if (pad > 0 && str.length < pad) {
            str = str.padStart(pad, '0');
        }

        const numW = BattleConfig.INFO.numbers.w;
        const gap = BattleConfig.INFO.numbers.gap;
        const img = Assets.get(BattleConfig.INFO.numbers.path);

        if (!img) return;

        // Calculate total width for alignment
        const totalW = str.length * numW + (str.length - 1) * gap;
        let startX = x;
        if (align === 'center') startX -= totalW / 2;
        else if (align === 'right') startX -= totalW;

        for (let i = 0; i < str.length; i++) {
            const digit = parseInt(str[i]);
            // Source X: digit * (14 + 2)
            const sx = digit * (numW + gap);
            ctx.drawImage(img,
                sx, 0, numW, img.height,
                startX + i * (numW + gap), y, numW, img.height
            );
        }

        return totalW; // Return width if needed for chaining
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

        // Update Characters
        if (this.p1Character) this.p1Character.update();
        if (this.cpuCharacter) this.cpuCharacter.update();

        // Update FX
        this.updateFX();

        // Hover Check (Mouse + Keyboard)
        // Only reset if we change states? Or ensure valid?
        if (this.hoverIndex === undefined) this.hoverIndex = 0;

        if (this.currentState === this.STATE_PLAYER_TURN) {
            // 1. Mouse Interaction
            const mx = Input.mouseX;
            const my = Input.mouseY;
            const tileW = BattleConfig.HAND.tileWidth;
            const tileH = BattleConfig.HAND.tileHeight;
            const gap = BattleConfig.HAND.gap;
            const handSize = this.p1.hand.length;
            const totalW = handSize * (tileW + gap);
            const startX = (640 - totalW) / 2;
            const handY = BattleConfig.HAND.y;

            // Only update hover from mouse if within bounds
            if (my >= handY && my <= handY + tileH) {
                if (mx >= startX && mx <= startX + totalW) {
                    const index = Math.floor((mx - startX) / (tileW + gap));
                    if (index >= 0 && index < handSize) {
                        this.hoverIndex = index;
                    }
                }
            }

            // 2. Keyboard Interaction
            if (Input.isJustPressed(Input.LEFT)) {
                this.hoverIndex--;
                if (this.hoverIndex < 0) this.hoverIndex = handSize - 1;
            }
            if (Input.isJustPressed(Input.RIGHT)) {
                this.hoverIndex++;
                if (this.hoverIndex >= handSize) this.hoverIndex = 0;
            }

            // Safety clamp
            if (this.hoverIndex >= handSize) this.hoverIndex = handSize - 1;
            if (this.hoverIndex < 0) this.hoverIndex = 0;
        }

        switch (this.currentState) {
            case this.STATE_INIT:
                if (this.timer > 60) { // Slight delay for Round Start text
                    this.playerDraw();
                    // playerDraw sets state and hoverIndex
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

                if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE) || Input.isMouseJustPressed()) {

                    if (this.hoverIndex !== -1 && this.hoverIndex < this.p1.hand.length) {
                        // Riichi Input Lock
                        if (this.p1.isRiichi && this.riichiTargetIndex !== undefined && this.riichiTargetIndex !== -1) {
                            if (this.hoverIndex !== this.riichiTargetIndex) {
                                console.log("Blocked invalid Riichi discard.");
                                return;
                            }
                        }

                        // Discard
                        this.discardTile(this.hoverIndex);
                    }
                }
                break;

            case this.STATE_ACTION_SELECT:
                if (this.actionTimer > 0) this.actionTimer--;
                this.updateActionSelect();
                break;
            case this.STATE_FX_PLAYING:
                this.updateSequence();
                break;

            case this.STATE_CPU_TURN:
                if (this.timer === 30) { // Delay before CPU acts
                    this.cpuDraw();
                }
                break;

            case this.STATE_WIN:
            case this.STATE_LOSE:
            case this.STATE_NAGARI:
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

        if (this.currentState < this.STATE_WIN && this.currentState !== this.STATE_INIT) {
            // Optimization: value check doesn't need to be every frame
            if (this.timer % 30 === 0) {
                this.checkRoundEnd();
            }
        }
    },

    // Assuming a 'draw' function exists where these calls should be placed.
    // This snippet is placed here based on the provided context,
    // assuming it's the end of a 'draw' function.
    draw: function (ctx) {
        // ... existing draw logic ...

        // Result Overlay
        if (this.currentState >= this.STATE_WIN) {
            this.drawResult(ctx);
        }

        // Draw FX (Top Level)
        this.drawFX(ctx);
    },

    drawResult: function (ctx) {
        // Overlay
        ctx.save();
        ctx.fillStyle = BattleConfig.OVERLAY.bgColor;
        ctx.fillRect(0, 0, 640, 480);

        // Text
        if (this.drawResultMsg) {
            ctx.textAlign = 'center';
            ctx.fillStyle = BattleConfig.OVERLAY.resultColor;

            const lines = this.drawResultMsg.split('\n');
            const totalHeight = lines.length * 40; // Approx line height
            let startY = 240 - (totalHeight / 2);

            lines.forEach((line, i) => {
                if (i === 0) ctx.font = BattleConfig.OVERLAY.resultFont;
                else if (i === 1) ctx.font = BattleConfig.OVERLAY.subFont;
                else ctx.font = BattleConfig.OVERLAY.infoFont;

                ctx.fillText(line, 320, startY + (i * 50));
            });
        }

        ctx.restore();
    },

    checkRoundEnd: function () {
        // 1. Deck Exhaustion
        if (this.deck.length === 0) {
            this.startNagariSequence();
            console.log("Deck Empty -> NAGARI Sequence");
            return;
        }

        // 2. Turn Limit
        if (this.turnCount > 20) {
            this.startNagariSequence();
            console.log("Turn Limit -> NAGARI Sequence");
            return;
        }
    },

    calculateTenpaiDamage: function (skipFX) {
        const p1Tenpai = this.checkTenpai(this.p1.hand);
        const cpuTenpai = this.checkTenpai(this.cpu.hand);

        // Status String
        const p1Status = p1Tenpai ? "텐파이" : "노텐";
        const cpuStatus = cpuTenpai ? "텐파이" : "노텐";
        let damageMsg = "";

        if (p1Tenpai && !cpuTenpai) {
            this.cpu.hp -= 1000;
            damageMsg = "CPU -1000";
        } else if (!p1Tenpai && cpuTenpai) {
            this.p1.hp -= 1000;
            damageMsg = "Player -1000";
        } else {
            damageMsg = "No Damage";
        }

        // e.g. "나가리\nP1: 텐파이 vs CPU: 노텐\nCPU -1000"
        this.drawResultMsg = `나가리\nP1: ${p1Status} vs CPU: ${cpuStatus}\n${damageMsg}`;
        console.log(this.drawResultMsg);

        // FX Trigger
        if (!skipFX) {
            this.playFX('fx/nagari', 320, 240); // Center

            const p1X = BattleConfig.PORTRAIT.P1.x + BattleConfig.PORTRAIT.P1.w / 2;
            const p1Y = BattleConfig.PORTRAIT.P1.y + BattleConfig.PORTRAIT.P1.h / 2;
            const cpuX = BattleConfig.PORTRAIT.CPU.x + BattleConfig.PORTRAIT.CPU.w / 2;
            const cpuY = BattleConfig.PORTRAIT.CPU.y + BattleConfig.PORTRAIT.CPU.h / 2;

            const p1Fx = p1Tenpai ? 'fx/tenpai' : 'fx/noten';
            const cpuFx = cpuTenpai ? 'fx/tenpai' : 'fx/noten';

            this.playFX(p1Fx, p1X, p1Y, { slideFrom: 'LEFT' });
            this.playFX(cpuFx, cpuX, cpuY, { slideFrom: 'RIGHT' });
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
        // Check End Conditions First
        this.checkRoundEnd();

        // Block if we transitioned to an End State or FX Logic
        if (this.currentState === this.STATE_FX_PLAYING ||
            this.currentState === this.STATE_NAGARI ||
            this.currentState === this.STATE_MATCH_OVER) {
            return;
        }

        const t = this.drawTiles(1);
        if (t.length > 0) {
            const drawnTile = t[0];
            console.log("Player Draws:", drawnTile.type); // Log
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
                this.hoverIndex = this.p1.hand.length - 1; // Default cursor to new tile
                this.timer = 0;
            }
        }
    },

    cpuDraw: function () {
        const t = this.drawTiles(1);
        if (t.length > 0) {
            console.log("CPU Draws:", t[0].type); // Log
            this.cpu.hand.push(t[0]);
        }

        // CPU AI Logic
        const difficulty = AILogic.DIFFICULTY.NORMAL; // Default to Normal for now

        // 1. Check Tsumo
        if (YakuLogic.checkYaku(this.cpu.hand)) {
            console.log("CPU Tsumo!");
            this.winningYaku = YakuLogic.checkYaku(this.cpu.hand);
            this.p1.hp = Math.max(0, this.p1.hp - this.winningYaku.score);
            this.startWinSequence('TSUMO', 'CPU', this.winningYaku.score);
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
                this.playFX('fx/riichi', 320, 240);
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
        console.log(`CPU discards index ${index} `);
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
        console.log(`Player discards index ${index}: ${this.p1.hand[index].type}`); // Log
        const discarded = this.p1.hand.splice(index, 1)[0];
        discarded.owner = 'p1'; // Mark owner
        this.discards.push(discarded);

        console.log("DISCARDS:", this.discards.map(d => d.type).join(", ")); // Log discards

        this.currentState = this.STATE_CPU_TURN;
        this.timer = 0;
        this.hoverIndex = -1;
    },



    draw: function (ctx) {
        // Disable interpolation for pixel art / precise layering
        ctx.imageSmoothingEnabled = false;

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

        // 2. Portraits
        if (this.p1Character) this.p1Character.draw(ctx);
        if (this.cpuCharacter) this.cpuCharacter.draw(ctx);

        // 3. UI Background (Over Characters)
        const uiBg = Assets.get(BattleConfig.UI_BG.path);
        if (uiBg) ctx.drawImage(uiBg, 0, 0);


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

            // Reveal hand if CPU wins (STATE_LOSE for player) OR Nagari OR Revealed flag
            if (this.currentState === this.STATE_LOSE || this.currentState === this.STATE_NAGARI || this.cpu.isRevealed) {
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
            // Draw Side ALWAYS
            const sideImg = Assets.get('tiles/side-bottom.png');
            if (sideImg) {
                ctx.drawImage(sideImg, x, handY + yOffset + tileH, tileW, sideImg.height);
            }

            this.drawTile(ctx, tile, x, handY + yOffset, tileW, tileH);

            if (isHover) {
                const cursorImg = Assets.get('ui/cursor_yellow.png');
                if (cursorImg) {
                    // Draw cursor on top (centered or same coords?)
                    // "크기 그대로" -> Use image dimensions, or scale to tile?
                    // "테두리가 표시되고 있는데... 이 이미지로 대체" -> Likely a bracket or highlight frame.
                    // Assuming it's a frame for the tile.
                    // Let's draw it at x, y + yOffset? Or centered?
                    // If it has diff size, we might need to center it.
                    // Safe bet: Draw at x, y + yOffset (top-left of the tile)
                    // But if image is bigger than tile (e.g. 64x64 vs 40x53), it will look off if not centered.
                    // Let's assume we center it on the tile.
                    const cx = x + tileW / 2 - cursorImg.width / 2;
                    // Align cursor bottom to the bottom of the side image
                    // Side image bottom Y = (handY + yOffset + tileH) + sideImg.height
                    // Cursor bottom Y = cy + cursorImg.height
                    // So cy = (handY + yOffset + tileH + sideH) - cursorImg.height
                    // We assume sideImg exists as it is drawn above.
                    const sideH = sideImg ? sideImg.height : 0;
                    const cy = (handY + yOffset + tileH + sideH) - cursorImg.height;
                    ctx.drawImage(cursorImg, cx, cy);
                } else {
                    // Fallback
                    ctx.strokeStyle = BattleConfig.HAND.hoverColor;
                    ctx.lineWidth = BattleConfig.HAND.hoverWidth;
                    ctx.strokeRect(x, handY + yOffset, tileW, tileH);
                }
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

        // 7. Info (Round, Turn, Dora) - Moved to end to be on top of characters/hands
        ctx.fillStyle = BattleConfig.INFO.color;
        ctx.strokeStyle = BattleConfig.INFO.stroke;
        ctx.lineWidth = BattleConfig.INFO.strokeWidth;
        ctx.textAlign = 'center';
        ctx.font = BattleConfig.INFO.roundFont;

        const labelImg = Assets.get(BattleConfig.INFO.labels.path);
        if (labelImg) {
            const turnW = 68;
            const gap = 2;
            const roundX = turnW + gap;
            const roundW = labelImg.width - roundX;
            const h = labelImg.height;

            // ROUND Label
            ctx.drawImage(labelImg, roundX, 0, roundW, h, BattleConfig.INFO.roundLabel.x - roundW / 2, BattleConfig.INFO.roundLabel.y, roundW, h);
            // Round Number
            this.drawNumber(ctx, this.currentRound, BattleConfig.INFO.roundNumber.x, BattleConfig.INFO.roundNumber.y, BattleConfig.INFO.roundNumber.align, 2);
            // TURN Label
            ctx.drawImage(labelImg, 0, 0, turnW, h, BattleConfig.INFO.turnLabel.x - turnW / 2, BattleConfig.INFO.turnLabel.y, turnW, h);
            // Turn Number
            this.drawNumber(ctx, this.turnCount, BattleConfig.INFO.turnNumber.x, BattleConfig.INFO.turnNumber.y, BattleConfig.INFO.turnNumber.align, 2);
        }

        // Dora
        if (this.doras[0] || this.doras[1]) {
            const totalW = (BattleConfig.DORA.tileWidth * 2) + BattleConfig.DORA.gap;
            let startX = BattleConfig.DORA.x;
            if (BattleConfig.DORA.align === 'center') startX -= totalW / 2;
            else if (BattleConfig.DORA.align === 'right') startX -= totalW;

            if (this.doras[0]) {
                const tx = startX;
                const ty = BattleConfig.DORA.y;
                const frameImg = Assets.get(BattleConfig.DORA.frame.path);
                if (frameImg) {
                    let fx = tx + BattleConfig.DORA.frame.xOffset;
                    let fy = ty + BattleConfig.DORA.frame.yOffset;
                    if (BattleConfig.DORA.frame.align === 'center') {
                        fx -= frameImg.width / 2;
                        fy -= frameImg.height / 2;
                    } else if (BattleConfig.DORA.frame.align === 'right') {
                        fx -= frameImg.width;
                    }
                    ctx.drawImage(frameImg, fx, fy);
                }
                this.drawTile(ctx, this.doras[0], tx, ty, BattleConfig.DORA.tileWidth, BattleConfig.DORA.tileHeight);
            }
            if (this.doras[1]) {
                const tx = startX + BattleConfig.DORA.tileWidth + BattleConfig.DORA.gap;
                const ty = BattleConfig.DORA.y;
                this.drawUnknownTile(ctx, tx, ty, BattleConfig.DORA.tileWidth, BattleConfig.DORA.tileHeight);
            }
        }


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
                msg = "NAGARI";
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

        // Draw FX (Top Level)
        this.drawFX(ctx);

        // Debug: Draw Potential Yaku
        if (this.debugTenpaiStrings && this.debugTenpaiStrings.length > 0) {
            console.log("Drawing Debug Info:", this.debugTenpaiStrings[0], "State:", this.currentState);
            if (this.currentState === this.STATE_ACTION_SELECT) {
                ctx.fillStyle = '#FFFF00'; // Bright Yellow
                ctx.font = 'bold 20px Arial'; // Safe font, larger
                ctx.textAlign = 'center';

            }
        }

        // Draw Recommended Riichi Discards - REMOVED
        /*
        if (this.recommendedDiscards && this.recommendedDiscards.length > 0 && this.currentState === this.STATE_ACTION_SELECT) {
            const tileW = BattleConfig.HAND.tileWidth;
            const gap = BattleConfig.HAND.gap;
            const totalW = this.p1.hand.length * (tileW + gap);
            // const pStartX = (640 - totalW) / 2; // Not needed, we just need the end
            // Center calculation:
            const pStartX = (640 - totalW) / 2;
            const endX = pStartX + totalW;

            const startX = endX + 20; // 20px gap from hand
            const y = BattleConfig.HAND.y;

            this.recommendedDiscards.forEach((tile, i) => {
                ctx.save();
                ctx.globalAlpha = 0.6; // Make it ghost-like
                this.drawTile(ctx, tile, startX + i * (tileW + 5), y, tileW, BattleConfig.HAND.tileHeight);
                ctx.restore();

                // Red Arrow (Solid)
                ctx.fillStyle = 'red';
                ctx.beginPath();
                const tx = startX + i * (tileW + 5);
                const cx = tx + tileW / 2;
                ctx.moveTo(cx, y - 10);
                ctx.lineTo(cx - 5, y - 20);
                ctx.lineTo(cx + 5, y - 20);
                ctx.fill();
            });
        }
        */
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
            const ponAction = { type: 'PON', label: '펑', targetTile: discardedTile };
            this.possibleActions.push(ponAction);
        }

        // 3. Check RON (Win)
        // Rule: Ron is allowed ONLY if Riichi is declared (User Requirement)
        // Since Pon disables Riichi, this effectively disables Ron after Pon.
        const tempHand = [...hand, discardedTile];
        if (this.p1.isRiichi && YakuLogic.checkYaku(tempHand)) {
            this.possibleActions.push({ type: 'RON', label: '론' });
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

                // Debug: Calculate potential Yaku
                // We need to re-scan to get DETAILS
                // Find WHICH discard allows Tenpai
                const debugInfo = [];
                const validDiscards = [];
                for (let i = 0; i < hand.length; i++) {
                    const temp = [...hand];
                    temp.splice(i, 1);
                    const yakus = this.checkTenpai(temp, true);
                    if (yakus && yakus.length > 0) {
                        debugInfo.push(`Discard [${hand[i].type}]: ${yakus.join(", ")}`);
                        validDiscards.push(hand[i]);
                    }
                }
                this.debugTenpaiStrings = debugInfo;
                this.recommendedDiscards = validDiscards;
                console.log("Debug Tenpai Strings:", this.debugTenpaiStrings);
            } else {
                this.debugTenpaiStrings = [];
                this.recommendedDiscards = [];
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
        console.log(`Executing Action: ${action.type} `);

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
            console.log("PON Action Triggered");
            this.playFX('fx/pon', 320, 240);

            // 1. Get Discarded Tile
            const tile = this.discards.pop();
            if (tile) {
                tile.owner = 'p1';
                this.p1.hand.push(tile);
            }
            // 2. State Update
            this.p1.isMenzen = false; // Pon breaks Menzen
            this.turnCount++; // Turn advances? Or just action? Pon counts as turn start.

            this.sortHand(this.p1.hand); // Sort

            // 3. Go to Discard (Do NOT Draw)
            this.currentState = this.STATE_PLAYER_TURN;
            this.timer = 0;
            this.hoverIndex = this.p1.hand.length - 1;

        } else if (action.type === 'RIICHI') {
            this.p1.isRiichi = true;
            this.playFX('fx/riichi', 320, 240);

            // Expression: Smile -> Idle
            this.p1Character.setState('smile');
            setTimeout(() => {
                if (this.p1Character) this.p1Character.setState('idle');
            }, 1000); // 60 frames approx

            // Logic:
            // Find valid discard for Riichi (move to end)
            // ... Identify valid discards
            const hand = this.p1.hand;
            let targetIdx = -1;

            for (let i = 0; i < hand.length; i++) {
                const temp = [...hand];
                temp.splice(i, 1);
                if (this.checkTenpai(temp, false)) { // Just check if it leads to Tenpai
                    targetIdx = i;
                    break;
                }
            }

            if (targetIdx !== -1) {
                // Move tile at targetIdx to end
                const tile = hand.splice(targetIdx, 1)[0];
                hand.push(tile);

                this.lastDrawGroupSize = 1; // Force visual gap
                this.riichiTargetIndex = hand.length - 1; // Strict target
            } else {
                this.riichiTargetIndex = -1; // Should not happen if Riichi was allowed
            }

            // Go to discard
            this.currentState = this.STATE_PLAYER_TURN;
            console.log("Riichi Declared! Target Index:", this.riichiTargetIndex);
        } else if (action.type === 'TSUMO') {
            const win = YakuLogic.checkYaku(this.p1.hand);
            if (win) {
                this.winningYaku = win;
                this.cpu.hp = Math.max(0, this.cpu.hp - win.score);
                this.startWinSequence('TSUMO', 'P1', win.score);
            }
        } else if (action.type === 'RON') {
            const win = YakuLogic.checkYaku([...this.p1.hand, this.discards[this.discards.length - 1]]);
            if (win) {
                this.winningYaku = win;
                this.cpu.hp = Math.max(0, this.cpu.hp - win.score);
                this.startWinSequence('RON', 'P1', win.score);
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



        // Draw Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, BattleConfig.BARS.width, BattleConfig.BARS.height);

        if (fillW > 0) {
            const path = (label === 'HP') ? BattleConfig.BARS.hpPath : BattleConfig.BARS.mpPath;
            const barImg = Assets.get(path);
            if (barImg) {
                // Draw Image Cropped
                ctx.drawImage(barImg,
                    0, 0, barImg.width * pct, barImg.height,
                    x, y, fillW, BattleConfig.BARS.height
                );
            } else {
                // Fallback
                ctx.fillStyle = (label === 'HP') ? '#ff4d4d' : '#4d4dff';
                ctx.fillRect(x, y, fillW, BattleConfig.BARS.height);
            }
        }

        // Border - Removed as per request
        // ctx.strokeStyle = 'black';
        // ctx.lineWidth = 2;
        // ctx.strokeRect(x, y, BattleConfig.BARS.width, BattleConfig.BARS.height);
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

            const isLast = (tile === this.discards[this.discards.length - 1]);
            if (isLast) {
                // Draw Larger (Hand Size)
                const w = BattleConfig.HAND.tileWidth;
                const h = BattleConfig.HAND.tileHeight;
                // Center on the slot
                const cx = x + (BattleConfig.DISCARDS.tileWidth - w) / 2;
                const cy = y + (BattleConfig.DISCARDS.tileHeight - h) / 2;

                this.drawTile(ctx, tile, cx, cy, w, h);
                // Optional: Highlight? User didn't ask, but size diff is the main request.
            } else {
                this.drawTile(ctx, tile, x, y, BattleConfig.DISCARDS.tileWidth, BattleConfig.DISCARDS.tileHeight);
            }
        });

        // Draw CPU Discards
        cpuDiscards.forEach((tile, i) => {
            const row = Math.floor(i / BattleConfig.DISCARDS.rowMax);
            const col = i % BattleConfig.DISCARDS.rowMax;
            const x = BattleConfig.DISCARDS.CPU.x + col * (BattleConfig.DISCARDS.tileWidth + BattleConfig.DISCARDS.gap);
            const y = BattleConfig.DISCARDS.CPU.y + row * (BattleConfig.DISCARDS.tileHeight + BattleConfig.DISCARDS.gap);

            const isLast = (tile === this.discards[this.discards.length - 1]);
            if (isLast) {
                // Draw Larger (Hand Size)
                const w = BattleConfig.HAND.tileWidth;
                const h = BattleConfig.HAND.tileHeight;
                // Center on the slot
                const cx = x + (BattleConfig.DISCARDS.tileWidth - w) / 2;
                const cy = y + (BattleConfig.DISCARDS.tileHeight - h) / 2;

                this.drawTile(ctx, tile, cx, cy, w, h);
            } else {
                this.drawTile(ctx, tile, x, y, BattleConfig.DISCARDS.tileWidth, BattleConfig.DISCARDS.tileHeight);
            }
        });
    },

    checkTenpai: function (hand, returnDetails) {
        // Hand should be 11 tiles.
        // We try adding every possible tile (13 types).
        // If any addition results in a Win (Yaku), then we are Tenpai.
        const potentialYakus = new Set();
        let isTenpai = false;

        for (const type of PaiData.TYPES) {
            // Create a temp tile
            const tile = { type: type.id, color: type.color, img: type.img };

            // Add to hand -> 12 tiles
            const tempHand = [...hand, tile];

            // Check Win
            const win = YakuLogic.checkYaku(tempHand);
            if (win) {
                isTenpai = true;
                if (returnDetails) {
                    potentialYakus.add(win.name);
                } else {
                    return true; // Return early if we don't need details
                }
            }
        }

        if (returnDetails && isTenpai) {
            return Array.from(potentialYakus);
        }

        return isTenpai;
    }
};

