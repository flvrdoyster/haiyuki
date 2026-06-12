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
    STATE_ROULETTE: 14,     // Skill: Last Chance Roulette

    rouletteTimer: 0,
    rouletteIndex: 0,
    rouletteTileType: null,

    currentState: 0,
    timer: 0,
    totalTicks: 0,        // NEW: Absolute tick counter (never resets)
    stateTimer: 0,
    lastState: -1,
    timeouts: [],

    /**
     * DeltaTime-Aware Timeout System
     * Uses logic ticks (dt) instead of system clock.
     * Prevents "early firing" on slow PCs where game time is slower than real time.
     */
    setTimeout: function (callback, delayTicks) {
        // delayTicks: Expected frames (1.0 = 1/60th sec)
        const timeout = {
            callback: callback,
            timer: 0,
            duration: delayTicks,
            id: ++this._timeoutIdCounter
        };
        this.dtTimeouts.push(timeout);
        return timeout.id;
    },

    updateTimeouts: function (dt = 1.0) {
        for (let i = this.dtTimeouts.length - 1; i >= 0; i--) {
            const t = this.dtTimeouts[i];
            t.timer += dt;
            if (t.timer >= t.duration) {
                this.dtTimeouts.splice(i, 1);
                t.callback();
            }
        }
    },

    clearTimeouts: function () {
        this.dtTimeouts = [];
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
        }

        if (defender && defender.buffs && defender.buffs.defenseUp) {
            score = Math.floor(score * 0.75); // Water Mirror: -25%
        }

        // Round to nearest 10
        return Math.round(score / 10) * 10;
    },

    sequencing: { active: false, steps: [], currentStep: 0, timer: 0 },

    showPopup: function (type, options = {}) {
        // Debounce: Prevent same popup within 10 frames (Fixes double trigger issues)
        // Using totalTicks instead of timer because timer resets frequently
        if (this._lastPopupType === type && (this.totalTicks - this._lastPopupTime) < 10) {
            return;
        }
        this._lastPopupType = type;
        this._lastPopupTime = this.totalTicks;

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

    dialogueTriggeredThisTurn: false,
    roundSkillUsage: { p1: {}, cpu: {} },

    init: function (data, scene) {
        this.scene = scene;
        // Prevent Context Menu on Canvas (Right Click)
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.oncontextmenu = (e) => {
                e.preventDefault();
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
            this.p1.skills = p1Data.skills || [];
        }
        if (cpuData) {
            this.cpu.id = cpuData.id;
            this.cpu.name = cpuData.name;
            this.cpu.aiProfile = cpuData.aiProfile || null;
            this.cpu.skills = cpuData.skills || [];
        }

        // Menu construction moved to BattleMenuSystem
        BattleMenuSystem.init(this);


        if (Game.isAutoTest && Game.autoTestOptions && Game.autoTestOptions.loseMode) {
            this.p1.hp = 1000;
            this.p1.maxHp = 1000;
            this.cpu.hp = 99999;
            this.cpu.maxHp = 99999;
        }

        this.activeFX = [];
        this.dtTimeouts = [];
        this._timeoutIdCounter = 0;
        this.sequencing = { active: false, steps: [], currentStep: 0, timer: 0 };

        // Portraits are view objects owned by BattleScene (initPortraits).
        // The engine requests expression changes via EXPRESSION events.

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

        // Resolve CPU skill (0..1) from the player's difficulty band + tournament
        // progress. Skill controls AI competence; aiProfile controls style.
        this.cpuSkill = this.computeCpuSkill(
            (Game.saveData && Game.saveData.difficulty) || 'normal',
            this.defeatedOpponents.length
        );

        this.startRound();
    },

    // Player difficulty picks a skill band; progression interpolates within it,
    // so early opponents are gentle and the final boss reaches the band's ceiling.
    DIFFICULTY_BANDS: {
        easy: [0.10, 0.45],
        normal: [0.30, 0.75],
        hard: [0.55, 1.00]
    },
    TOURNAMENT_LENGTH: 5, // opponents before the final boss

    computeCpuSkill: function (difficulty, defeatedCount) {
        const band = this.DIFFICULTY_BANDS[difficulty] || this.DIFFICULTY_BANDS.normal;
        const t = Math.max(0, Math.min(1, defeatedCount / this.TOURNAMENT_LENGTH));
        return band[0] + (band[1] - band[0]) * t;
    },

    playFX: function (type, x, y, options = {}) {
        this.events.push({
            type: 'FX',
            asset: type,
            x: x,
            y: y,
            options: options
        });
    },

    startWinSequence: function (type, who, score) {
        this.events.push({ type: 'STOP_MUSIC' });

        // Calculate Skill Modified Score
        let finalScore = score;
        const attacker = this.getPlayer(who);
        const defender = this.getOpponent(who);
        const activeBuffs = [];
        const isRiichi = (who === 'P1') ? this.p1.isRiichi : this.cpu.isRiichi;

        // DORA_BOMB Logic (CPU Auto-Use)
        if (who === 'CPU' && isRiichi && attacker.id === 'rinxiang') {
            SkillFlows.applyDoraBomb(this, attacker, who);
        }

        // Attack Up (CRITICAL)
        if (attacker.buffs && attacker.buffs.attackUp) {
            finalScore = Math.floor(finalScore * 1.25);
            attacker.buffs.attackUp = false; // Consume Buff;
            activeBuffs.push('CRITICAL');
        }

        // Defense Up (WATER MIRROR) on Defender
        if (defender.buffs && defender.buffs.defenseUp) {
            finalScore = Math.floor(finalScore * 0.75);
            defender.buffs.defenseUp = false; // Consume Buff
            activeBuffs.push('WATER_MIRROR');
        }

        // Prepare Data
        this.pendingDamage = { target: who === 'P1' ? 'CPU' : 'P1', amount: finalScore };

        const winner = who === 'P1' ? 'p1' : 'cpu';
        const loser = who === 'P1' ? 'cpu' : 'p1';

        // Visuals & Dialogue (Immediate)
        this.setExpression(who, 'smile');
        this.setExpression(this.opponentOf(who), 'shocked');
        this.triggerDialogue('WIN', winner);
        this.triggerDialogue('LOSE', loser);

        // Build Sequence (FX -> Result Screen)
        this.currentState = this.STATE_FX_PLAYING;

        const steps = [
            { type: 'WAIT', duration: BattleConfig.SPEED.WIN_WAIT },
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
                                    SkillFlows.applyDoraBomb(this, attacker, who);
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

        // Calculate Bonuses & Final Result Logic
        if (this.winningYaku) {
            this.winningYaku.score = score; // Use Base Score for Yaku display
        }

        // Note: Bonuses calculated LATER in sequence execution? 
        // No, calculateBonuses reads current state (this.uraDoras). 
        // Since sequence executes over time, logic used to be pre-calculated here.
        // FIX: Move bonus calculation to the STATE transition or a LATE CALLBACK step.
        // However, resultInfo is needed for STATE_WIN/LOSE which is the last step.

        // Let's use a Callback Step before STATE transition to finalize score calculation.
        steps.push({ type: 'WAIT_FX' }); // Wait for any FX (e.g. Ron/Tsumo animations)
        steps.push({
            type: 'CALLBACK',
            callback: () => {
                // Re-calculate score/bonuses here because Ura Dora might have changed
                const winnerHand = (who === 'P1') ? this.getFullHand(this.p1) : this.getFullHand(this.cpu);
                // isRiichi is still valid from closure

                const bonusResult = this.calculateBonuses(winnerHand, type, isRiichi);
                let totalScore = finalScore + bonusResult.score;

                // Ensure final score is rounded to nearest 10 (Rule: Handle single digits)
                totalScore = Math.round(totalScore / 10) * 10;

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
            damage = 1000; // Flat 1000 for Tenpai win
            this.pendingDamage = { target: 'CPU', amount: damage };
            damageMsg = `데미지: ${damage}`;
        } else if (!p1Tenpai && cpuTenpai) {
            // CPU Wins (Tenpai vs Noten)
            damage = 1000;
            this.pendingDamage = { target: 'P1', amount: damage };
            damageMsg = `데미지: -${damage}`;
        } else {
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
        this.setExpression('P1', p1Tenpai ? 'smile' : 'shocked');

        this.setExpression('CPU', cpuTenpai ? 'smile' : 'shocked');

        // Create result object
        const resultData = {
            round: this.currentRound,
            result: '무승부', // Draw
            yaku: '-'
        };
        this.roundHistory.push(resultData);

        // Visual Sequence
        // "Nagari" Text
        // Show Hands (Reveal CPU)
        // Show Tenpai/Noten status
        // Apply Damage Animation
        // Next Round

        // Setup sequence steps
        const p1X = 150; const p1Y = 300;
        const cpuX = 490; const cpuY = 300;

        const p1Fx = p1Tenpai ? 'fx/tenpai' : 'fx/noten'; // We don't have these images yet. 
        // as `STATE_NAGARI` transitions to `drawResult` which can show the message.

        // Logic for Tenpai/Noten
        const steps = [
            // SKILL: LAST_CHANCE (Before Nagari Finalizes)
            {
                type: 'CALLBACK', callback: () => {
                    const skillId = 'LAST_CHANCE';
                    const player = this.p1;
                    // Check if Player has skill & is Tenpai
                    if (BattleConfig.RULES.SKILLS_ENABLED && p1Tenpai && player.skills && player.skills.includes(skillId)) {
                        const skill = SkillData[skillId];
                        if (this.checkSkillCost(skill, 'P1')) {
                            // Pause Sequence handling manually if we show confirmation
                            this.sequencing.active = false;

                            if (this.scene && this.scene.showConfirm) {
                                this.scene.showConfirm(
                                    (BattleConfig.MESSAGES && BattleConfig.MESSAGES.SKILL_CONFIRM && BattleConfig.MESSAGES.SKILL_CONFIRM[skillId]) ?
                                        BattleConfig.MESSAGES.SKILL_CONFIRM[skillId](skill.cost) : skill.name,
                                    () => {
                                        // YES
                                        this.activateLastChance('P1');
                                        // activateLastChance handles sequencing state
                                    },
                                    () => {
                                        // NO
                                        this.sequencing.active = true; // Resume
                                    }
                                );
                            } else {
                                this.sequencing.active = true; // Safety
                            }
                        }
                    }
                }
            },
            {
                type: 'CALLBACK', callback: () => {
                    // Only continue if not interrupted by Win
                    if (this.currentState === this.STATE_FX_PLAYING) {
                        this.showPopup('NAGARI', { blocking: true });
                        const sound = BattleConfig.RESULT.TYPES.NAGARI.sound;
                        if (sound) this.events.push({ type: 'SOUND', id: sound });
                    }
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

    // Sequence step handlers. Each handler advances `this.sequencing` itself:
    // most call _advanceSequence(); WAIT/WAIT_FX stay on the step until their
    // condition is met; STATE/STATE_NAGARI end the sequence.
    sequenceStepHandlers: {
        WAIT: function (step, dt) {
            this.sequencing.timer += dt;
            if (this.sequencing.timer >= step.duration) {
                this.sequencing.timer = 0;
                this._advanceSequence();
            }
        },
        WAIT_FX: function () {
            if (this.scene && this.scene.activeFX && this.scene.activeFX.length > 0) {
                return; // Wait
            }
            this._advanceSequence();
        },
        FX: function (step) {
            this.playFX(step.asset, step.x, step.y, { scale: step.scale, slideFrom: step.slideFrom, popupType: step.popupType, blocking: step.blocking });
            this._advanceSequence();
        },
        FX_PARALLEL: function (step) {
            step.items.forEach(item => {
                this.playFX(item.asset, item.x, item.y, { scale: item.scale, slideFrom: item.slideFrom });
            });
            this._advanceSequence();
        },
        REVEAL_HAND: function () {
            this.cpu.isRevealed = true;
            this.sortHand(this.cpu.hand); // Sort for display
            this._advanceSequence();
        },
        REVEAL_URA: function () {
            this.uraDoraRevealed = true;
            this._advanceSequence();
        },
        STATE: function (step) {
            this.currentState = step.state;
            this.sequencing.active = false;
        },
        MUSIC: function (step) {
            this.events.push({ type: 'MUSIC', id: step.id, loop: step.loop });
            this._advanceSequence();
        },
        SOUND: function (step) {
            this.events.push({ type: 'SOUND', id: step.id });
            this._advanceSequence();
        },
        CALLBACK: function (step) {
            const prevSeq = this.sequencing;
            if (step.callback) step.callback();

            // Only advance if the callback didn't replace the whole sequence
            if (this.sequencing === prevSeq) {
                this._advanceSequence();
            }
        },
        STATE_NAGARI: function () {
            // FIX: Must set state to NAGARI to allow input (Next Round)
            this.currentState = this.STATE_NAGARI;
            this.calculateTenpaiDamage(true); // skipFX = true
            this.sequencing.active = false;
        },
        DEAL: function (step) {
            const newP1 = this.drawTiles(step.count);
            const newCpu = this.drawTiles(step.count);
            this.p1.hand = this.p1.hand.concat(newP1);
            this.cpu.hand = this.cpu.hand.concat(newCpu);

            if (step.sound) {
                this.events.push({ type: 'SOUND', id: step.sound });
            }
            this._advanceSequence();
        },
        FLIP_HAND: function (step) {
            // Reveal player hand (was face down during deal)
            this.p1.isFaceDown = false;
            this.sortHand(this.p1.hand); // Sort immediately on reveal
            if (step.sound) {
                this.events.push({ type: 'SOUND', id: step.sound });
            }
            this._advanceSequence();
        }
    },

    _advanceSequence: function () {
        this.sequencing.currentStep++;
    },

    updateSequence: function (dt = 1.0) {
        if (!this.sequencing.active) return;

        const step = this.sequencing.steps[this.sequencing.currentStep];
        if (!step) {
            this.sequencing.active = false;
            return;
        }

        const handler = this.sequenceStepHandlers[step.type];
        if (handler) {
            handler.call(this, step, dt);
        } else {
            // Unknown step types used to hang the sequence forever — warn and skip instead
            console.warn(`Unknown sequence step type: ${step.type}`);
            this._advanceSequence();
        }
    },








    nextRound: function () {
        this.currentRound++;
        this.startRound();
    },

    confirmResult: function () {
        // User clicked to confirm result (Win/Lose/Nagari)

        // Calculate Damage if needed (Usually done in checkRoundEnd, stored in resultInfo)
        // Actually, checkRoundEnd sets currentState. 
        // We just need to move to DAMAGE_ANIMATION state to play visual fx.

        this.currentState = this.STATE_DAMAGE_ANIMATION;
        this.timer = 0;
        this.stateTimer = 0; // Reset state timer
        this._damageEffectTriggered = false;
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
        this.showLastChanceResult = false; // Clear persistent Last Chance result

        // Reset Popup Debounce state to prevent carry-over bugs
        this._lastPopupType = null;
        this._lastPopupTime = -100;

        // Reset BGM to Battle Theme
        this.currentBgm = 'audio/bgm_basic';
        this.events.push({ type: 'MUSIC', id: this.currentBgm, loop: true });

        // Skill System Initialization
        this.skillsUsedThisTurn = false;
        this.roundSkillUsage = { p1: {}, cpu: {} };
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

        // this.p1.hand = this.drawTiles(11);
        this.cpu.isRevealed = false; // Reset reveal status
        // this.sortHand(this.p1.hand); // Sorting happens after deal reveal

        // Start Dealing Sequence
        this.currentState = this.STATE_DEALING;
        this.sequencing = {
            active: true,
            currentStep: 0,
            timer: 0,
            steps: [
                { type: 'WAIT', duration: 15 },
                { type: 'DEAL', count: 4, sound: 'audio/deal' },
                { type: 'WAIT', duration: 8 },
                { type: 'DEAL', count: 4, sound: 'audio/deal' },
                { type: 'WAIT', duration: 8 },
                { type: 'DEAL', count: 2, sound: 'audio/deal' },
                { type: 'WAIT', duration: 8 },
                { type: 'DEAL', count: 1, sound: 'audio/deal' },
                { type: 'WAIT', duration: 15 },
                { type: 'FLIP_HAND', sound: 'audio/flip' }, // Reveal & Sort
                { type: 'WAIT', duration: 5 },
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

        // Visible Dora
        const d1 = PaiData.TYPES[Math.floor(Math.random() * PaiData.TYPES.length)];
        this.doras.push({ type: d1.id, color: d1.color, img: d1.img });

        // Ura Dora (Hidden, Persistent)
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
        this.setExpressions('idle', 'idle');


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
        const char = this.getPlayer(who);

        // Cost check
        if (char.mp < skill.cost) return false;

        return true;
    },

    canUseSkill: function (skillId, who = 'P1', isInternal = false) {
        const skill = SkillData[skillId];
        if (!skill) return false;

        // Type Check (Active Phase only)
        // REACTIVE and SETUP skills cannot be used manually via menu
        // Internal calls (e.g. Ron Counters) bypass this check
        if (!isInternal && (skill.type === 'REACTIVE' || skill.type === 'SETUP')) return false;

        // MP Cost
        if (!this.checkSkillCost(skill, who)) return false;

        const entry = SkillRegistry[skillId] || {};

        // Round/Turn Limits
        if (!entry.multiUse) {
            // Once per ROUND limit
            if (this.roundSkillUsage[who.toLowerCase()] && this.roundSkillUsage[who.toLowerCase()][skillId]) {
                return false;
            }
            if (this.skillsUsedThisTurn && skill.type === 'ACTIVE') {
                return false;
            }
        }

        // Skill-specific conditions
        if (entry.canUse && !entry.canUse(this, who, this.getPlayer(who))) {
            return false;
        }

        return true;
    },

    useSkill: function (skillId, who = 'P1', isInternal = false) {
        const skill = SkillData[skillId];
        if (!skill) return false;

        // Use core validation
        if (!this.canUseSkill(skillId, who, isInternal)) {
            return false;
        }

        // autoFlow skills fire through dedicated flows (round start / pre-nagari),
        // NOT this generic path — block it so they can't double-fire.
        const entry = SkillRegistry[skillId] || {};
        if (entry.autoFlow) {
            this.showPopup('SKILL', { text: "자동 발동 스킬!", blocking: false });
            return false;
        }

        // Deduct MP
        this.consumeMp(who, skill.cost);

        // Process Effect
        this.processSkillEffect(skill, who, skillId);

        // Record usage
        if (!entry.multiUse) {
            this.roundSkillUsage[who.toLowerCase()][skillId] = true;
            this.skillsUsedThisTurn = true;
        }

        // Visuals
        this.showPopup('SKILL', { text: skill.name, blocking: false });

        this.setExpression(who, 'smile');

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

        // Refresh actions (some skills might change possible actions, e.g. Spirit Riichi)
        if (who === 'P1' && (this.currentState === this.STATE_PLAYER_TURN || this.currentState === this.STATE_ACTION_SELECT)) {
            this.checkSelfActions();
            this.selectedActionIndex = 0; // Reset index when actions refresh
        }

        return true;
    },

    processSkillEffect: function (skill, user, skillId) {
        if (skill.type !== 'ACTIVE' && skill.type !== 'SETUP') return;

        const entry = SkillRegistry[skillId];
        if (entry && entry.execute) {
            entry.execute(this, user, this.getPlayer(user), this.getOpponent(user));
        }
    },

    // Open the player's round-start tile exchange UI (EXCHANGE_TILE / PAINT_TILE)
    enterTileExchangeState: function () {
        this.currentState = this.STATE_TILE_EXCHANGE;
        this.exchangeIndices = [];
        this.hoverIndex = 0;
        this.timer = 0;
    },

    manageBuffs: function (who) {
        if (!who.buffs) return;

        // Spirit Riichi Timer
        if (who.buffs.spiritTimer > 0) {
            who.buffs.spiritTimer--;
            if (who.buffs.spiritTimer === 0) {
                who.buffs.guaranteedWin = true; // Activate Tiger Strike effect
                this.triggerDialogue('SKILL_WIN', who === this.p1 ? 'p1' : 'cpu'); // Generic win skill line
            }
        }

        // Discard Guard Timer
        if (who.buffs.discardGuard > 0) {
            who.buffs.discardGuard--;
            if (who.buffs.discardGuard === 0) {
            }
        }

        // Note: curseDraw is handled in drawTiles (decrements on effect)
    },

    heal: function (who, amount) {
        const char = this.getPlayer(who);
        char.hp = Math.min(char.hp + amount, char.maxHp);
        // Visual update handled by renderer update
    },

    consumeMp: function (who, amount) {
        const char = this.getPlayer(who);
        char.mp = Math.max(char.mp - amount, 0);
    },

    triggerReaction: function (skillId, onYes, onNo) {
        const skill = SkillData[skillId];
        // Ensure Scene has showConfirm
        let msg = `${skill.name}을(를) 사용하여 방어하시겠습니까? (MP: ${skill.cost})`;
        if (BattleConfig.MESSAGES && BattleConfig.MESSAGES.SKILL_CONFIRM) {
            const msgFunc = BattleConfig.MESSAGES.SKILL_CONFIRM[skillId] || BattleConfig.MESSAGES.SKILL_CONFIRM['DEFAULT'];
            if (msgFunc) {
                msg = msgFunc(skill.cost, skill.name); // Pass cost, name just in case
            }
        }

        if (this.scene && this.scene.showConfirm) {
            this.scene.showConfirm(
                msg,
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

    // Thin wrappers — implementations live in skillRegistry.js (SkillFlows).
    // Kept on the engine because internal flows and the Playwright tests call them.
    activateLastChance: function (who) {
        SkillFlows.activateLastChance(this, who);
    },

    resolveRouletteResult: function () {
        SkillFlows.resolveRouletteResult(this);
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
            // Guaranteed Win (Tiger Strike / Spirit Riichi)
            if (who.buffs && who.buffs.guaranteedWin) {
                const winningTileIdx = this.deck.findIndex(tile => {
                    // Check if this tile completes the hand
                    const testHand = [...who.hand, tile];
                    // Our YakuLogic.checkYaku checks patterns.
                    return YakuLogic.checkYaku(testHand, who.id);
                });

                if (winningTileIdx !== -1) {
                    // Found it! Move to end (pop position)
                    const tile = this.deck.splice(winningTileIdx, 1)[0];
                    this.deck.push(tile);
                    who.buffs.guaranteedWin = false; // Consume buff
                } else {
                }
            }

            // Curse Draw (Hell Pile)
            if (who.buffs && who.buffs.curseDraw > 0) {
                // Simplistic: Ensure we don't give a winning tile if possible
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
                        break;
                    }
                }
                who.buffs.curseDraw--; // Decrement duration (turns)
            }
        }

        const drawn = [];
        for (let i = 0; i < count; i++) {
            if (this.deck.length > 0) drawn.push(this.deck.pop());
        }
        return drawn;
    },

    updateLogic: function (dt = 1.0) {
        this.timer += dt;
        this.totalTicks += dt; // Always advance

        // Update Timeouts first (May trigger state changes)
        this.updateTimeouts(dt);
        // State Timer Logic
        if (this.currentState !== this.lastState) {
            this.stateTimer = 0;
            this.lastState = this.currentState;
        }
        this.stateTimer += dt;
        this.timer += dt;

        // Update Dialogue (Always run)

        // Music Update
        // Only update battle music during active battle states
        // Refactored to allow arbitrary state order
        const activeMusicStates = [
            this.STATE_DEALING,
            this.STATE_WAIT_FOR_DRAW,
            this.STATE_PLAYER_TURN,
            this.STATE_ACTION_SELECT,
            this.STATE_BATTLE_MENU,
            this.STATE_CPU_TURN,
            this.STATE_ROULETTE
        ];

        if (activeMusicStates.includes(this.currentState) && !this.sequencing.active) {
            this.updateBattleMusic();
        }

        // AUTO TEST LOGIC
        if (Game.isAutoTest && this.currentState === this.STATE_PLAYER_TURN && this.timer > 5) {
            this.performAutoTurn();
            return;
        }

        // AUTO TEST MENU HANDLING (Skip Action Select)
        if (Game.isAutoTest && this.currentState === this.STATE_ACTION_SELECT && this.timer > 5) {
            // Priority: TSUMO > RIICHI > PASS
            const tsumo = this.possibleActions.find(a => a.type === 'TSUMO');
            if (tsumo) {
                this.executeAction(tsumo);
                return;
            }
            const riichi = this.possibleActions.find(a => a.type === 'RIICHI');
            if (riichi) {
                this.executeAction(riichi);
                return;
            }
            const pass = this.possibleActions.find(a => a.type === 'PASS_SELF');
            if (pass) {
                this.executeAction(pass);
                return;
            }
        }

        // RIICHI AUTO-PLAY LOGIC (Normal Game)
        // Only if NOT declaring Riichi (User Manual Discard)
        if (!Game.isAutoTest && this.p1.isRiichi && !this.p1.declaringRiichi && this.currentState === this.STATE_PLAYER_TURN && this.timer > BattleConfig.SPEED.RIICHI_AUTO_DISCARD) {
            this.discardTile(this.p1.hand.length - 1);
            return;
        }

        // Update Sequencing
        if (this.sequencing.active) {
            this.updateSequence(dt);
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
            this.STATE_DAMAGE_ANIMATION,
            this.STATE_ROULETTE
        ];

        if (!endStates.includes(this.currentState) && this.currentState !== this.STATE_INIT) {
            const prevCheck = Math.floor((this.timer - dt) / 30);
            const currentCheck = Math.floor(this.timer / 30);
            if (currentCheck > prevCheck) {
                this.checkRoundEnd();
            }
        }

        // State Machine
        switch (this.currentState) {
            case this.STATE_ROULETTE:
                SkillFlows.updateRoulette(this, dt);
                break;

            case this.STATE_INIT:
                if (this.timer > (Game.isAutoTest ? 10 : 60)) { // Speed up init
                    if (this.turnCount === 1) {
                        // CPU Setup Skills: fire at round start, mirroring the player's
                        // tile-exchange UI below (executeCpuTileExchange handles MP/sound)
                        const cpuSkills = CharacterData.find(c => c.id === this.cpu.id).skills || [];
                        const cpuSetupSkill = cpuSkills.find(id => id === 'PAINT_TILE' || id === 'EXCHANGE_TILE');
                        if (BattleConfig.RULES.SKILLS_ENABLED && cpuSetupSkill) {
                            SkillFlows.executeCpuTileExchange(this, cpuSetupSkill);
                        }

                        // Skill Check: Setup Skills (Exchange Tile / Paint Tile)
                        const p1Skills = CharacterData.find(c => c.id === this.p1.id).skills;
                        if (BattleConfig.RULES.SKILLS_ENABLED && (p1Skills.includes('EXCHANGE_TILE') || p1Skills.includes('PAINT_TILE'))) {
                            this.enterTileExchangeState();
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
                if ((window.Input && Input.isMouseJustPressed() && this.timer > 15) || (Game.isAutoTest && this.timer > 5)) {
                    this.confirmDraw();
                }
                break;

            case this.STATE_PLAYER_TURN:
                break;

            case this.STATE_ACTION_SELECT:
                if (this.actionTimer > 0) this.actionTimer -= dt;

                break;

            case this.STATE_FX_PLAYING:
                // Blocked until FX finishes
                break;

            case this.STATE_CPU_TURN:
                if (this.timer > (Game.isAutoTest ? 5 : BattleConfig.SPEED.CPU_THINK_TIME)) { // Use config for CPU speed
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
                if (this.stateTimer > 60 && (Input.isMouseDown || Input.isDown(Input.SPACE) || Input.isDown(Input.ENTER) || Input.isMouseJustPressed())) {
                    this.proceedFromMatchOver();
                }
                break;

            case this.STATE_DAMAGE_ANIMATION:
                // Animation Logic
                // Trigger Damage Effect once
                if (!this._damageEffectTriggered) {
                    this._damageEffectTriggered = true;
                    if (this.pendingDamage) {
                        // Emit Damage Event (Sound + Renderer Shake)
                        this.events.push({ type: 'DAMAGE', target: this.pendingDamage.target, amount: this.pendingDamage.amount });

                        // Apply actual HP change
                        const victim = this.getPlayer(this.pendingDamage.target);
                        victim.hp = Math.max(0, victim.hp - this.pendingDamage.amount);
                        this.setExpression(this.pendingDamage.target, 'shocked');
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

        // Deck Exhaustion
        if (this.deck.length === 0) {
            this.startNagariSequence();
            return;
        }

        // Turn Limit
        // Check if we are STARTING turn 21
        if (this.turnCount > 20) {
            this.startNagariSequence();
            return;
        }
    },



    handleRoundEnd: function () {
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

        this.dialogueTriggeredThisTurn = false;
        this.skillsUsedThisTurn = false;

        // Manage Buffs (Start of Turn)
        this.manageBuffs(this.p1);

        // Check if dead (Nagari/Damage could happen?)
        if (this.p1.hp <= 0) return;

        // Draw Tile Logic
        // But Player Pon handling usually skips to Discard state immediately.

        const t = this.drawTiles(1, this.p1);
        if (t.length > 0) {
            const drawnTile = t[0];
            this.events.push({ type: 'DRAW', player: 'P1' });
            this.p1.hand.push(drawnTile);

            // Grouping Logic Removed as per user request.
            // Just keep the new tile at the end.
            this.lastDrawGroupSize = 1;
        }


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
        if (this.cpu.needsToDiscard) {
            this.cpu.needsToDiscard = false;
        } else {
            const t = this.drawTiles(1, this.cpu);
            if (t.length > 0) {
                this.events.push({ type: 'DRAW', player: 'CPU' });
                this.cpu.hand.push(t[0]);
            }
        }

        this.dialogueTriggeredThisTurn = false;

        // Manage Buffs
        this.manageBuffs(this.cpu);

        // CPU AI Logic
        // Active Skill Check
        this.checkCpuActiveSkills(); // AI decides to use skills

        // Check Tsumo
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

        // Check Riichi
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

            if (canRiichi && AILogic.shouldRiichi(this.cpu.hand, this.cpuSkill, this.cpu.aiProfile)) {
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

        // Decide Discard
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
            const discardIdx = AILogic.decideDiscard(this.cpu.hand, this.cpuSkill, this.cpu.aiProfile, context);
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

        // Suppress random dialogue if CPU is Riichi (Silent Focus)
        if (!this.dialogueTriggeredThisTurn && this.turnCount < 20 && !this.cpu.isRiichi) {
            if (this.p1.isRiichi) {
                if (Math.random() < BattleConfig.DIALOGUE.CHANCE.WORRY_RON) this.triggerDialogue('WORRY_RON', 'cpu');
            } else {
                if (Math.random() < BattleConfig.DIALOGUE.CHANCE.RANDOM) this.triggerDialogue('RANDOM', 'cpu');
            }
        }

        this.discards.push(discarded);

        // Reset Expressions
        this.setExpressions('idle', 'idle');
        this.selectedActionIndex = 0; // Reset index for safety

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
                this.currentState = this.STATE_WAIT_FOR_DRAW;
                this.timer = 0;
            }
        }
    },
    sortHand: function (hand) {
        const catOrder = { 'character': 1, 'weapon': 2, 'mayu': 3 };
        const colorOrder = { 'red': 1, 'blue': 2, 'yellow': 3, 'purple': 4 };

        hand.sort((a, b) => {
            // Get Data to check category
            const typeA = PaiData.TYPES.find(t => t.id === a.type) || {};
            const typeB = PaiData.TYPES.find(t => t.id === b.type) || {};

            const catA = typeA.category || 'unknown';
            const catB = typeB.category || 'unknown';

            if (catOrder[catA] !== catOrder[catB]) {
                return (catOrder[catA] || 99) - (catOrder[catB] || 99);
            }

            // Color
            if (a.color !== b.color) {
                return (colorOrder[a.color] || 99) - (colorOrder[b.color] || 99);
            }
            // ID (Name)
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
        // Advanced AI Logic with Weighted Scoring
        const cpuProfile = CharacterData.find(c => c.id === this.cpu.id).aiProfile;
        if (!cpuProfile) return; // Should not happen

        // Define Weights
        // aggression: Likelihood to use Attack skills
        // defense: Likelihood to use Defense skills
        // speed: Likelihood to use Setup/Cycle skills

        for (const skillId of skills) {
            const skill = SkillData[skillId];
            if (!skill) continue;

            // Core Validation
            if (!this.canUseSkill(skillId, 'CPU', true)) continue;

            const entry = SkillRegistry[skillId];
            if (!entry || !entry.aiScore) continue;

            const threshold = 0.6; // Base threshold to activate
            const ctx = {
                isTenpai: this.checkTenpai(this.cpu.hand, this.cpu.id),
                isPlayerRiichi: this.p1.isRiichi,
                turn: this.turnCount,
                profile: cpuProfile
            };
            const score = entry.aiScore(this, ctx);

            // Difficulty 2 (Hard) = Less random, more optimal.
            // Difficulty 0 (Easy) = Random checks.
            const randomFactor = Math.random() * 0.2; // 0.0 ~ 0.2 fluctuation

            if (score + randomFactor > threshold) {
                this.useSkill(skillId, 'CPU');
                return; // One skill per turn
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
        this.setExpressions('idle', 'idle');

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

        // RON
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

            if (reactiveSkillId) {
                const canAfford = this.checkSkillCost(SkillData[reactiveSkillId]);

                if (canAfford) {
                    // Trigger Reaction Modal
                    this.triggerReaction(reactiveSkillId, () => {
                        // YES: Cancel Ron
                        if (this.useSkill(reactiveSkillId, 'P1', true)) { // isInternal = true
                            if (reactiveSkillId === 'SUPER_IAI') {
                                SkillFlows.activateSuperIaido(this, 'P1');
                            } else if (reactiveSkillId === 'EXCHANGE_RON') {
                                SkillFlows.activateRonTileExchange(this, 'P1');
                            }
                        } else {
                            // Skill failed (e.g. limit reached), allow Ron
                            this.finishRon(win);
                        }

                    }, () => {
                        // NO: Allow Ron
                        this.finishRon(win);
                    });
                    return true; // Block standard flow
                }
            }

            this.finishRon(win);
            return true;
        }

        // PON
        let pairCount = 0;
        this.cpu.hand.forEach(t => {
            if (t.type === discardedTile.type && t.color === discardedTile.color) pairCount++;
        });

        // Require at least 3 tiles in hand to Pon (need 1 tile left to discard)
        if (pairCount >= 2 && !this.cpu.isRiichi && this.cpu.hand.length >= 3) {
            const context = { isMenzen: this.cpu.isMenzen, turnCount: this.turnCount };
            if (AILogic.shouldPon(this.cpu.hand, discardedTile, this.cpuSkill, this.cpu.aiProfile, context)) {
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
        // If this was meant to be a modification of executeCpuPon, please clarify.

        // Placeholder for Tenpai Info logic:
        const hand = player.hand;
        const tenpaiInfo = {
            isTenpai: false,
            waitingTiles: [],
            potentialYakus: []
        };

        if (this.checkTenpai(hand)) {
            tenpaiInfo.isTenpai = true;
        }
        return tenpaiInfo;
    },

    executeCpuPon: function (tile) {
        // Visuals (Immediate feedback)
        this.setExpressions('shocked', 'smile'); // P1 is shocked by CPU's Pon
        this.showPopup('PON', { blocking: true });
        this.triggerDialogue('PON', 'cpu');
        this.dialogueTriggeredThisTurn = true;

        this.currentState = this.STATE_FX_PLAYING;
        this.setTimeout(() => {
            if (!this.applyPon(this.cpu, tile)) return;

            // Setup Discard Phase
            this.currentState = this.STATE_CPU_TURN;
            this.timer = 30; // Short delay before discard
            this.cpu.needsToDiscard = true; // Fix: Prevent Drawing on next turn
        }, BattleConfig.SPEED.ACTION_WAIT);
    },


    checkPlayerActions: function (discardedTile) {
        // Discard Guard Check
        if (this.cpu.buffs && this.cpu.buffs.discardGuard > 0) {
            return false;
        }
        this.possibleActions = [];
        const hand = this.p1.hand;
        const fullHand = this.getFullHand(this.p1);

        // Check PON (Pair matches discard)
        let matchCount = 0;
        hand.forEach(t => {
            if (t.type === discardedTile.type) matchCount++;
        });
        // Require at least 3 tiles in hand to Pon (need 1 tile left to discard)
        if (matchCount >= 2 && this.turnCount !== 1 && this.turnCount < 20 && !this.p1.isRiichi && hand.length >= 3) {
            const ponAction = { type: 'PON', label: '펑', targetTile: discardedTile };
            this.possibleActions.push(ponAction);
        }

        // Check RON (Win)
        // Rule: Ron is allowed ONLY if Riichi is declared (User Requirement)
        // Since Pon disables Riichi, this effectively disables Ron after Pon.
        // Also need to check Yaku with FULL HAND.
        const tempHand = [...fullHand, discardedTile];
        if (this.p1.isRiichi && YakuLogic.checkYaku(tempHand, this.p1.id)) {
            this.possibleActions.push({ type: 'RON', label: '론' });
        }

        // Pass
        if (this.possibleActions.length > 0) {
            this.possibleActions.push({ type: 'PASS', label: '패스' });
            return true;
        }
        return false;
    },

    checkSelfActions: function () {
        // Optimization: Cache result check to strictly avoid re-calculation on same state

        // Generate State Key
        const currentHandKey = this.p1.hand.map(t => t.type + t.color).sort().join('|') +
            `_${this.p1.openSets.length}_${this.p1.isRiichi}_${this.turnCount}_` +
            `${this.p1.buffs.guaranteedWin}_${this.p1.buffs.spiritTimer}`;

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

        // Tsumo
        const yakuResult = YakuLogic.checkYaku(fullHand, this.p1.id);

        if (yakuResult) {
            this.possibleActions.push({ type: 'TSUMO', label: '쯔모' });
        }

        // Riichi
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

                // Since this is Riichi check, we assume Menzen, so fullHand == hand.

                if (this.checkTenpai(tempHand)) {
                    canRiichi = true;
                    break;
                }
            }

            if (canRiichi) {
                this.possibleActions.push({ type: 'RIICHI', label: '리치' });

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
            } else {
                this.recommendedDiscards = [];
            }
        }

        // Special Skill Enforcement (Tiger Strike / Spirit Riichi)
        // If Tiger Strike is active, player MUST Riichi now.
        if (this.p1.buffs && (this.p1.buffs.guaranteedWin || this.p1.buffs.spiritTimer > 0)) {
            if (!this.p1.isRiichi) {
                // Filter actions to only keep RIICHI
                this.possibleActions = this.possibleActions.filter(a => a.type === 'RIICHI');
            }
        }

        if (this.possibleActions.length > 0) {
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





    executeAction: function (action) {
        if (!action) return;
        if (action.type === 'PASS' || action.type === 'PASS_SELF') {
            // Pass logic
            if (action.type === 'PASS_SELF') {
                this.currentState = this.STATE_PLAYER_TURN;
            } else if (action.type === 'PASS') {
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
            // Visuals (Immediate feedback) — checkPlayerActions guarantees the pair exists
            this.setExpressions('smile', 'shocked');
            this.showPopup('PON', { blocking: true });
            this.triggerDialogue('PON', 'p1');
            this.dialogueTriggeredThisTurn = true;

            this.currentState = this.STATE_FX_PLAYING;
            this.setTimeout(() => {
                if (!this.applyPon(this.p1, action.targetTile)) return;

                this.setTimeout(() => {
                    this.triggerDialogue('PON_REPLY', 'cpu');
                }, BattleConfig.DIALOGUE.replyDelay);

                // Force Discard State (Turn continues but starts at discard phase)
                this.currentState = this.STATE_PLAYER_TURN;
                this.possibleActions = []; // Clear actions (e.g. Pon button)
                this.timer = 0;
                this.hoverIndex = this.p1.hand.length - 1; // Hover last tile
            }, BattleConfig.SPEED.ACTION_WAIT);
        } else if (action.type === 'RIICHI') {
            this.p1.isRiichi = true;
            this.p1.declaringRiichi = true; // Mark next discard
            // Calculate valid discards (must maintain tenpai)
            this.validRiichiDiscardIndices = this.getValidRiichiDiscards();

            this.showPopup('RIICHI', { slideFrom: 'LEFT' });

            // Dialogue
            const riichiKey = this.cpu.isRiichi ? 'COUNTER_RIICHI' : 'RIICHI';
            this.triggerDialogue(riichiKey, 'p1');
            this.setTimeout(() => {
                this.triggerDialogue('RIICHI_REPLY', 'cpu');
            }, BattleConfig.DIALOGUE.replyDelay);

            // Force BGM update immediately
            this.currentBgm = 'audio/bgm_showdown';
            this.events.push({ type: 'MUSIC', id: this.currentBgm, loop: true });

            // Expression: Smile (Will be reset on discard)
            this.setExpression('P1', 'smile');

            // Logic:
            // Smart Auto-Select: Evaluate all valid discards and pick the best one.
            const hand = this.p1.hand;
            let candidates = [];


            for (let i = 0; i < hand.length; i++) {
                const temp = [...hand];
                temp.splice(i, 1);
                // Check if Tenpai is maintained
                if (this.checkTenpai(temp, false)) {
                    const metrics = this.getRiichiScore(i);
                    candidates.push({ index: i, ...metrics, tile: hand[i] });
                }
            }


            if (candidates.length > 0) {
                // We do NOT force selection. User must choose manually.
                // candidates.sort ...

            } else {
                console.error("Riichi declared but no valid discards found? Should not happen.");
            }

            // Ensure unlocked
            this.riichiTargetIndex = -1;

            this.p1.riichiValidDiscards = null; // Clear manual list just in case

            this.updateBattleMusic();

            // Go to discard
            this.currentState = this.STATE_PLAYER_TURN;

        } else if (action.type === 'TSUMO') {
            const fullHand = this.getFullHand(this.p1);
            this.showPopup('TSUMO', { blocking: true });
            this.setExpressions('smile', 'shocked');

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
            if (BattleConfig.RULES.SKILLS_ENABLED && !this.cpu.isRiichi) {
                const reactiveSkillId = this.cpu.skills ? this.cpu.skills.find(id => {
                    const s = SkillData[id];
                    return s && s.type === 'REACTIVE' && (id === 'EXCHANGE_RON' || id === 'SUPER_IAI');
                }) : null;

                if (reactiveSkillId && this.checkSkillCost(SkillData[reactiveSkillId], 'CPU')) {
                    // AI DECISION: High chance to use if affordable
                    if (this.cpu.hp < 8000 || Math.random() < 0.8) {
                        if (this.useSkill(reactiveSkillId, 'CPU', true)) { // isInternal = true
                            if (reactiveSkillId === 'SUPER_IAI') {
                                SkillFlows.activateSuperIaido(this, 'CPU');
                            } else if (reactiveSkillId === 'EXCHANGE_RON') {
                                SkillFlows.activateRonTileExchange(this, 'CPU');
                            }
                            return; // Stop Ron execution
                        }
                    }
                }
            }

            // -------------------------------------

            this.showPopup('RON', { blocking: true });
            this.setExpressions('smile', 'shocked');

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

    getPlayer: function (who) {
        return who === 'P1' ? this.p1 : this.cpu;
    },

    getOpponent: function (who) {
        return who === 'P1' ? this.cpu : this.p1;
    },

    opponentOf: function (who) {
        return who === 'P1' ? 'CPU' : 'P1';
    },

    // Portrait expressions are view state owned by BattleScene — route changes
    // through the events queue like SOUND/FX instead of touching the view directly.
    setExpression: function (who, state) {
        this.events.push({ type: 'EXPRESSION', who: who, state: state });
    },

    setExpressions: function (p1State, cpuState) {
        this.setExpression('P1', p1State);
        this.setExpression('CPU', cpuState);
    },

    // Remove two tiles matching the discard from `player`'s hand, meld them as an
    // open PON set, and take the discard off the pile. Tile identity is by type
    // (each type has a fixed color). Returns false if the hand has no pair.
    applyPon: function (player, tile) {
        const matches = [];
        const keep = [];
        player.hand.forEach(t => {
            if (t.type === tile.type && matches.length < 2) {
                matches.push(t);
            } else {
                keep.push(t);
            }
        });
        if (matches.length < 2) return false;

        player.hand = keep;
        player.openSets.push({
            type: 'PON',
            tiles: [matches[0], matches[1], tile]
        });
        player.isMenzen = false;
        this.discards.pop();
        return true;
    },

    // Swap the tiles at `indices` out of `player`'s hand: removed tiles are
    // reinserted into the deck at random positions, then the same number of
    // fresh tiles is drawn and the hand re-sorted.
    exchangeTiles: function (player, indices) {
        const sortedIndices = [...indices].sort((a, b) => b - a);
        const removedTiles = [];
        sortedIndices.forEach(idx => {
            removedTiles.push(player.hand.splice(idx, 1)[0]);
        });

        removedTiles.forEach(tile => {
            const r = Math.floor(Math.random() * this.deck.length);
            this.deck.splice(r, 0, tile);
        });

        const newTiles = this.drawTiles(removedTiles.length, player);
        player.hand.push(...newTiles);
        this.sortHand(player.hand);
    },

    confirmDraw: function () {
        if (this.currentState !== this.STATE_WAIT_FOR_DRAW) return;
        this.playerDraw();
    },



    // Thin wrapper — implementation lives in yakuLogic.js (pure function).
    checkTenpai: function (hand, returnDetails) {
        return YakuLogic.checkTenpai(hand, returnDetails);
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
            this.currentBgm = targetBgm;
            this.events.push({ type: 'MUSIC', id: targetBgm, loop: true });
        }
    },

    // --- Bonus Logic (implementations in yakuLogic.js) ---
    calculateBonuses: function (hand, winType, isRiichi) {
        return YakuLogic.calculateBonuses(hand, winType, isRiichi, {
            turnCount: this.turnCount,
            doras: this.doras,
            uraDoras: this.uraDoras
        });
    },

    getRiichiScore: function (discardIdx) {
        return YakuLogic.getRiichiScore(this.p1.hand, this.p1.id, discardIdx);
    },

    triggerDialogue: function (key, owner) {
        if (!DialogueData || !DialogueData.BATTLE) return;

        const charId = (owner === 'p1' || owner === 'P1') ? this.p1.id : this.cpu.id;
        const charData = DialogueData.BATTLE[charId];
        const usedData = charData || DialogueData.BATTLE.default;
        const usedId = charData ? charId : 'default';


        let lines = usedData[key];
        if (!lines || lines.length === 0) {
            lines = DialogueData.BATTLE.default[key];
        }

        if (lines && lines.length > 0) {
            const text = lines[Math.floor(Math.random() * lines.length)];
            const who = (owner === 'p1' || owner === 'P1') ? 'P1' : 'CPU';
            this.events.push({ type: 'DIALOGUE', text: text, who: who });
            this.dialogueTriggeredThisTurn = true;
        } else {
        }
    },

    activeStateTileExchange: function () {
        // Logic handled by Scene Input (Selection toggling)

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
            return;
        }

        const totalCost = count * skill.cost;

        if (this.p1.mp < totalCost) {
            this.showPopup('SKILL', { text: "MP 부족!", blocking: false });
            Assets.playSound('audio/cancel');
            return;
        }

        // Execute Exchange
        this.consumeMp('P1', totalCost);
        this.exchangeTiles(this.p1, this.exchangeIndices);

        // Visuals
        this.events.push({ type: 'SOUND', id: 'audio/skill_activate' });
        this.showPopup('SKILL', { text: skill.name, blocking: false });

        // Reset Selection State
        this.exchangeIndices = [];

        // Proceed
        this.currentState = this.STATE_WAIT_FOR_DRAW;
        this.timer = 0;
    },

    // ----------------------------------------------------------------
    // ----------------------------------------------------------------
    performAutoTurn: function () {
        if (this.currentState !== this.STATE_PLAYER_TURN) {
            return;
        }

        // Riichi Enforcement: Must discard drawn tile (last one)
        if (this.p1.isRiichi) {
            if (this.p1.declaringRiichi && this.p1.validRiichiDiscardIndices) {
                const validIdx = this.p1.validRiichiDiscardIndices[0];
                this.discardTile(validIdx);
            } else {
                this.discardTile(this.p1.hand.length - 1);
            }
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
            // Delegate to AI Logic. Player autopilot plays competently and
            // independently of the CPU difficulty setting.
            const context = {
                discards: this.discards,
                opponentRiichi: this.cpu.isRiichi // Auto-play defends against CPU Riichi
            };
            const discardIdx = AILogic.decideDiscard(this.p1.hand, 0.7, null, context);

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
    }
};

// Global Exposure
window.BattleEngine = BattleEngine;
