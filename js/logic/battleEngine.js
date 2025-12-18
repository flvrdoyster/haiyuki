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
    STATE_TILE_EXCHANGE: 13, // Skill: Exchange Tiles

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

    },

    // Constants
    DELAY_DRAW: 60,
    DELAY_DISCARD_AUTO: 60,

    calculateScore: function (baseScore, isMenzen, attacker, defender) {
        let score = baseScore;

        // Open Hand Penalty: 75% Score (3/4)
        if (!isMenzen) {
            score = Math.floor(baseScore * 0.75);
        }

        // Skill Modifiers
        if (attacker && attacker.buffs && attacker.buffs.attackUp) {
            score = Math.floor(score * 1.25); // Critical: +25%
            console.log("[Skill] Critical Hit! +25% Damage");
        }

        if (defender && defender.buffs && defender.buffs.defenseUp) {
            score = Math.floor(score * 0.75); // Water Mirror: -25%
            console.log("[Skill] Water Mirror! -25% Damage Taken");
        }

        // Round to nearest 10
        return Math.round(score / 10) * 10;
    },

    sequencing: { active: false, steps: [], currentStep: 0, timer: 0 },

    showPopup: function (type, options = {}) {
        // Debounce: Prevent same popup within 10 frames (Fixes double trigger issues)
        if (this._lastPopupType === type && (this.timer - this._lastPopupTime) < 10) {
            return;
        }
        this._lastPopupType = type;
        this._lastPopupTime = this.timer;

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

        // Pass type info for View sound handling
        finalOptions.popupType = type;

        this.playFX(asset, conf.x, conf.y, finalOptions);
    },

    playerIndex: 0,
    cpuIndex: 0,

    // Battle Data
    p1: { hp: BattleConfig.RULES.INITIAL_HP, maxHp: BattleConfig.RULES.INITIAL_HP, mp: BattleConfig.RULES.INITIAL_MP, maxMp: BattleConfig.RULES.INITIAL_MP, hand: [], openSets: [], isRiichi: false },
    cpu: { hp: BattleConfig.RULES.INITIAL_HP, maxHp: BattleConfig.RULES.INITIAL_HP, mp: BattleConfig.RULES.INITIAL_MP, maxMp: BattleConfig.RULES.INITIAL_MP, hand: [], openSets: [], isRiichi: false, isRevealed: false },

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
    // selectedMenuIndex: 0, // Moved to BattleMenuSystem 

    dialogueTriggeredThisTurn: false,

    init: function (data, scene) {
        this.scene = scene;
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

        const p1Data = CharacterData.find(c => c.index === this.playerIndex) || CharacterData[this.playerIndex];
        const cpuData = CharacterData.find(c => c.index === this.cpuIndex) || CharacterData[this.cpuIndex];

        // Assign Character IDs and Names for Logic
        if (p1Data) {
            this.p1.id = p1Data.id;
            this.p1.name = p1Data.name;
        }
        if (cpuData) {
            this.cpu.id = cpuData.id;
            this.cpu.name = cpuData.name;
            this.cpu.aiProfile = cpuData.aiProfile || null;
        }

        // Menu construction moved to BattleMenuSystem
        BattleMenuSystem.init(this);
        // this.menuItems = []; // Removed


        if (Game.isAutoTest && Game.autoTestOptions && Game.autoTestOptions.loseMode) {
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
        // Reset Stats (Only if new match)
        // Reset Stats (Only if new match)
        if (!data.isNextRound) {
            this.p1.hp = BattleConfig.RULES.INITIAL_HP;
            this.cpu.hp = BattleConfig.RULES.INITIAL_HP;
            this.p1.maxHp = BattleConfig.RULES.INITIAL_HP;
            this.cpu.maxHp = BattleConfig.RULES.INITIAL_HP;
            this.p1.mp = BattleConfig.RULES.INITIAL_MP;
            this.cpu.mp = BattleConfig.RULES.INITIAL_MP;
            this.p1.maxMp = BattleConfig.RULES.INITIAL_MP;
            this.cpu.maxMp = BattleConfig.RULES.INITIAL_MP;
        }

        // Store tournament data
        this.defeatedOpponents = data.defeatedOpponents || [];
        this.roundHistory = []; // Initialize Round History



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

    applyDoraBomb: function (attacker, who) {
        // Validation
        const skillId = 'DORA_BOMB';
        const skill = SkillData[skillId];

        // 1. Check if Character has skill (Simplified check against ID or Skills array)
        if (!attacker.id || attacker.id !== 'rinxiang') return; // Specific to Rinxiang for now or check skills list
        // Better: Check known skills from CharacterData? 
        // For performance, let's just check if they have enough MP and are the right character.
        // Actually, we should check logic:
        // if (!this.canUseSkill(skillId, who)) return; // reusing canUseSkill might be cleaner but it checks restrictions.

        // Manual Check for Reactive Trigger
        if (attacker.mp < skill.cost) return;

        // 2. Logic: Find most frequent tile in hand
        const hand = this.getFullHand(attacker);
        const counts = {};
        hand.forEach(tile => {
            const key = tile.type + '_' + tile.color;
            if (!counts[key]) counts[key] = { count: 0, tile: tile };
            counts[key].count++;
        });

        // Sort by Count Descending
        const sorted = Object.values(counts).sort((a, b) => b.count - a.count);

        if (sorted.length === 0) return;

        // 3. Execute
        this.consumeMp(who, skill.cost);

        // Set Ura Doras
        // Replace ALL Ura Doras with the best tiles? Or 1-to-1?
        // Plan said: "For each existing Ura Dora slot... Replace"
        // Let's replace up to number of Ura Doras available.
        for (let i = 0; i < this.uraDoras.length; i++) {
            // Use best tile. If multiple Ura Doras, use best then second best? 
            // Or just reuse best for max damage? User said "Most frequent".
            // Let's use the absolute best tile for ALL slots for maximum destruction (Bombs away!)
            const targetTile = sorted[0].tile;

            // If we have enough unique tiles, maybe spread? 
            // But 3 Doras of same type is better.

            this.uraDoras[i] = {
                type: targetTile.type,
                color: targetTile.color,
                img: targetTile.img
            };
        }

        // Visuals
        console.log(`[Skill] DORA BOMB! Ura Dora became ${sorted[0].tile.name}`);
        this.showPopup('SKILL', { text: skill.name, blocking: false });
        this.triggerDialogue(skillId, who === 'P1' ? 'p1' : 'cpu');
        this.events.push({ type: 'SOUND', id: 'audio/quake' }); // Quake SFX
    },

    startWinSequence: function (type, who, score) {
        this.events.push({ type: 'STOP_MUSIC' });

        // 1. Calculate Skill Modified Score
        let finalScore = score;
        const attacker = who === 'P1' ? this.p1 : this.cpu;
        const defender = who === 'P1' ? this.cpu : this.p1;
        const activeBuffs = [];
        const isRiichi = (who === 'P1') ? this.p1.isRiichi : this.cpu.isRiichi;

        // DORA_BOMB Logic (CPU Auto-Use)
        if (who === 'CPU' && isRiichi && attacker.id === 'rinxiang') {
            this.applyDoraBomb(attacker, who);
        }

        // Attack Up (CRITICAL)
        if (attacker.buffs && attacker.buffs.attackUp) {
            finalScore = Math.floor(finalScore * 1.25);
            attacker.buffs.attackUp = false; // Consume Buff;
            activeBuffs.push('CRITICAL');
            console.log(`[Skill] Critical Hit! Score x1.25 -> ${finalScore}`);
        }

        // Defense Up (WATER MIRROR) on Defender
        if (defender.buffs && defender.buffs.defenseUp) {
            finalScore = Math.floor(finalScore * 0.75);
            defender.buffs.defenseUp = false; // Consume Buff
            activeBuffs.push('WATER_MIRROR');
            console.log(`[Skill] Water Mirror! Damage -25% -> ${finalScore}`);
        }

        // 2. Prepare Data
        this.pendingDamage = { target: who === 'P1' ? 'CPU' : 'P1', amount: finalScore };

        const winner = who === 'P1' ? 'p1' : 'cpu';
        const loser = who === 'P1' ? 'cpu' : 'p1';

        // 3. Visuals & Dialogue (Immediate)
        if (who === 'P1') {
            this.p1Character.setState('smile');
            this.cpuCharacter.setState('shocked');
        } else {
            this.p1Character.setState('shocked');
            this.cpuCharacter.setState('smile');
        }
        this.triggerDialogue('WIN', winner);
        this.triggerDialogue('LOSE', loser);

        // 4. Build Sequence (FX -> Result Screen)
        this.currentState = this.STATE_FX_PLAYING;

        const steps = [
            { type: 'WAIT', duration: 80 },
            { type: 'REVEAL_HAND' }
        ];

        // Insert DORA_BOMB Confirmation Step (Player only)
        if (BattleConfig.RULES.SKILLS_ENABLED && who === 'P1' && isRiichi && attacker.id === 'rinxiang') {
            const skillId = 'DORA_BOMB';
            const skill = SkillData[skillId];
            if (skill && attacker.mp >= skill.cost) {
                steps.push({
                    type: 'CALLBACK',
                    callback: () => {
                        if (this.scene && this.scene.showConfirm) {
                            // Pause Sequence (Visuals pause on current frame)
                            this.sequencing.active = false;

                            this.scene.showConfirm(
                                '도라폭진을 사용하시겠습니까?',
                                () => {
                                    // YES
                                    this.applyDoraBomb(attacker, who);
                                    // Slight delay for effect? Or resume immediately
                                    // The applyDoraBomb adds popup/sound events which might run in parallel or need sequence step
                                    // Resume Sequence
                                    this.sequencing.active = true;
                                },
                                () => {
                                    // NO
                                    // Resume Sequence
                                    this.sequencing.active = true;
                                }
                            );
                        }
                    }
                });
            }
        }

        // Reveal Ura Dora if Riichi
        if ((who === 'P1' && this.p1.isRiichi) || (who === 'CPU' && this.cpu.isRiichi)) {
            steps.push({ type: 'REVEAL_URA' });
        }

        // Add Win/Lose Sound to Sequence
        if (who === 'P1') {
            const sound = BattleConfig.RESULT.TYPES.WIN.sound;
            if (sound) steps.push({ type: 'SOUND', id: sound });
        } else {
            const sound = BattleConfig.RESULT.TYPES.LOSE.sound;
            if (sound) steps.push({ type: 'SOUND', id: sound });
        }

        // 5. Calculate Bonuses & Final Result Logic
        if (this.winningYaku) {
            this.winningYaku.score = score; // Use Base Score for Yaku display
        }

        // Note: Bonuses calculated LATER in sequence execution? 
        // No, calculateBonuses reads current state (this.uraDoras). 
        // Since sequence executes over time, logic used to be pre-calculated here.
        // BUT if DORA_BOMB changes uraDoras mid-sequence, pre-calculation here is WRONG.
        // FIX: Move bonus calculation to the STATE transition or a LATE CALLBACK step.
        // However, resultInfo is needed for STATE_WIN/LOSE which is the last step.
        // We can pass a function or lazily evaluate resultInfo in the last step.

        // Let's use a Callback Step before STATE transition to finalize score calculation.
        steps.push({ type: 'WAIT_FX' }); // Wait for any FX (e.g. Ron/Tsumo animations)
        steps.push({
            type: 'CALLBACK',
            callback: () => {
                // Re-calculate score/bonuses here because Ura Dora might have changed
                const winnerHand = (who === 'P1') ? this.getFullHand(this.p1) : this.getFullHand(this.cpu);
                // isRiichi is still valid from closure

                const bonusResult = this.calculateBonuses(winnerHand, type, isRiichi);
                const totalScore = finalScore + bonusResult.score;

                if (this.pendingDamage) {
                    this.pendingDamage.amount = totalScore;
                }

                // Update History
                const resultData = {
                    round: this.currentRound,
                    result: (who === 'P1') ? '승' : '패',
                    yaku: (this.winningYaku && this.winningYaku.yaku && this.winningYaku.yaku.length > 0) ? this.winningYaku.yaku[0] : type
                };
                this.roundHistory.push(resultData);

                // Update Result Info
                this.resultInfo = {
                    type: (who === 'P1') ? 'WIN' : 'LOSE',
                    baseScore: score,
                    score: totalScore,
                    finalDamage: totalScore,
                    yakuName: this.winningYaku ? this.winningYaku.yaku[0] : '',
                    yakuScore: this.winningYaku ? this.winningYaku.score : 0,
                    bonuses: bonusResult.details,
                    bonusScore: bonusResult.score,
                    activeBuffs: activeBuffs
                };

                // Update the STATE step's score if needed (though state usually reads resultInfo)
            }
        });

        // Final Step: Transition to STATE_WIN/LOSE
        // Note: Score argument passed to State might be stale if calculated early.
        // But the State usually relies on resultInfo. Let's pass 0 or updated score via closure if possible?
        // Actually, we can just omit score arg as it's in resultInfo.
        steps.push({ type: 'STATE', state: (who === 'P1' ? this.STATE_WIN : this.STATE_LOSE) });

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

        // Determine Damage
        // Determine Damage
        const damageResult = this.calculateTenpaiDamage(p1Tenpai, cpuTenpai);
        const damageMsg = damageResult.msg;
        const damage = damageResult.damage;

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
        } else if (step.type === 'WAIT_FX') {
            // Wait for visual FX in scene to finish
            if (this.scene && this.scene.activeFX && this.scene.activeFX.length > 0) {
                return; // Wait
            }
            this.sequencing.currentStep++;
        } else if (step.type === 'FX') {
            this.playFX(step.asset, step.x, step.y, { scale: step.scale, slideFrom: step.slideFrom, popupType: step.popupType, blocking: step.blocking });
            this.sequencing.currentStep++;
        } else if (step.type === 'FX_PARALLEL') {
            step.items.forEach(item => {
                this.playFX(item.asset, item.x, item.y, { scale: item.scale, slideFrom: item.slideFrom });
            });
            this.sequencing.currentStep++;
        } else if (step.type === 'REVEAL_HAND') {
            this.cpu.isRevealed = true;
            this.sortHand(this.cpu.hand); // Sort for display
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
                // Unlock Mayu
                if (!Game.saveData.unlocked.includes('mayu')) {
                    Game.saveData.unlocked.push('mayu');
                    Game.save();
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
        this.currentRound++;
        this.startRound();
    },

    startRound: function () {

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

        // Reset Popup Debounce state to prevent carry-over bugs
        this._lastPopupType = null;
        this._lastPopupTime = -100;

        // Reset BGM to Battle Theme
        this.currentBgm = 'audio/bgm_basic';
        this.events.push({ type: 'MUSIC', id: this.currentBgm, loop: true });

        // Skill System Initialization
        this.skillsUsedThisTurn = false;
        this.p1.buffs = {};
        this.p1.buffs = {};
        this.cpu.buffs = {};

        // Reset Exchange Indices
        this.exchangeIndices = [];

        // Init Deck
        this.deck = this.generateDeck();

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

        // Initialize Doras
        this.doras = [];
        this.uraDoras = [];
        this.uraDoraRevealed = false; // Reset Ura Dora state

        // 1. Visible Dora
        const d1 = PaiData.TYPES[Math.floor(Math.random() * PaiData.TYPES.length)];
        this.doras.push({ type: d1.id, color: d1.color, img: d1.img });

        // 2. Ura Dora (Hidden, Persistent)
        // Rule: Can be same as visible Dora (User Request)
        const d2 = PaiData.TYPES[Math.floor(Math.random() * PaiData.TYPES.length)];

        this.uraDoras.push({ type: d2.id, color: d2.color, img: d2.img });

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
            this.p1.hp = 1;      // Instant Death next hit
            this.p1.maxHp = 1;
            this.cpu.hp = 99999;
            this.cpu.maxHp = 99999;
        }

    },




    // ----------------------------------------------------------------
    // Skill System
    // ----------------------------------------------------------------
    skillsUsedThisTurn: false, // Track usage

    checkSkillCost: function (skill, who = 'P1') {
        if (!skill) return false;
        const char = who === 'P1' ? this.p1 : this.cpu;

        // Cost check
        if (char.mp < skill.cost) return false;

        return true;
    },

    canUseSkill: function (skillId, who = 'P1') {
        const skill = SkillData[skillId];
        if (!skill) return false;

        // 0. Type Check (Active Phase only)
        // REACTIVE and SETUP skills cannot be used manually via menu
        if (skill.type === 'REACTIVE' || skill.type === 'SETUP') return false;

        // 1. Cost
        if (!this.checkSkillCost(skill, who)) return false;

        // 2. Already Used (Limit 1) exception Recovery
        if (this.skillsUsedThisTurn && skillId !== 'RECOVERY') return false;

        // 3. Specific Conditions
        const char = who === 'P1' ? this.p1 : this.cpu;

        switch (skillId) {
            case 'TIGER_STRIKE':
                // Check 1: Turn < 20
                if (this.turnCount >= 20) return false;

            // Fallthrough to Tenpai check shared with SPIRIT_RIICHI
            case 'SPIRIT_RIICHI':
                if (skillId === 'SPIRIT_RIICHI') {
                    // Spirit Riichi Check: Turn <= 16
                    if (this.turnCount > 16) return false;
                }

                // Check 2: Must be Tenpai (Ready to Riichi/Win)
                {
                    let canReachTenpai = false;
                    for (let i = 0; i < char.hand.length; i++) {
                        const tempHand = [...char.hand];
                        tempHand.splice(i, 1);
                        if (this.checkTenpai(tempHand)) {
                            canReachTenpai = true;
                            break;
                        }
                    }
                    if (!canReachTenpai) return false;
                }
                break;

            case 'PAINT_TILE':
            case 'EXCHANGE_TILE':
                // Turn 1 Only
                if (this.turnCount !== 1) return false;
                break;

            case 'RECOVERY':
                if (char.hp >= char.maxHp) return false;
                break;

            case 'HELL_PILE':
            case 'CRITICAL':
            case 'WATER_MIRROR':
            case 'DISCARD_GUARD':
                // Valid at any time in main phase.
                break;
        }

        return true;
    },

    useSkill: function (skillId, who = 'P1') {
        const skill = SkillData[skillId];
        if (!skill) return false;

        // Use core validation
        if (!this.canUseSkill(skillId, who)) {
            console.log(`Cannot use skill ${skill.name} (Conditions not met)`);
            return false;
        }

        // ONE USE PER TURN RULE & UNIMPLEMENTED SKILLS
        // These are effectively double-checked by canUseSkill, but we keep the UNIMPLEMENTED check 
        // explicit here if we want to show a popup? 
        // Actually, canUseSkill should probably handle unimplemented skills returning false too?
        // But useSkill logic for unimplemented skills was showing a specific popup "Not Implemented".
        // Let's rely on canUseSkill generally, but keep the popup logic for unimplemented skills?
        // No, let's move unimplemented logic to canUseSkill or just let them fail silently in menu (disabled).
        // If user hacks usage, canUseSkill returns false.

        // BLOCK UNIMPLEMENTED SKILLS (Batch 2)
        if (['EXCHANGE_TILE', 'PAINT_TILE', 'LAST_CHANCE'].includes(skillId)) {
            console.log("Skill logic not yet implemented (Batch 2)");
            this.showPopup('SKILL', { text: "구현 예정!", blocking: false });
            return false;
        }

        // BLOCK UNIMPLEMENTED SKILLS (Batch 2)
        if (['EXCHANGE_TILE', 'PAINT_TILE', 'LAST_CHANCE'].includes(skillId)) {
            console.log("Skill logic not yet implemented (Batch 2)");
            // Show "Not Implemented" popup?
            this.showPopup('SKILL', { text: "구현 예정!", blocking: false });
            return false;
        }

        // Deduct MP
        this.consumeMp(who, skill.cost);

        // Process Effect
        this.processSkillEffect(skill, who, skillId);

        // Mark as used
        if (skillId !== 'RECOVERY') {
            // Track per user? Currently engine has one flag 'skillsUsedThisTurn'
            // Keep it simple: Shared flag or separate?
            // Better to respect turn. If it's P1 turn, P1 uses. If CPU turn, CPU uses.
            // But Reactive skills can trigger out of turn.
            this.skillsUsedThisTurn = true;
        }

        // Visuals
        // Only show Popup for P1? Or both? Both is fine.
        this.showPopup('SKILL', { text: skill.name, blocking: false });

        // Play SFX
        if (skill.sfx) {
            this.events.push({ type: 'SOUND', id: skill.sfx });
        } else {
            // Default Skill Sound
            this.events.push({ type: 'SOUND', id: 'audio/skill_activate' });
        }

        // Trigger Dialogue
        // Use Skill ID as key to find specific text in DialogueData
        const dialOwner = who === 'P1' ? 'p1' : 'cpu';
        this.triggerDialogue(skillId, dialOwner);

        // Log
        console.log(`${who} used skill: ${skill.name}`);

        return true;
    },

    processSkillEffect: function (skill, user, skillId) {
        const target = user === 'P1' ? 'CPU' : 'P1';
        const userObj = user === 'P1' ? this.p1 : this.cpu;
        const targetObj = user === 'P1' ? this.cpu : this.p1;

        // 1. Buffs / Debuffs
        if (skill.type === 'ACTIVE' || skill.type === 'SETUP') {
            // Handle specific skills
            switch (skillId) {
                // FARI
                case 'RECOVERY':
                    this.heal(user, 3000); // 3000 HP
                    this.playFX('fx/heal', BattleConfig.PORTRAIT[user].x + 100, 300, { scale: 1.5 });
                    Assets.playSound('audio/recovery');
                    break;

                case 'DISCARD_GUARD':
                    userObj.buffs.discardGuard = 5; // 5 Turns
                    break;

                // ATAHO
                case 'TIGER_STRIKE':
                    userObj.buffs.guaranteedWin = true; // Next Draw = Win
                    break;

                case 'HELL_PILE':
                    targetObj.buffs.curseDraw = 3; // 3 Turns
                    break;

                // PETUM
                case 'CRITICAL':
                    userObj.buffs.attackUp = true; // Duration? Round? Assuming Round based on desc "When I win"
                    Assets.playSound('audio/buff');
                    break;

                // RINXIANG
                case 'WATER_MIRROR':
                    userObj.buffs.defenseUp = true;
                    Assets.playSound('audio/barrier');
                    break;

                // YURI
                case 'SPIRIT_RIICHI':
                    userObj.buffs.spiritTimer = 5; // 5 Turns countdown
                    break;

                // SMASH / MAYU
                case 'EXCHANGE_TILE':
                case 'PAINT_TILE':
                    // Trigger Exchange UI
                    // Logic should be handled by Scene changing state
                    // checking validation first
                    // For now, auto-complete or placeholder
                    break;
            }
        }
    },

    manageBuffs: function (who) {
        if (!who.buffs) return;

        // 1. Spirit Riichi Timer
        if (who.buffs.spiritTimer > 0) {
            who.buffs.spiritTimer--;
            if (who.buffs.spiritTimer === 0) {
                who.buffs.guaranteedWin = true; // Activate Tiger Strike effect
                console.log("[Skill] Spirit Riichi Activated! Next draw is a win.");
                this.triggerDialogue('SKILL_WIN', who === this.p1 ? 'p1' : 'cpu'); // Generic win skill line
            }
        }

        // 2. Discard Guard Timer
        if (who.buffs.discardGuard > 0) {
            who.buffs.discardGuard--;
            if (who.buffs.discardGuard === 0) {
                console.log("[Skill] Discard Guard Ended.");
            }
        }

        // Note: curseDraw is handled in drawTiles (decrements on effect)
    },

    heal: function (who, amount) {
        const char = who === 'P1' ? this.p1 : this.cpu;
        char.hp = Math.min(char.hp + amount, char.maxHp);
        // Visual update handled by renderer update
    },

    consumeMp: function (who, amount) {
        const char = who === 'P1' ? this.p1 : this.cpu;
        char.mp = Math.max(char.mp - amount, 0);
    },

    triggerReaction: function (skillId, onYes, onNo) {
        const skill = SkillData[skillId];
        // Ensure Scene has showConfirm
        if (this.scene && this.scene.showConfirm) {
            this.scene.showConfirm(
                `${skill.name}을(를) 사용하여 방어하시겠습니까? (MP: ${skill.cost})`,
                onYes,
                onNo
            );
        } else {
            // Fallback: If no UI, just skip skill (No)
            onNo();
        }
    },

    finishRon: function (win) {
        this.showPopup('RON', { blocking: true });
        this.winningYaku = win;
        const score = this.calculateScore(this.winningYaku.score, this.cpu.isMenzen, this.cpu, this.p1);
        this.pendingDamage = { target: 'P1', amount: score };
        this.startWinSequence('RON', 'CPU', score);
    },

    cancelRonAndSwap: function (skillId, who = 'P1') {
        const discarder = who === 'P1' ? 'p1' : 'cpu'; // If P1 uses skill, P1 was the discarder (Countering Ron on self)

        // Swap discarded tile with a 'safe' one
        // 1. Remove dangerous discard
        const badTile = this.discards.pop();

        // 2. Generate Safe Tile (Use generic weapon/item if possible, or random safe)
        // Fallback to 'punch' (Basic Tile)
        const safeTile = { type: 'punch', color: 'red', img: 'tiles/pai_punch.png', owner: discarder };
        this.discards.push(safeTile);

        console.log(`[Skill] Ron Cancelled by ${who}! Swapped ${badTile.type} with Safe Tile.`);

        // Use generalized trigger
        const dialKey = 'SKILL_DEFENSE'; // Or specific skill key?
        const dialOwner = who === 'P1' ? 'p1' : 'cpu';
        this.triggerDialogue(dialKey, dialOwner);
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

    drawTiles: function (count, who) {
        // Skill Logic: Deck Manipulation (Only for single draws)
        if (who && count === 1 && this.deck.length > 0) {
            // 1. Guaranteed Win (Tiger Strike / Spirit Riichi)
            if (who.buffs && who.buffs.guaranteedWin) {
                // Search for a winning tile
                const winningTileIdx = this.deck.findIndex(tile => {
                    // Check if this tile completes the hand
                    const testHand = [...who.hand, tile];
                    // Note: We need to respect Menzen status for score calc, but for Win Check it matters less unless Yaku requires it.
                    // But checkYaku needs correct menzen flag? Usually pass it if needed, or checkYaku infers.
                    // Our YakuLogic.checkYaku checks patterns.
                    return YakuLogic.checkYaku(testHand, who.id);
                });

                if (winningTileIdx !== -1) {
                    // Found it! Move to end (pop position)
                    const tile = this.deck.splice(winningTileIdx, 1)[0];
                    this.deck.push(tile);
                    who.buffs.guaranteedWin = false; // Consume buff
                    console.log("[Skill] Manipulated Deck for Guaranteed Win!");
                } else {
                    console.log("[Skill] No winning tile found in deck...");
                }
            }

            // 2. Curse Draw (Hell Pile)
            if (who.buffs && who.buffs.curseDraw > 0) {
                // Simplistic: Ensure we don't give a winning tile if possible
                // Or give a wind/dragon tile that they don't have pairs for.
                // Let's just shuffle the top tile if it looks "good" to a "bad" one.
                // Simple implementation: Move top tile to bottom if it matches any tile in hand (set building).
                // Try up to 3 times to find a 'bad' tile.

                let attempts = 0;
                while (attempts < 5) {
                    const topTile = this.deck[this.deck.length - 1]; // Candidate
                    const isUseful = who.hand.some(t => t.type === topTile.type || (t.color === topTile.color && Math.abs(t.type - topTile.type) <= 1));

                    if (isUseful) {
                        // It's useful, bury it
                        const buried = this.deck.pop();
                        this.deck.unshift(buried); // Move to bottom
                        attempts++;
                    } else {
                        // Found a garbage tile (or ran out of attempts)
                        break;
                    }
                }
                who.buffs.curseDraw--; // Decrement duration (turns)
                console.log("[Skill] Cursed Draw applied.");
            }
        }

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
        // this.updateDialogue(); // Removed

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
        // Only if NOT declaring Riichi (User Manual Discard)
        if (!Game.isAutoTest && this.p1.isRiichi && !this.p1.declaringRiichi && this.currentState === this.STATE_PLAYER_TURN && this.timer > BattleConfig.SPEED.RIICHI_AUTO_DISCARD) {
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
        BattleDialogue.update();

        // State Machine
        switch (this.currentState) {
            case this.STATE_INIT:
                if (this.timer > (Game.isAutoTest ? 10 : 60)) { // Speed up init
                    if (this.turnCount === 1) {
                        // Skill Check: Setup Skills (Exchange Tile / Paint Tile)
                        const p1Skills = CharacterData.find(c => c.id === this.p1.id).skills;
                        if (BattleConfig.RULES.SKILLS_ENABLED && (p1Skills.includes('EXCHANGE_TILE') || p1Skills.includes('PAINT_TILE'))) {
                            this.currentState = this.STATE_TILE_EXCHANGE;
                            this.exchangeIndices = []; // Reset selection
                            this.hoverIndex = 0; // Fix: Initialize cursor focus
                            this.timer = 0;
                            console.log("[Skill] Entering Tile Exchange Mode");
                        } else {
                            // Fix: Go to Wait State to show Draw Button
                            this.currentState = this.STATE_WAIT_FOR_DRAW;
                            this.timer = 0;
                        }
                    } else {
                        // Normal subsequent turns
                        this.currentState = this.STATE_WAIT_FOR_DRAW;
                        this.timer = 0;
                    }
                }
                break;

            case this.STATE_TILE_EXCHANGE:
                this.activeStateTileExchange();
                break;

            case this.STATE_WAIT_FOR_DRAW:
                // Wait for click to confirm draw
                if ((window.Input && Input.isMouseJustPressed() && this.timer > 15) || (Game.isAutoTest && this.timer > 5)) {
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
                // Block input during "Rolling" animation (140 frames)
                if (this.stateTimer > 160 && (Input.isMouseJustPressed() || Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.ENTER))) {
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






    checkRoundEnd: function () {
        // Guard: Prevent double triggering if already ending/in sequence
        if (this.currentState === this.STATE_FX_PLAYING ||
            this.currentState === this.STATE_NAGARI ||
            this.currentState === this.STATE_MATCH_OVER) {
            return;
        }

        // 1. Deck Exhaustion
        if (this.deck.length === 0) {
            this.startNagariSequence();
            return;
        }

        // 2. Turn Limit
        // Check if we are STARTING turn 21
        if (this.turnCount > 20) {
            console.log("Turn Limit Reached (20). Starting Nagari.");
            this.startNagariSequence();
            return;
        }
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

        // Reset Dialogue Flag for this turn
        this.dialogueTriggeredThisTurn = false;
        this.skillsUsedThisTurn = false;

        // Manage Buffs (Start of Turn)
        this.manageBuffs(this.p1);

        // Check if dead (Nagari/Damage could happen?)
        if (this.p1.hp <= 0) return;

        // Draw Tile Logic
        // Fix: If P1 just Pon-ed, they don't draw, they just discard.
        // But Player Pon handling usually skips to Discard state immediately.
        // This function is called for Normal Draw.

        const t = this.drawTiles(1, this.p1);
        if (t.length > 0) {
            const drawnTile = t[0];
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
                    this.executeAction(tsumoAction);
                    return;
                }
            }

            this.currentState = this.STATE_ACTION_SELECT;
            this.actionTimer = 0;
            this.selectedActionIndex = 0;
        } else {
            // No actions
            // Normal turn (Riichi Auto-Discard handled by Update Loop)
            this.currentState = this.STATE_PLAYER_TURN;
            this.hoverIndex = this.p1.hand.length - 1; // Default cursor to new tile
            this.timer = 0;
        }
    },

    cpuDraw: function () {
        // Fix: If CPU just Pon-ed, they don't draw, they just discard.
        if (this.cpu.needsToDiscard) {
            this.cpu.needsToDiscard = false;
        } else {
            const t = this.drawTiles(1, this.cpu);
            if (t.length > 0) {
                this.events.push({ type: 'DRAW', player: 'CPU' });
                this.cpu.hand.push(t[0]);
            }
        }

        // Reset Dialogue Flag for CPU turn
        this.dialogueTriggeredThisTurn = false;

        // Manage Buffs
        this.manageBuffs(this.cpu);

        // CPU AI Logic
        // Active Skill Check
        this.checkCpuActiveSkills(); // AI decides to use skills

        const difficulty = BattleConfig.RULES.AI_DIFFICULTY;

        // 1. Check Tsumo
        if (YakuLogic.checkYaku(this.cpu.hand, this.cpu.id)) {
            this.winningYaku = YakuLogic.checkYaku(this.cpu.hand, this.cpu.id);
            if (this.winningYaku) {
                this.showPopup('TSUMO', { blocking: true });
                const score = this.calculateScore(this.winningYaku.score, this.cpu.isMenzen, this.cpu, this.p1);
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
                this.cpu.isRiichi = true;
                this.cpu.declaringRiichi = true; // Mark next discard

                // Directly set BGM state to ensure overwrite logic works
                this.currentBgm = 'audio/bgm_tension';

                // Start Riichi Sequence (Delay Discard)
                this.currentState = this.STATE_FX_PLAYING;

                // DIALOGUE TRIGGER (CPU RIICHI)
                const riichiKey = this.p1.isRiichi ? 'COUNTER_RIICHI' : 'RIICHI';
                this.triggerDialogue(riichiKey, 'cpu');

                this.sequencing = {
                    active: true,
                    timer: 0,
                    currentStep: 0,
                    steps: [
                        { type: 'FX', asset: 'fx/riichi', x: BattleConfig.POPUP.x, y: BattleConfig.POPUP.y, anim: 'SLIDE', slideFrom: 'RIGHT', scale: 1.0, popupType: 'RIICHI', blocking: true },
                        { type: 'MUSIC', id: 'audio/bgm_tension', loop: true }, // Music update handled here
                        { type: 'WAIT', duration: 60 },
                        {
                            type: 'CALLBACK', callback: () => {
                                // Finish Sequence
                                this.sequencing.active = false;
                                // Reset State to allow discard logic to proceed (otherwise it blocks as FX_PLAYING)
                                this.currentState = this.STATE_CPU_TURN;
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
        this.events.push({ type: 'DISCARD', player: 'CPU' });
        const discarded = this.cpu.hand.splice(index, 1)[0];
        discarded.owner = 'cpu';
        if (this.cpu.declaringRiichi) {
            discarded.isRiichi = true;
            this.cpu.declaringRiichi = false;
        }

        // Dialogue Trigger (Random or Worry)
        // Suppress random dialogue if CPU is Riichi (Silent Focus)
        if (!this.dialogueTriggeredThisTurn && this.turnCount < 20 && !this.cpu.isRiichi) {
            if (this.p1.isRiichi) {
                if (Math.random() < BattleConfig.DIALOGUE.CHANCE.WORRY_RON) this.triggerDialogue('WORRY_RON', 'cpu');
            } else {
                if (Math.random() < BattleConfig.DIALOGUE.CHANCE.RANDOM) this.triggerDialogue('RANDOM', 'cpu');
            }
        }

        this.discards.push(discarded);

        let hasAction = false;
        // Check if Player can Ron
        // AUTO LOSE MODE: Player Cannot Ron
        if (!Game.isAutoLose && this.checkPlayerActions(discarded)) {
            // Riichi Auto-Win (Ron)
            if (this.p1.isRiichi) {
                const ronAction = this.possibleActions.find(a => a.type === 'RON');
                if (ronAction) {
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
            if (this.currentState === this.STATE_NAGARI ||
                this.currentState === this.STATE_MATCH_OVER ||
                this.currentState === this.STATE_FX_PLAYING ||
                this.turnCount > 20) return; // Transitioned to End State or Limit Reached

            // Check Riichi Auto Draw
            if (this.p1.isRiichi) {
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
        this.lastDrawGroupSize = 0;
    },

    checkCpuActiveSkills: function () {
        if (!BattleConfig.RULES.SKILLS_ENABLED) return;
        if (this.skillsUsedThisTurn) return;

        // Iterate skills
        const skills = this.cpu.skills || [];
        for (const skillId of skills) {
            const skill = SkillData[skillId];
            if (!skill || skill.type !== 'ACTIVE') continue;
            if (!this.checkSkillCost(skill, 'CPU')) continue;

            let shouldUse = false;

            // AI Heuristics
            switch (skillId) {
                case 'RECOVERY':
                    // Heal if HP < 60%
                    if (this.cpu.hp < this.cpu.maxHp * 0.6) shouldUse = true;
                    break;
                case 'TIGER_STRIKE':
                case 'SPIRIT_RIICHI':
                case 'CRITICAL':
                    // Use if Tenpai (Ready to win)
                    // Check hand (before draw, size 13)
                    if (this.checkTenpai(this.cpu.hand, this.cpu.id)) shouldUse = true;
                    break;
                case 'HELL_PILE':
                case 'DISCARD_GUARD':
                case 'WATER_MIRROR':
                    // Defensive/Debuff: Use if Player is Riichi or HP Low
                    if (this.p1.isRiichi || this.cpu.hp < this.cpu.maxHp * 0.4) shouldUse = true;
                    break;
            }

            // Aggression/RNG Check (prevent deterministic spam)
            if (shouldUse && Math.random() < 0.8) {
                this.useSkill(skillId, 'CPU');
                return; // Assume 1 skill per turn limit applies to CPU too
            }
        }
    },

    discardTile: function (index) {
        if (this.currentState !== this.STATE_PLAYER_TURN) {
            return;
        }

        this.events.push({ type: 'DISCARD', player: 'P1' });
        const discarded = this.p1.hand.splice(index, 1)[0];
        discarded.owner = 'p1'; // Mark owner
        if (this.p1.declaringRiichi) {
            discarded.isRiichi = true;
            this.p1.declaringRiichi = false;
            this.riichiTargetIndex = -1; // Reset Logic
            this.validRiichiDiscardIndices = null; // Reset Visuals
        }
        this.discards.push(discarded);

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

        if (!this.dialogueTriggeredThisTurn && !this.p1.isRiichi) {
            // Normal Random (Moved to CPU Discard)
        }
    },

    checkCpuActions: function (discardedTile) {
        // Discard Guard Check
        // If P1 (discarder) has discardGuard, CPU cannot access this tile.
        if (this.p1.buffs && this.p1.buffs.discardGuard > 0) {
            return false;
        }

        // 1. RON
        // Rule: Ron is allowed ONLY if Riichi is declared (same as player)
        // This prevents Ron after Pon (since Pon makes hand open and prevents Riichi)
        // Check if adding this tile completes the hand
        const checkHand = [...this.getFullHand(this.cpu), discardedTile];
        const win = YakuLogic.checkYaku(checkHand, this.cpu.id);
        if (win && this.cpu.isRiichi) { // Added Riichi requirement
            // --- SKILL CHECK: COUNTER-RON ---
            const reactiveSkillId = this.p1 && this.p1.skills ? this.p1.skills.find(id => {
                const s = SkillData[id];
                return s && s.type === 'REACTIVE' && (id === 'EXCHANGE_RON' || id === 'SUPER_IAI');
            }) : null;

            if (reactiveSkillId && this.checkSkillCost(SkillData[reactiveSkillId])) {
                // Trigger Reaction Modal
                this.triggerReaction(reactiveSkillId, () => {
                    // YES: Cancel Ron
                    this.useSkill(reactiveSkillId); // Deducts MP & Logs
                    this.cancelRonAndSwap(reactiveSkillId);
                    // Flow continues?
                    // cancelRonAndSwap should likely set state to CPU_TURN or just let discardTile continue.
                    // Since we return true, discardTile stops.
                    // We need to manually resume state.
                    this.currentState = this.STATE_CPU_TURN;
                }, () => {
                    // NO: Allow Ron
                    this.finishRon(win);
                });
                return true; // Block standard flow
            }

            this.finishRon(win);
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
            const context = { isMenzen: this.cpu.isMenzen, turnCount: this.turnCount };
            if (AILogic.shouldPon(this.cpu.hand, discardedTile, difficulty, this.cpu.aiProfile, context)) {
                this.executeCpuPon(discardedTile);
                return true;
            }
        }

        return false;
    },
    /**
     * Helper for Riichi Manual Discard
     * Returns array of indices in current p1.hand that are valid to discard (keep Tenpai).
     */
    getValidRiichiDiscards: function () {
        const hand = this.p1.hand;
        const validIndices = [];

        for (let i = 0; i < hand.length; i++) {
            // Create temp hand without this tile
            const tempHand = [...hand];
            tempHand.splice(i, 1);

            // Must have 11 tiles (since hand is 12).
            // checkTenpai expects 11 tiles (waiting for 12th).
            if (this.checkTenpai(tempHand)) {
                validIndices.push(i);
            }
        }
        return validIndices;
    },

    /**
     * Simplified Can Win Check (Is Tenpai?)
     */
    getTenpaiInfo: function (player) {
        // This function is intended to return information about tenpai, not to execute a pon.
        // The provided snippet seems to be a copy-paste error from executeCpuPon.
        // Assuming the user intended to add a new helper function for Tenpai info.
        // For now, I'll add a placeholder based on the comment.
        // If this was meant to be a modification of executeCpuPon, please clarify.

        // Placeholder for Tenpai Info logic:
        const hand = player.hand;
        const tenpaiInfo = {
            isTenpai: false,
            waitingTiles: [],
            potentialYakus: []
        };

        // Simplified check for demonstration
        if (this.checkTenpai(hand)) {
            tenpaiInfo.isTenpai = true;
            // In a real implementation, you'd calculate waiting tiles and potential yakus here.
            // For now, just a basic flag.
        }
        return tenpaiInfo;
    },

    executeCpuPon: function (tile) {
        this.currentState = this.STATE_FX_PLAYING;
        this.setTimeout(() => {
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
                this.cpu.needsToDiscard = true; // Fix: Prevent Drawing on next turn

                // Trigger Dialogue (PON)
                this.triggerDialogue('PON', 'cpu');
                // Set flag to inhibit Random/Worry dialogue on discard
                this.dialogueTriggeredThisTurn = true;

            }
        }, 450);
    },

    // View proxies removed (Use BattleRenderer directly)

    checkPlayerActions: function (discardedTile) {
        // Discard Guard Check
        if (this.cpu.buffs && this.cpu.buffs.discardGuard > 0) {
            return false;
        }
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
        const yakuResult = YakuLogic.checkYaku(fullHand, this.p1.id);
        console.log(`[Turn ${this.turnCount}] checkSelfActions: HandSize=${fullHand.length}, Yaku=`, yakuResult);

        if (yakuResult) {
            this.possibleActions.push({ type: 'TSUMO', label: '쯔모' });
            console.log("-> Tsumo Action Added");
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
            } else {
                this.recommendedDiscards = [];
            }
        }

        if (this.possibleActions.length > 0) {
            // Skill Constraint: If Tiger Strike (guaranteedWin) or Spirit Riichi (spiritTimer) is active, cannot Pass
            if (!(this.p1.buffs && (this.p1.buffs.guaranteedWin || this.p1.buffs.spiritTimer > 0))) {
                this.possibleActions.push({ type: 'PASS_SELF', label: '패스' }); // Pass on declaring actions
            }
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
            return;
        }

        // Riichi Enforcement: Must discard drawn tile (last one)
        if (this.p1.isRiichi) {
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
                this.p1.isRiichi = true;
                this.p1.declaringRiichi = true;
                this.showPopup('RIICHI', { blocking: true, slideFrom: 'LEFT' });
                // Sound handled by showPopup -> View (popupType check)
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
        if (action.type === 'PASS' || action.type === 'PASS_SELF') {
            // Pass logic
            if (action.type === 'PASS_SELF') {
                // Return to player turn for discard
                this.currentState = this.STATE_PLAYER_TURN;
            } else if (action.type === 'PASS') {
                console.log("Player Passed.");
                this.turnCount++;
                this.checkRoundEnd();
                if (this.currentState !== this.STATE_ACTION_SELECT) return;

                // Check Riichi Auto Draw
                if (this.p1.isRiichi) {
                    this.playerDraw();
                } else {
                    this.currentState = this.STATE_WAIT_FOR_DRAW; // Manual Draw
                    this.timer = 0;
                }
            }
            this.possibleActions = []; // Clear actions
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

                    // Update Menzen Status
                    this.p1.isMenzen = false;

                    // Expressions
                    this.p1Character.setState('smile');
                    this.cpuCharacter.setState('shocked');
                    this.showPopup('PON', { blocking: true });

                    // Dialogue
                    this.triggerDialogue('PON', 'p1');
                    this.dialogueTriggeredThisTurn = true;
                    setTimeout(() => {
                        this.triggerDialogue('PON_REPLY', 'cpu');
                    }, BattleConfig.DIALOGUE.replyDelay);

                    // this.events.push({ type: 'SOUND', id: 'audio/pon' }); // Handled by showPopup

                    // Force Discard State (Turn continues but starts at discard phase)
                    this.currentState = this.STATE_PLAYER_TURN;
                    this.possibleActions = []; // Clear actions (e.g. Pon button)
                    this.timer = 0;
                    this.hoverIndex = this.p1.hand.length - 1; // Hover last tile
                }, 450);
            }
        } else if (action.type === 'RIICHI') {
            this.p1.isRiichi = true;
            this.p1.declaringRiichi = true; // Mark next discard
            // Manual Discard for Riichi Declaration:
            // Calculate valid discards (must maintain tenpai)
            this.validRiichiDiscardIndices = this.getValidRiichiDiscards();

            this.showPopup('RIICHI', { slideFrom: 'LEFT' });

            // Dialogue
            // Dialogue
            const riichiKey = this.cpu.isRiichi ? 'COUNTER_RIICHI' : 'RIICHI';
            this.triggerDialogue(riichiKey, 'p1');
            setTimeout(() => {
                this.triggerDialogue('RIICHI_REPLY', 'cpu');
            }, BattleConfig.DIALOGUE.replyDelay);

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

            // console.time('RiichiCalc'); // Performance Check

            for (let i = 0; i < hand.length; i++) {
                const temp = [...hand];
                temp.splice(i, 1);
                // Check if Tenpai is maintained
                if (this.checkTenpai(temp, false)) {
                    const metrics = this.getRiichiScore(i);
                    candidates.push({ index: i, ...metrics, tile: hand[i] });
                }
            }

            // console.timeEnd('RiichiCalc'); // End Performance Check

            if (candidates.length > 0) {
                // Just log (Debug)
                // We do NOT force selection. User must choose manually.
                // candidates.sort ...

                // this.riichiTargetIndex = -1; // Ensure unlocked
            } else {
                console.error("Riichi declared but no valid discards found? Should not happen.");
                // this.riichiTargetIndex = -1;
            }

            // Ensure unlocked
            this.riichiTargetIndex = -1;

            this.p1.riichiValidDiscards = null; // Clear manual list just in case

            // Update BGM immediately (Tension or Showdown)
            this.updateBattleMusic();

            // Go to discard
            this.currentState = this.STATE_PLAYER_TURN;

        } else if (action.type === 'TSUMO') {
            const fullHand = this.getFullHand(this.p1);
            this.showPopup('TSUMO', { blocking: true });
            this.p1Character.setState('smile');
            this.cpuCharacter.setState('shocked');

            // Tsumo: Tile is already in hand
            this.winningYaku = YakuLogic.checkYaku(fullHand, this.p1.id);

            if (this.winningYaku) {
                const score = this.calculateScore(this.winningYaku.score, this.p1.isMenzen, this.p1, this.cpu);
                this.pendingDamage = { target: 'CPU', amount: score };
                this.startWinSequence('TSUMO', 'P1', score);
            } else {
                console.error("CRITICAL: TSUMO allowed but checkYaku failed during execution!");
                // Fail safely (do not win)
                return;
            }

        } else if (action.type === 'RON') {
            // --- SKILL CHECK: CPU COUNTER-RON ---
            const reactiveSkillId = this.cpu.skills ? this.cpu.skills.find(id => {
                const s = SkillData[id];
                return s && s.type === 'REACTIVE' && (id === 'EXCHANGE_RON' || id === 'SUPER_IAI');
            }) : null;

            if (reactiveSkillId && this.checkSkillCost(SkillData[reactiveSkillId], 'CPU')) {
                // AI DECISION: High chance to use if affordable
                if (this.cpu.hp < 8000 || Math.random() < 0.8) {
                    this.useSkill(reactiveSkillId, 'CPU');
                    this.cancelRonAndSwap(reactiveSkillId, 'CPU');

                    // Resume Flow: Treat as if discard happened and was passed
                    this.currentState = this.STATE_CPU_TURN;
                    return;
                }
            }
            // -------------------------------------

            this.showPopup('RON', { blocking: true });
            this.p1Character.setState('smile');
            this.cpuCharacter.setState('shocked');

            const fullHand = this.getFullHand(this.p1);
            const winningTile = this.discards[this.discards.length - 1];
            const finalHand = [...fullHand, winningTile];

            this.winningYaku = YakuLogic.checkYaku(finalHand, this.p1.id);
            if (this.winningYaku) {
                const score = this.calculateScore(this.winningYaku.score, this.p1.isMenzen, this.p1, this.cpu);
                this.pendingDamage = { target: 'CPU', amount: score };
                this.startWinSequence('RON', 'P1', score);
            } else {
                console.error("CRITICAL: RON allowed but checkYaku failed during execution!");
                // Fail safely (do not win)
                return;
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
                    potentialYakus.add(win.yaku[0]);
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
            // console.log(`Switching Battle BGM to: ${targetBgm}`);
            this.currentBgm = targetBgm;
            this.events.push({ type: 'MUSIC', id: targetBgm, loop: true });
        }
    },

    // --- Bonus Logic ---
    calculateBonuses: function (hand, winType, isRiichi) {
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
        if (isRiichi) { // Use passed argument
            // Ura Doras are pre-generated in startRound. Just use them.
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




    triggerDialogue: function (key, owner) {
        if (!DialogueData || !DialogueData.BATTLE) return;

        const charId = (owner === 'p1' || owner === 'P1') ? this.p1Character.id : this.cpuCharacter.id;
        const charData = DialogueData.BATTLE[charId];
        const usedData = charData || DialogueData.BATTLE.default;
        const usedId = charData ? charId : 'default';

        console.log(`[BattleEngine] Dialogue Lookup: Key=${key}, Owner=${owner}, CharID=${charId}, ResolvedTo=${usedId}`);

        let lines = usedData[key];
        if (!lines || lines.length === 0) {
            lines = DialogueData.BATTLE.default[key];
            if (lines && lines.length > 0) console.log(`[BattleEngine] Falling back to default for Key=${key}`);
        }

        if (lines && lines.length > 0) {
            const text = lines[Math.floor(Math.random() * lines.length)];
            const who = (owner === 'p1' || owner === 'P1') ? 'P1' : 'CPU';
            console.log(`[BattleEngine] Triggering Dialogue: Key=${key}, Owner=${owner}, Text="${text}"`);
            BattleDialogue.show(text, who);
            this.dialogueTriggeredThisTurn = true;
        } else {
            console.log(`[BattleEngine] Trigger Dialogue Failed: No lines found for Key=${key}, Owner=${owner}, CharID=${charId}`);
        }
    },

    activeStateTileExchange: function () {
        // Logic handled by Scene Input (Selection toggling)
        // Here we just wait for Confirmation or Input updates.

        // Note: Actual Input processing (Left/Right/Space/Enter) is delegated to BattleScene.update()
    },

    toggleExchangeSelection: function (index) {
        if (this.exchangeIndices.includes(index)) {
            this.exchangeIndices = this.exchangeIndices.filter(i => i !== index);
            Assets.playSound('audio/cursor');
        } else {
            // Check MP Cost before adding
            const charData = CharacterData.find(c => c.id === this.p1.id);
            const p1Skills = charData ? charData.skills : [];
            let skillId = null;
            if (p1Skills.includes('PAINT_TILE')) skillId = 'PAINT_TILE';
            else if (p1Skills.includes('EXCHANGE_TILE')) skillId = 'EXCHANGE_TILE';

            if (skillId) {
                const skill = SkillData[skillId];
                const currentCost = this.exchangeIndices.length * skill.cost;
                if (this.p1.mp < currentCost + skill.cost) {
                    // Not enough MP for next tile
                    Assets.playSound('audio/cancel');
                    return;
                }
            }

            this.exchangeIndices.push(index);
            Assets.playSound('audio/cursor');
        }
    },

    confirmTileExchange: function () {
        // Safe check for skills to avoid errors if data missing
        const charData = CharacterData.find(c => c.id === this.p1.id);
        const p1Skills = charData ? charData.skills : [];

        let skillId = null;
        if (p1Skills.includes('PAINT_TILE')) skillId = 'PAINT_TILE';
        else if (p1Skills.includes('EXCHANGE_TILE')) skillId = 'EXCHANGE_TILE';

        const skill = SkillData[skillId];
        if (!skill) {
            // Should not happen if state was entered correctly
            this.currentState = this.STATE_WAIT_FOR_DRAW;
            this.timer = 0;
            return;
        }

        const count = this.exchangeIndices.length;

        if (count === 0) {
            // Skip
            this.currentState = this.STATE_WAIT_FOR_DRAW;
            this.timer = 0;
            console.log("[Skill] Tile Exchange Skipped.");
            return;
        }

        const totalCost = count * skill.cost;

        if (this.p1.mp < totalCost) {
            console.log("Not enough MP!");
            this.showPopup('SKILL', { text: "MP 부족!", blocking: false });
            Assets.playSound('audio/cancel');
            return;
        }

        // Execute Exchange
        this.consumeMp('P1', totalCost);

        // 1. Remove tiles
        // Sort indices descending to splice correctly
        const sortedIndices = [...this.exchangeIndices].sort((a, b) => b - a);
        const removedTiles = [];

        sortedIndices.forEach(idx => {
            const tile = this.p1.hand.splice(idx, 1)[0];
            removedTiles.push(tile);
        });

        // 2. Return to Deck (Random insert)
        removedTiles.forEach(tile => {
            const r = Math.floor(Math.random() * this.deck.length);
            this.deck.splice(r, 0, tile);
        });

        // 3. Draw New
        const newTiles = this.drawTiles(count, this.p1);
        this.p1.hand.push(...newTiles);

        // 4. Sort
        this.sortHand(this.p1.hand);

        // Visuals
        this.events.push({ type: 'SOUND', id: 'audio/skill_activate' });
        this.showPopup('SKILL', { text: skill.name, blocking: false });

        // Reset Selection State
        this.exchangeIndices = [];

        // Proceed
        this.currentState = this.STATE_WAIT_FOR_DRAW;
        this.timer = 0;
        console.log(`[Skill] Exchanged ${count} tiles.`);
    }
};
