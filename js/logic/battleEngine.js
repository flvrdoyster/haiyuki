// Battle UI Configuration is now in js/data/battleUIConfig.js

const BattleEngine = {
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
    STATE_BATTLE_MENU: 9, // New: Battle Menu Overlay

    currentState: 0,
    timer: 0,
    stateTimer: 0,
    lastState: -1,

    calculateScore: function (baseScore, isMenzen) {
        let score = baseScore;
        // Open Hand Penalty: 75% Score (3/4)
        // Not cumulative, applies once if hand is not Menzen.
        if (!isMenzen) {
            score = Math.floor(baseScore * 0.75);
        }
        // Round to nearest 10
        return Math.round(score / 10) * 10;
    },

    sequencing: { active: false, steps: [], currentStep: 0, timer: 0 },

    showPopup: function (type) {
        const conf = BattleUIConfig.POPUP;
        const asset = `fx/${type.toLowerCase()}`;
        console.log(`Showing Popup: ${type} at ${conf.x}, ${conf.y}`);
        this.playFX(asset, conf.x, conf.y);
    },

    playerIndex: 0,
    cpuIndex: 0,

    // Battle Data
    // Battle Data
    p1: { hp: BattleUIConfig.RULES.INITIAL_HP, maxHp: BattleUIConfig.RULES.INITIAL_HP, mp: 100, maxMp: 100, hand: [], openSets: [], isRiichi: false },
    cpu: { hp: BattleUIConfig.RULES.INITIAL_HP, maxHp: BattleUIConfig.RULES.INITIAL_HP, mp: 100, maxMp: 100, hand: [], openSets: [], isRiichi: false, isRevealed: false },

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

    // Config for Battle Menu
    // Action Logic
    possibleActions: [], // { type: 'PON', tile: ... }
    actionTimer: 0,
    selectedActionIndex: 0,

    // Config for Battle Menu
    selectedMenuIndex: 0,

    init: function (data) {
        // Prevent Context Menu on Canvas (Right Click)
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.oncontextmenu = (e) => {
                e.preventDefault();
                this.toggleBattleMenu();
            };
        }

        // ... (rest of init)
        this.playerIndex = data.playerIndex || 0;
        this.cpuIndex = data.cpuIndex || 0;
        console.log(`BattleScene Init. P1 Index: ${this.playerIndex}, CPU Index: ${this.cpuIndex}`);
        console.log(`CharacterData Length: ${CharacterData.length}`);
        CharacterData.forEach((c, i) => console.log(`[${i}] ${c.name} (${c.id})`));

        const p1Data = CharacterData.find(c => c.index === this.playerIndex) || CharacterData[this.playerIndex];
        const cpuData = CharacterData.find(c => c.index === this.cpuIndex) || CharacterData[this.cpuIndex];
        console.log(`BattleScene Resolved. P1: ${p1Data ? p1Data.name : 'null'}, CPU: ${cpuData ? cpuData.name : 'null'}`);

        // Construct Dynamic Battle Menu
        this.menuItems = [
            '자동 선택',   // Auto-select
            '다시 시작'     // Revert
        ];
        // Add Character Skills
        if (p1Data && p1Data.skills) {
            this.menuItems.push(...p1Data.skills);
        }
        // Add System Actions
        this.menuItems.push('도움말');

        this.activeFX = [];
        this.sequencing = { active: false, steps: [], currentStep: 0, timer: 0 };

        // Init Characters
        // Initialize Portraits
        const idMap = {
            'ataho': 'ATA',
            'rinxiang': 'RIN',
            'smash': 'SMSH',
            'petum': 'PET',
            'fari': 'FARI',
            'yuri': 'YURI',
            'mayu': 'MAYU'
        };

        const getAnimConfig = (charData, side) => {
            if (!charData) return null;

            // 1. Check AnimConfig (Manual Overrides) - DEPRECATED/REMOVED
            /* 
            if (typeof AnimConfig !== 'undefined' && AnimConfig[charData.id]) {
                const config = side === 'left' ? AnimConfig[charData.id].L : AnimConfig[charData.id].R;
                if (config) return config;
            }
            */

            // Auto-Detection (Standard face folder only)
            const prefix = idMap[charData.id] || charData.id.toUpperCase();
            const base = `face/${prefix}_base.png`;
            if (Assets.get(base)) {
                console.log(`[BattleScene] Auto-configuring animation for ${charData.id} (${side})`);
                return { base: base };
            }

            return null;
        };

        // BGM (Basic Battle Theme)
        Assets.playMusic('audio/bgm_basic'); // Will upgrade to dynamic later

        this.p1Character = new PortraitCharacter(p1Data, {
            ...BattleUIConfig.PORTRAIT.P1,
            baseW: BattleUIConfig.PORTRAIT.baseW,
            baseH: BattleUIConfig.PORTRAIT.baseH
        }, false);
        this.p1Character.setAnimationConfig(getAnimConfig(p1Data, 'left'));

        this.cpuCharacter = new PortraitCharacter(cpuData, {
            ...BattleUIConfig.PORTRAIT.CPU,
            baseW: BattleUIConfig.PORTRAIT.baseW,
            baseH: BattleUIConfig.PORTRAIT.baseH
        }, true);
        this.cpuCharacter.setAnimationConfig(getAnimConfig(cpuData, 'right'));

        // Ensure Expressions are Reset
        if (this.p1Character) this.p1Character.setState('idle');
        if (this.cpuCharacter) this.cpuCharacter.setState('idle');

        this.currentState = this.STATE_INIT;
        this.timer = 0;
        this.turnCount = 1;
        this.currentRound = 1;

        // Select Random Background
        const bgIndex = Math.floor(Math.random() * (BattleUIConfig.BG.max - BattleUIConfig.BG.min + 1)) + BattleUIConfig.BG.min;
        const bgName = bgIndex.toString().padStart(2, '0');
        this.bgPath = `${BattleUIConfig.BG.prefix}${bgName}.png`;
        console.log(`Selected BG: ${this.bgPath}`);

        // Reset Stats (Only if new match)
        // Reset Stats (Only if new match)
        if (!data.isNextRound) {
            this.p1.hp = BattleUIConfig.RULES.INITIAL_HP;
            this.cpu.hp = BattleUIConfig.RULES.INITIAL_HP;
            this.p1.maxHp = BattleUIConfig.RULES.INITIAL_HP;
            this.cpu.maxHp = BattleUIConfig.RULES.INITIAL_HP;
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

        this.currentState = this.STATE_FX_PLAYING;

        // Build Sequence
        const steps = [
            // FX Removed
            { type: 'WAIT', duration: 30 }, // Reduced wait
            { type: 'REVEAL_HAND' } // Reveal CPU hand
        ];

        if (who === 'P1') {
            steps.push({ type: 'MUSIC', id: 'audio/bgm_win', loop: false });
        }

        // UPDATE STATE with Final Score for Renderer
        if (this.winningYaku) {
            this.winningYaku.score = score;
        }

        const winType = (who === 'P1') ? 'WIN' : 'LOSE';
        this.resultInfo = {
            type: winType,
            score: score,
            yakuName: this.winningYaku ? this.winningYaku.yaku[0] : ''
        };

        steps.push({ type: 'STATE', state: (who === 'P1' ? this.STATE_WIN : this.STATE_LOSE), score: score });

        this.sequencing = {
            active: true,
            timer: 0,
            currentStep: 0,
            steps: steps
        };
    },

    calculateTenpaiDamage: function (p1Tenpai, cpuTenpai) {
        // Fallback if arguments are missing (e.g. called from sequencing without context)
        if (p1Tenpai === undefined) p1Tenpai = this.checkTenpai(this.getFullHand(this.p1), false);
        if (cpuTenpai === undefined) cpuTenpai = this.checkTenpai(this.getFullHand(this.cpu), false);

        let damageMsg = "";
        if (p1Tenpai && cpuTenpai) {
            // Both Tenpai -> No payments.
            damageMsg = "데미지 없음";
        } else if (p1Tenpai && !cpuTenpai) {
            // P1 Tenpai, CPU Noten -> CPU takes damage
            const dmg = 1000;
            this.pendingDamage = { target: 'CPU', amount: dmg };
            damageMsg = `데미지: ${dmg}`;
        } else if (!p1Tenpai && cpuTenpai) {
            // CPU Tenpai, P1 Noten -> Player takes damage
            const dmg = 1000;
            this.pendingDamage = { target: 'P1', amount: dmg };
            damageMsg = `데미지: -${dmg}`;
        } else {
            // Both Noten
            damageMsg = "데미지 없음";
        }

        return damageMsg;
    },



    startNagariSequence: function () {
        this.currentState = this.STATE_NAGARI;

        // Tenpai checks
        const p1Tenpai = this.checkTenpai(this.getFullHand(this.p1), false);
        const cpuTenpai = this.checkTenpai(this.getFullHand(this.cpu), false);

        console.log(`P1 Tenpai: ${p1Tenpai}, CPU Tenpai: ${cpuTenpai}`);

        // Determine Damage
        const damageMsg = this.calculateTenpaiDamage(p1Tenpai, cpuTenpai);
        console.log(`Nagari! Damage Msg: ${damageMsg}`);

        const p1Tx = p1Tenpai ? BattleUIConfig.STATUS_TEXTS.TENPAI : BattleUIConfig.STATUS_TEXTS.NOTEN;
        const cpuTx = cpuTenpai ? BattleUIConfig.STATUS_TEXTS.TENPAI : BattleUIConfig.STATUS_TEXTS.NOTEN;

        // Expressions
        if (p1Tenpai) this.p1Character.setState('smile');
        else this.p1Character.setState('shocked');

        if (cpuTenpai) this.cpuCharacter.setState('smile');
        else this.cpuCharacter.setState('shocked');

        // Visual Sequence
        // 1. "Nagari" Text
        // 2. Show Hands (Reveal CPU)
        // 3. Show Tenpai/Noten status
        // 4. Apply Damage Animation
        // 5. Next Round

        // Setup sequence steps
        const p1X = 150; const p1Y = 300;
        const cpuX = 490; const cpuY = 300;

        const p1Fx = p1Tenpai ? 'fx/tenpai' : 'fx/noten'; // We don't have these images yet. 
        // Or use text bubbles.
        // Let's use text bubble FX or specific assets if they existed.
        // For now, use existing generic FX or popups.

        // Let's assume we use valid assets or text popups. 
        // We can create a "TextFX" type?
        // For this task, we can assume standard assets or re-use existing system.
        // Actually, let's just use the `damageMsg` in the Result window for now, 
        // as `STATE_NAGARI` transitions to `drawResult` which can show the message.

        this.sequencing = {
            active: true,
            currentStep: 0,
            timer: 0,
            steps: [
                { type: 'WAIT', duration: 30 },
                // Just using popups for Tenpai status if possible, or skip to result
                // We'll rely on Result Window's text update logic (Refactoring `BattleRenderer` later?)
                // Actually `BattleRenderer` logic for Nagari needs to show "Damage" text.

                // Let's just do FX for standard reveal
                { type: 'REVEAL_HAND' },
                { type: 'WAIT', duration: 30 },

                // We can spawn text particles?
                // For now, simple wait and then show Result Overlay which has TEXT.
                { type: 'STATE', state: this.STATE_NAGARI }
            ]
        };

        // Add Tenpai/Noten text to resultInfo for Renderer to optionally use?
        // Or just the damage msg.
        this.resultInfo = {
            type: 'NAGARI',
            damageMsg: damageMsg,
            p1Status: p1Tx,
            cpuStatus: cpuTx
        };
        console.log('Set resultInfo:', this.resultInfo);
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
            this.sequencing.active = false;
        } else if (step.type === 'MUSIC') {
            // New Step: Play Music
            Assets.playMusic(step.id, step.loop);
            this.sequencing.currentStep++;
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
                // User said "slide in... same duration". Let's slide over first 0.3 seconds (18 frames).
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

    playFX: function (asset, x, y, options) {
        // FX Removed as per user request
    },

    activeFX: [], // Kept as empty array to avoid undefined errors in renderer loops



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
                Assets.stopMusic();
                Game.changeScene(TitleScene);
                return;
            }

            // Proceed to next match
            Assets.stopMusic();
            Game.changeScene(CharacterSelectScene, {
                mode: 'NEXT_MATCH',
                playerIndex: this.playerIndex,
                defeatedOpponents: this.defeatedOpponents
            });
        } else {
            // Game Over -> Continue Screen
            this.resultInfo = { type: 'GAME_OVER' }; // Set resultInfo for game over
            console.log(`Encounter Finished. Transitioning to Battle. P1: ${this.playerIndex}, CPU: ${this.cpuIndex}`);
            Assets.stopMusic();
            Game.changeScene(BattleScene, {
                playerIndex: this.playerIndex,
                cpuIndex: this.cpuIndex,
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
        this.timer = 0; // Reset timer for clean start
        this.stateTimer = 0;
        this.lastState = -1;
        this.resultInfo = null; // Clear result info
        this.sequencing.active = false; // Ensure sequence is off

        // Reset BGM to Battle Theme
        Assets.playMusic('audio/bgm_basic', true);

        // Init Deck
        this.deck = this.generateDeck();
        console.log(`Deck generated. Size: ${this.deck.length}`);

        // Init Hands
        this.p1.hand = this.drawTiles(11);
        console.log(`Player Hand drawn. Size: ${this.p1.hand.length}`);



        this.cpu.hand = this.drawTiles(11);
        this.cpu.isRevealed = false; // Reset reveal status
        this.sortHand(this.p1.hand); // Re-enabled sorting as per user request (initial only)

        // Reset Open Sets (Fixes "Too many tiles" bug in Round 2)
        this.p1.openSets = [];
        this.cpu.openSets = [];

        // 2 Doras (Visible + Hidden)
        this.doras = [];
        this.uraDoraRevealed = false; // Reset Ura Dora state

        // Dora 1
        const d1Type = PaiData.TYPES[Math.floor(Math.random() * PaiData.TYPES.length)];
        this.doras.push({ type: d1Type.id, color: d1Type.color, img: d1Type.img });

        // Dora 2 (Must be different from Dora 1)
        let d2Type;
        do {
            d2Type = PaiData.TYPES[Math.floor(Math.random() * PaiData.TYPES.length)];
        } while (d2Type.id === d1Type.id && d2Type.color === d1Type.color);

        this.doras.push({ type: d2Type.id, color: d2Type.color, img: d2Type.img });

        // Reset Riichi & Menzen
        this.p1.isRiichi = false;
        this.cpu.isRiichi = false;
        this.p1.isMenzen = true; // Reset Menzen (Closed Hand)
        this.cpu.isMenzen = true; // Ensure CPU logic resets too

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

        const numW = BattleUIConfig.INFO.numbers.w;
        const gap = BattleUIConfig.INFO.numbers.gap;
        const img = Assets.get(BattleUIConfig.INFO.numbers.path);

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

    updateLogic: function () {
        // State Timer Logic
        if (this.currentState !== this.lastState) {
            this.stateTimer = 0;
            this.lastState = this.currentState;
        }
        this.stateTimer++;
        this.timer++;

        // Music Update
        this.updateBattleMusic();

        // 1. Timer Update
        // this.timer++; // Removed, handled above
        // Update Characters
        if (this.p1Character) this.p1Character.update();
        if (this.cpuCharacter) this.cpuCharacter.update();

        // Update FX
        this.updateFX();

        if (this.currentState < this.STATE_WIN && this.currentState !== this.STATE_INIT) {
            if (this.timer % 30 === 0) {
                this.checkRoundEnd();
            }
        }

        switch (this.currentState) {
            case this.STATE_INIT:
                if (this.timer > 60) {
                    this.playerDraw();
                }
                break;

            case this.STATE_PLAYER_TURN:
                // Riichi Auto-Discard Logic
                if (this.p1.isRiichi) {
                    if (this.timer > 60) {
                        console.log("Riichi Auto-Discard (Delayed)");
                        this.discardTile(this.p1.hand.length - 1);
                    }
                }
                break;

            case 'RIICHI':
                console.log("Player declares Riichi");
                this.p1.isRiichi = true;
                this.p1.hand.sort((a, b) => a.id - b.id);
                this.playFX('fx/riichi', 320, 240);
                this.updateBattleMusic();
                this.riichiTargetIndex = -1;
                this.currentState = this.STATE_PLAYER_TURN;
                break;

            case this.STATE_ACTION_SELECT:
                if (this.actionTimer > 0) this.actionTimer--;
                break;

            case this.STATE_FX_PLAYING:
                this.updateSequence();
                break;

            case this.STATE_CPU_TURN:
                if (this.timer === 30 && !this.cpu.needsToDiscard) {
                    this.cpuDraw();
                }
                if (this.timer === 60 && this.cpu.needsToDiscard) {
                    this.cpu.needsToDiscard = false;
                    const discardIdx = AILogic.decideDiscard(this.cpu.hand, AILogic.DIFFICULTY.NORMAL);
                    this.discardTileCPU(discardIdx);
                }
                break;

            case this.STATE_WIN:
            case this.STATE_LOSE:
            case this.STATE_NAGARI:
                // Debug log every 60 frames
                if (this.timer % 60 === 0) console.log("Waiting for Next Round Input (Space/Click)... State:", this.currentState);
                // Input is now handled in BattleScene.js
                break;

            case this.STATE_MATCH_OVER:
                // Input is now handled in BattleScene.js
                break;
        }
    },

    confirmResult: function () {
        console.log("Result Confirmed. Applying Damage & Proceeding.");
        if (this.pendingDamage) {
            // Apply Damage
            if (this.pendingDamage.target === 'P1') {
                this.p1.hp = Math.max(0, this.p1.hp - this.pendingDamage.amount);
                this.p1Character.setState('shocked');
            } else if (this.pendingDamage.target === 'CPU') {
                this.cpu.hp = Math.max(0, this.cpu.hp - this.pendingDamage.amount);
                this.cpuCharacter.setState('shocked');
            }

            // Play Hit Sound
            Assets.playSound('audio/hit');
            console.log(`Applied Pending Damage: ${this.pendingDamage.amount} to ${this.pendingDamage.target}`);

            this.pendingDamage = null; // Clear
        }

        this.handleRoundEnd();
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



    handleRoundEnd: function () {
        console.log("handleRoundEnd Called. HP:", this.p1.hp, this.cpu.hp);
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
            console.log("Proceeding to Next Round via handleRoundEnd");
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
            Assets.playSound('audio/draw'); // Play sound
            this.p1.hand.push(drawnTile);

            // Grouping Logic Removed as per user request.
            // Just keep the new tile at the end.
            this.lastDrawGroupSize = 1;
        }

        // DO NOT SORT HERE. Only on discard or initial deal.

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
            Assets.playSound('audio/draw'); // Play sound
            this.cpu.hand.push(t[0]);
        }

        // CPU AI Logic
        const difficulty = AILogic.DIFFICULTY.NORMAL; // Default to Normal for now

        // 1. Check Tsumo
        if (YakuLogic.checkYaku(this.cpu.hand, this.cpu.id)) {
            this.winningYaku = YakuLogic.checkYaku(this.cpu.hand, this.cpu.id);
            if (this.winningYaku) {
                console.log("CPU TSUMO!");
                const score = this.calculateScore(this.winningYaku.score, this.cpu.isMenzen);
                this.pendingDamage = { target: 'P1', amount: score };
                this.startWinSequence('TSUMO', 'CPU', score);
                return;
            }
        }

        // 2. Check Riichi
        if (!this.cpu.isRiichi && this.cpu.isMenzen && this.cpu.hand.length >= 2) {
            // Check if can Riichi (Tenpai check)
            let canRiichi = false;
            for (let i = 0; i < this.cpu.hand.length; i++) {
                const tempHand = [...this.cpu.hand];
                tempHand.splice(i, 1);
                if (this.checkTenpai(tempHand, this.cpu.id)) {
                    canRiichi = true;
                    break;
                }
            }

            if (canRiichi && AILogic.shouldRiichi(this.cpu.hand, difficulty)) {
                console.log("CPU Riichi!");
                this.cpu.isRiichi = true;
                this.showPopup('RIICHI');

                this.updateBattleMusic();

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
        Assets.playSound('audio/discard'); // Play sound
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
        if (this.currentState !== this.STATE_PLAYER_TURN) {
            console.log("Ignored discard attempt in non-player state:", this.currentState);
            return;
        }

        console.log(`Player discards index ${index}: ${this.p1.hand[index].type}`); // Log
        Assets.playSound('audio/discard'); // Play sound
        const discarded = this.p1.hand.splice(index, 1)[0];
        discarded.owner = 'p1'; // Mark owner
        this.discards.push(discarded);

        console.log("DISCARDS:", this.discards.map(d => d.type).join(", ")); // Log discards

        this.sortHand(this.p1.hand); // Sort remaining hand after discard to keep it organized for next turn

        // Reset Expressions
        this.p1Character.setState('idle');
        this.cpuCharacter.setState('idle');

        this.hoverIndex = -1;

        if (this.checkCpuActions(discarded)) {
            return;
        }

        this.currentState = this.STATE_CPU_TURN;
        this.timer = 0;
    },

    checkCpuActions: function (discardedTile) {
        // 1. RON
        // Check if adding this tile completes the hand
        // CPU Hand + Discarded Tile
        const checkHand = [...this.getFullHand(this.cpu), discardedTile];
        const win = YakuLogic.checkYaku(checkHand, this.cpu.id);
        if (win) {
            console.log("CPU RON!");
            this.winningYaku = win;
            const score = this.calculateScore(this.winningYaku.score, this.cpu.isMenzen);
            this.pendingDamage = { target: 'P1', amount: score };
            this.startWinSequence('RON', 'CPU', score);
            return true;
        }

        // 2. PON
        // Check for pairs in hand
        let pairCount = 0;
        this.cpu.hand.forEach(t => {
            if (t.type === discardedTile.type && t.color === discardedTile.color) pairCount++;
        });

        if (pairCount >= 2) {
            const difficulty = AILogic.DIFFICULTY.NORMAL;
            if (AILogic.shouldPon(this.cpu.hand, discardedTile, difficulty)) {
                this.executeCpuPon(discardedTile);
                return true;
            }
        }

        return false;
    },

    executeCpuPon: function (tile) {
        console.log("CPU Calls PON!", tile.type);
        this.showPopup('PON');
        Assets.playSound('audio/call');

        // Remove 2 matching tiles logic
        let removed = 0;
        for (let i = this.cpu.hand.length - 1; i >= 0; i--) {
            const t = this.cpu.hand[i];
            if (t.type === tile.type && t.color === tile.color) {
                this.cpu.hand.splice(i, 1);
                removed++;
                if (removed >= 2) break;
            }
        }

        // Add Open Set
        this.cpu.openSets.push({
            type: 'PON',
            tiles: [tile, tile, tile] // 2 from hand + 1 discarded
        });

        this.cpu.isMenzen = false;

        // Take from discards
        this.discards.pop();

        // Setup Discard Phase
        this.cpu.needsToDiscard = true;
        this.currentState = this.STATE_CPU_TURN;
        this.timer = 0; // Will trigger discard logic at timer=60
    },





    getVisualMetrics: function (character, groupSize) {
        return BattleRenderer.getVisualMetrics(character, groupSize);
    },

    getPlayerHandPosition: function (index, count, groupSize, startX) {
        return BattleRenderer.getPlayerHandPosition(index, count, groupSize, startX);
    },

    checkPlayerActions: function (discardedTile) {
        this.possibleActions = [];
        const hand = this.p1.hand;
        const fullHand = this.getFullHand(this.p1);

        // 1. Check PON (Pair matches discard)
        let matchCount = 0;
        hand.forEach(t => {
            if (t.type === discardedTile.type) matchCount++;
        });
        if (matchCount >= 2 && this.turnCount !== 1 && this.turnCount < 20) {
            const ponAction = { type: 'PON', label: '펑', targetTile: discardedTile };
            this.possibleActions.push(ponAction);
        }

        // 3. Check RON (Win)
        // Rule: Ron is allowed ONLY if Riichi is declared (User Requirement)
        // Since Pon disables Riichi, this effectively disables Ron after Pon.
        // Wait, if I Pon I can't Riichi? Usually yes in Riichi Mahjong (unless specific rule).
        // User didn't explicitly say Pon disables Riichi, but implied "Riichi declared condition".
        // Also need to check Yaku with FULL HAND.
        const tempHand = [...fullHand, discardedTile];
        if (this.p1.isRiichi && YakuLogic.checkYaku(tempHand, this.p1.id)) {
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
        const fullHand = this.getFullHand(this.p1);

        // 1. Tsumo
        if (YakuLogic.checkYaku(fullHand, this.p1.id)) {
            this.possibleActions.push({ type: 'TSUMO', label: '쯔모' });
        }

        // 2. Riichi
        // Cond: Closed hand (isMenzen), Not already Riichi
        // Rule: "Have 11 tiles" -> Draw 1 -> 12. Discard -> 11.
        // Riichi is declared before discard.
        // Riichi requires Menzen (No Open Sets).
        // Check openSets length
        const isMenzen = this.p1.openSets.length === 0;

        if (!this.p1.isRiichi && isMenzen && hand.length >= 2) {
            // Check if any discard leads to Tenpai
            // We have 12 tiles now (after draw).
            // We need to check if discarding any tile results in a hand that is Tenpai (1 away from win).

            let canRiichi = false;
            // Iterate all tiles in hand to simulate discard
            for (let i = 0; i < hand.length; i++) {
                // Create temp hand without this tile
                const tempHand = [...hand];
                tempHand.splice(i, 1); // Remove 1 tile -> 11 tiles

                // For Tenpai check, we need to pass the hand that would remain.
                // Since this is Riichi check, we assume Menzen, so fullHand == hand.
                // But generally checkTenpai should take the "hand to check".

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



    performAutoTurn: function () {
        if (this.currentState !== this.STATE_PLAYER_TURN) {
            console.log("Not player turn, cannot auto-select.");
            return;
        }

        try {
            // Delegate to AI Logic
            // Use 'NORMAL' difficulty as standard auto-play
            const discardIdx = AILogic.decideDiscard(this.p1.hand, AILogic.DIFFICULTY.NORMAL);

            if (typeof discardIdx !== 'number' || discardIdx < 0) {
                console.error("AILogic returned invalid index:", discardIdx);
                // Fallback: Discard rightmost tile safely
                this.discardTile(this.p1.hand.length - 1);
                return;
            }

            console.log(`[Auto-Select] AI chose to discard index ${discardIdx}`);
            this.discardTile(discardIdx);
        } catch (e) {
            console.error("Error during Auto-Select:", e);
            console.error(e.stack);
            // Fallback: Discard rightmost tile safely to prevent soft-lock
            if (this.p1.hand.length > 0) {
                this.discardTile(this.p1.hand.length - 1);
            }
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
            // Move tiles from hand to openSets
            const matchType = action.targetTile.type;
            const matches = [];
            const keep = [];

            this.p1.hand.forEach(t => {
                if (t.type === matchType && matches.length < 2) {
                    matches.push(t);
                } else {
                    keep.push(t);
                }
            });

            if (matches.length === 2) {
                this.p1.hand = keep;
                this.p1.openSets.push({
                    type: 'PON',
                    tiles: [matches[0], matches[1], action.targetTile]
                });

                // Remove from discards (physically taken)
                this.discards.pop();

                console.log("Executed PON. Hand size:", this.p1.hand.length);

                // Expressions
                this.p1Character.setState('smile');
                this.cpuCharacter.setState('shocked');
                this.showPopup('PON');

                // Force Discard State (Turn continues but starts at discard phase)
                this.currentState = this.STATE_PLAYER_TURN;
                this.timer = 0;
                this.hoverIndex = this.p1.hand.length - 1; // Hover last tile
            }

        } else if (action.type === 'RIICHI') {
            this.p1.isRiichi = true;
            this.showPopup('RIICHI');

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
            console.log("TSUMO! Player Wins.");
            this.showPopup('TSUMO');
            this.p1Character.setState('joy');
            this.cpuCharacter.setState('ko');

            const fullHand = this.getFullHand(this.p1);
            // Tsumo: Tile is already in hand
            this.winningYaku = YakuLogic.checkYaku(fullHand, this.p1.id);
            if (this.winningYaku) {
                const score = this.calculateScore(this.winningYaku.score, this.p1.isMenzen);
                this.pendingDamage = { target: 'CPU', amount: score };
                this.startWinSequence('TSUMO', 'P1', score);
            }
            this.currentState = this.STATE_WIN;

        } else if (action.type === 'RON') {
            console.log("RON! Player Wins.");
            this.showPopup('RON');
            this.p1Character.setState('joy');
            this.cpuCharacter.setState('ko');

            const fullHand = this.getFullHand(this.p1);
            const winningTile = this.discards[this.discards.length - 1];
            const finalHand = [...fullHand, winningTile];

            this.winningYaku = YakuLogic.checkYaku(finalHand, this.p1.id);
            if (this.winningYaku) {
                const score = this.calculateScore(this.winningYaku.score, this.p1.isMenzen);
                this.pendingDamage = { target: 'CPU', amount: score };
                this.startWinSequence('RON', 'P1', score);
            }
            this.currentState = this.STATE_WIN;
        }

        // REMOVED: Unconditional reset to STATE_PLAYER_TURN. 
        // Each action block is now responsible for setting the correct next state.
    },

    toggleBattleMenu: function () {
        if (this.currentState === this.STATE_BATTLE_MENU) {
            this.currentState = this.lastStateBeforeMenu || this.STATE_PLAYER_TURN;
        } else {
            this.lastStateBeforeMenu = this.currentState;
            this.currentState = this.STATE_BATTLE_MENU;
            this.selectedMenuIndex = 0;
        }
    },



    handleMenuSelection: function (selected) {
        console.log("Selected Menu Item:", selected);

        if (selected === '도움말') {
            window.open('https://atah.io/haiyuki_manual/index.html#yaku', '_blank', 'width=640,height=800,status=no,toolbar=no');
        } else if (selected === '자동 선택') {
            if (this.lastStateBeforeMenu !== this.STATE_PLAYER_TURN) {
                console.log("Auto-select ignored: Not player turn");
                // Optional: Play error sound
            } else {
                this.toggleBattleMenu(); // Close menu
                this.performAutoTurn();
            }
        } else if (selected === '다시 시작') {
            // Restart Game / Reload
            if (confirm("정말로 다시 시작하시겠습니까?")) {
                location.reload();
            }
        } else if (selected === '옵션') {
            // Placeholder
        } else {
            // Skills or other items
        }

        this.toggleBattleMenu();
    },

    // Draw methods delegated to BattleRenderer

    drawTile: function (ctx, tile, x, y, w, h) {
        // Just draw the image as requested
        const img = Assets.get(tile.img);
        if (img) {
            ctx.drawImage(img, x, y, w, h);
        } else {
            // Fallback if image missing
            ctx.fillStyle = BattleUIConfig.FALLBACK.tileBg;
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center'; // Ensure text is centered for fallback
            ctx.font = BattleUIConfig.FALLBACK.tileTextFont; // Smaller font for fallback
            ctx.fillText(tile.type, x + w / 2, y + h / 2);
        }
    },

    drawBar: function (ctx, x, y, val, max, label) {
        // Bar bg (Removed)
        // ctx.fillStyle = BattleUIConfig.BARS.BG_COLOR;
        // ctx.fillRect(x, y, BattleUIConfig.BARS.width, BattleUIConfig.BARS.height);

        // Bar fill (Pattern)
        const pct = Math.max(0, Math.min(1, val / max));
        const fillW = Math.floor(BattleUIConfig.BARS.width * pct);



        // Draw Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, BattleUIConfig.BARS.width, BattleUIConfig.BARS.height);

        if (fillW > 0) {
            const path = (label === 'HP') ? BattleUIConfig.BARS.hpPath : BattleUIConfig.BARS.mpPath;
            const barImg = Assets.get(path);
            if (barImg) {
                // Draw Image Cropped
                ctx.drawImage(barImg,
                    0, 0, barImg.width * pct, barImg.height,
                    x, y, fillW, BattleUIConfig.BARS.height
                );
            } else {
                // Fallback
                ctx.fillStyle = (label === 'HP') ? '#ff4d4d' : '#4d4dff';
                ctx.fillRect(x, y, fillW, BattleUIConfig.BARS.height);
            }
        }

        // Border - Removed as per request
        // ctx.strokeStyle = 'black';
        // ctx.lineWidth = 2;
        // ctx.strokeRect(x, y, BattleUIConfig.BARS.width, BattleUIConfig.BARS.height);
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
            ctx.fillStyle = BattleUIConfig.FALLBACK.cardBackBg;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = BattleUIConfig.FALLBACK.cardBackStroke;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, w, h);

            // X Pattern
            ctx.beginPath();
            ctx.strokeStyle = BattleUIConfig.FALLBACK.cardBackPattern;
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
            const row = Math.floor(i / BattleUIConfig.DISCARDS.rowMax);
            const col = i % BattleUIConfig.DISCARDS.rowMax;
            const x = BattleUIConfig.DISCARDS.P1.x + col * (BattleUIConfig.DISCARDS.tileWidth + BattleUIConfig.DISCARDS.gap);
            const y = BattleUIConfig.DISCARDS.P1.y + row * (BattleUIConfig.DISCARDS.tileHeight + BattleUIConfig.DISCARDS.gap);

            const isLast = (tile === this.discards[this.discards.length - 1]);
            if (isLast) {
                // Draw Larger (Hand Size)
                const w = BattleUIConfig.HAND.tileWidth;
                const h = BattleUIConfig.HAND.tileHeight;
                // Center on the slot
                const cx = x + (BattleUIConfig.DISCARDS.tileWidth - w) / 2;
                const cy = y + (BattleUIConfig.DISCARDS.tileHeight - h) / 2;

                this.drawTile(ctx, tile, cx, cy, w, h);
                // Optional: Highlight? User didn't ask, but size diff is the main request.
            } else {
                this.drawTile(ctx, tile, x, y, BattleUIConfig.DISCARDS.tileWidth, BattleUIConfig.DISCARDS.tileHeight);
            }
        });

        // Draw CPU Discards
        cpuDiscards.forEach((tile, i) => {
            const row = Math.floor(i / BattleUIConfig.DISCARDS.rowMax);
            const col = i % BattleUIConfig.DISCARDS.rowMax;
            const x = BattleUIConfig.DISCARDS.CPU.x + col * (BattleUIConfig.DISCARDS.tileWidth + BattleUIConfig.DISCARDS.gap);
            const y = BattleUIConfig.DISCARDS.CPU.y + row * (BattleUIConfig.DISCARDS.tileHeight + BattleUIConfig.DISCARDS.gap);

            const isLast = (tile === this.discards[this.discards.length - 1]);
            if (isLast) {
                // Draw Larger (Hand Size)
                const w = BattleUIConfig.HAND.tileWidth;
                const h = BattleUIConfig.HAND.tileHeight;
                // Center on the slot
                const cx = x + (BattleUIConfig.DISCARDS.tileWidth - w) / 2;
                const cy = y + (BattleUIConfig.DISCARDS.tileHeight - h) / 2;

                this.drawTile(ctx, tile, cx, cy, w, h);
            } else {
                this.drawTile(ctx, tile, x, y, BattleUIConfig.DISCARDS.tileWidth, BattleUIConfig.DISCARDS.tileHeight);
            }
        });
    },

    drawOpenSets: function (ctx, openSets, startX, y, tileW, tileH, isCpu) {
        if (!openSets || openSets.length === 0) return;

        const gap = 5;
        const setGap = 15;
        let currentX = startX;

        // Draw Side Asset if Player (isCpu false)
        const sideImg = !isCpu ? Assets.get('tiles/side-bottom.png') : null;

        openSets.forEach(set => {
            set.tiles.forEach(tile => {
                if (sideImg) {
                    ctx.drawImage(sideImg, currentX, y + tileH, tileW, sideImg.height);
                }
                this.drawTile(ctx, tile, currentX, y, tileW, tileH);
                currentX += tileW + gap;
            });
            currentX += setGap - gap; // Add gap (remove existing tile gap compensation)
        });
    },

    getFullHand: function (player) {
        let tiles = [...player.hand];
        player.openSets.forEach(set => {
            tiles = tiles.concat(set.tiles);
        });
        return tiles;
    },

    getVisualMetrics: function (player, groupSize) {
        const tileW = BattleUIConfig.HAND.tileWidth;
        const gap = BattleUIConfig.HAND.gap;
        const setGap = 15;
        const groupGap = BattleUIConfig.HAND.groupGap;
        const sectionGap = 20; // Gap between hand and open sets

        // 1. Calculate Hand Width
        const handCount = player.hand.length;
        let handW = handCount * (tileW + gap);
        if (groupSize > 0) handW += groupGap;

        // 2. Calculate Open Sets Width
        let openW = 0;
        if (player.openSets.length > 0) {
            player.openSets.forEach(set => {
                openW += (set.tiles.length * tileW) + ((set.tiles.length - 1) * gap) + setGap;
            });
            openW -= setGap; // Remove last gap
        }

        // 3. Total Width
        let totalW = handW;
        if (openW > 0) totalW += sectionGap + openW;

        // 4. Start X (Centered)
        const startX = (640 - totalW) / 2;

        return { startX, handW, openW, sectionGap };
    },

    getPlayerHandPosition: function (index, totalTiles, groupSize, startX) {
        const tileW = BattleUIConfig.HAND.tileWidth;
        const gap = BattleUIConfig.HAND.gap;

        let x = startX || 0; // Use provided startX

        // Add individual offset
        x += index * (tileW + gap);

        // Add group gap offset
        if (groupSize > 0 && index >= totalTiles - groupSize) {
            x += BattleUIConfig.HAND.groupGap;
        }

        return { x: x, y: BattleUIConfig.HAND.playerHandY };
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
    },

    updateBattleMusic: function () {
        // Priority: Showdown (Both Riichi) > Tension (One Riichi) > Basic
        let targetBgm = 'audio/bgm_basic';

        if (this.p1.isRiichi && this.cpu.isRiichi) {
            targetBgm = 'audio/bgm_showdown';
        } else if (this.p1.isRiichi || this.cpu.isRiichi) {
            targetBgm = 'audio/bgm_tension';
        }

        // Only switch if different
        if (!Assets.currentMusic || Assets.currentMusic._id !== targetBgm) {
            console.log(`Switching Battle BGM to: ${targetBgm}`);
            Assets.playMusic(targetBgm);
        }
    }
};

