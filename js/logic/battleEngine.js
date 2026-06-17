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

        // NOTE: CRITICAL(attackUp) / WATER_MIRROR(defenseUp) modifiers are applied
        // (and consumed) once in BattleSequencer.startWinSequence, which is the
        // single authoritative damage step. They were ALSO applied here, so every
        // win path (calculateScore → startWinSequence) doubled them — CRITICAL
        // became ×1.5625, 수경 became ×0.5625. Do not re-add them here.

        // Round to nearest 10
        return Math.round(score / 10) * 10;
    },

    sequencing: { active: false, steps: [], currentStep: 0, timer: 0 },

    // ── Game-harness seam ─────────────────────────────────────────────────
    // The ONLY place the rules engine touches the Game global: test/automation
    // flags. They can be toggled mid-battle, so they are read live (not
    // snapshotted at init). Everything else comes in through init(data).
    isAutoTest: function () {
        return typeof Game !== 'undefined' && !!Game.isAutoTest;
    },

    isAutoLoseMode: function () {
        return this.isAutoTest() && !!(Game.autoTestOptions && Game.autoTestOptions.loseMode);
    },

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


        if (this.isAutoLoseMode()) {
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
        this.difficulty = data.difficulty || 'normal';
        this.cpuSkill = this.computeCpuSkill(this.difficulty, this.defeatedOpponents.length);

        // Easy-mode luck smoothing for the PLAYER's draws (see drawTiles).
        this.drawAssistChance = (data.difficulty === 'easy')
            ? BattleConfig.RULES.DRAW_ASSIST.chance : 0;
        this.lastDrawAssist = null; // inspection: last assisted draw's target

        // Character luck (personality): biases the CPU's OWN draws toward (+) or away
        // from (−) useful tiles, with probability |luck|. 화린 +, 페톰 −. (see drawTiles)
        this.cpuLuck = (this.cpu.aiProfile && this.cpu.aiProfile.luck) || 0;

        this.startRound();
    },

    // Player difficulty picks a skill band; progression interpolates within it,
    // so early opponents are gentle and the final boss reaches the band's ceiling.
    // Two real difficulty tiers: normal and hard. "easy" uses the SAME skill band as
    // normal — what makes it easier is the player-side draw assist (see init), not a
    // dumber CPU. Skill rises linearly within the band as the tournament progresses.
    DIFFICULTY_BANDS: {
        // 운 게임이라 패 효율의 난이도 천장이 낮음 → AI는 거의/완전 최선수로 둔다.
        // 실수율은 skill로 매핑(T = 점수폭 × (1−skill) × MISTAKE_TEMP):
        //   normal=아주 가끔(1.0에 안 닿음), hard=절대 안 함(skill 1.0 → T=0).
        // easy는 normal과 동일 밴드 — 난이도 차이는 easy 전용 (사기급) 드로우 어시스트뿐.
        easy: [0.75, 0.95],   // == normal; 차이는 드로우 어시스트(easy만)
        normal: [0.75, 0.95],
        hard: [1.00, 1.00]
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

    // Win / Nagari shows and the sequence runner live in battleSequencer.js.

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

        console.log(`[Match] ${winner} wins — P1 HP ${this.p1.hp} / CPU HP ${this.cpu.hp}`);

        // Stop BGM
        this.events.push({ type: 'STOP_MUSIC' });

        // 패배 사운드만. 승리 효과음은 제거 — 빅토리 화면이 사라져서 다음 장면과 겹쳤음.
        if (winner !== 'P1') {
            const sound = (BattleConfig.RESULT.TYPES.MATCH_LOSE && BattleConfig.RESULT.TYPES.MATCH_LOSE.sound) || 'audio/lose';
            if (sound) this.events.push({ type: 'SOUND', id: sound });
        }

        // 빅토리/RESULT 화면 없음 — 승/패 모두 블랙 페이드로 다음 장면 전환(scene이 처리).
        // endMatch가 페이드를 깔고, 암전 시점에 proceedFromMatchOver(실제 네비)를 호출한다.
        if (this.scene && this.scene.endMatch) {
            this.scene.endMatch();
        } else {
            this.proceedFromMatchOver();
        }
    },

    // The match result is settled — hand off to the presenter. What happens next
    // (scene navigation, unlocks/save, continue count) is meta-game policy and
    // lives in BattleScene.proceedFromMatchOver, not in the rules engine.
    proceedFromMatchOver: function () {
        if (this.scene && this.scene.proceedFromMatchOver) {
            this.scene.proceedFromMatchOver();
        }
    },

    startNextRound: function () {
        this.currentRound++;
        this.startRound();
    },

    startRound: function () {
        // [debug] 난이도 검증용 — 매 라운드 cpuSkill 출력. cpuSkill은 매치 시작 시
        // 1회 산출되므로 같은 상대 내에선 라운드마다 동일하고, 다음 상대로 넘어가면
        // (격파 수 증가) 밴드 내에서 올라간다.
        const _band = this.DIFFICULTY_BANDS[this.difficulty] || this.DIFFICULTY_BANDS.normal;
        console.log(`[Difficulty] ${this.difficulty} | 격파 ${this.defeatedOpponents.length}/${this.TOURNAMENT_LENGTH} | band [${_band[0]}~${_band[1]}] | cpuSkill=${this.cpuSkill.toFixed(3)}`);

        this.turnCount = 1;
        this.winningYaku = null;
        this.discards = [];
        // Clear any leftover action window (e.g. a riichi RON from the prior round)
        // so it can't leak into the new deal — possibleActions now persists across
        // state transitions (no forced modal clears it).
        this.possibleActions = [];
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
        if (this.isAutoLoseMode()) {
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

        console.log(`[Skill] ${who} used ${skill.name} (${skillId})`);

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
        if (who === 'P1' && this.currentState === this.STATE_PLAYER_TURN) {
            this.checkSelfActions();
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
        BattleSequencer.startWinSequence(this, 'RON', 'CPU', score);
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
        // Skill buffs (guaranteed win / curse) manipulate the deck below and
        // must win over the easy-mode assist, so remember if any is active.
        const buffActive = who && who.buffs &&
            (who.buffs.guaranteedWin || who.buffs.curseDraw > 0);

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
                }
            }

            // Curse Draw (Hell Pile): hand the victim the most USELESS tile — peek the
            // deck top and surface the one that improves their hand LEAST, judged by the
            // real yaku table (rateTileForHand). This is the exact inverse of the draw
            // assist / cpuLuck: a tenpai victim never gets a completing tile, and while
            // building they get the least-helpful tile. Pure reorder of the deck top
            // (composition untouched).
            if (who.buffs && who.buffs.curseDraw > 0) {
                if (this.deck.length >= 2) {
                    const peek = Math.min(BattleConfig.RULES.DRAW_ASSIST.peek, this.deck.length);
                    const fullHand = this.getFullHand(who);
                    let worstOffset = 0;
                    let worstScore = Infinity;
                    for (let i = 0; i < peek; i++) {
                        const tile = this.deck[this.deck.length - 1 - i];
                        const s = YakuLogic.rateTileForHand(who.hand, tile, who.id, fullHand, {});
                        if (s < worstScore) { worstScore = s; worstOffset = i; }
                    }
                    if (worstOffset > 0) {
                        const picked = this.deck.splice(this.deck.length - 1 - worstOffset, 1)[0];
                        this.deck.push(picked);
                    }
                }
                who.buffs.curseDraw--; // Decrement duration (turns)
            }
        }

        // Easy-mode draw assist: peek the top few tiles and surface the one
        // that builds the highest-scoring hand (tall stacks / color / win tile).
        // Player single draws only — the CPU never gets rigged draws.
        if (!buffActive && who === this.p1 && count === 1 &&
            this.drawAssistChance > 0 && this.deck.length >= 2 &&
            Math.random() < this.drawAssistChance) {
            const peek = Math.min(BattleConfig.RULES.DRAW_ASSIST.peek, this.deck.length);
            const fullHand = this.getFullHand(who);
            let bestOffset = 0;
            let bestScore = -Infinity;
            const bestDetail = {};
            for (let i = 0; i < peek; i++) {
                const tile = this.deck[this.deck.length - 1 - i];
                const detail = {};
                const score = YakuLogic.rateTileForHand(who.hand, tile, who.id, fullHand, detail);
                if (score > bestScore) { bestScore = score; bestOffset = i; Object.assign(bestDetail, detail); }
            }
            // Record what the assist surfaced so it can be inspected
            // (BattleEngine.lastDrawAssist / QADebug). tier: complete|tenpai|building.
            const chosen = this.deck[this.deck.length - 1 - bestOffset];
            this.lastDrawAssist = {
                turn: this.turnCount,
                tile: chosen ? chosen.type : null,
                tier: bestDetail.tier || null,
                yaku: bestDetail.yaku || null,
                reordered: bestOffset > 0
            };
            if (bestOffset > 0) {
                // Move the chosen tile to the top (pop position) — pure reorder,
                // deck composition is untouched.
                const picked = this.deck.splice(this.deck.length - 1 - bestOffset, 1)[0];
                this.deck.push(picked);
            }
        }

        // CPU draw luck (personality): bias the CPU's own single draw toward (luck>0)
        // or away from (luck<0) useful tiles, with probability |luck|. Pure reorder of
        // the deck top — composition untouched, mirrors the player assist above.
        if (!buffActive && who === this.cpu && count === 1 && this.cpuLuck && this.deck.length >= 2 &&
            Math.random() < Math.abs(this.cpuLuck)) {
            const want = this.cpuLuck > 0; // true = best tile, false = worst tile
            const peek = Math.min(BattleConfig.RULES.DRAW_ASSIST.peek, this.deck.length);
            const fullHand = this.getFullHand(who);
            let pickOffset = 0;
            let pickScore = want ? -Infinity : Infinity;
            for (let i = 0; i < peek; i++) {
                const tile = this.deck[this.deck.length - 1 - i];
                const s = YakuLogic.rateTileForHand(who.hand, tile, who.id, fullHand, {});
                if (want ? (s > pickScore) : (s < pickScore)) { pickScore = s; pickOffset = i; }
            }
            if (pickOffset > 0) {
                const picked = this.deck.splice(this.deck.length - 1 - pickOffset, 1)[0];
                this.deck.push(picked);
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

        // Update Dialogue (Always run)

        // Music Update
        // Only update battle music during active battle states
        // Refactored to allow arbitrary state order
        const activeMusicStates = [
            this.STATE_DEALING,
            this.STATE_WAIT_FOR_DRAW,
            this.STATE_PLAYER_TURN,
            this.STATE_BATTLE_MENU,
            this.STATE_CPU_TURN,
            this.STATE_ROULETTE
        ];

        if (activeMusicStates.includes(this.currentState) && !this.sequencing.active) {
            this.updateBattleMusic();
        }

        // AUTO TEST LOGIC — own-turn tsumo/riichi/pon are all handled inside
        // performAutoTurn / the draw window now (no forced ACTION_SELECT modal).
        if (this.isAutoTest() && this.currentState === this.STATE_PLAYER_TURN && this.timer > 3) {
            this.performAutoTurn();
            return;
        }

        // RIICHI AUTO-PLAY LOGIC (Normal Game)
        // Only if NOT declaring Riichi (User Manual Discard)
        if (!this.isAutoTest() && this.p1.isRiichi && !this.p1.declaringRiichi && this.currentState === this.STATE_PLAYER_TURN && this.timer > BattleConfig.SPEED.RIICHI_AUTO_DISCARD) {
            this.discardTile(this.p1.hand.length - 1);
            return;
        }

        // Update Sequencing
        if (this.sequencing.active) {
            BattleSequencer.update(this, dt);
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
            const prevCheck = Math.floor((this.timer - dt) / 15);
            const currentCheck = Math.floor(this.timer / 15);
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
                if (this.timer > (this.isAutoTest() ? 5 : 30)) { // Speed up init
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
                if ((window.Input && Input.isMouseJustPressed() && this.timer > 8) || (this.isAutoTest() && this.timer > 3)) {
                    this.confirmDraw();
                }
                break;

            case this.STATE_PLAYER_TURN:
                break;

            case this.STATE_FX_PLAYING:
                // Blocked until FX finishes
                break;

            case this.STATE_CPU_TURN:
                if (this.timer > (this.isAutoTest() ? 3 : BattleConfig.SPEED.CPU_THINK_TIME)) { // Use config for CPU speed
                    this.cpuDraw();
                }
                break;

            case this.STATE_WIN:
            case this.STATE_LOSE:
                // Block input during "Rolling" animation (140 frames)
                if (this.stateTimer > 160 && (Input.isMouseJustPressed() || Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z))) {
                    this.confirmResult();
                }
                break;

            case this.STATE_NAGARI:
                if (Input.isMouseJustPressed() || Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z)) {
                    this.confirmResult();
                }
                break;

            case this.STATE_MATCH_OVER:
                // 매치 종료는 matchOver에서 endMatch(블랙 페이드)로 자동 전환 — 입력 대기 없음.
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
                        console.log(`[Damage] ${this.pendingDamage.target} -${this.pendingDamage.amount} → HP ${victim.hp}`);
                        this.setExpression(this.pendingDamage.target, 'shocked');
                    }
                }

                if (this.timer > (this.isAutoTest() ? 5 : 30)) { // Speed up damage anim
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
            BattleSequencer.startNagariSequence(this);
            return;
        }

        // Turn Limit
        // Check if we are STARTING turn 21
        if (this.turnCount > 20) {
            BattleSequencer.startNagariSequence(this);
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
            console.log(`[Draw] P1: ${drawnTile.color} ${drawnTile.type}`);

            // Grouping Logic Removed as per user request.
            // Just keep the new tile at the end.
            this.lastDrawGroupSize = 1;
        }


        // CHECK SELF ACTIONS (Riichi, Tsumo) — populates possibleActions for the menu.
        if (this.checkSelfActions() && this.p1.isRiichi) {
            // Riichi Auto-Win (Tsumo): riichi is committed, so the win fires
            // automatically with no menu/choice.
            const tsumoAction = this.possibleActions.find(a => a.type === 'TSUMO');
            if (tsumoAction) {
                this.executeAction(tsumoAction);
                return;
            }
        }

        // No forced modal. Stay in the normal turn; if possibleActions holds a
        // TSUMO/RIICHI, the battle menu (아가리/리치) and the "날 수 있어!" hint
        // surface it. Discarding declines (discardTile clears possibleActions).
        // When there are no actions, possibleActions is already empty.
        this.currentState = this.STATE_PLAYER_TURN;
        this.hoverIndex = this.p1.hand.length - 1; // Default cursor to new tile
        this.actionFocused = false; // start on the new tile, not the action button
        this.timer = 0;
    },

    cpuDraw: function () {
        if (this.cpu.needsToDiscard) {
            this.cpu.needsToDiscard = false;
            this.cpuDrawInfo = null; // Post-Pon: no fresh draw to react to
        } else {
            // Snapshot the pre-draw concealed hand so the discard-time reaction
            // can cheaply judge whether the drawn tile was useful (GOOD_DRAW) or
            // junk (BAD_DRAW). No heavy yaku eval — just same-id/color counts.
            const preHand = [...this.cpu.hand];
            const t = this.drawTiles(1, this.cpu);
            if (t.length > 0) {
                this.events.push({ type: 'DRAW', player: 'CPU' });
                this.cpu.hand.push(t[0]);
                console.log(`[Draw] CPU: ${t[0].color} ${t[0].type}`);
                this.cpuDrawInfo = { tile: t[0], preHand: preHand };
            } else {
                this.cpuDrawInfo = null;
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
                BattleSequencer.startWinSequence(this, 'TSUMO', 'CPU', score);
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

                // Expression: Smile (mirrors the player's riichi; reset on discard).
                this.setExpression('CPU', 'smile');

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
        let discardIdx;
        if (this.cpu.isRiichi) {
            // If Riichi (existing state), discard drawn tile
            discardIdx = this.cpu.hand.length - 1;
        } else {
            const context = {
                discards: this.discards,
                opponentRiichi: this.p1.isRiichi,
                doras: this.doras, // Pass Doras for AI
                turnCount: this.turnCount,
                charId: this.cpu.id // for value (큰 역 노림) yaku-score lookahead
            };
            discardIdx = AILogic.decideDiscard(this.cpu.hand, this.cpuSkill, this.cpu.aiProfile, context);
        }

        // Hold briefly between draw and discard so the player can see the tile the
        // CPU just drew before it's thrown. The DRAW event already fired (sound/anim);
        // park in FX_PLAYING so CPU_TURN doesn't re-fire and input stays blocked, then
        // discard after the beat. Autotest skips the hold (atomic, keeps tests fast).
        const hold = this.isAutoTest() ? 0 : BattleConfig.SPEED.CPU_DISCARD_HOLD;
        if (hold > 0) {
            this.currentState = this.STATE_FX_PLAYING;
            this.setTimeout(() => {
                this.currentState = this.STATE_CPU_TURN;
                this.discardTileCPU(discardIdx);
            }, hold);
        } else {
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
            const CH = BattleConfig.DIALOGUE.CHANCE;
            if (this.p1.isRiichi) {
                if (Math.random() < CH.WORRY_RON) this.triggerDialogue('WORRY_RON', 'cpu');
            } else {
                // React to how good the freshly drawn tile was. classifyCpuDraw
                // falls back to 'RANDOM' (neutral) when the tile is unremarkable
                // or the character has no situational line.
                const key = this.classifyCpuDraw();
                const chance = key === 'GOOD_DRAW' ? CH.DRAW_GOOD
                    : key === 'BAD_DRAW' ? CH.DRAW_BAD
                        : CH.RANDOM;
                if (Math.random() < chance) this.triggerDialogue(key, 'cpu', 'RANDOM');
            }
        }
        this.cpuDrawInfo = null; // Consumed

        this.discards.push(discarded);
        console.log(`[Discard] CPU: ${discarded.color} ${discarded.type}${discarded.isRiichi ? ' [Riichi]' : ''}`);

        // Reset Expressions
        this.setExpressions('idle', 'idle');

        // checkPlayerActions populates possibleActions (PON, and RON when riichi).
        // Ron is riichi-only and auto-fires (riichi is committed). PON (non-riichi)
        // is NOT forced into a modal — possibleActions persists into the draw window
        // below so the battle menu can offer 펑; drawing forgoes it.
        if (this.checkPlayerActions(discarded) && this.p1.isRiichi) {
            const ronAction = this.possibleActions.find(a => a.type === 'RON');
            if (ronAction) {
                this.executeAction(ronAction);
                return;
            }
        }

        // Advance to the player's draw turn. possibleActions (PON) is intentionally
        // kept so the menu can surface it during WAIT_FOR_DRAW.
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
        // value:   Likelihood to use Attack/damage skills (big-hand characters)
        // defense: Likelihood to use Defense skills
        // speed:   Likelihood to use Setup/Cycle skills

        // cpuSkill governs how reliably the CPU acts on a warranted skill — its
        // skill-use FREQUENCY. A weak CPU often lets a good chance slip; a strong
        // one takes it almost every time. (Timing quality still comes from aiScore.)
        const skillUseChance = 0.3 + 0.7 * this.cpuSkill;

        for (const skillId of skills) {
            const skill = SkillData[skillId];
            if (!skill) continue;

            // Core Validation
            if (!this.canUseSkill(skillId, 'CPU', true)) continue;

            const entry = SkillRegistry[skillId];
            if (!entry || !entry.aiScore) continue;

            const threshold = 0.6; // Base desirability threshold (good timing)
            const ctx = {
                isTenpai: this.checkTenpai(this.cpu.hand, this.cpu.id),
                isPlayerRiichi: this.p1.isRiichi,
                turn: this.turnCount,
                profile: cpuProfile
            };
            const score = entry.aiScore(this, ctx);
            const randomFactor = Math.random() * 0.2; // 0.0 ~ 0.2 fluctuation

            // First skill whose timing is warranted: decide (once per turn) whether
            // to actually pull the trigger, gated by skill-use frequency.
            if (score + randomFactor > threshold) {
                if (Math.random() < skillUseChance) {
                    this.useSkill(skillId, 'CPU');
                }
                return;
            }
        }
    },

    discardTile: function (index) {
        if (this.currentState !== this.STATE_PLAYER_TURN) {
            return;
        }

        // Discarding declines any pending own-turn win/riichi offer (no forced modal).
        this.possibleActions = [];

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
        console.log(`[Discard] P1: ${discarded.color} ${discarded.type}${discarded.isRiichi ? ' [Riichi]' : ''}`);

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

            // "내가 리치를 걸고 있을 때는 사용할 수 없다" — counter unavailable while
            // P1 is in Riichi (mirrors the CPU guard above).
            if (reactiveSkillId && !this.p1.isRiichi) {
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
            this.timer = 15; // Short delay before discard
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

        return this.possibleActions.length > 0;
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
        // Declining (펑/아가리/리치 passing) is no longer an explicit action — the
        // player simply draws or discards, which clears possibleActions. So only the
        // affirmative actions (PON/RON/TSUMO/RIICHI) reach here.
        if (action.type === 'PON') {
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
                BattleSequencer.startWinSequence(this, 'TSUMO', 'P1', score);
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
                BattleSequencer.startWinSequence(this, 'RON', 'P1', score);
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

    // Can `who` declare Riichi right now? Closed hand, not already riichi, in
    // time, and able to reach tenpai by discarding one tile. (Pon opens the
    // hand → false.) Mirrors the RIICHI eligibility in checkSelfActions/cpuDraw.
    canDeclareRiichi: function (who) {
        const p = this.getPlayer(who);
        if (p.isRiichi || p.openSets.length !== 0 || this.turnCount >= 20 || p.hand.length < 2) {
            return false;
        }
        for (let i = 0; i < p.hand.length; i++) {
            const tempHand = [...p.hand];
            tempHand.splice(i, 1);
            if (this.checkTenpai(tempHand)) return true;
        }
        return false;
    },

    // Skill-driven riichi lock (TIGER_STRIKE / SPIRIT_RIICHI): commit the hand so
    // the player can't break tenpai before the guaranteed win — otherwise drawTiles
    // can't find a winning tile and the skill is wasted. Same as the normal RIICHI
    // action minus popup/FX. (validRiichiDiscardIndices is P1-only; the CPU AI
    // handles its own riichi discard.)
    declareRiichiLock: function (who) {
        const p = this.getPlayer(who);
        p.isRiichi = true;
        p.declaringRiichi = true;
        if (who === 'P1') {
            this.validRiichiDiscardIndices = this.getValidRiichiDiscards();
        }
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
        console.log(`[Pon] ${player === this.p1 ? 'P1' : 'CPU'}: ${tile.color} ${tile.type}`);
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
        console.log(`[Exchange] ${player === this.p1 ? 'P1' : 'CPU'}: ${removedTiles.length}장 — out [${removedTiles.map(t => t.type).join(',')}] in [${newTiles.map(t => t.type).join(',')}]`);
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

    // Classify the CPU's freshly drawn tile (set in cpuDraw) into a dialogue
    // pool: 'GOOD_DRAW' (useful), 'BAD_DRAW' (junk) or 'RANDOM' (unremarkable).
    classifyCpuDraw: function () {
        const info = this.cpuDrawInfo;
        if (!info || !info.tile) return 'RANDOM';
        const tile = info.tile;
        const preHand = info.preHand || [];

        // Cheap O(N) judgement — runs once per CPU discard, must NOT do heavy
        // yaku/shanten recomputation (that path caused past slowdowns). Yaku here
        // are triplet/color based (no runs), so a tile's worth ≈ how many it
        // pairs with (same id) + its color concentration.
        const sameType = preHand.filter(t => t.type === tile.type).length;
        const sameColor = preHand.filter(t => t.color === tile.color).length;

        // GOOD: completes a triplet (already held a pair)
        if (sameType >= 2) return 'GOOD_DRAW';

        // BAD: isolated junk — pairs with nothing and its color barely appears
        if (sameType === 0 && sameColor <= 2) return 'BAD_DRAW';

        return 'RANDOM';
    },

    // fallbackKey: if the character has no line for `key`, use this key on the
    // SAME character first (e.g. GOOD_DRAW → that char's neutral RANDOM) before
    // falling through to the global default pool.
    triggerDialogue: function (key, owner, fallbackKey) {
        if (!DialogueData || !DialogueData.BATTLE) return;

        const charId = (owner === 'p1' || owner === 'P1') ? this.p1.id : this.cpu.id;
        const charData = DialogueData.BATTLE[charId];
        const usedData = charData || DialogueData.BATTLE.default;
        const usedId = charData ? charId : 'default';


        let lines = usedData[key];
        if ((!lines || lines.length === 0) && fallbackKey) {
            lines = usedData[fallbackKey];
        }
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

        // Declare an available win (non-riichi tsumo). Previously the forced
        // ACTION_SELECT modal's auto-test handler did this; now tsumo lives in the
        // normal turn, so the auto driver declares it here.
        const tsumoAction = (this.possibleActions || []).find(a => a.type === 'TSUMO');
        if (tsumoAction) {
            this.executeAction(tsumoAction);
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
