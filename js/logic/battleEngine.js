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
    STATE_WAIT_FOR_DRAW: 10, // Wait for user input before drawing
    STATE_DAMAGE_ANIMATION: 11, // New: Damage Animation

    currentState: 0,
    timer: 0,
    stateTimer: 0,
    lastState: -1,

    // Constants
    DELAY_DRAW: 60,
    DELAY_DISCARD_AUTO: 60,

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

    showPopup: function (type, options = {}) {
        const conf = BattleConfig.POPUP;
        const asset = `fx/${type.toLowerCase()}`;
        const typeConf = conf.TYPES[type] || {};

        // Merge options: Defaults < Config < Arguments
        // Note: options arg overrides config if specific overrides needed
        const fAnim = options.anim || typeConf.anim;
        const fSlide = options.slideFrom || typeConf.slideFrom;
        const fLife = options.life || typeConf.life || 45;
        const fScale = options.scale || typeConf.scale || conf.scale;

        // Construct final options
        const finalOptions = {
            scale: fScale,
            slideFrom: fSlide,
            life: fLife,
            anim: fAnim,
            blocking: options.blocking // blocking usually passed by logic context
        };

        // Sound Logic - REMOVED (Handled by View via popupType)

        // Pass type info for View sound handling
        finalOptions.popupType = type;

        this.playFX(asset, conf.x, conf.y, finalOptions);
    },

    playerIndex: 0,
    cpuIndex: 0,

    // Battle Data
    // Battle Data
    p1: { hp: BattleConfig.RULES.INITIAL_HP, maxHp: BattleConfig.RULES.INITIAL_HP, mp: 100, maxMp: 100, hand: [], openSets: [], isRiichi: false },
    cpu: { hp: BattleConfig.RULES.INITIAL_HP, maxHp: BattleConfig.RULES.INITIAL_HP, mp: 100, maxMp: 100, hand: [], openSets: [], isRiichi: false, isRevealed: false },

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

        // Assign Character IDs for Logic (Yaku Names)
        if (p1Data) this.p1.id = p1Data.id;
        if (cpuData) {
            this.cpu.id = cpuData.id;
            this.cpu.aiProfile = cpuData.aiProfile || null;
            if (this.cpu.aiProfile) console.log(`Loaded AI Profile for ${cpuData.name}:`, this.cpu.aiProfile.type);
        }

        // Construct Dynamic Battle Menu based on Config
        this.menuItems = [];
        const layout = BattleConfig.BATTLE_MENU.layout;

        layout.forEach(item => {
            if (item.id === 'SKILLS_PLACEHOLDER') {
                if (p1Data && p1Data.skills) {
                    p1Data.skills.forEach(skillId => {
                        const skill = SkillData[skillId];
                        if (skill) {
                            const isDisabled = !BattleConfig.RULES.SKILLS_ENABLED;
                            this.menuItems.push({ id: skillId, label: skill.name, type: 'SKILL', data: skill, disabled: isDisabled });
                        }
                    });
                }
            } else {
                this.menuItems.push(item);
            }
        });

        if (Game.isAutoTest && Game.autoTestOptions && Game.autoTestOptions.loseMode) {
            console.log("AUTO-LOSE MODE ACTIVE: Setting Player HP to 1000");
            this.p1.hp = 1000;
            this.p1.maxHp = 1000;
            this.cpu.hp = 99999;
            this.cpu.maxHp = 99999;
        }

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
            // 1. Check AnimConfig (Manual Overrides) - DEPRECATED/REMOVED

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
            ...BattleConfig.PORTRAIT.P1,
            baseW: BattleConfig.PORTRAIT.baseW,
            baseH: BattleConfig.PORTRAIT.baseH,
            isBattle: true
        }, false);
        this.p1Character.setAnimationConfig(getAnimConfig(p1Data, 'left'));

        this.cpuCharacter = new PortraitCharacter(cpuData, {
            ...BattleConfig.PORTRAIT.CPU,
            baseW: BattleConfig.PORTRAIT.baseW,
            baseH: BattleConfig.PORTRAIT.baseH,
            isBattle: true
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
        const bgIndex = Math.floor(Math.random() * (BattleConfig.BG.max - BattleConfig.BG.min + 1)) + BattleConfig.BG.min;
        const bgName = bgIndex.toString().padStart(2, '0');
        this.bgPath = `${BattleConfig.BG.prefix}${bgName}.png`;
        console.log(`Selected BG: ${this.bgPath}`);

        // Reset Stats (Only if new match)
        // Reset Stats (Only if new match)
        if (!data.isNextRound) {
            this.p1.hp = BattleConfig.RULES.INITIAL_HP;
            this.cpu.hp = BattleConfig.RULES.INITIAL_HP;
            this.p1.maxHp = BattleConfig.RULES.INITIAL_HP;
            this.cpu.maxHp = BattleConfig.RULES.INITIAL_HP;
        }

        // Store tournament data
        this.defeatedOpponents = data.defeatedOpponents || [];

        this.startRound();
    },

    playFX: function (type, x, y, options = {}) {
        // Push event for BattleScene to handle
        this.events.push({
            type: 'FX',
            asset: type,
            x: x,
            y: y,
            options: options
        });
    },

    startWinSequence: function (type, who, score) {
        console.log(`Starting Win Sequence: ${type} by ${who}`);
        this.events.push({ type: 'STOP_MUSIC' }); // NEW: Stop BGM on Ron/Tsumo

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
            { type: 'WAIT', duration: 120 }, // Increased wait to ensure FX finish (30 -> 120)
            { type: 'REVEAL_HAND' } // Reveal CPU hand
        ];

        if (who === 'P1') {
            steps.push({ type: 'MUSIC', id: 'audio/bgm_win', loop: false });
        } else {
            steps.push({ type: 'MUSIC', id: 'audio/bgm_lose', loop: false });
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
        // Fallback checks
        if (p1Tenpai === undefined) p1Tenpai = this.checkTenpai(this.getFullHand(this.p1), false);
        if (cpuTenpai === undefined) cpuTenpai = this.checkTenpai(this.getFullHand(this.cpu), false);

        const damage = BattleConfig.RULES.NAGARI_DAMAGE;
        let damageMsg = "데미지 없음";

        if (p1Tenpai && !cpuTenpai) {
            this.pendingDamage = { target: 'CPU', amount: damage };
            damageMsg = `데미지: ${damage}`;
        } else if (!p1Tenpai && cpuTenpai) {
            this.pendingDamage = { target: 'P1', amount: damage };
            damageMsg = `데미지: -${damage}`;
        }

        return damageMsg;
    },



    startNagariSequence: function () {
        this.currentState = this.STATE_FX_PLAYING;
        this.events.push({ type: 'STOP_MUSIC' });

        // Tenpai checks
        const p1Tenpai = this.checkTenpai(this.getFullHand(this.p1), false);
        const cpuTenpai = this.checkTenpai(this.getFullHand(this.cpu), false);

        console.log(`P1 Tenpai: ${p1Tenpai}, CPU Tenpai: ${cpuTenpai}`);

        // Determine Damage
        const damageMsg = this.calculateTenpaiDamage(p1Tenpai, cpuTenpai);
        console.log(`Nagari! Damage Msg: ${damageMsg}`);

        const p1Tx = p1Tenpai ? BattleConfig.STATUS_TEXTS.TENPAI : BattleConfig.STATUS_TEXTS.NOTEN;
        const cpuTx = cpuTenpai ? BattleConfig.STATUS_TEXTS.TENPAI : BattleConfig.STATUS_TEXTS.NOTEN;

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
                { type: 'CALLBACK', callback: () => this.showPopup('NAGARI') }, // Nagari Popup via Config
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
            this.events.push({ type: 'MUSIC', id: step.id, loop: step.loop });
            this.sequencing.currentStep++;
        } else if (step.type === 'CALLBACK') {
            const prevSeq = this.sequencing;
            if (step.callback) step.callback();

            // Critical Fix: If callback started a NEW sequence, do not increment step
            if (this.sequencing === prevSeq) {
                this.sequencing.currentStep++;
            }
        } else if (step.type === 'STATE_NAGARI') {
            // FIX: Must set state to NAGARI to allow input (Next Round)
            this.currentState = this.STATE_NAGARI;
            this.calculateTenpaiDamage(true); // skipFX = true
            this.sequencing.active = false;
        }
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
            const isTrueEnding = mayuInfo && (this.cpuIndex === mayuInfo.index || this.cpuIndex === 6); // 6 is Mayu index
            if (isTrueEnding) {
                console.log("TRUE ENDING COMPLETED!");

                // Unlock Mayu
                if (!Game.saveData.unlocked.includes('mayu')) {
                    Game.saveData.unlocked.push('mayu');
                    Game.save();
                    console.log("Mayu unlocked!");
                }

                Game.isAutoTest = false; // Stop Auto Test
                // Transition to Post-Victory Dialogue
                Game.changeScene(EncounterScene, {
                    playerIndex: this.playerIndex,
                    cpuIndex: this.cpuIndex,
                    mode: 'TRUE_ENDING_CLEAR',
                    defeatedOpponents: [] // Reset
                });
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
            console.log(`Encounter Finished. Transitioning to Continue Screen.`);
            this.events.push({ type: 'STOP_MUSIC' });

            Game.changeScene(ContinueScene, {
                playerIndex: this.playerIndex,
                cpuIndex: this.cpuIndex,
                defeatedOpponents: this.defeatedOpponents,
                isNextRound: false // Fresh rematch if continued
            });
            // Update Global Continue Count
            Game.continueCount++;
        }
    },

    startNextRound: function () {
        console.log("Starting Next Round...");
        this.currentRound++;
        this.startRound();
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
        this.events = []; // Clear event queue

        // Reset BGM to Battle Theme
        // Reset BGM to Battle Theme
        this.currentBgm = 'audio/bgm_basic';
        this.events.push({ type: 'MUSIC', id: this.currentBgm, loop: true });

        // Init Deck
        this.deck = this.generateDeck();
        console.log(`Deck generated. Size: ${this.deck.length}`);

        // CRITICAL: Clear hands before drawing new tiles
        this.p1.hand = [];
        this.cpu.hand = [];

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


        // Auto-Lose Mode Check (Re-apply effectively)
        if (Game.isAutoTest && Game.autoTestOptions && Game.autoTestOptions.loseMode) {
            console.log("AUTO-LOSE MODE (startRound): Setting P1 HP=1, CPU HP=99999");
            this.p1.hp = 1;      // Instant Death next hit
            this.p1.maxHp = 1;
            this.cpu.hp = 99999;
            this.cpu.maxHp = 99999;
        }

        console.log(`Round ${this.currentRound} Start! Visible Dora: ${this.doras[0].type}`);
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
        // Only update battle music during active battle states
        if (this.currentState <= this.STATE_CPU_TURN && !this.sequencing.active) {
            this.updateBattleMusic();
        }

        // AUTO TEST LOGIC
        if (Game.isAutoTest && this.currentState === this.STATE_PLAYER_TURN && this.timer > 5) {
            this.performAutoTurn();
            return;
        }

        // 1. Timer Update
        // this.timer++; // Removed, handled above
        // Update Characters
        if (this.p1Character) this.p1Character.update();
        if (this.cpuCharacter) this.cpuCharacter.update();

        // Update Sequencing
        if (this.sequencing.active) {
            this.updateSequence();
            return; // Block other logic
        }

        if (this.currentState < this.STATE_WIN && this.currentState !== this.STATE_INIT) {
            if (this.timer % 30 === 0) {
                this.checkRoundEnd();
            }
        }

        switch (this.currentState) {
            case this.STATE_INIT:
                if (this.timer > (Game.isAutoTest ? 10 : 60)) { // Speed up init
                    if (this.turnCount === 1) {
                        this.playerDraw();
                    }
                }
                break;

            case this.STATE_WAIT_FOR_DRAW:
                // Wait for click to confirm draw
                if (window.Input && Input.isMousePressed || (Game.isAutoTest && this.timer > 5)) {
                    this.confirmDraw();
                }
                break;

            case this.STATE_PLAYER_TURN:
                // Waiting for input... (Handled by Auto Test above or manual click)
                break;

            case this.STATE_ACTION_SELECT:
                if (this.actionTimer > 0) this.actionTimer--;

                if (Game.isAutoTest && this.actionTimer <= 0) {
                    // AUTO-LOSE SABOTAGE: actively avoid winning
                    const isLoseMode = (Game.autoTestOptions && Game.autoTestOptions.loseMode);

                    // Priority: TSUMO > RON > RIICHI > PASS
                    const tsumoAction = this.possibleActions.find(a => a.type === 'TSUMO');
                    if (tsumoAction && !isLoseMode) { // Skip if loseMode
                        this.executeAction(tsumoAction);
                        return;
                    }

                    const ronAction = this.possibleActions.find(a => a.type === 'RON');
                    if (ronAction && !isLoseMode) {
                        this.executeAction(ronAction);
                        return;
                    }

                    const riichiAction = this.possibleActions.find(a => a.type === 'RIICHI');
                    if (riichiAction && !isLoseMode) {
                        this.executeAction(riichiAction);
                        return;
                    }

                    const passAction = this.possibleActions.find(a => a.type === 'PASS');
                    if (passAction) this.executeAction(passAction);
                }
                break;

            case this.STATE_FX_PLAYING:
                // Blocked until FX finishes
                break;

            case this.STATE_CPU_TURN:
                if (this.timer > (Game.isAutoTest ? 5 : 60)) { // Speed up CPU
                    this.cpuDraw();
                }
                break;

            case this.STATE_WIN:
            case this.STATE_LOSE:
                if (window.Input && Input.isMousePressed || (Game.isAutoTest && this.timer > 30)) {
                    this.confirmResult();
                }
                break;

            case this.STATE_NAGARI:
                if (window.Input && Input.isMousePressed || (Game.isAutoTest && this.timer > 30)) {
                    this.startNextRound();
                }
                break;

            case this.STATE_MATCH_OVER:
                // logic handled inside matchOver function usually, but if we are waiting for click to proceed?
                // matchOver transitions scene immediately in current code.
                // Wait, matchOver function calls Game.changeScene.
                // So we might not stay in STATE_MATCH_OVER unless waiting for interaction?
                // Looking at matchOver implementation:
                // It calls Game.changeScene immediately. So this state might be transient.
                break;

            case this.STATE_DAMAGE_ANIMATION:
                // Animation Logic
                // 1. Init (Timer 0): Play Sound, Start Visuals?
                // Sound handled by Event?
                if (this.timer === 1) {
                    if (this.pendingDamage) {
                        // Emit Damage Event (Sound + Renderer Shake)
                        this.events.push({ type: 'DAMAGE', target: this.pendingDamage.target, amount: this.pendingDamage.amount });
                        console.log(`[Anim] Applying Damage: ${this.pendingDamage.amount} to ${this.pendingDamage.target}`);

                        // Apply actual HP change (Render will handle bar sliding if optimized, or jump)
                        // If we want sliding, we need to interpolate in Renderer.
                        // For now, jump is acceptable as per previous design, but maybe delay it?
                        // Let's apply it now so bars update.
                        if (this.pendingDamage.target === 'P1') {
                            this.p1.hp = Math.max(0, this.p1.hp - this.pendingDamage.amount);
                            this.p1Character.setState('shocked');
                        } else if (this.pendingDamage.target === 'CPU') {
                            this.cpu.hp = Math.max(0, this.cpu.hp - this.pendingDamage.amount);
                            this.cpuCharacter.setState('shocked');
                        }
                    }
                }

                if (this.timer > (Game.isAutoTest ? 10 : 60)) { // Speed up damage anim
                    this.pendingDamage = null;
                    if (this.p1.hp <= 0 || this.cpu.hp <= 0) {
                        this.currentState = this.STATE_MATCH_OVER;
                        this.matchOver(this.p1.hp > 0 ? 'P1' : 'CPU');
                    } else {
                        this.startNextRound();
                    }
                }
                break;
        }
    },

    confirmResult: function () {
        console.log("Result Confirmed. Transitioning to Damage Animation.");
        this.currentState = this.STATE_DAMAGE_ANIMATION;
        this.timer = 0;
        // Stop Victory BGM?
        // this.events.push({ type: 'STOP_MUSIC' }); // Optional: Stop fanfare?
        // Usually fanfare plays once.
    },




    checkRoundEnd: function () {
        // 1. Deck Exhaustion
        if (this.deck.length === 0) {
            console.log("Deck Empty -> NAGARI Sequence");
            this.startNagariSequence();
            return;
        }

        // 2. Turn Limit
        // Check if we are STARTING turn 21
        if (this.turnCount > 20) {
            console.log(`Turn Limit Exceeded (${this.turnCount}) -> NAGARI Sequence`);
            this.startNagariSequence();
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
            this.events.push({ type: 'DRAW', player: 'P1' });
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
            this.events.push({ type: 'DRAW', player: 'CPU' });
            this.cpu.hand.push(t[0]);
        }

        // CPU AI Logic
        const difficulty = BattleConfig.RULES.AI_DIFFICULTY;

        // 1. Check Tsumo
        if (YakuLogic.checkYaku(this.cpu.hand, this.cpu.id)) {
            this.winningYaku = YakuLogic.checkYaku(this.cpu.hand, this.cpu.id);
            if (this.winningYaku) {
                console.log("CPU TSUMO!");
                this.showPopup('TSUMO');
                const score = this.calculateScore(this.winningYaku.score, this.cpu.isMenzen);
                this.pendingDamage = { target: 'P1', amount: score };
                this.startWinSequence('TSUMO', 'CPU', score);
                return;
            }
        }

        // 2. Check Riichi
        if (!this.cpu.isRiichi && this.cpu.isMenzen && this.cpu.hand.length >= 2 && this.turnCount < 20) {
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

            if (canRiichi && AILogic.shouldRiichi(this.cpu.hand, difficulty, this.cpu.aiProfile)) {
                console.log("CPU Riichi!");
                this.cpu.isRiichi = true;
                this.cpu.declaringRiichi = true; // Mark next discard as Riichi declaration

                // Start Riichi Sequence (Delay Discard)
                this.currentState = this.STATE_FX_PLAYING;

                // Identify discard index (last drawn)
                const discardIdx = this.cpu.hand.length - 1;

                this.sequencing = {
                    active: true,
                    timer: 0,
                    currentStep: 0,
                    steps: [
                        { type: 'FX', asset: 'fx/riichi', x: BattleConfig.POPUP.x, y: BattleConfig.POPUP.y, slideFrom: 'RIGHT', scale: 1.0 },
                        { type: 'MUSIC', id: 'audio/bgm_tension', loop: true }, // Music update handled here
                        { type: 'WAIT', duration: 60 },
                        {
                            type: 'CALLBACK', callback: () => {
                                // Finish Sequence
                                this.sequencing.active = false;
                                // Proceed to Discard
                                this.discardTileCPU(discardIdx);
                            }
                        }
                    ]
                };
                return; // Stop CPU turn logic here
            }
        }

        // 3. Decide Discard
        // If Riichi (existing state), discard drawn tile
        if (this.cpu.isRiichi) {
            this.discardTileCPU(this.cpu.hand.length - 1);
        } else {
            const context = {
                discards: this.discards,
                opponentRiichi: this.p1.isRiichi
            };
            const discardIdx = AILogic.decideDiscard(this.cpu.hand, difficulty, this.cpu.aiProfile, context);
            this.discardTileCPU(discardIdx);
        }
    },

    discardTileCPU: function (index) {
        console.log(`CPU discards index ${index} `);
        this.events.push({ type: 'DISCARD', player: 'CPU' });
        const discarded = this.cpu.hand.splice(index, 1)[0];
        discarded.owner = 'cpu';
        if (this.cpu.declaringRiichi) {
            discarded.isRiichi = true;
            this.cpu.declaringRiichi = false;
        }
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
                // Manually proceed to next turn logic (Fixing executeAction state check issue)
                this.turnCount++;
                this.checkRoundEnd();

                if (this.currentState === this.STATE_NAGARI || this.currentState === this.STATE_MATCH_OVER) return; // Round ended

                console.log("Riichi Auto-Draw");
                this.playerDraw();
                return;
            }

            this.currentState = this.STATE_ACTION_SELECT;
            this.actionTimer = 0;
            this.selectedActionIndex = 0;
        } else {
            this.turnCount++;

            this.checkRoundEnd();
            if (this.currentState === this.STATE_NAGARI || this.currentState === this.STATE_MATCH_OVER) return; // Transitioned to End State

            // Check Riichi Auto Draw
            if (this.p1.isRiichi) {
                console.log("Riichi Auto-Draw");
                this.currentState = this.STATE_PLAYER_TURN; // Will trigger logic? No, PLAYER_TURN just waits.
                // We need to CALL playerDraw explicitly or setup state such that it draws.
                // currentState=PLAYER_TURN -> updateLogic -> ?
                // updateLogic just checks timers.
                // We should call playerDraw directly logic?
                // Logic: playerDraw sets state to PLAYER_TURN.
                this.playerDraw();
            } else {
                // Transition to Wait for Draw
                this.currentState = this.STATE_WAIT_FOR_DRAW;
                this.timer = 0;
            }
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
        this.events.push({ type: 'DISCARD', player: 'P1' });
        const discarded = this.p1.hand.splice(index, 1)[0];
        discarded.owner = 'p1'; // Mark owner
        if (this.p1.declaringRiichi) {
            discarded.isRiichi = true;
            this.p1.declaringRiichi = false;
        }
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
        // Rule: Ron is allowed ONLY if Riichi is declared (same as player)
        // This prevents Ron after Pon (since Pon makes hand open and prevents Riichi)
        // Check if adding this tile completes the hand
        const checkHand = [...this.getFullHand(this.cpu), discardedTile];
        const win = YakuLogic.checkYaku(checkHand, this.cpu.id);
        if (win && this.cpu.isRiichi) { // Added Riichi requirement
            console.log("CPU RON!");
            this.showPopup('RON');
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

        if (pairCount >= 2 && !this.cpu.isRiichi) {
            const difficulty = BattleConfig.RULES.AI_DIFFICULTY;
            if (AILogic.shouldPon(this.cpu.hand, discardedTile, difficulty, this.cpu.aiProfile)) {
                this.executeCpuPon(discardedTile);
                return true;
            }
        }

        return false;
    },

    executeCpuPon: function (tile) {
        console.log("CPU Calls PON!", tile.type);
        this.showPopup('PON');
        // Sound handled by showPopup -> FX event
        // this.events.push({ type: 'SOUND', id: 'audio/call' });
        // this.events.push({ type: 'SOUND', id: 'audio/pon' }); // Handled by showPopup

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





    // View proxies removed (Use BattleRenderer directly)

    checkPlayerActions: function (discardedTile) {
        this.possibleActions = [];
        const hand = this.p1.hand;
        const fullHand = this.getFullHand(this.p1);

        // 1. Check PON (Pair matches discard)
        let matchCount = 0;
        hand.forEach(t => {
            if (t.type === discardedTile.type) matchCount++;
        });
        if (matchCount >= 2 && this.turnCount !== 1 && this.turnCount < 20 && !this.p1.isRiichi) {
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

        if (!this.p1.isRiichi && isMenzen && hand.length >= 2 && this.turnCount < 20) {
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

        // Riichi Enforcement: Must discard drawn tile (last one)
        if (this.p1.isRiichi) {
            console.log("[Auto-Select] Player is Riichi. Auto-Discard drawn tile.");
            this.discardTile(this.p1.hand.length - 1);
            return;
        }

        // Auto-Riichi Check
        if (this.p1.isMenzen && this.p1.hand.length >= 2) {
            let canRiichi = false;
            let riichiDiscardIndex = -1;

            for (let i = 0; i < this.p1.hand.length; i++) {
                const tempHand = [...this.p1.hand];
                tempHand.splice(i, 1);
                if (this.checkTenpai(tempHand)) {
                    canRiichi = true;
                    riichiDiscardIndex = i;
                    break;
                }
            }

            if (canRiichi) {
                console.log("[Auto-Select] Auto-Riichi!");
                this.p1.isRiichi = true;
                this.p1.declaringRiichi = true;
                this.showPopup('RIICHI');
                this.events.push({ type: 'SOUND', id: 'audio/riichi' });
                this.updateBattleMusic();
                this.discardTile(riichiDiscardIndex);
                return;
            }
        }

        try {
            // Delegate to AI Logic
            // Use 'NORMAL' difficulty as standard auto-play
            const context = {
                discards: this.discards,
                opponentRiichi: this.cpu.isRiichi // Auto-play defends against CPU Riichi
            };
            const discardIdx = AILogic.decideDiscard(this.p1.hand, BattleConfig.RULES.AI_DIFFICULTY, null, context);

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
            } else if (action.type === 'PASS') {
                console.log("Player Passed.");
                // Turn count increment only if we are ending CPU turn?
                // CPU discarded -> We checked actions -> Pass.
                // CPU turn IS ending.
                this.turnCount++;

                this.checkRoundEnd();
                if (this.currentState !== this.STATE_ACTION_SELECT) return; // Transitioned to End State (from Action Select context)

                // Check Riichi Auto Draw
                if (this.p1.isRiichi) {
                    console.log("Riichi Auto-Draw");
                    this.playerDraw();
                } else {
                    this.currentState = this.STATE_WAIT_FOR_DRAW; // Manual Draw
                    this.timer = 0;
                }
                // Clear actions
                this.possibleActions = [];
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
                // this.events.push({ type: 'SOUND', id: 'audio/pon' }); // Handled by showPopup

                // Force Discard State (Turn continues but starts at discard phase)
                this.currentState = this.STATE_PLAYER_TURN;
                this.timer = 0;
                this.hoverIndex = this.p1.hand.length - 1; // Hover last tile
            }

        } else if (action.type === 'RIICHI') {
            this.p1.isRiichi = true;
            this.p1.declaringRiichi = true; // Mark next discard
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

            // Clear possibleActions to allow progression
            this.possibleActions = [];

            // Update BGM immediately (Tension or Showdown)
            this.updateBattleMusic();

            // Go to discard
            this.currentState = this.STATE_PLAYER_TURN;
            console.log("Riichi Declared! Target Index:", this.riichiTargetIndex);

        } else if (action.type === 'TSUMO') {
            const fullHand = this.getFullHand(this.p1);
            console.log("Excuting TSUMO. Hand:", fullHand.map(t => t.type), "ID:", this.p1.id);
            this.showPopup('TSUMO');
            this.p1Character.setState('joy');
            this.cpuCharacter.setState('ko');

            // Tsumo: Tile is already in hand
            this.winningYaku = YakuLogic.checkYaku(fullHand, this.p1.id);

            if (this.winningYaku) {
                console.log("Winning Yaku Found:", this.winningYaku);
                const score = this.calculateScore(this.winningYaku.score, this.p1.isMenzen);
                this.pendingDamage = { target: 'CPU', amount: score };
                this.startWinSequence('TSUMO', 'P1', score);
            } else {
                console.error("CRITICAL: TSUMO allowed but checkYaku failed during execution!");
                // Fallback to prevent soft-lock
                const score = 1000;
                this.winningYaku = { yaku: ['Unknown Yaku'], score: score };
                this.startWinSequence('TSUMO', 'P1', score);
            }

        } else if (action.type === 'RON') {
            console.log("Excuting RON.");
            this.showPopup('RON');
            this.p1Character.setState('joy');
            this.cpuCharacter.setState('ko');

            const fullHand = this.getFullHand(this.p1);
            const winningTile = this.discards[this.discards.length - 1];
            const finalHand = [...fullHand, winningTile];

            this.winningYaku = YakuLogic.checkYaku(finalHand, this.p1.id);
            if (this.winningYaku) {
                console.log("Winning Yaku Found:", this.winningYaku);
                const score = this.calculateScore(this.winningYaku.score, this.p1.isMenzen);
                this.pendingDamage = { target: 'CPU', amount: score };
                this.startWinSequence('RON', 'P1', score);
            } else {
                console.error("CRITICAL: RON allowed but checkYaku failed during execution!");
                // Fallback
                const score = 1000;
                this.winningYaku = { yaku: ['Unknown Yaku'], score: score };
                this.startWinSequence('RON', 'P1', score);
            }
        }

        // Action blocks set the correct next state.
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



    handleMenuSelection: function (selectedItem) {
        console.log("Selected Menu Item:", selectedItem);
        const selectedId = selectedItem.id;

        if (selectedId === 'HELP') {
            const yakuContainer = document.getElementById('yaku-container');
            if (yakuContainer) {
                const isHidden = yakuContainer.classList.contains('hidden');
                yakuContainer.classList.toggle('hidden');

                // Sync toolbar button state
                const yakuBtn = document.getElementById('yaku-btn');
                if (yakuBtn) {
                    yakuBtn.classList.remove('toggle-on', 'toggle-off');
                    yakuBtn.classList.add(isHidden ? 'toggle-on' : 'toggle-off');
                }

                if (isHidden) {
                    // Reload iframe src to force scroll to anchor
                    const iframe = document.getElementById('yaku-frame');
                    if (iframe) {
                        iframe.src = iframe.src;
                    }
                }
            } else {
                window.open('https://atah.io/haiyuki_manual/index.html#yaku', '_blank', 'width=640,height=800,status=no,toolbar=no');
            }
        } else if (selectedId === 'AUTO') {
            if (this.lastStateBeforeMenu !== this.STATE_PLAYER_TURN) {
                console.log("Auto-select ignored: Not player turn");
                // Optional: Play error sound
            } else {
                this.toggleBattleMenu(); // Close menu
                this.performAutoTurn();
                return; // Prevent double toggle
            }
        } else if (selectedId === 'RESTART') {
            // Restart Round Strategy
            if (confirm("정말로 이 라운드를 다시 시작할까요?")) {
                this.toggleBattleMenu(); // Close menu
                this.startRound();
            }
        } else if (selectedItem.type === 'SKILL') {
            if (selectedItem.disabled) {
                console.log(`Skill Disabled: ${selectedItem.label}`);
                // Play error sound?
                return; // Do not close menu
            }
            console.log(`Skill Selected: ${selectedItem.label} (${selectedId})`);
            // Skill Logic Placeholder
        }

        this.toggleBattleMenu();
    },

    // Draw methods delegated to BattleRenderer




    getFullHand: function (player) {
        let tiles = [...player.hand];
        player.openSets.forEach(set => {
            tiles = tiles.concat(set.tiles);
        });
        return tiles;
    },

    confirmDraw: function () {
        if (this.currentState !== this.STATE_WAIT_FOR_DRAW) return;
        this.playerDraw();
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
        if (this.currentBgm !== targetBgm) {
            console.log(`Switching Battle BGM to: ${targetBgm}`);
            this.currentBgm = targetBgm;
            this.events.push({ type: 'MUSIC', id: targetBgm, loop: true });
        }
    }
};

