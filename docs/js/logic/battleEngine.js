const BattleEngine = {
    STATE_INIT: 0,
    STATE_DEALING: 1,
    STATE_WAIT_FOR_DRAW: 2,
    STATE_PLAYER_TURN: 3,
    STATE_ACTION_SELECT: 4,
    STATE_BATTLE_MENU: 5,
    STATE_CPU_TURN: 6,
    STATE_FX_PLAYING: 7,
    STATE_DAMAGE_ANIMATION: 8,
    STATE_WIN: 9,
    STATE_LOSE: 10,
    STATE_NAGARI: 11,
    STATE_MATCH_OVER: 12,
    STATE_TILE_EXCHANGE: 13,
    STATE_ROULETTE: 14,

    lastChance: null,

    SEAT_WHO: ['P1', 'CPU'],
    localSeat: 0,
    seats: null,
    controllers: null,
    firstSeat: 0,
    firstTurn: 'P1',
    cpuPhase: 'draw',
    setupPending: [],
    setupWaiting: null,
    PON_THINK_CREDIT: 15,

    currentState: 0,
    timer: 0,
    totalTicks: 0,
    stateTimer: 0,
    lastState: -1,

    timers: TickTimers.create(),

    DELAY_DRAW: 60,
    DELAY_DISCARD_AUTO: 60,

    calculateScore: function (baseScore, isMenzen, attacker, defender) {
        let score = baseScore;

        if (!isMenzen) {
            score = Math.floor(baseScore * 0.75);
        }

        return Math.round(score / 10) * 10;
    },

    sequencing: { active: false, steps: [], currentStep: 0, timer: 0 },

    isAutoTest: function () {
        return typeof Game !== 'undefined' && !!Game.isAutoTest;
    },

    isSymmetric: function () {
        return this.isAutoTest() && typeof Game !== 'undefined' && !!Game.symmetric;
    },

    SYMMETRIC_SKILL: 1.0,

    luckOf: function (who) {
        if (!this.luckEnabled) return 0;
        const c = CharacterData.find(ch => ch.id === who.id);
        return (c && c.aiProfile && c.aiProfile.luck) || 0;
    },

    skillOf: function (who) {
        return who === 'P1' ? this.p1Skill : this.cpuSkill;
    },

    whoAt: function (seat) {
        return seat === this.localSeat ? 'P1' : 'CPU';
    },

    seatOf: function (who) {
        return who === 'P1' ? this.localSeat : 1 - this.localSeat;
    },

    playerAt: function (seat) {
        return this.getPlayer(this.whoAt(seat));
    },

    defaultControllers: function () {
        return { P1: new HumanController(), CPU: new AIController() };
    },

    controllerOf: function (who) {
        if (!this.controllers) this.controllers = this.defaultControllers();
        return this.controllers[who];
    },

    turnStateOf: function (who) {
        return who === 'P1' ? this.STATE_PLAYER_TURN : this.STATE_CPU_TURN;
    },

    isDrawWindow: function (who) {
        if (who === 'P1') return this.currentState === this.STATE_WAIT_FOR_DRAW;
        return this.currentState === this.STATE_CPU_TURN && this.cpuPhase === 'draw';
    },

    isTurn: function (who) {
        if (who === 'P1') return this.currentState === this.STATE_PLAYER_TURN;
        return this.currentState === this.STATE_CPU_TURN && this.cpuPhase === 'turn';
    },

    isAutoLoseMode: function () {
        return this.isAutoTest() && !!(Game.autoTestOptions && Game.autoTestOptions.loseMode);
    },

    showPopup: function (type, options = {}) {
        if (this._lastPopupType === type && (this.totalTicks - this._lastPopupTime) < 10) {
            return;
        }
        this._lastPopupType = type;
        this._lastPopupTime = this.totalTicks;

        const asset = `fx/${type.toLowerCase()}`;
        const typeConf = BattleConfig.POPUP.TYPES[type] || {};

        const finalOptions = {
            timeline: options.timeline || typeConf.timeline,
            labels: options.labels,
            blocking: options.blocking,
            popupType: type
        };
        this.playFX(asset, 0, 0, finalOptions);
    },

    playerIndex: 0,
    cpuIndex: 0,

    p1: { hp: BattleConfig.RULES.INITIAL_HP, maxHp: BattleConfig.RULES.INITIAL_HP, mp: BattleConfig.RULES.INITIAL_MP, maxMp: BattleConfig.RULES.INITIAL_MP, hand: [], openSets: [], isRiichi: false },
    cpu: { hp: BattleConfig.RULES.INITIAL_HP, maxHp: BattleConfig.RULES.INITIAL_HP, mp: BattleConfig.RULES.INITIAL_MP, maxMp: BattleConfig.RULES.INITIAL_MP, hand: [], openSets: [], isRiichi: false, isRevealed: false },

    deck: [],
    discards: [],

    turnCount: 1,
    currentRound: 1,
    doras: [],
    winningYaku: null,

    possibleActions: [],

    dialogueTriggeredThisTurn: false,
    lastDrawInfo: { P1: null, CPU: null },
    roundSkillUsage: { p1: {}, cpu: {} },

    logAction: function (who, type, payload) {
        const entry = Object.assign({ round: this.currentRound, who: who, type: type }, payload);
        this.actionLog.push(entry);
        if (this.onAction) this.onAction(entry);
    },

    stateHash: function () {
        const key = t => t.type + ':' + t.color;
        const hand = p => p.hand.map(key).sort().join(',');
        const sets = p => p.openSets.map(s => s.tiles.map(key).sort().join(',')).join(';');
        const s0 = this.playerAt(0), s1 = this.playerAt(1);
        const parts = [
            hand(s0), sets(s0), s0.hp, s0.mp,
            hand(s1), sets(s1), s1.hp, s1.mp,
            this.discards.map(key).join(','),
            this.deck.length, this.currentRound, this.turnCount,
            this.rng.deck.calls, this.rng.fx.calls
        ];
        const s = parts.join('|');
        let h = 0x811c9dc5;
        for (let i = 0; i < s.length; i++) {
            h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
        }
        return h >>> 0;
    },

    tileKey: function (tile) {
        return { type: tile.type, color: tile.color };
    },

    init: function (data, scene) {
        this.scene = scene;
        this.seed = (data.seed != null ? data.seed : Rng.randomSeed()) >>> 0;
        this.rng = Rng.create(this.seed);
        AILogic.rng = this.rng.ai;
        this.actionLog = [];
        this.onAction = data.onAction || null;
        this.online = data.online || null;
        this.resultSeq = 0;
        this.clock = null;
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.oncontextmenu = (e) => {
                e.preventDefault();
            };
        }

        this.timers.clear();

        this.localSeat = data.localSeat ? 1 : 0;
        this.seats = [this.playerAt(0), this.playerAt(1)];
        this.controllers = Object.assign(this.defaultControllers(), data.controllers || {});

        this.playerIndex = data.playerIndex || 0;
        this.cpuIndex = data.cpuIndex || 0;

        const p1Data = CharacterData.find(c => c.index === this.playerIndex) || CharacterData[this.playerIndex];
        const cpuData = CharacterData.find(c => c.index === this.cpuIndex) || CharacterData[this.cpuIndex];

        if (p1Data) {
            this.p1.id = p1Data.id;
            this.p1.name = p1Data.name;
            this.p1.skills = p1Data.skills || [];
        }
        if (cpuData) {
            this.cpu.id = cpuData.id;
            this.cpu.name = cpuData.name;
            this.cpu.aiProfile = cpuData.aiProfile || null;
            this.cpu.skillOffset = cpuData.skillOffset || 0;
            this.cpu.skills = cpuData.skills || [];
        }

        BattleMenuSystem.init(this);


        if (this.isAutoLoseMode()) {
            this.p1.hp = 1000;
            this.p1.maxHp = 1000;
            this.cpu.hp = 99999;
            this.cpu.maxHp = 99999;
        }

        this.sequencing = { active: false, steps: [], currentStep: 0, timer: 0 };

        this.currentState = this.STATE_INIT;
        this.timer = 0;
        this.turnCount = 1;
        this.currentRound = 1;

        const bgIndex = this.rng.fx.int(BattleConfig.BG.max - BattleConfig.BG.min + 1) + BattleConfig.BG.min;
        const bgName = bgIndex.toString().padStart(2, '0');
        this.bgPath = `${BattleConfig.BG.prefix}${bgName}.png`;

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

        this.defeatedOpponents = data.defeatedOpponents || [];
        this.roundHistory = [];

        this.difficulty = data.difficulty || 'normal';
        if (this.difficulty === 'hard') this.cpu.skillOffset = 0;
        this.cpuSkill = this.applySkillOffset(
            this.computeCpuSkill(this.difficulty, this.defeatedOpponents.length), this.cpu.skillOffset);

        this.drawAssistChance = (data.difficulty === 'easy')
            ? BattleConfig.RULES.DRAW_ASSIST.chance : 0;
        this.lastDrawAssist = null;

        this.luckEnabled = true;

        this.symmetric = this.isSymmetric();
        this.p1.exchangeDiscard = this.cpu.exchangeDiscard = null;
        this.p1.exchangeReturned = this.cpu.exchangeReturned = null;
        this.p1Skill = this.cpuSkill;
        if (this.symmetric) {
            this.p1.skillOffset = this.cpu.skillOffset = 0;
            this.cpuSkill = this.p1Skill = this.SYMMETRIC_SKILL;
            this.drawAssistChance = 0;
            this.p1.aiProfile = p1Data && p1Data.aiProfile || null;
        }

        this.narration = null;
        this.tutorial = null;
        if (data.tutorial) {
            this.drawAssistChance = 0;
            this.luckEnabled = false;
            this.tutorialLoad(data.lessonIndex || 0);
        }

        this.startRound();
    },

    DIFFICULTY_BANDS: {
        easy: [0.75, 0.95],
        normal: [0.75, 0.95],
        hard: [1.00, 1.00]
    },
    TOURNAMENT_LENGTH: 5,

    computeCpuSkill: function (difficulty, defeatedCount) {
        const band = this.DIFFICULTY_BANDS[difficulty] || this.DIFFICULTY_BANDS.normal;
        const t = Math.max(0, Math.min(1, defeatedCount / this.TOURNAMENT_LENGTH));
        return band[0] + (band[1] - band[0]) * t;
    },

    applySkillOffset: function (skill, offset) {
        return Math.max(0, Math.min(1, skill + (offset || 0)));
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

    calculateTenpaiDamage: function (p1Tenpai, cpuTenpai) {
        if (p1Tenpai === undefined) p1Tenpai = this.checkTenpai(this.getFullHand(this.p1), false, this.isOpen(this.p1));
        if (cpuTenpai === undefined) cpuTenpai = this.checkTenpai(this.getFullHand(this.cpu), false, this.isOpen(this.cpu));

        let damage = 0;
        let damageMsg = "데미지 없음";

        if (p1Tenpai && !cpuTenpai) {
            damage = 1000;
            this.pendingDamage = { target: 'CPU', amount: damage };
            damageMsg = `데미지: ${damage}`;
        } else if (!p1Tenpai && cpuTenpai) {
            damage = 1000;
            this.pendingDamage = { target: 'P1', amount: damage };
            damageMsg = `데미지: -${damage}`;
        } else {
            damage = 0;
            damageMsg = "무승부";
        }

        return { msg: damageMsg, damage: damage };
    },



    recordRound: function (entry) {
        const at = this.roundHistory.findIndex(r => r.round === entry.round);
        if (at >= 0) this.roundHistory.splice(at, 1);
        this.roundHistory.push(entry);
    },

    hpAfter: function (target, amount) {
        const hp = [this.p1.hp, this.cpu.hp];
        const i = target === 'P1' ? 0 : target === 'CPU' ? 1 : -1;
        if (i >= 0) hp[i] = Math.max(0, hp[i] - amount);
        return hp;
    },

    nextRound: function () {
        this.currentRound++;
        this.startRound();
    },

    isResultState: function () {
        return this.currentState === this.STATE_WIN ||
            this.currentState === this.STATE_LOSE ||
            this.currentState === this.STATE_NAGARI;
    },

    handOverToAI: function (who) {
        const old = this.controllerOf(who);
        const ai = new AIController();
        this.controllers[who] = ai;
        this.clock = null;
        ai.pending = this.isTurn(who);
        if (old.release) old.release(this, who);
        if (this.setupWaiting === who) {
            ai.onRoundSetup(this, who, this.setupSkillOf(who));
        }
        if (this.lastChance && this.lastChance.who === who && this.lastChance.phase === 'spin') {
            this.lastChance.stopAt = ai.rouletteStopAt(this, who);
        }
        if (this.isDrawWindow(who)) {
            const tile = this.discards[this.discards.length - 1];
            if (tile) ai.onDrawWindow(this, who, { tile: tile, canPon: this.drawWindowOptions(who, tile).canPon });
        }
    },

    confirmResult: function (who) {
        if (this.narration) return;
        if (this.online) {
            if (!this.isResultState()) return;
            this.logAction(who || 'P1', 'confirm', { win: this.resultSeq });
            this.resultSeq++;
        }
        const proceed = () => {
            this.currentState = this.STATE_DAMAGE_ANIMATION;
            this.timer = 0;
            this.stateTimer = 0;
            this._damageEffectTriggered = false;
        };
        if (this.tutorial) {
            this.tutorialEvent('afterResult', proceed);
        } else {
            proceed();
        }
    },
    matchOver: function (winner) {
        this.currentState = this.STATE_MATCH_OVER;
        this.timer = 0;
        this.stateTimer = 0;
        this.matchWinner = winner;

        console.log(`[Match] ${winner} wins — P1 HP ${this.p1.hp} / CPU HP ${this.cpu.hp}`);

        this.events.push({ type: 'STOP_MUSIC' });

        if (winner !== 'P1') {
            this.events.push({ type: 'SOUND', id: 'audio/jingle_cpu_win' });
        }

        if (this.scene && this.scene.endMatch) {
            this.scene.endMatch();
        } else {
            this.proceedFromMatchOver();
        }
    },

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
        const _band = this.DIFFICULTY_BANDS[this.difficulty] || this.DIFFICULTY_BANDS.normal;
        console.log(`[Difficulty] ${this.difficulty} | 격파 ${this.defeatedOpponents.length}/${this.TOURNAMENT_LENGTH} | band [${_band[0]}~${_band[1]}] | cpuSkill=${this.cpuSkill.toFixed(3)}`);

        this.turnCount = 1;
        if (this.tutorial) this.currentRound = this.tutorial.index + 1;
        this.winningYaku = null;
        this.discards = [];
        this.possibleActions = [];
        this.currentState = this.STATE_INIT;
        this.timer = 0;
        this.stateTimer = 0;
        this.lastState = -1;
        this.resultInfo = null;
        this.sequencing.active = false;
        this.events = [];
        this.lastChance = null;
        this.roundNotes = { doraBomb: false, counter: null, lastChance: null };

        this._lastPopupType = null;
        this._lastPopupTime = -100;

        this.currentBgm = 'audio/bgm_basic';
        this.events.push({ type: 'MUSIC', id: this.currentBgm, loop: true });

        this.p1.skillsUsedThisTurn = false;
        this.cpu.skillsUsedThisTurn = false;
        this.roundSkillUsage = { p1: {}, cpu: {} };
        this.p1.buffs = {};
        this.cpu.buffs = {};

        this.exchangeIndices = [];

        this.deck = this.tutorial ? this.tutorialBuildDeck() : this.generateDeck();

        this.p1.hand = [];
        this.cpu.hand = [];
        this.p1.declaringRiichi = false;
        this.cpu.declaringRiichi = false;
        this.p1.riichiSilent = false;
        this.cpu.riichiSilent = false;
        this.validRiichiDiscardIndices = null;
        this.narration = null;

        this.p1.isFaceDown = false;
        this.cpu.isRevealed = false;
        this.p1.exchangeReturned = this.cpu.exchangeReturned = null;
        this.cpuPhase = 'draw';
        this.setupPending = [];
        this.setupWaiting = null;
        this.firstSeat = (!this.tutorial && BattleConfig.RULES.RANDOM_FIRST_TURN && this.rng.deck.random() < 0.5) ? 1 : 0;
        this.firstTurn = this.whoAt(this.firstSeat);

        const dealSteps = [];
        [3, 3, 3, 2].forEach((count, i) => {
            if (i > 0) dealSteps.push({ type: 'WAIT', duration: 5 });
            dealSteps.push({ type: 'DEAL', seat: 1, count: count, sound: 'audio/discard' });
            dealSteps.push({ type: 'WAIT', duration: 5 });
            dealSteps.push({ type: 'DEAL', seat: 0, count: count, sound: 'audio/discard' });
        });
        const roulette = (this.tutorial || (this.isAutoTest() && !this.online)) ? [] : [{ type: 'DORA_ROULETTE', sound: 'audio/dora_roulette' }];
        this.currentState = this.STATE_DEALING;
        this.sequencing = {
            active: true,
            currentStep: 0,
            timer: 0,
            steps: [
                ...roulette,
                { type: 'WAIT', duration: 10 },
                { type: 'SOUND', id: 'audio/discard' },
                { type: 'WAIT', duration: 5 },
                ...dealSteps,
                { type: 'WAIT', duration: 30 },
                { type: 'FACE_DOWN', sound: 'audio/discard' },
                { type: 'WAIT', duration: 15 },
                { type: 'FLIP_HAND', sound: 'audio/discard' },
                { type: 'STATE', state: this.STATE_INIT }
            ]
        };

        this.p1.openSets = [];
        this.cpu.openSets = [];

        this.doras = [];
        this.uraDoras = [];
        this.uraDoraRevealed = false;

        const d1 = this.tutorial ? PaiData.BY_ID[this.tutorial.lesson.dora] : this.rng.deck.pick(PaiData.TYPES);
        this.doras.push({ type: d1.id, color: d1.color, img: d1.img });

        const d2 = this.tutorial ? PaiData.BY_ID[this.tutorial.lesson.uraDora] : this.rng.deck.pick(PaiData.TYPES);

        this.uraDoras.push({ type: d2.id, color: d2.color, img: d2.img });

        this.p1.isRiichi = false;
        this.cpu.isRiichi = false;
        this.riichiTargetIndex = -1;
        this.p1.isMenzen = true;
        this.cpu.isMenzen = true;

        this.setExpressions('idle', 'idle');

        if (this.isAutoLoseMode()) {
            this.p1.hp = 1;
            this.p1.maxHp = 1;
            this.cpu.hp = 99999;
            this.cpu.maxHp = 99999;
        }

    },




    tutorialLoad: function (index) {
        const lesson = TutorialData.LESSONS[index];
        this.tutorial = {
            index: index,
            lesson: lesson,
            ptr: 0,
            discardCount: 0,
            draws: {
                p1: lesson.plan.filter(s => s.draw).map(s => s.draw),
                cpu: [...lesson.cpuDraws]
            },
            discards: lesson.plan.filter(s => s.discard).map(s => s.discard)
        };
    },

    tutorialStartLesson: function (index) {
        this.tutorialLoad(index);
        this._cachedSelfActionsKey = null;
        this.pendingDamage = null;
        this.startRound();
    },

    tutorialNext: function () {
        const next = this.tutorial.index + 1;
        this.currentState = this.STATE_FX_PLAYING;
        if (next < TutorialData.LESSONS.length) {
            this.scene.fadeRound(() => this.tutorialStartLesson(next));
        } else {
            Game.fadeTo(() => this.scene.exitTutorial());
        }
    },

    tutorialFail: function () {
        const index = this.tutorial.index;
        this.tutorialSay([this.tutorial.lesson.failSay], () => {
            this.currentState = this.STATE_FX_PLAYING;
            this.scene.fadeRound(() => this.tutorialStartLesson(index));
        });
    },

    tutorialTile: function (id) {
        const t = PaiData.BY_ID[id];
        return { type: t.id, color: t.color, img: t.img };
    },

    tutorialNextDraw: function (who) {
        const queue = this.tutorial.draws[who];
        return queue.length > 0 ? queue.shift() : null;
    },

    tutorialBuildDeck: function () {
        const deck = this.generateDeck();
        const mine = [];
        Object.keys(this.tutorial.lesson.hand).forEach(id => {
            for (let i = 0; i < this.tutorial.lesson.hand[id]; i++) mine.push(this.tutorialTile(id));
        });
        const cpu = deck.splice(0, mine.length);
        const deal = [];
        let at = 0;
        [3, 3, 3, 2].forEach(count => {
            deal.push(...cpu.slice(at, at + count), ...mine.slice(at, at + count));
            at += count;
        });
        return deck.concat(deal.reverse());
    },

    tutorialCanDiscard: function (index) {
        if (this.tutorialWantsAction() && !this.p1.isRiichi) return false;
        const tile = this.p1.hand[index];
        const allowed = this.tutorial.discards[this.tutorial.discardCount];
        return !!tile && tile.type === allowed;
    },

    tutorialWantsAction: function () {
        if (!this.tutorial) return false;
        if (this.possibleActions.some(a => a.type === 'TSUMO')) return true;
        return !!this.tutorial.lesson.needRiichi && !this.p1.isRiichi &&
            this.possibleActions.some(a => a.type === 'RIICHI');
    },

    tutorialEvent: function (name, onDone) {
        const t = this.tutorial;
        const entry = t && t.lesson.script[t.ptr];
        if (entry && entry.on === name && (entry.discards === undefined || entry.discards === t.discardCount)) {
            t.ptr++;
            this.tutorialSay(entry.say, onDone);
            return true;
        }
        if (onDone) onDone();
        return false;
    },

    tutorialSay: function (pages, onDone) {
        if (this.isAutoTest() || pages.length === 0) {
            if (onDone) onDone();
            return;
        }
        this.narration = { pages: pages, index: 0, age: 0, onDone: onDone };
    },

    narrationPage: function () {
        const page = this.narration.pages[this.narration.index];
        if (typeof page === 'string') return { text: page, look: [] };
        return { text: page.text, look: [].concat(page.look || []) };
    },

    advanceNarration: function () {
        const n = this.narration;
        if (!n) return;
        n.index++;
        n.age = 0;
        if (n.index >= n.pages.length) {
            this.narration = null;
            if (n.onDone) n.onDone();
        }
    },

    get skillsUsedThisTurn() {
        return !!this.p1.skillsUsedThisTurn;
    },

    set skillsUsedThisTurn(v) {
        this.p1.skillsUsedThisTurn = v;
    },

    checkSkillCost: function (skill, who = 'P1') {
        if (!skill) return false;
        const char = this.getPlayer(who);
        if (char.mp < skill.cost) return false;
        return true;
    },

    canUseSkill: function (skillId, who = 'P1', isInternal = false) {
        const skill = SkillData[skillId];
        if (!skill) return false;

        if (!isInternal && (skill.type === 'REACTIVE' || skill.type === 'SETUP')) return false;

        if (!this.checkSkillCost(skill, who)) return false;

        const entry = SkillRegistry[skillId] || {};

        if (!entry.multiUse) {
            if (this.roundSkillUsage[who.toLowerCase()] && this.roundSkillUsage[who.toLowerCase()][skillId]) {
                return false;
            }
            if (this.getPlayer(who).skillsUsedThisTurn && skill.type === 'ACTIVE') {
                return false;
            }
        }

        if (entry.canUse && !entry.canUse(this, who, this.getPlayer(who))) {
            return false;
        }

        return true;
    },

    useSkill: function (skillId, who = 'P1', isInternal = false) {
        const skill = SkillData[skillId];
        if (!skill) return false;

        if (!this.canUseSkill(skillId, who, isInternal)) {
            return false;
        }

        const entry = SkillRegistry[skillId] || {};
        if (entry.autoFlow) {
            this.showPopup('SKILL', { text: "자동 발동 스킬!", blocking: false });
            return false;
        }

        this.logAction(who, 'skill', { skill: skillId });
        this.consumeMp(who, skill.cost);
        this.processSkillEffect(skill, who, skillId);

        console.log(`[Skill] ${who} used ${skill.name} (${skillId})`);

        if (!entry.multiUse) {
            this.roundSkillUsage[who.toLowerCase()][skillId] = true;
            this.getPlayer(who).skillsUsedThisTurn = true;
        }

        this.showPopup('SKILL', { text: skill.name, blocking: false });
        this.setExpression(who, 'smile');

        if (skill.sfx) {
            this.events.push({ type: 'SOUND', id: skill.sfx });
        } else {
            this.events.push({ type: 'SOUND', id: 'audio/skill_activate' });
        }

        const dialOwner = who === 'P1' ? 'p1' : 'cpu';
        this.triggerDialogue(skillId, dialOwner);

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

    enterTileExchangeState: function () {
        this.currentState = this.STATE_TILE_EXCHANGE;
        this.exchangeIndices = [];
        this.hoverIndex = 0;
        this.timer = 0;
    },

    manageBuffs: function (who) {
        if (!who.buffs) return;

        if (who.buffs.spiritTimer > 0) {
            who.buffs.spiritTimer--;
            if (who.buffs.spiritTimer === 0) {
                who.buffs.guaranteedWin = true;
                this.triggerDialogue('SKILL_WIN', who === this.p1 ? 'p1' : 'cpu');
            }
        }

        if (who.buffs.discardGuard > 0) {
            who.buffs.discardGuard--;
        }
    },

    heal: function (who, amount) {
        const char = this.getPlayer(who);
        char.hp = Math.min(char.hp + amount, char.maxHp);
    },

    consumeMp: function (who, amount) {
        const char = this.getPlayer(who);
        char.mp = Math.max(char.mp - amount, 0);
    },

    activateLastChance: function (who) {
        SkillFlows.activateLastChance(this, who);
    },


    generateDeck: function () {
        const deck = [];
        PaiData.TYPES.forEach(type => {
            for (let i = 0; i < PaiData.TILE_COUNT_PER_TYPE; i++) {
                deck.push({
                    type: type.id,
                    color: type.color,
                    img: type.img
                });
            }
        });

        return this.rng.deck.shuffle(deck);
    },

    drawTiles: function (count, who) {
        if (this.tutorial && who && count === 1) {
            const id = this.tutorialNextDraw(who === this.p1 ? 'p1' : 'cpu');
            if (id) return [this.tutorialTile(id)];
        }

        const buffActive = who && who.buffs &&
            (who.buffs.guaranteedWin || who.buffs.curseDraw > 0);

        if (who && count === 1 && this.deck.length > 0) {
            if (who.buffs && who.buffs.guaranteedWin) {
                const fullHand = this.getFullHand(who);
                const winningTileIdx = this.deck.findIndex(tile => {
                    return YakuLogic.checkYaku([...fullHand, tile], who.id, this.isOpen(who));
                });

                if (winningTileIdx !== -1) {
                    const tile = this.deck.splice(winningTileIdx, 1)[0];
                    this.deck.push(tile);
                    who.buffs.guaranteedWin = false;
                }
            }

            if (who.buffs && who.buffs.curseDraw > 0) {
                if (this.deck.length >= 2) {
                    const peek = Math.min(BattleConfig.RULES.DRAW_ASSIST.peek, this.deck.length);
                    const fullHand = this.getFullHand(who);
                    let worstOffset = 0;
                    let worstScore = Infinity;
                    for (let i = 0; i < peek; i++) {
                        const tile = this.deck[this.deck.length - 1 - i];
                        const s = YakuLogic.rateTileForHand(who.hand, tile, who.id, fullHand, {}, this.isOpen(who));
                        if (s < worstScore) { worstScore = s; worstOffset = i; }
                    }
                    if (worstOffset > 0) {
                        const picked = this.deck.splice(this.deck.length - 1 - worstOffset, 1)[0];
                        this.deck.push(picked);
                    }
                }
                who.buffs.curseDraw--;
            }
        }

        if (!buffActive && who === this.p1 && count === 1 &&
            this.drawAssistChance > 0 && this.deck.length >= 2 &&
            this.rng.deck.random() < this.drawAssistChance) {
            const peek = Math.min(BattleConfig.RULES.DRAW_ASSIST.peek, this.deck.length);
            const fullHand = this.getFullHand(who);
            let bestOffset = 0;
            let bestScore = -Infinity;
            const bestDetail = {};
            for (let i = 0; i < peek; i++) {
                const tile = this.deck[this.deck.length - 1 - i];
                const detail = {};
                const score = YakuLogic.rateTileForHand(who.hand, tile, who.id, fullHand, detail, this.isOpen(who));
                if (score > bestScore) { bestScore = score; bestOffset = i; Object.assign(bestDetail, detail); }
            }
            const chosen = this.deck[this.deck.length - 1 - bestOffset];
            this.lastDrawAssist = {
                turn: this.turnCount,
                tile: chosen ? chosen.type : null,
                tier: bestDetail.tier || null,
                yaku: bestDetail.yaku || null,
                reordered: bestOffset > 0
            };
            if (bestOffset > 0) {
                const picked = this.deck.splice(this.deck.length - 1 - bestOffset, 1)[0];
                this.deck.push(picked);
            }
        }

        const luck = who ? this.luckOf(who) : 0;
        if (!buffActive && who && count === 1 && luck && this.deck.length >= 2 &&
            this.rng.deck.random() < Math.abs(luck)) {
            const want = luck > 0;
            const peek = Math.min(BattleConfig.RULES.DRAW_ASSIST.peek, this.deck.length);
            const fullHand = this.getFullHand(who);
            let pickOffset = 0;
            let pickScore = want ? -Infinity : Infinity;
            for (let i = 0; i < peek; i++) {
                const tile = this.deck[this.deck.length - 1 - i];
                const s = YakuLogic.rateTileForHand(who.hand, tile, who.id, fullHand, {}, this.isOpen(who));
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
        this.totalTicks += dt;

        this.timers.update(dt);
        this.SEAT_WHO.forEach(who => {
            const c = this.controllerOf(who);
            if (c.poll) c.poll(this, who, dt);
        });
        if (this.online) this.controllerOf('P1').update(this, 'P1', dt);
        if (this.narration) return;

        if (this.currentState !== this.lastState) {
            this.stateTimer = 0;
            this.lastState = this.currentState;
        }
        this.stateTimer += dt;

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

        if (this.isAutoTest() && this.currentState === this.STATE_PLAYER_TURN && this.timer > 3) {
            AutoPlay.performTurn(this);
            return;
        }

        if (!this.isAutoTest() && this.p1.isRiichi && !this.p1.declaringRiichi && this.currentState === this.STATE_PLAYER_TURN && this.timer > BattleConfig.SPEED.RIICHI_AUTO_DISCARD) {
            this.discardTile(this.p1.hand.length - 1);
            return;
        }

        if (this.sequencing.active) {
            BattleSequencer.update(this, dt);
            return;
        }

        const endStates = [
            this.STATE_WIN,
            this.STATE_LOSE,
            this.STATE_NAGARI,
            this.STATE_MATCH_OVER,
            this.STATE_FX_PLAYING,
            this.STATE_DAMAGE_ANIMATION,
            this.STATE_ROULETTE
        ];

        switch (this.currentState) {
            case this.STATE_ROULETTE:
                SkillFlows.updateRoulette(this, dt);
                break;

            case this.STATE_INIT:
                if (this.timer > (this.isAutoTest() ? 5 : 30)) {
                    this.beginRoundSetup();
                }
                break;

            case this.STATE_TILE_EXCHANGE:
                this.activeStateTileExchange();
                break;

            case this.STATE_WAIT_FOR_DRAW:
                if (this.isAutoTest() && this.timer > 3) {
                    if (this.symmetric && this.tryP1AiPon()) break;
                    this.confirmDraw();
                } else if (this.p1.isRiichi && this.timer > BattleConfig.SPEED.RIICHI_AUTO_DRAW) {
                    this.confirmDraw();
                }
                break;

            case this.STATE_PLAYER_TURN:
                break;

            case this.STATE_FX_PLAYING:
                break;

            case this.STATE_CPU_TURN:
                this.controllerOf('CPU').update(this, 'CPU', dt);
                break;

            case this.STATE_WIN:
            case this.STATE_LOSE:
                if (this.tutorial && this.stateTimer > BattleConfig.NARRATION.resultDelay && this.tutorialEvent('win')) break;
                if (this.stateTimer > 160 && (Input.isMouseJustPressed() || Input.isConfirmKey())) {
                    this.confirmResult();
                }
                break;

            case this.STATE_NAGARI:
                if (Input.isMouseJustPressed() || Input.isConfirmKey()) {
                    this.confirmResult();
                }
                break;

            case this.STATE_MATCH_OVER:
                break;

            case this.STATE_DAMAGE_ANIMATION:
                if (!this._damageEffectTriggered) {
                    this._damageEffectTriggered = true;
                    if (this.pendingDamage) {
                        this.events.push({ type: 'DAMAGE', target: this.pendingDamage.target, amount: this.pendingDamage.amount });

                        const victim = this.getPlayer(this.pendingDamage.target);
                        victim.hp = Math.max(0, victim.hp - this.pendingDamage.amount);
                        console.log(`[Damage] ${this.pendingDamage.target} -${this.pendingDamage.amount} → HP ${victim.hp}`);
                        this.setExpression(this.pendingDamage.target, 'shocked');
                    }
                }

                if (this.timer > (this.isAutoTest() ? 5 : 30)) {
                    this.pendingDamage = null;
                    if (this.tutorial) {
                        this.tutorialNext();
                    } else if (this.p1.hp <= 0 || this.cpu.hp <= 0) {
                        this.currentState = this.STATE_MATCH_OVER;
                        this.matchOver(this.p1.hp > 0 ? 'P1' : 'CPU');
                    } else if (this.scene && this.scene.fadeRound) {
                        this.currentState = this.STATE_FX_PLAYING;
                        this.scene.fadeRound(() => this.startNextRound());
                    } else {
                        this.startNextRound();
                    }
                }
                break;
        }
    },






    checkRoundEnd: function () {
        if (this.currentState === this.STATE_FX_PLAYING ||
            this.currentState === this.STATE_NAGARI ||
            this.currentState === this.STATE_MATCH_OVER) {
            return;
        }

        if (this.deck.length === 0) {
            BattleSequencer.startNagariSequence(this);
            return;
        }

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
            this.nextRound();
        }
    },

    drawFor: function (who) {
        if (!this.isDrawWindow(who)) return;
        const me = this.getPlayer(who);

        this.checkRoundEnd();
        if (this.currentState === this.STATE_FX_PLAYING ||
            this.currentState === this.STATE_NAGARI ||
            this.currentState === this.STATE_MATCH_OVER) {
            return;
        }

        this.logAction(who, 'draw');
        this.dialogueTriggeredThisTurn = false;
        me.skillsUsedThisTurn = false;

        this.manageBuffs(me);
        if (me.hp <= 0) return;

        const preHand = [...me.hand];
        const t = this.drawTiles(1, me);
        if (t.length > 0) {
            this.events.push({ type: 'DRAW', player: who });
            me.hand.push(t[0]);
            console.log(`[Draw] ${who}: ${t[0].color} ${t[0].type}`);
            if (who === 'P1') this.lastDrawGroupSize = 1;
            this.lastDrawInfo[who] = { tile: t[0], preHand: preHand };
        } else {
            this.lastDrawInfo[who] = null;
        }

        if (who === 'P1') {
            if (this.checkSelfActions() && me.isRiichi) {
                const tsumoAction = this.possibleActions.find(a => a.type === 'TSUMO');
                if (tsumoAction) {
                    if (this.tutorial) {
                        this.tutorialEvent('tsumoChance', () => this.executeAction(tsumoAction));
                    } else {
                        this.declareTsumo('P1', true);
                    }
                    return;
                }
            }
        } else if (me.isRiichi && !this.tutorial &&
            YakuLogic.checkYaku(this.getFullHand(me), me.id, this.isOpen(me))) {
            this.declareTsumo(who, true);
            return;
        }

        this.enterTurn(who, { drew: true });
    },

    enterTurn: function (who, info) {
        const me = this.getPlayer(who);
        this.currentState = this.turnStateOf(who);
        if (who === 'P1') {
            this.timer = 0;
            if (!info.drew) this.possibleActions = [];
            this.hoverIndex = info.hoverIndex !== undefined ? info.hoverIndex : me.hand.length - 1;
            if (info.drew) {
                this.actionFocused = this.tutorialWantsAction();
                if (this.tutorial) {
                    this.tutorialEvent('drawn');
                    if (this.possibleActions.some(a => a.type === 'TSUMO')) this.tutorialEvent('tsumoChance');
                }
            }
        } else {
            this.cpuPhase = 'turn';
            this.timer = info.afterPon ? this.PON_THINK_CREDIT : 0;
        }
        this.controllerOf(who).onTurn(this, who, info);
    },

    sortHand: function (hand) {
        const catOrder = { 'character': 1, 'weapon': 2, 'mayu': 3 };
        const colorOrder = { 'red': 1, 'blue': 2, 'yellow': 3, 'purple': 4 };

        hand.sort((a, b) => {
            const typeA = PaiData.TYPES.find(t => t.id === a.type) || {};
            const typeB = PaiData.TYPES.find(t => t.id === b.type) || {};

            const catA = typeA.category || 'unknown';
            const catB = typeB.category || 'unknown';

            if (catOrder[catA] !== catOrder[catB]) {
                return (catOrder[catA] || 99) - (catOrder[catB] || 99);
            }

            if (a.color !== b.color) {
                return (colorOrder[a.color] || 99) - (colorOrder[b.color] || 99);
            }

            if (a.type !== b.type) {
                return a.type.localeCompare(b.type);
            }
            return 0;
        });
        this.lastDrawGroupSize = 0;
    },

    tryP1AiPon: function () {
        const pon = (this.possibleActions || []).find(a => a.type === 'PON');
        if (!pon) return false;
        const context = { isMenzen: this.p1.isMenzen, turnCount: this.turnCount };
        if (!AILogic.shouldPon(this.p1.hand, pon.targetTile, this.p1Skill, this.p1.aiProfile, context)) return false;
        this.executeAction(pon);
        return true;
    },

    canReachTenpai: function (who) {
        const me = this.getPlayer(who);
        const full = this.getFullHand(me);
        const open = this.isOpen(me);
        if (full.length === 11) return !!this.checkTenpai(full, false, open);
        for (let i = 0; i < me.hand.length; i++) {
            const tmp = [...full];
            tmp.splice(tmp.indexOf(me.hand[i]), 1);
            if (this.checkTenpai(tmp, false, open)) return true;
        }
        return false;
    },

    checkActiveSkills: function (who) {
        AIDecisions.useActiveSkills(this, who);
    },

    discardTile: function (index) {
        this.discardFor('P1', index);
    },

    discardFor: function (who, index) {
        if (!this.isTurn(who)) return;
        const me = this.getPlayer(who);

        if (who === 'P1') {
            if (this.tutorial) {
                if (!this.tutorialCanDiscard(index)) {
                    Assets.playSound('audio/wrong');
                    return;
                }
                this.tutorial.discardCount++;
            }
            this.possibleActions = [];
        }

        if (me.hand[index]) this.logAction(who, 'discard', { tile: this.tileKey(me.hand[index]) });

        if (me.declaringRiichi && !me.riichiSilent) {
            this.startRiichiSequence(who, index);
            return;
        }

        const hold = (who === 'P1' || this.isAutoTest()) ? 0 : BattleConfig.SPEED.CPU_DISCARD_HOLD;
        if (hold > 0) {
            this.currentState = this.STATE_FX_PLAYING;
            this.timers.add(() => {
                this.currentState = this.turnStateOf(who);
                this.commitDiscardFor(who, index);
            }, hold);
        } else {
            this.commitDiscardFor(who, index);
        }
    },

    startRiichiSequence: function (who, index) {
        const oppWho = this.opponentOf(who);
        const sp = BattleConfig.SPEED;
        const riichiKey = this.getPlayer(oppWho).isRiichi ? 'COUNTER_RIICHI' : 'RIICHI';
        const bgm = who === 'P1' ? 'audio/bgm_showdown' : 'audio/bgm_tension';
        const timeline = who === 'P1' ? undefined : 'riichi_r';
        const think = who === 'P1' ? [] : [{ type: 'WAIT', duration: sp.CPU_RIICHI_THINK }];

        if (who === 'P1') this.riichiTargetIndex = index;
        this.currentState = this.STATE_FX_PLAYING;
        const talk = this.tutorial ? [] : [
            ...think,
            { type: 'DIALOGUE', key: riichiKey, who: who.toLowerCase() },
            { type: 'WAIT', duration: sp.DIALOGUE_SPEAK },
            { type: 'DIALOGUE', key: 'RIICHI_REPLY', who: oppWho.toLowerCase() },
            { type: 'WAIT_KEY', duration: sp.DIALOGUE_REPLY }
        ];
        this.sequencing = {
            active: true,
            timer: 0,
            currentStep: 0,
            steps: [
                ...talk,
                { type: 'CALLBACK', callback: () => this.showPopup('RIICHI', { timeline: timeline, blocking: true }) },
                { type: 'MUSIC', id: bgm, loop: true },
                {
                    type: 'CALLBACK', callback: () => {
                        this.sequencing.active = false;
                        this.currentBgm = bgm;
                        this.currentState = this.turnStateOf(who);
                        this.commitDiscardFor(who, index);
                    }
                }
            ]
        };
    },

    commitDiscard: function (index) {
        this.commitDiscardFor('P1', index);
    },

    commitDiscardFor: function (who, index) {
        const me = this.getPlayer(who);
        const oppWho = this.opponentOf(who);
        const opp = this.getPlayer(oppWho);

        this.events.push({ type: 'DISCARD', player: who });
        const discarded = me.hand.splice(index, 1)[0];
        discarded.owner = who.toLowerCase();
        if (me.declaringRiichi) {
            discarded.isRiichi = true;
            me.declaringRiichi = false;
            me.riichiSilent = false;
            if (who === 'P1') {
                this.riichiTargetIndex = -1;
                this.validRiichiDiscardIndices = null;
            }
        }
        me.exchangeReturned = null;

        if (!this.dialogueTriggeredThisTurn && this.turnCount < 20 && !me.isRiichi) {
            const CH = BattleConfig.DIALOGUE.CHANCE;
            const opts = { silent: who === 'P1' };
            if (opp.isRiichi) {
                if (this.rng.fx.random() < CH.WORRY_RON) this.triggerDialogue('WORRY_RON', who, undefined, opts);
            } else {
                const key = this.classifyDraw(who);
                const chance = key === 'GOOD_DRAW' ? CH.DRAW_GOOD
                    : key === 'BAD_DRAW' ? CH.DRAW_BAD
                        : CH.RANDOM;
                if (this.rng.fx.random() < chance) this.triggerDialogue(key, who, 'RANDOM', opts);
            }
        }
        this.lastDrawInfo[who] = null;

        this.discards.push(discarded);
        console.log(`[Discard] ${who}: ${discarded.color} ${discarded.type}${discarded.isRiichi ? ' [Riichi]' : ''}`);

        if (who === 'P1') {
            this.sortHand(me.hand);
            this.hoverIndex = -1;
        }
        this.setExpressions('idle', 'idle');

        if (!this.openDrawWindow(oppWho, discarded)) return;

        if (who !== this.firstTurn) this.turnCount++;
        this.checkRoundEnd();
        if (!this.isDrawWindow(oppWho)) return;

        if (this.tutorial) {
            if (oppWho === 'P1') {
                if (!opp.isRiichi) {
                    this.tutorialEvent(this.possibleActions.some(a => a.type === 'PON') ? 'ponChance' : 'wait');
                }
            } else {
                this.tutorialEvent('discarded');
            }
        }
    },

    openDrawWindow: function (who, tile) {
        const opts = this.drawWindowOptions(who, tile);
        if (who === 'P1') this.checkPlayerActions(tile);

        if (opts.canRon) {
            if (who === 'P1' && this.tutorial) {
                this.tutorialEvent('ron', () => this.declareRon('P1'));
            } else {
                this.declareRon(who);
            }
            return false;
        }

        this.timer = 0;
        if (who === 'P1') {
            this.currentState = this.STATE_WAIT_FOR_DRAW;
        } else {
            this.currentState = this.STATE_CPU_TURN;
            this.cpuPhase = 'draw';
        }
        this.controllerOf(who).onDrawWindow(this, who, { tile: tile, canPon: opts.canPon });
        return this.isDrawWindow(who);
    },

    drawWindowOptions: function (who, tile) {
        const none = { canPon: false, canRon: false };
        if (!tile) return none;
        const me = this.getPlayer(who);
        const opp = this.getOpponent(who);
        if (opp.buffs && opp.buffs.discardGuard > 0) return none;

        const matchCount = me.hand.filter(t => t.type === tile.type).length;
        const canPon = matchCount >= 2 && this.canPon(me) && me.hand.length >= 3;
        const canRon = me.isRiichi &&
            !!YakuLogic.checkYaku([...this.getFullHand(me), tile], me.id, this.isOpen(me));
        return { canPon: canPon, canRon: canRon };
    },

    checkCpuActions: function (discardedTile) {
        if (this.tutorial) return false;
        return !this.openDrawWindow('CPU', discardedTile);
    },

    getValidRiichiDiscards: function () {
        const hand = this.p1.hand;
        const validIndices = [];

        for (let i = 0; i < hand.length; i++) {
            const tempHand = [...hand];
            tempHand.splice(i, 1);
            if (this.checkTenpai(tempHand)) {
                validIndices.push(i);
            }
        }
        return validIndices;
    },

    checkPlayerActions: function (discardedTile) {
        const opts = this.drawWindowOptions('P1', discardedTile);
        this.possibleActions = [];
        if (opts.canPon) this.possibleActions.push({ type: 'PON', label: '펑', targetTile: discardedTile });
        if (opts.canRon) this.possibleActions.push({ type: 'RON', label: '론' });
        return this.possibleActions.length > 0;
    },

    checkSelfActions: function () {
        const currentHandKey = this.p1.hand.map(t => t.type + t.color).sort().join('|') +
            `_${this.p1.openSets.length}_${this.p1.isRiichi}_${this.turnCount}_` +
            `${this.p1.buffs.guaranteedWin}_${this.p1.buffs.spiritTimer}`;

        if (this._cachedSelfActionsKey === currentHandKey) {
            if (this._cachedSelfActions) {
                this.possibleActions = [...this._cachedSelfActions];
                return this.possibleActions.length > 0;
            }
        }

        this.possibleActions = [];
        const hand = this.p1.hand;
        const fullHand = this.getFullHand(this.p1);

        const yakuResult = YakuLogic.checkYaku(fullHand, this.p1.id, this.isOpen(this.p1));

        if (yakuResult) {
            this.possibleActions.push({ type: 'TSUMO', label: '쯔모' });
        }

        const isMenzen = this.p1.openSets.length === 0;

        if (!this.p1.isRiichi && isMenzen && hand.length >= 2 && this.turnCount < 20) {
            let canRiichi = false;
            for (let i = 0; i < hand.length; i++) {
                const tempHand = [...hand];
                tempHand.splice(i, 1);

                if (this.checkTenpai(tempHand)) {
                    canRiichi = true;
                    break;
                }
            }

            if (canRiichi) {
                this.possibleActions.push({ type: 'RIICHI', label: '리치' });

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

        if (this.tutorial && !this.tutorial.lesson.needRiichi) {
            this.possibleActions = this.possibleActions.filter(a => a.type !== 'RIICHI');
        }

        if (this.p1.buffs && (this.p1.buffs.guaranteedWin || this.p1.buffs.spiritTimer > 0)) {
            if (!this.p1.isRiichi) {
                this.possibleActions = this.possibleActions.filter(a => a.type === 'RIICHI');
            }
        }

        if (this.possibleActions.length > 0) {
            this._cachedSelfActionsKey = currentHandKey;
            this._cachedSelfActions = [...this.possibleActions];
            return true;
        }

        this._cachedSelfActionsKey = currentHandKey;
        this._cachedSelfActions = [];
        return false;
    },





    executeAction: function (action) {
        if (!action) return;
        if (action.type === 'PON') this.declarePon('P1', action.targetTile);
        else if (action.type === 'RIICHI') this.declareRiichi('P1');
        else if (action.type === 'TSUMO') this.declareTsumo('P1');
        else if (action.type === 'RON') this.declareRon('P1');
    },

    declarePon: function (who, tile) {
        const me = this.getPlayer(who);
        this.logAction(who, 'pon', { tile: this.tileKey(tile) });
        this.setExpression(who, 'smile');
        this.setExpression(this.opponentOf(who), 'shocked');
        this.showPopup('PON', { blocking: true });
        this.triggerDialogue('PON', who.toLowerCase());
        this.dialogueTriggeredThisTurn = true;

        this.currentState = this.STATE_FX_PLAYING;
        this.timers.add(() => {
            if (!this.applyPon(me, tile)) return;

            const oppWho = this.opponentOf(who);
            const reply = this.pickDialogue('PON_REPLY', oppWho);
            if (reply && oppWho === 'CPU') {
                this.timers.add(() => {
                    this.events.push({ type: 'DIALOGUE', text: reply, who: oppWho });
                }, BattleConfig.SPEED.DIALOGUE_SPEAK);
            }

            this.enterTurn(who, { drew: false, afterPon: true });
            if (who === 'P1') this.tutorialEvent('afterPon');
        }, BattleConfig.SPEED.ACTION_WAIT);
    },

    declareRiichi: function (who) {
        const me = this.getPlayer(who);
        this.logAction(who, 'riichi');
        me.isRiichi = true;
        me.riichiStick = 0;
        me.declaringRiichi = true;
        me.riichiSilent = false;
        if (who === 'P1') {
            this.validRiichiDiscardIndices = this.getValidRiichiDiscards();
            if (this.validRiichiDiscardIndices.length === 0) {
                console.error("Riichi declared but no valid discards found? Should not happen.");
            }
            this.riichiTargetIndex = -1;
        }

        this.setExpression(who, 'smile');
        this.updateBattleMusic();
        this.currentState = this.turnStateOf(who);
        if (who === 'P1') this.tutorialEvent('riichi');
    },

    declareTsumo: function (who, auto) {
        const me = this.getPlayer(who);
        const opp = this.getOpponent(who);
        const win = YakuLogic.checkYaku(this.getFullHand(me), me.id, this.isOpen(me));
        if (!win) {
            console.error("CRITICAL: TSUMO allowed but checkYaku failed during execution!");
            return;
        }
        this.logAction(who, 'tsumo', auto ? { auto: true } : undefined);

        this.setExpression(who, 'smile');
        this.setExpression(this.opponentOf(who), 'shocked');
        this.winningYaku = win;
        const score = this.calculateScore(win.score, me.isMenzen, me, opp);
        this.pendingDamage = { target: this.opponentOf(who), amount: score };
        BattleSequencer.startWinSequence(this, 'TSUMO', who, score);
    },

    declareRon: function (who) {
        const me = this.getPlayer(who);
        const oppWho = this.opponentOf(who);
        const opp = this.getPlayer(oppWho);
        const winningTile = this.discards[this.discards.length - 1];
        const win = winningTile && YakuLogic.checkYaku([...this.getFullHand(me), winningTile], me.id, this.isOpen(me));
        if (!win) {
            console.error("CRITICAL: RON allowed but checkYaku failed during execution!");
            return;
        }
        this.logAction(who, 'ron');

        if (BattleConfig.RULES.SKILLS_ENABLED && !opp.isRiichi) {
            const reactiveSkillId = (opp.skills || []).find(id => {
                const s = SkillData[id];
                return s && s.type === 'REACTIVE' && (id === 'EXCHANGE_RON' || id === 'SUPER_IAI');
            });
            if (reactiveSkillId && this.checkSkillCost(SkillData[reactiveSkillId], oppWho)) {
                this.controllerOf(oppWho).onCounterPrompt(this, oppWho, reactiveSkillId, (use) => {
                    this.logAction(oppWho, 'react', { use: !!use });
                    if (use && this.useSkill(reactiveSkillId, oppWho, true)) {
                        this.roundNotes.counter = { who: oppWho, id: reactiveSkillId };
                        if (reactiveSkillId === 'SUPER_IAI') {
                            SkillFlows.activateSuperIaido(this, oppWho);
                        } else {
                            SkillFlows.activateRonTileExchange(this, oppWho);
                        }
                    } else {
                        this.finishRonFor(who, win);
                    }
                });
                return;
            }
        }

        this.finishRonFor(who, win);
    },

    finishRonFor: function (who, win) {
        const me = this.getPlayer(who);
        const opp = this.getOpponent(who);
        this.winningYaku = win;
        const score = this.calculateScore(win.score, me.isMenzen, me, opp);
        this.pendingDamage = { target: this.opponentOf(who), amount: score };
        BattleSequencer.startWinSequence(this, 'RON', who, score);
    },

    getFullHand: function (player) {
        let tiles = [...player.hand];
        player.openSets.forEach(set => {
            tiles = tiles.concat(set.tiles);
        });
        return tiles;
    },

    isOpen: function (player) {
        return player.openSets.length > 0;
    },

    canPon: function (player) {
        return !player.isRiichi && player.openSets.length < 3 &&
            this.discards.length >= 2 && this.discards.length <= 37;
    },

    getPlayer: function (who) {
        return who === 'P1' ? this.p1 : this.cpu;
    },

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

    declareRiichiLock: function (who, stick) {
        const p = this.getPlayer(who);
        p.isRiichi = true;
        p.riichiStick = stick;
        p.declaringRiichi = true;
        if (who === 'P1') {
            this.validRiichiDiscardIndices = this.getValidRiichiDiscards();
        }
    },

    startFirstTurn: function () {
        this.openDrawWindow(this.firstTurn, null);
        if (this.tutorial && this.isDrawWindow('P1')) this.tutorialEvent('wait');
    },

    getOpponent: function (who) {
        return who === 'P1' ? this.cpu : this.p1;
    },

    opponentOf: function (who) {
        return who === 'P1' ? 'CPU' : 'P1';
    },

    setExpression: function (who, state) {
        this.events.push({ type: 'EXPRESSION', who: who, state: state });
    },

    setExpressions: function (p1State, cpuState) {
        this.setExpression('P1', p1State);
        this.setExpression('CPU', cpuState);
    },

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

    exchangeTiles: function (player, indices) {
        const sortedIndices = [...indices].sort((a, b) => b - a);
        const removedTiles = [];
        sortedIndices.forEach(idx => {
            removedTiles.push(player.hand.splice(idx, 1)[0]);
        });

        removedTiles.sort((a, b) => (a.type + a.color).localeCompare(b.type + b.color));
        removedTiles.forEach(tile => {
            const r = this.rng.deck.int(this.deck.length);
            this.deck.splice(r, 0, tile);
        });

        const newTiles = this.drawTiles(removedTiles.length, player);
        player.hand.push(...newTiles);
        this.sortHand(player.hand);
        console.log(`[Exchange] ${player === this.p1 ? 'P1' : 'CPU'}: ${removedTiles.length}장 — out [${removedTiles.map(t => t.type).join(',')}] in [${newTiles.map(t => t.type).join(',')}]`);
    },

    confirmDraw: function () {
        if (this.currentState !== this.STATE_WAIT_FOR_DRAW) return;
        if (this.tutorial && this.tutorial.lesson.needPon && this.possibleActions.some(a => a.type === 'PON')) {
            this.tutorialFail();
            return;
        }
        this.drawFor('P1');
    },

    playerDraw: function () {
        this.drawFor('P1');
    },

    checkTenpai: function (hand, returnDetails, open) {
        return YakuLogic.checkTenpai(hand, returnDetails, open);
    },

    updateBattleMusic: function () {
        let targetBgm = 'audio/bgm_basic';
        const p1Riichi = this.p1.isRiichi && !this.p1.declaringRiichi;
        const cpuRiichi = this.cpu.isRiichi && !this.cpu.declaringRiichi;

        if (p1Riichi && cpuRiichi) {
            if (this.currentBgm === 'audio/bgm_tension') targetBgm = 'audio/bgm_tension';
            else targetBgm = 'audio/bgm_showdown';
        } else if (cpuRiichi) {
            targetBgm = 'audio/bgm_tension';
        } else if (p1Riichi) {
            targetBgm = 'audio/bgm_showdown';
        }

        if (this.currentBgm !== targetBgm) {
            this.currentBgm = targetBgm;
            this.events.push({ type: 'MUSIC', id: targetBgm, loop: true });
        }
    },

    calculateBonuses: function (hand, winType, isRiichi, winner) {
        return YakuLogic.calculateBonuses(hand, winType, isRiichi, {
            winner: winner || 'P1',
            discardCount: this.discards.length,
            doras: this.doras,
            uraDoras: this.uraDoras
        });
    },

    getRiichiScore: function (discardIdx) {
        return YakuLogic.getRiichiScore(this.p1.hand, this.p1.id, discardIdx);
    },

    get cpuDrawInfo() {
        return this.lastDrawInfo.CPU;
    },

    set cpuDrawInfo(v) {
        this.lastDrawInfo.CPU = v;
    },

    classifyCpuDraw: function () {
        return this.classifyDraw('CPU');
    },

    classifyDraw: function (who) {
        const info = this.lastDrawInfo[who];
        if (!info || !info.tile) return 'RANDOM';
        const tile = info.tile;
        const preHand = info.preHand || [];

        const sameType = preHand.filter(t => t.type === tile.type).length;
        const sameColor = preHand.filter(t => t.color === tile.color).length;

        if (sameType >= 2) return 'GOOD_DRAW';
        if (sameType === 0 && sameColor <= 2) return 'BAD_DRAW';

        return 'RANDOM';
    },

    triggerDialogue: function (key, owner, fallbackKey, options = {}) {
        const text = this.pickDialogue(key, owner, fallbackKey);
        if (!text) return;
        const who = (owner === 'p1' || owner === 'P1') ? 'P1' : 'CPU';
        if (!options.silent) this.events.push({ type: 'DIALOGUE', text: text, who: who });
        this.dialogueTriggeredThisTurn = true;
    },

    pickDialogue: function (key, owner, fallbackKey) {
        if (this.tutorial) return null;
        if (!DialogueData || !DialogueData.BATTLE) return null;

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

        if (!lines || lines.length === 0) return null;
        return this.rng.fx.pick(lines);
    },

    activeStateTileExchange: function () {
    },

    toggleExchangeSelection: function (index) {
        if (this.exchangeIndices.includes(index)) {
            this.exchangeIndices = this.exchangeIndices.filter(i => i !== index);
            Assets.playSound('audio/tick');
        } else {
            const skill = SkillData[this.setupSkillOf('P1')];
            if (skill) {
                const currentCost = this.exchangeIndices.length * skill.cost;
                if (this.p1.mp < currentCost + skill.cost) {
                    Assets.playSound('audio/wrong');
                    return;
                }
            }

            this.exchangeIndices.push(index);
            Assets.playSound('audio/tick');
        }
    },

    setupSkillOf: function (who) {
        const skills = this.getPlayer(who).skills || [];
        return skills.find(id => id === 'PAINT_TILE' || id === 'EXCHANGE_TILE') || null;
    },

    beginRoundSetup: function () {
        this.setupPending = [1, 0].map(seat => this.whoAt(seat));
        this.continueRoundSetup();
    },

    continueRoundSetup: function () {
        while (this.setupPending.length > 0) {
            const who = this.setupPending.shift();
            const skillId = BattleConfig.RULES.SKILLS_ENABLED ? this.setupSkillOf(who) : null;
            if (!skillId) continue;
            this.setupWaiting = who;
            this.controllerOf(who).onRoundSetup(this, who, skillId);
            return;
        }
        this.startFirstTurn();
    },

    finishRoundSetup: function (who) {
        if (this.setupWaiting && this.setupWaiting !== who) return;
        this.setupWaiting = null;
        this.continueRoundSetup();
    },

    confirmTileExchange: function (who = 'P1', indices, skillId) {
        const me = this.getPlayer(who);
        if (!indices) indices = this.exchangeIndices;
        if (!skillId) skillId = this.setupSkillOf(who);
        const skill = SkillData[skillId];
        const count = indices.length;

        if (!skill || count === 0) {
            this.logAction(who, 'exchange', { tiles: [] });
            this.finishRoundSetup(who);
            return;
        }

        const totalCost = count * skill.cost;
        if (me.mp < totalCost) {
            this.showPopup('SKILL', { text: "MP 부족!", blocking: false });
            Assets.playSound('audio/wrong');
            return;
        }

        this.logAction(who, 'exchange', { tiles: indices.map(i => this.tileKey(me.hand[i])) });
        this.consumeMp(who, totalCost);
        this.exchangeTiles(me, indices);

        if (who === 'P1') {
            this.events.push({ type: 'SOUND', id: 'audio/skill_activate' });
            this.showPopup('SKILL', { text: skill.name, blocking: false });
        } else {
            this.events.push({ type: 'SOUND', id: 'audio/flip' });
            this.timer = -15;
        }
        this.triggerDialogue(skillId, who, undefined, { silent: who === 'P1' });

        if (indices === this.exchangeIndices) this.exchangeIndices = [];

        this.finishRoundSetup(who);
    },

    offerLastChance: function (who, tenpai) {
        const skillId = 'LAST_CHANCE';
        const me = this.getPlayer(who);
        if (!BattleConfig.RULES.SKILLS_ENABLED || !tenpai) return;
        if (!me.skills || !me.skills.includes(skillId)) return;
        if (!this.checkSkillCost(SkillData[skillId], who)) return;

        this.sequencing.active = false;
        this.controllerOf(who).onNagari(this, who, (use) => {
            this.logAction(who, 'nagari', { use: !!use });
            if (use) this.activateLastChance(who);
            else this.sequencing.active = true;
        });
    },

    offerDoraBomb: function (who, onDone) {
        const skillId = 'DORA_BOMB';
        const me = this.getPlayer(who);
        if (!BattleConfig.RULES.SKILLS_ENABLED || !me.isRiichi || me.id !== 'rinxiang' ||
            !this.checkSkillCost(SkillData[skillId], who)) {
            onDone();
            return;
        }
        this.controllerOf(who).onDoraBomb(this, who, (use) => {
            this.logAction(who, 'doraBomb', { use: !!use });
            if (use) {
                this.roundNotes.doraBomb = true;
                SkillFlows.applyDoraBomb(this, me, who);
            }
            onDone();
        });
    },

    findHandIndex: function (who, tileKey, used = []) {
        const hand = this.getPlayer(who).hand;
        for (let i = 0; i < hand.length; i++) {
            if (used.includes(i)) continue;
            if (hand[i].type === tileKey.type && hand[i].color === tileKey.color) return i;
        }
        return -1;
    }
};

window.BattleEngine = BattleEngine;
