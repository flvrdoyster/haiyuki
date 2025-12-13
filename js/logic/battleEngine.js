// Battle UI Configuration is now in js/data/battleUIConfig.js

const BattleEngine = {
    // States
    STATE_INIT: 0,
    STATE_DEALING: 1,      // Start of Round
    STATE_WAIT_FOR_DRAW: 2,
    STATE_PLAYER_TURN: 3,
    STATE_ACTION_SELECT: 4, // Interjection (Pon/Ron)
    STATE_BATTLE_MENU: 5,   // Overlay
    STATE_CPU_TURN: 6,
    STATE_FX_PLAYING: 7,    // Animations / Inter-turn
    STATE_DAMAGE_ANIMATION: 8, // Result Processing
    STATE_WIN: 9,           // Round End
    STATE_LOSE: 10,
    STATE_NAGARI: 11,
    STATE_MATCH_OVER: 12,   // Game End

    currentState: 0,
    timer: 0,
    stateTimer: 0,
    lastState: -1,
    timeouts: [],

    setTimeout: function (callback, delay) {
        const id = setTimeout(() => {
            // Remove from list when executed
            this.timeouts = this.timeouts.filter(t => t !== id);
            callback();
        }, delay);
        this.timeouts.push(id);
        return id;
    },

    clearTimeouts: function () {
        this.timeouts.forEach(id => clearTimeout(id));
        this.timeouts = [];
        console.log("All BattleEngine timers cleared.");
    },

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
    // selectedMenuIndex: 0, // Moved to BattleMenuSystem 

    init: function (data) {
        // Prevent Context Menu on Canvas (Right Click)
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.oncontextmenu = (e) => {
                e.preventDefault();
                // BattleMenuSystem.toggle(); // Handled by Input in BattleScene
            };
        }

        this.clearTimeouts();

        // ... (rest of init)
        this.playerIndex = data.playerIndex || 0;
        this.cpuIndex = data.cpuIndex || 0;
        console.log(`BattleScene Init. P1 Index: ${this.playerIndex}, CPU Index: ${this.cpuIndex}`);
        console.log(`CharacterData Length: ${CharacterData.length}`);
        CharacterData.forEach((c, i) => console.log(`[${i}] ${c.name} (${c.id})`));

        const p1Data = CharacterData.find(c => c.index === this.playerIndex) || CharacterData[this.playerIndex];
        const cpuData = CharacterData.find(c => c.index === this.cpuIndex) || CharacterData[this.cpuIndex];
        console.log(`BattleScene Resolved. P1: ${p1Data ? p1Data.name : 'null'}, CPU: ${cpuData ? cpuData.name : 'null'}`);

        // Assign Character IDs and Names for Logic
        if (p1Data) {
            this.p1.id = p1Data.id;
            this.p1.name = p1Data.name;
        }
        if (cpuData) {
            this.cpu.id = cpuData.id;
            this.cpu.name = cpuData.name;
            this.cpu.aiProfile = cpuData.aiProfile || null;
            if (this.cpu.aiProfile) console.log(`Loaded AI Profile for ${cpuData.name}:`, this.cpu.aiProfile.type);
        }

        // Menu construction moved to BattleMenuSystem
        BattleMenuSystem.init(this);
        // this.menuItems = []; // Removed


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
        // BGM (Basic Battle Theme) - REMOVED: Managed by startRound() events to prevent double-play
        // Assets.playMusic('audio/bgm_basic');

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
        this.roundHistory = []; // Initialize Round History

        // Init Dialogue States
        this.p1Dialogue = { active: false, text: '', timer: 0 };
        this.cpuDialogue = { active: false, text: '', timer: 0 };

        // Start Dialogue (Fresh Match Only)
        // 50:50 Chance for who speaks first
        // 50:50 Chance for who speaks first
        if (!data.isNextRound) {
            this.setTimeout(() => {
                const who = (Math.random() < 0.5) ? 'P1' : 'CPU';
                this.triggerDialogue(who, 'MATCH_START');
            }, 800);
        }

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

        // Conditional Steps
        if (who === 'P1' && this.p1.isRiichi) {
            steps.push({ type: 'REVEAL_URA' });
        }

        if (who === 'P1') {
            // WIN: Play Configured Sound
            const sound = BattleConfig.RESULT.TYPES.WIN.sound;
            if (sound) steps.push({ type: 'SOUND', id: sound });
        } else {
            // LOSE: Play Configured Sound
            const sound = BattleConfig.RESULT.TYPES.LOSE.sound;
            if (sound) steps.push({ type: 'SOUND', id: sound });
        }

        // UPDATE STATE with Final Score for Renderer
        if (this.winningYaku) {
            this.winningYaku.score = score;
        }

        // Calculate Bonuses
        const winnerHand = (who === 'P1') ? this.getFullHand(this.p1) : this.getFullHand(this.cpu);
        const bonusResult = this.calculateBonuses(winnerHand, type);
        const finalScore = score + bonusResult.score;

        // FIX: Update pending damage with final score (including bonuses)
        if (this.pendingDamage) {
            this.pendingDamage.amount = finalScore;
        }

        // Record Round History
        const resultData = {
            round: this.currentRound,
            result: (who === 'P1') ? '승' : '패',
            yaku: (this.winningYaku && this.winningYaku.yaku && this.winningYaku.yaku.length > 0) ? this.winningYaku.yaku[0] : type
        };
        this.roundHistory.push(resultData);
        console.log(`Base Score: ${score}, Bonus: ${bonusResult.score}, Final: ${finalScore}`);
        console.log(`Bonuses: ${bonusResult.names.join(', ')}`);

        const winType = (who === 'P1') ? 'WIN' : 'LOSE';

        // Trigger Win/Lose Dialogue
        if (who === 'P1') {
            this.triggerDialogue('P1', 'WIN_CALL');
            this.setTimeout(() => this.triggerDialogue('CPU', 'LOSE_CALL'), 1200);
        } else {
            this.triggerDialogue('CPU', 'WIN_CALL');
            this.setTimeout(() => this.triggerDialogue('P1', 'LOSE_CALL'), 1200);
        }

        this.resultInfo = {
            type: winType,
            score: finalScore,
            yakuName: this.winningYaku ? this.winningYaku.yaku[0] : '',
            yakuScore: this.winningYaku ? this.winningYaku.score : 0, // Pass base score
            bonuses: bonusResult.details, // Pass Details Array
            bonusScore: bonusResult.score
        };

        steps.push({ type: 'STATE', state: (who === 'P1' ? this.STATE_WIN : this.STATE_LOSE), score: finalScore });

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

        let damage = 0;
        let damageMsg = "데미지 없음";

        if (p1Tenpai && !cpuTenpai) {
            // Player Wins (Tenpai vs Noten) -> In game terms, usually small damage or just score transfer.
            // Let's deal standard Tenpai damage (e.g. 1000 or 1500 or 3000)
            damage = 1000; // Flat 1000 for Tenpai win
            this.pendingDamage = { target: 'CPU', amount: damage };
            damageMsg = `데미지: ${damage}`;
        } else if (!p1Tenpai && cpuTenpai) {
            // CPU Wins (Tenpai vs Noten)
            damage = 1000;
            this.pendingDamage = { target: 'P1', amount: damage };
            damageMsg = `데미지: -${damage}`;
        } else {
            // Draw (Both Tenpai or Both Noten)
            damage = 0;
            damageMsg = "무승부";
        }

        return { msg: damageMsg, damage: damage };
    },



    startNagariSequence: function () {
        this.currentState = this.STATE_FX_PLAYING;
        this.events.push({ type: 'STOP_MUSIC' });

        // Tenpai checks
        const p1Tenpai = this.checkTenpai(this.getFullHand(this.p1), false);
        const cpuTenpai = this.checkTenpai(this.getFullHand(this.cpu), false);

        console.log(`P1 Tenpai: ${p1Tenpai}, CPU Tenpai: ${cpuTenpai}`);

        // Determine Damage
        // Determine Damage
        const damageResult = this.calculateTenpaiDamage(p1Tenpai, cpuTenpai);
        const damageMsg = damageResult.msg;
        const damage = damageResult.damage;
        console.log(`Nagari! Damage Msg: ${damageMsg}`);

        const p1Tx = p1Tenpai ? BattleConfig.STATUS_TEXTS.TENPAI : BattleConfig.STATUS_TEXTS.NOTEN;
        const cpuTx = cpuTenpai ? BattleConfig.STATUS_TEXTS.TENPAI : BattleConfig.STATUS_TEXTS.NOTEN;

        // Expressions
        if (p1Tenpai) this.p1Character.setState('smile');
        else this.p1Character.setState('shocked');

        if (cpuTenpai) this.cpuCharacter.setState('smile');
        else this.cpuCharacter.setState('shocked');

        // Create result object
        const resultData = {
            round: this.currentRound,
            result: '무승부', // Draw
            yaku: '-'
        };
        this.roundHistory.push(resultData);

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

        // Logic for Tenpai/Noten
        const steps = [
            {
                type: 'CALLBACK', callback: () => {
                    this.showPopup('NAGARI', { blocking: true });
                    const sound = BattleConfig.RESULT.TYPES.NAGARI.sound;
                    if (sound) this.events.push({ type: 'SOUND', id: sound });
                }
            },
            { type: 'WAIT', duration: 30 },
            { type: 'REVEAL_HAND' },
            { type: 'WAIT', duration: 30 },
            {
                type: 'STATE',
                state: this.STATE_NAGARI,
                score: damage
            }
        ];

        this.sequencing = {
            active: true,
            timer: 0,
            currentStep: 0,
            steps: steps
        };

        // Add Tenpai/Noten text to resultInfo for Renderer to optionally use?
        // Or just the damage msg.
        this.resultInfo = {
            type: 'NAGARI',
            damageMsg: damageMsg,
            score: damage,
            bonuses: [
                { name: this.p1.name || '플레이어', score: p1Tx },
                { name: this.cpu.name || '상대', score: cpuTx }
            ],
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
        } else if (step.type === 'REVEAL_URA') {
            this.uraDoraRevealed = true;
            this.sequencing.currentStep++;
        } else if (step.type === 'STATE') {
            this.currentState = step.state;
            this.sequencing.active = false;
        } else if (step.type === 'MUSIC') {
            // New Step: Play Music
            this.events.push({ type: 'MUSIC', id: step.id, loop: step.loop });
            this.sequencing.currentStep++;
        } else if (step.type === 'SOUND') {
            this.events.push({ type: 'SOUND', id: step.id });
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
        } else if (step.type === 'DEAL') {
            // Deal To Players
            // step.count, step.sound
            const newP1 = this.drawTiles(step.count);
            const newCpu = this.drawTiles(step.count);
            this.p1.hand = this.p1.hand.concat(newP1);
            this.cpu.hand = this.cpu.hand.concat(newCpu);

            // Should playing sound here or via sequence? 
            // Sequence 'SOUND' usually used, but let's allow inline for sync
            if (step.sound) {
                this.events.push({ type: 'SOUND', id: step.sound });
            }
            this.sequencing.currentStep++;
        } else if (step.type === 'FLIP_HAND') {
            // Reveal player hand (was face down during deal)
            this.p1.isFaceDown = false;
            this.sortHand(this.p1.hand); // Sort immediately on reveal
            if (step.sound) {
                this.events.push({ type: 'SOUND', id: step.sound });
            }
            this.sequencing.currentStep++;
        }
    },








    nextRound: function () {
        console.log("Starting Next Round...");
        this.currentRound++;
        this.startRound();
    },

    confirmResult: function () {
        // User clicked to confirm result (Win/Lose/Nagari)
        // Transition to Damage Animation or Next Round or Match Over

        // 1. Calculate Damage if needed (Usually done in checkRoundEnd, stored in resultInfo)
        // Actually, checkRoundEnd sets currentState. 
        // We just need to move to DAMAGE_ANIMATION state to play visual fx.

        this.currentState = this.STATE_DAMAGE_ANIMATION;
        this.timer = 0;
        this.stateTimer = 0; // Reset state timer
    },
    matchOver: function (winner) {
        console.log(`Match Over! Winner: ${winner}`);
        this.currentState = this.STATE_MATCH_OVER;
        this.timer = 0;
        this.stateTimer = 0;
        this.matchWinner = winner; // Store for transition

        // Stop BGM
        this.events.push({ type: 'STOP_MUSIC' });

        if (winner === 'P1') {
            this.resultInfo = { type: 'MATCH_WIN', history: this.roundHistory };
            const sound = BattleConfig.RESULT.TYPES.MATCH_WIN.sound;
            if (sound) this.events.push({ type: 'SOUND', id: sound });
            // Remain in STATE_MATCH_OVER for P1 Win (Victory Screen)
        } else {
            // LOSE: Skip Result Screen, Go directly to Continue
            // Play sound if configured
            const sound = BattleConfig.RESULT.TYPES.MATCH_LOSE ? BattleConfig.RESULT.TYPES.MATCH_LOSE.sound : 'audio/lose';
            if (sound) this.events.push({ type: 'SOUND', id: sound });

            this.proceedFromMatchOver();
            return; // Exit
        }
    },

    proceedFromMatchOver: function () {
        const winner = this.matchWinner;

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
            // Update Global Continue Count
            Game.continueCount++;

            Game.changeScene(ContinueScene, {
                playerIndex: this.playerIndex,
                cpuIndex: this.cpuIndex,
                defeatedOpponents: this.defeatedOpponents,
                isNextRound: false // Fresh rematch if continued
            });
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

        // P1 starts Face Down during dealing
        this.p1.isFaceDown = true;

        // Init Hands - Modified for Realistic Dealing (4-4-2-1)
        // this.p1.hand = this.drawTiles(11);
        // this.cpu.hand = this.drawTiles(11);
        this.cpu.isRevealed = false; // Reset reveal status
        // this.sortHand(this.p1.hand); // Sorting happens after deal reveal

        // Start Dealing Sequence
        this.currentState = this.STATE_DEALING;
        this.sequencing = {
            active: true,
            currentStep: 0,
            timer: 0,
            steps: [
                { type: 'WAIT', duration: 30 },
                { type: 'DEAL', count: 4, sound: 'audio/deal' },
                { type: 'WAIT', duration: 20 },
                { type: 'DEAL', count: 4, sound: 'audio/deal' },
                { type: 'WAIT', duration: 20 },
                { type: 'DEAL', count: 2, sound: 'audio/deal' },
                { type: 'WAIT', duration: 20 },
                { type: 'DEAL', count: 1, sound: 'audio/deal' },
                { type: 'WAIT', duration: 30 },
                { type: 'FLIP_HAND', sound: 'audio/flip' }, // Reveal & Sort
                { type: 'WAIT', duration: 10 },
                { type: 'STATE', state: this.STATE_INIT } // Hand off to INIT to start turn logic
            ]
        };

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
        this.riichiTargetIndex = -1; // Reset Riichi Lock (Bug Fix)
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

        // Generate Deck based on PaiData config
        PaiData.TYPES.forEach(type => {
            for (let i = 0; i < PaiData.TILE_COUNT_PER_TYPE; i++) {
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

        // Update Dialogue (Always run)
        this.updateDialogue();

        // Music Update
        // Only update battle music during active battle states
        // Refactored to allow arbitrary state order
        const activeMusicStates = [
            this.STATE_DEALING,
            this.STATE_WAIT_FOR_DRAW,
            this.STATE_PLAYER_TURN,
            this.STATE_ACTION_SELECT,
            this.STATE_BATTLE_MENU,
            this.STATE_CPU_TURN
        ];

        if (activeMusicStates.includes(this.currentState) && !this.sequencing.active) {
            this.updateBattleMusic();
        }

        // AUTO TEST LOGIC
        if (Game.isAutoTest && this.currentState === this.STATE_PLAYER_TURN && this.timer > 5) {
            this.performAutoTurn();
            return;
        }

        // RIICHI AUTO-PLAY LOGIC (Normal Game)
        if (!Game.isAutoTest && this.p1.isRiichi && this.currentState === this.STATE_PLAYER_TURN && this.timer > 45) {
            // console.log("Riichi Auto-Discard (Normal)");
            this.discardTile(this.p1.hand.length - 1);
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

        // Check Round End Condition (Deck Empty etc)
        // Ensure we are not already in an end sequence
        const endStates = [
            this.STATE_WIN,
            this.STATE_LOSE,
            this.STATE_NAGARI,
            this.STATE_MATCH_OVER,
            this.STATE_FX_PLAYING,
            this.STATE_DAMAGE_ANIMATION
        ];

        if (!endStates.includes(this.currentState) && this.currentState !== this.STATE_INIT) {
            if (this.timer % 30 === 0) {
                this.checkRoundEnd();
            }
        }

        switch (this.currentState) {
            case this.STATE_INIT:
                if (this.timer > (Game.isAutoTest ? 10 : 60)) { // Speed up init
                    if (this.turnCount === 1) {
                        // Fix: Go to Wait State to show Draw Button
                        this.currentState = this.STATE_WAIT_FOR_DRAW;
                        this.timer = 0;
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

                // Auto Test: Wait for user input for actions (Ron/Pon/Riichi)
                // if (Game.isAutoTest && this.actionTimer <= 0) { ... } -> REMOVED
                break;

            case this.STATE_FX_PLAYING:
                // Blocked until FX finishes
                break;

            case this.STATE_CPU_TURN:
                if (this.timer > (Game.isAutoTest ? 5 : 20)) { // Speed up CPU
                    this.cpuDraw();
                }
                break;

            case this.STATE_WIN:
            case this.STATE_LOSE:
                if (Input.isMouseJustPressed() || Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.ENTER)) {
                    this.confirmResult();
                }
                break;

            case this.STATE_NAGARI:
                if (Input.isMouseJustPressed() || Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.ENTER)) {
                    this.confirmResult();
                }
                break;

            case this.STATE_MATCH_OVER:
                // Wait for input to transition
                if (this.stateTimer > 60 && (Input.isMouseDown || Input.isDown(Input.SPACE) || Input.isDown(Input.ENTER) || Input.isMouseJustPressed())) {
                    this.proceedFromMatchOver();
                }
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
        // Guard: Prevent double triggering if already ending/in sequence
        if (this.currentState === this.STATE_FX_PLAYING ||
            this.currentState === this.STATE_NAGARI ||
            this.currentState === this.STATE_MATCH_OVER) {
            return;
        }

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
        // Fix: If CPU just Pon-ed, they don't draw, they just discard.
        if (this.cpu.needsToDiscard) {
            console.log("CPU needs to discard (After Pon), skipping draw.");
            this.cpu.needsToDiscard = false;
        } else {
            const t = this.drawTiles(1);
            if (t.length > 0) {
                // console.log("CPU Draws:", t[0].type); // Log
                this.events.push({ type: 'DRAW', player: 'CPU' });
                this.cpu.hand.push(t[0]);
            }
        }

        // CPU AI Logic
        const difficulty = BattleConfig.RULES.AI_DIFFICULTY;

        // 1. Check Tsumo
        if (YakuLogic.checkYaku(this.cpu.hand, this.cpu.id)) {
            this.winningYaku = YakuLogic.checkYaku(this.cpu.hand, this.cpu.id);
            if (this.winningYaku) {
                // console.log("CPU TSUMO!");
                this.showPopup('TSUMO', { blocking: true });
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
            let riichiDiscardIndex = -1;

            for (let i = 0; i < this.cpu.hand.length; i++) {
                const tempHand = [...this.cpu.hand];
                tempHand.splice(i, 1);
                if (this.checkTenpai(tempHand, this.cpu.id)) {
                    canRiichi = true;
                    riichiDiscardIndex = i; // Store the correct discard for Tenpai
                    break;
                }
            }

            if (canRiichi && AILogic.shouldRiichi(this.cpu.hand, BattleConfig.RULES.AI_DIFFICULTY, this.cpu.aiProfile)) {
                // console.log(`CPU Riichi! Will discard index: ${riichiDiscardIndex}`);
                this.cpu.isRiichi = true;
                this.cpu.declaringRiichi = true; // Mark next discard

                // Directly set BGM state to ensure overwrite logic works
                this.currentBgm = 'audio/bgm_tension';

                // Start Riichi Sequence (Delay Discard)
                this.currentState = this.STATE_FX_PLAYING;

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
                                this.discardTileCPU(riichiDiscardIndex);
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
                opponentRiichi: this.p1.isRiichi,
                doras: this.doras, // Pass Doras for AI
                turnCount: this.turnCount
            };
            const difficulty = BattleConfig.RULES.AI_DIFFICULTY;
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

        let hasAction = false;
        // Check if Player can Ron
        // AUTO LOSE MODE: Player Cannot Ron
        if (!Game.isAutoLose && this.checkPlayerActions(discarded)) {
            console.log("Player has actions on CPU discard");
            // Riichi Auto-Win (Ron)
            if (this.p1.isRiichi) {
                const ronAction = this.possibleActions.find(a => a.type === 'RON');
                if (ronAction) {
                    console.log("Riichi Auto-Ron!");
                    this.executeAction(ronAction);
                    return;
                }
            } else {
                // Normal user interaction or other logic
                this.currentState = this.STATE_ACTION_SELECT;
                this.actionTimer = 0;
                this.selectedActionIndex = 0;
                hasAction = true;
            }
        }

        if (!hasAction) {
            this.turnCount++;
            this.checkRoundEnd();
            if (this.currentState === this.STATE_NAGARI || this.currentState === this.STATE_MATCH_OVER) return; // Transitioned to End State

            // Check Riichi Auto Draw
            if (this.p1.isRiichi) {
                console.log("Riichi Auto-Draw");
                this.currentState = this.STATE_PLAYER_TURN; // Will trigger logic? No, PLAYER_TURN just waits.
                // We need to CALL playerDraw explicitly or setup state such that it draws.
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
            this.riichiTargetIndex = -1; // Reset Logic
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
            this.showPopup('RON', { blocking: true });
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

        // Require at least 3 tiles in hand to Pon (need 1 tile left to discard)
        if (pairCount >= 2 && !this.cpu.isRiichi && this.cpu.hand.length >= 3) {
            const difficulty = BattleConfig.RULES.AI_DIFFICULTY;
            if (AILogic.shouldPon(this.cpu.hand, discardedTile, difficulty, this.cpu.aiProfile)) {
                this.executeCpuPon(discardedTile);
                return true;
            }
        }

        return false;
    },

    executeCpuPon: function (tile) {
        this.currentState = this.STATE_FX_PLAYING;
        this.setTimeout(() => {
            console.log("CPU Calls PON!", tile.type);
            this.showPopup('PON', { blocking: true });

            // Remove 2 matching tiles logic
            let matches = [];
            let keep = [];

            // Find matches first
            this.cpu.hand.forEach(t => {
                if (t.type === tile.type && t.color === tile.color && matches.length < 2) {
                    matches.push(t);
                } else {
                    keep.push(t);
                }
            });

            if (matches.length >= 2) {
                this.cpu.hand = keep;

                // Add Open Set
                this.cpu.openSets.push({
                    type: 'PON',
                    tiles: [matches[0], matches[1], tile]
                });

                this.cpu.isMenzen = false;

                // Take from discards
                this.discards.pop();

                // Setup Discard Phase
                this.currentState = this.STATE_CPU_TURN;
                this.timer = 30; // Short delay before discard
            }
        }, 450);
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
        // Require at least 3 tiles in hand to Pon (need 1 tile left to discard)
        if (matchCount >= 2 && this.turnCount !== 1 && this.turnCount < 20 && !this.p1.isRiichi && hand.length >= 3) {
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
        // Optimization: Cache result check to strictly avoid re-calculation on same state
        // This is critical because checkTenpai -> checkYaku is combinatorial (O(N!))

        // Generate State Key
        const currentHandKey = this.p1.hand.map(t => t.type + t.color).sort().join('|') +
            `_${this.p1.openSets.length}_${this.p1.isRiichi}_${this.turnCount}`;

        if (this._cachedSelfActionsKey === currentHandKey) {
            // Restore cached actions
            if (this._cachedSelfActions) {
                this.possibleActions = [...this._cachedSelfActions];
                return this.possibleActions.length > 0;
            }
        }

        this.possibleActions = [];
        const hand = this.p1.hand;
        const fullHand = this.getFullHand(this.p1);

        // 1. Tsumo
        if (YakuLogic.checkYaku(fullHand, this.p1.id)) {
            this.possibleActions.push({ type: 'TSUMO', label: '쯔모' });
        }

        // 2. Riichi
        // Cond: Closed hand (isMenzen), Not already Riichi
        // Ruile: "Have 11 tiles" -> Draw 1 -> 12. Discard -> 11.
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
                // Optimization: Only run debug calculation if explicitly needed (or just log it once)
                // We leave it but note it's heavy.
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

            // Allow actions to be cached
            this._cachedSelfActionsKey = currentHandKey;
            this._cachedSelfActions = [...this.possibleActions];
            return true;
        }

        // Cache empty result
        this._cachedSelfActionsKey = currentHandKey;
        this._cachedSelfActions = [];
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
                this.showPopup('RIICHI', { blocking: true });
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
                this.currentState = this.STATE_FX_PLAYING;
                this.setTimeout(() => {
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
                    this.showPopup('PON', { blocking: true });
                    // this.events.push({ type: 'SOUND', id: 'audio/pon' }); // Handled by showPopup

                    // Force Discard State (Turn continues but starts at discard phase)
                    this.currentState = this.STATE_PLAYER_TURN;
                    this.timer = 0;
                    this.hoverIndex = this.p1.hand.length - 1; // Hover last tile
                }, 450);
            }
        } else if (action.type === 'RIICHI') {
            this.p1.isRiichi = true;
            this.p1.declaringRiichi = true; // Mark next discard
            this.showPopup('RIICHI', { blocking: true });

            this.triggerDialogue('P1', 'SELF_RIICHI');
            // 'ENEMY_RIICHI' for CPU is implicit via _REPLY check if we added strictly,
            // BUT Riichi is special. Let's rely on generic reply? 
            // Actually, for Riichi, the opponent usually reacts to the declaration.
            // So if P1 does SELF_RIICHI, CPU should do ENEMY_RIICHI.
            // My generic logic maps KEY -> KEY_REPLY. 
            // So SELF_RIICHI -> SELF_RIICHI_REPLY. 
            // BUT our data uses 'ENEMY_RIICHI' key for the opponent's reaction.
            // Let's adjust usage to match data:
            // Data has 'SELF_RIICHI' (My line) and 'ENEMY_RIICHI' (My line when enemy Riichis).
            // So when P1 triggers SELF_RIICHI, CPU should trigger ENEMY_RIICHI.
            // We need to manually trigger this reaction because the keys don't match the _REPLY pattern.
            setTimeout(() => {
                this.triggerDialogue('CPU', 'ENEMY_RIICHI');
            }, 1000);

            // Force BGM update immediately
            this.currentBgm = 'audio/bgm_showdown';
            this.events.push({ type: 'MUSIC', id: this.currentBgm, loop: true });
            // this.updateBattleMusic(); // Redundant now as we forced it

            // Expression: Smile -> Idle
            this.p1Character.setState('smile');
            setTimeout(() => {
                if (this.p1Character) this.p1Character.setState('idle');
            }, 1000); // 60 frames approx

            // Logic:
            // Smart Auto-Select: Evaluate all valid discards and pick the best one.
            const hand = this.p1.hand;
            let candidates = [];

            console.time('RiichiCalc'); // Performance Check

            for (let i = 0; i < hand.length; i++) {
                const temp = [...hand];
                temp.splice(i, 1);
                // Check if Tenpai is maintained
                if (this.checkTenpai(temp, false)) {
                    const metrics = this.getRiichiScore(i);
                    candidates.push({ index: i, ...metrics, tile: hand[i] });
                }
            }

            console.timeEnd('RiichiCalc'); // End Performance Check

            if (candidates.length > 0) {
                // Sort: Max Score DESC -> Wait Count DESC
                candidates.sort((a, b) => {
                    if (b.maxScore !== a.maxScore) return b.maxScore - a.maxScore;
                    return b.waitCount - a.waitCount;
                });

                const best = candidates[0];
                console.log("Riichi Smart Select Candidates:", candidates);
                console.log(`Selected Best: ${best.tile.type} (Score: ${best.maxScore}, Waits: ${best.waitCount})`);

                // Force Selection Logic (Original Style)
                const targetIdx = best.index;
                const tile = hand.splice(targetIdx, 1)[0];
                hand.push(tile);

                this.lastDrawGroupSize = 1; // Force visual gap
                this.riichiTargetIndex = hand.length - 1; // Strict target
            } else {
                console.error("Riichi declared but no valid discards found? Should not happen.");
                this.riichiTargetIndex = -1;
            }

            this.p1.riichiValidDiscards = null; // Clear manual list just in case

            // Update BGM immediately (Tension or Showdown)
            this.updateBattleMusic();

            // Go to discard
            this.currentState = this.STATE_PLAYER_TURN;
            console.log("Riichi Declared! Target Index:", this.riichiTargetIndex);

        } else if (action.type === 'TSUMO') {
            const fullHand = this.getFullHand(this.p1);
            console.log("Excuting TSUMO. Hand:", fullHand.map(t => t.type), "ID:", this.p1.id);
            this.showPopup('TSUMO', { blocking: true });
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
            this.showPopup('RON', { blocking: true });
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
            // Keep existing Riichi music (Overwrite logic)
            if (this.currentBgm === 'audio/bgm_tension') targetBgm = 'audio/bgm_tension';
            else targetBgm = 'audio/bgm_showdown';
        } else if (this.cpu.isRiichi) {
            targetBgm = 'audio/bgm_tension';
        } else if (this.p1.isRiichi) {
            targetBgm = 'audio/bgm_showdown';
        }

        // Only switch if different
        if (this.currentBgm !== targetBgm) {
            console.log(`Switching Battle BGM to: ${targetBgm}`);
            this.currentBgm = targetBgm;
            this.events.push({ type: 'MUSIC', id: targetBgm, loop: true });
        }
    },

    // --- Bonus Logic ---
    calculateBonuses: function (hand, winType) {
        let totalBonus = 0;
        let details = []; // Array of { name, score }

        // 1. Tenho (Heavenly Hand)
        // 1st Turn & Tsumo
        if (this.turnCount <= 1 && winType === 'TSUMO') {
            const s = 800;
            totalBonus += s;
            details.push({ name: '텐호 보너스', score: s });
        }

        // 2 & 3. Haitei / Houtei (Last Turn)
        // Check if it's the 20th turn (or last turn context)
        // Using strict 20 for now as requested. 
        if (this.turnCount >= 20) {
            if (winType === 'TSUMO') {
                const s = 800;
                totalBonus += s;
                details.push({ name: '해저 보너스', score: s });
            } else if (winType === 'RON') {
                const s = 800;
                totalBonus += s;
                details.push({ name: '하저 보너스', score: s });
            }
        }

        // 4. Dora
        // Check visible Doras
        let doraCount = 0;
        this.doras.forEach(dora => {
            hand.forEach(tile => {
                if (tile.type === dora.type && tile.color === dora.color) {
                    doraCount++;
                }
            });
        });

        // Check Ura Dora (Hidden) - Only if Riichi?
        if (this.p1.isRiichi) {
            // Ensure Ura Doras exist
            if (!this.uraDoras || this.uraDoras.length === 0) {
                this.uraDoras = [];
                // Generate 2 random Ura Doras safely (using deck logic might be better but simple random for now)
                for (let i = this.cpu.hand.length - 1; i >= 0; i--) {
                    const t = PaiData.TYPES[Math.floor(Math.random() * PaiData.TYPES.length)];
                    this.uraDoras.push({ type: t.id, color: t.color, img: t.img });
                }
            }

            this.uraDoras.forEach(dora => {
                hand.forEach(tile => {
                    if (tile.type === dora.type && tile.color === dora.color) {
                        doraCount++;
                    }
                });
            });
        }

        if (doraCount > 0) {
            const s = 400 * doraCount;
            totalBonus += s;
            details.push({ name: `도라 보너스 x${doraCount}`, score: s });
        }

        return { score: totalBonus, details: details, names: details.map(d => d.name) }; // Keep names key in case of legacy usage?
    },

    getRiichiScore: function (discardIdx) {
        // Simulate Discard
        const tempHand = [...this.p1.hand];
        tempHand.splice(discardIdx, 1);

        let maxScore = 0;
        let totalScore = 0;
        let waitCount = 0; // Number of unique tile types that win

        // Iterate ALL possible tiles to see if they complete the hand
        PaiData.TYPES.forEach(type => {
            // Add theoretical tile
            const testHand = [...tempHand, { type: type.id, color: type.color, img: type.img }];

            // Check Yaku (Win Condition?)
            // We use checkYaku directly. 
            // Note: checkYaku determines score based on completed hand.
            const result = YakuLogic.checkYaku(testHand, this.p1.id);
            if (result) {
                waitCount++;
                if (result.score > maxScore) maxScore = result.score;
                totalScore += result.score;
            }
        });

        return {
            maxScore: maxScore,
            avgScore: waitCount > 0 ? (totalScore / waitCount) : 0,
            waitCount: waitCount
        };
    },

    updateDialogue: function () {
        // P1
        if (this.p1Dialogue && this.p1Dialogue.active) {
            this.p1Dialogue.timer--;
            if (this.p1Dialogue.timer <= 0) {
                this.p1Dialogue.active = false;
                if (this.p1Character) this.p1Character.setTalking(false);
            }
        }
        // CPU
        if (this.cpuDialogue && this.cpuDialogue.active) {
            this.cpuDialogue.timer--;
            if (this.cpuDialogue.timer <= 0) {
                this.cpuDialogue.active = false;
                if (this.cpuCharacter) this.cpuCharacter.setTalking(false);
            }
        }
    },

    triggerDialogue: function (who, key) {
        // Resolve Character Data
        const charId = (who === 'P1') ? this.p1.id : this.cpu.id;
        const charData = CharacterData.find(c => c.id === charId);

        if (!charData || !charData.dialogue || !charData.dialogue[key]) {
            return;
        }

        const text = charData.dialogue[key];
        const state = (who === 'P1') ? this.p1Dialogue : this.cpuDialogue;
        const character = (who === 'P1') ? this.p1Character : this.cpuCharacter;

        // Reset & Activate
        state.active = true;
        state.text = text;
        state.timer = BattleConfig.DIALOGUE.life || 120;

        if (character) {
            character.setTalking(true);
        }

        console.log(`[Dialogue] ${who} (${charId}): ${text.replace(/\n/g, ' ')}`);

        // --- Generic Reply Logic ---
        // Exclude specific keys that have their own coupled logic
        const EXCLUDED_KEYS = ['SELF_RIICHI', 'ENEMY_RIICHI', 'WIN_CALL', 'LOSE_CALL'];

        if (!EXCLUDED_KEYS.includes(key) && !key.endsWith('_REPLY')) {
            const opponentWho = (who === 'P1') ? 'CPU' : 'P1';
            const replyKey = `${key}_REPLY`;

            // Check if opponent has this reply key
            const oppId = (who === 'P1') ? this.cpu.id : this.p1.id;
            const oppData = CharacterData.find(c => c.id === oppId);

            if (oppData && oppData.dialogue && oppData.dialogue[replyKey]) {
                // Schedule Reply
                this.setTimeout(() => {
                    // Check if battle is still active/valid?
                    this.triggerDialogue(opponentWho, replyKey);
                }, 1500); // 1.5 sec delay
            }
        }
    }
};

