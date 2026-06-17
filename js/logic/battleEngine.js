const BattleEngine = {
    // States
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

    rouletteTimer: 0,
    rouletteIndex: 0,
    rouletteTileType: null,

    currentState: 0,
    timer: 0,
    totalTicks: 0,
    stateTimer: 0,
    lastState: -1,
    timeouts: [],

    // 로직 틱(dt) 기반 타임아웃 — 느린 PC에서 조기 발동 방지.
    setTimeout: function (callback, delayTicks) {
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

    DELAY_DRAW: 60,
    DELAY_DISCARD_AUTO: 60,

    calculateScore: function (baseScore, isMenzen, attacker, defender) {
        let score = baseScore;

        if (!isMenzen) {
            score = Math.floor(baseScore * 0.75);
        }

        // CRITICAL/WATER_MIRROR 보정은 startWinSequence에서 1회만 적용하므로 여기서 중복 적용 금지.
        return Math.round(score / 10) * 10;
    },

    sequencing: { active: false, steps: [], currentStep: 0, timer: 0 },

    // Game 글로벌 접촉점: 테스트/자동화 플래그만. 매 프레임 live 읽기(mid-battle 토글 허용).
    isAutoTest: function () {
        return typeof Game !== 'undefined' && !!Game.isAutoTest;
    },

    isAutoLoseMode: function () {
        return this.isAutoTest() && !!(Game.autoTestOptions && Game.autoTestOptions.loseMode);
    },

    showPopup: function (type, options = {}) {
        // 10프레임 내 동일 팝업 중복 방지(timer는 자주 리셋되므로 totalTicks 사용).
        if (this._lastPopupType === type && (this.totalTicks - this._lastPopupTime) < 10) {
            return;
        }
        this._lastPopupType = type;
        this._lastPopupTime = this.totalTicks;

        const conf = BattleConfig.POPUP;
        const asset = `fx/${type.toLowerCase()}`;
        const typeConf = conf.TYPES[type] || {};

        const fAnim = options.anim || typeConf.anim;
        const fSlide = options.slideFrom || typeConf.slideFrom;
        const fLife = options.life || typeConf.life || 45;
        const fScale = options.scale || typeConf.scale || conf.scale;

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
    roundSkillUsage: { p1: {}, cpu: {} },

    init: function (data, scene) {
        this.scene = scene;
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.oncontextmenu = (e) => {
                e.preventDefault();
            };
        }

        this.clearTimeouts();

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
            this.cpu.skills = cpuData.skills || [];
        }

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

        this.currentState = this.STATE_INIT;
        this.timer = 0;
        this.turnCount = 1;
        this.currentRound = 1;

        const bgIndex = Math.floor(Math.random() * (BattleConfig.BG.max - BattleConfig.BG.min + 1)) + BattleConfig.BG.min;
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

        // cpuSkill: 역량(0..1). aiProfile: 플레이 스타일(별도).
        this.difficulty = data.difficulty || 'normal';
        this.cpuSkill = this.computeCpuSkill(this.difficulty, this.defeatedOpponents.length);

        // easy 전용 드로우 어시스트(플레이어만, drawTiles 참조).
        this.drawAssistChance = (data.difficulty === 'easy')
            ? BattleConfig.RULES.DRAW_ASSIST.chance : 0;
        this.lastDrawAssist = null;

        // CPU 성격 편향: luck>0이면 유리한 패, luck<0이면 불리한 패 쪽으로 드로우 확률 기울임.
        this.cpuLuck = (this.cpu.aiProfile && this.cpu.aiProfile.luck) || 0;

        this.startRound();
    },

    // 난이도 밴드 × 토너 진행도로 cpuSkill 보간. easy/normal 밴드 동일 — 차이는 드로우 어시스트(easy만).
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
        if (p1Tenpai === undefined) p1Tenpai = this.checkTenpai(this.getFullHand(this.p1), false);
        if (cpuTenpai === undefined) cpuTenpai = this.checkTenpai(this.getFullHand(this.cpu), false);

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



    nextRound: function () {
        this.currentRound++;
        this.startRound();
    },

    confirmResult: function () {
        this.currentState = this.STATE_DAMAGE_ANIMATION;
        this.timer = 0;
        this.stateTimer = 0;
        this._damageEffectTriggered = false;
    },
    matchOver: function (winner) {
        this.currentState = this.STATE_MATCH_OVER;
        this.timer = 0;
        this.stateTimer = 0;
        this.matchWinner = winner;

        console.log(`[Match] ${winner} wins — P1 HP ${this.p1.hp} / CPU HP ${this.cpu.hp}`);

        this.events.push({ type: 'STOP_MUSIC' });

        // 승리 효과음 없음 — 빅토리 화면 제거 후 다음 장면과 겹쳤던 이력 있음.
        if (winner !== 'P1') {
            const sound = (BattleConfig.RESULT.TYPES.MATCH_LOSE && BattleConfig.RESULT.TYPES.MATCH_LOSE.sound) || 'audio/lose';
            if (sound) this.events.push({ type: 'SOUND', id: sound });
        }

        // 블랙 페이드 전환(scene.endMatch) → 암전 시점에 proceedFromMatchOver 호출.
        if (this.scene && this.scene.endMatch) {
            this.scene.endMatch();
        } else {
            this.proceedFromMatchOver();
        }
    },

    // 메타게임 정책(네비·저장·컨티뉴)은 BattleScene.proceedFromMatchOver가 담당.
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
        this.winningYaku = null;
        this.discards = [];
        // 이전 라운드의 리치 RON 등 잔여 액션이 새 패 배분으로 누출되지 않도록 초기화.
        this.possibleActions = [];
        this.currentState = this.STATE_INIT;
        this.timer = 0;
        this.stateTimer = 0;
        this.lastState = -1;
        this.resultInfo = null;
        this.sequencing.active = false;
        this.events = [];
        this.showLastChanceResult = false;

        this._lastPopupType = null;
        this._lastPopupTime = -100;

        this.currentBgm = 'audio/bgm_basic';
        this.events.push({ type: 'MUSIC', id: this.currentBgm, loop: true });

        this.skillsUsedThisTurn = false;
        this.roundSkillUsage = { p1: {}, cpu: {} };
        this.p1.buffs = {};
        this.cpu.buffs = {};

        this.exchangeIndices = [];

        this.deck = this.generateDeck();

        this.p1.hand = [];
        this.cpu.hand = [];

        this.p1.isFaceDown = true;
        this.cpu.isRevealed = false;

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

        this.p1.openSets = [];
        this.cpu.openSets = [];

        this.doras = [];
        this.uraDoras = [];
        this.uraDoraRevealed = false;

        const d1 = PaiData.TYPES[Math.floor(Math.random() * PaiData.TYPES.length)];
        this.doras.push({ type: d1.id, color: d1.color, img: d1.img });

        // 우라도라는 표 도라와 중복 가능(기획 확인).
        const d2 = PaiData.TYPES[Math.floor(Math.random() * PaiData.TYPES.length)];

        this.uraDoras.push({ type: d2.id, color: d2.color, img: d2.img });

        this.p1.isRiichi = false;
        this.cpu.isRiichi = false;
        this.riichiTargetIndex = -1;
        this.p1.isMenzen = true;
        this.cpu.isMenzen = true;

        this.setExpressions('idle', 'idle');

        if (this.isAutoLoseMode()) {
            this.p1.hp = 1;      // Instant Death next hit
            this.p1.maxHp = 1;
            this.cpu.hp = 99999;
            this.cpu.maxHp = 99999;
        }

    },




    skillsUsedThisTurn: false,

    checkSkillCost: function (skill, who = 'P1') {
        if (!skill) return false;
        const char = this.getPlayer(who);
        if (char.mp < skill.cost) return false;
        return true;
    },

    canUseSkill: function (skillId, who = 'P1', isInternal = false) {
        const skill = SkillData[skillId];
        if (!skill) return false;

        // REACTIVE/SETUP는 수동 메뉴 불가. isInternal(론 카운터 등)은 통과.
        if (!isInternal && (skill.type === 'REACTIVE' || skill.type === 'SETUP')) return false;

        if (!this.checkSkillCost(skill, who)) return false;

        const entry = SkillRegistry[skillId] || {};

        if (!entry.multiUse) {
            if (this.roundSkillUsage[who.toLowerCase()] && this.roundSkillUsage[who.toLowerCase()][skillId]) {
                return false;
            }
            if (this.skillsUsedThisTurn && skill.type === 'ACTIVE') {
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

        // autoFlow 스킬은 전용 흐름에서만 발동 — 이 경로로 오면 이중 발동되므로 차단.
        const entry = SkillRegistry[skillId] || {};
        if (entry.autoFlow) {
            this.showPopup('SKILL', { text: "자동 발동 스킬!", blocking: false });
            return false;
        }

        this.consumeMp(who, skill.cost);
        this.processSkillEffect(skill, who, skillId);

        console.log(`[Skill] ${who} used ${skill.name} (${skillId})`);

        if (!entry.multiUse) {
            this.roundSkillUsage[who.toLowerCase()][skillId] = true;
            this.skillsUsedThisTurn = true;
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

        // curseDraw 감소는 drawTiles에서 처리.
    },

    heal: function (who, amount) {
        const char = this.getPlayer(who);
        char.hp = Math.min(char.hp + amount, char.maxHp);
    },

    consumeMp: function (who, amount) {
        const char = this.getPlayer(who);
        char.mp = Math.max(char.mp - amount, 0);
    },

    triggerReaction: function (skillId, onYes, onNo) {
        const skill = SkillData[skillId];
        let msg = `${skill.name}을(를) 사용하여 방어하시겠습니까? (MP: ${skill.cost})`;
        if (BattleConfig.MESSAGES && BattleConfig.MESSAGES.SKILL_CONFIRM) {
            const msgFunc = BattleConfig.MESSAGES.SKILL_CONFIRM[skillId] || BattleConfig.MESSAGES.SKILL_CONFIRM['DEFAULT'];
            if (msgFunc) {
                msg = msgFunc(skill.cost, skill.name);
            }
        }

        if (this.scene && this.scene.showConfirm) {
            this.scene.showConfirm(
                msg,
                onYes,
                onNo
            );
        } else {
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

    activateLastChance: function (who) {
        SkillFlows.activateLastChance(this, who);
    },

    resolveRouletteResult: function () {
        SkillFlows.resolveRouletteResult(this);
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

        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    },

    drawTiles: function (count, who) {
        // 스킬 버프(guaranteedWin/curseDraw)는 easy 어시스트보다 우선해야 하므로 먼저 확인.
        const buffActive = who && who.buffs &&
            (who.buffs.guaranteedWin || who.buffs.curseDraw > 0);

        if (who && count === 1 && this.deck.length > 0) {
            if (who.buffs && who.buffs.guaranteedWin) {
                const winningTileIdx = this.deck.findIndex(tile => {
                    // Check if this tile completes the hand
                    const testHand = [...who.hand, tile];
                    // Our YakuLogic.checkYaku checks patterns.
                    return YakuLogic.checkYaku(testHand, who.id);
                });

                if (winningTileIdx !== -1) {
                    const tile = this.deck.splice(winningTileIdx, 1)[0];
                    this.deck.push(tile);
                    who.buffs.guaranteedWin = false;
                }
            }

            // 저주 드로우: 패 개선에 가장 무익한 타일을 덱 상단에서 골라 올림(rateTileForHand 역방향).
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
                who.buffs.curseDraw--;
            }
        }

        // easy 드로우 어시스트: 덱 상단 몇 장 중 가장 유익한 타일을 플레이어에게 넘김.
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

        // CPU 성격 편향 드로우(cpuLuck): 덱 상단 재정렬만, 패 구성 불변.
        if (!buffActive && who === this.cpu && count === 1 && this.cpuLuck && this.deck.length >= 2 &&
            Math.random() < Math.abs(this.cpuLuck)) {
            const want = this.cpuLuck > 0;
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
        this.totalTicks += dt;

        this.updateTimeouts(dt);

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
            this.performAutoTurn();
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

        if (!endStates.includes(this.currentState) && this.currentState !== this.STATE_INIT) {
            const prevCheck = Math.floor((this.timer - dt) / 15);
            const currentCheck = Math.floor(this.timer / 15);
            if (currentCheck > prevCheck) {
                this.checkRoundEnd();
            }
        }

        switch (this.currentState) {
            case this.STATE_ROULETTE:
                SkillFlows.updateRoulette(this, dt);
                break;

            case this.STATE_INIT:
                if (this.timer > (this.isAutoTest() ? 5 : 30)) {
                    if (this.turnCount === 1) {
                        const cpuSkills = CharacterData.find(c => c.id === this.cpu.id).skills || [];
                        const cpuSetupSkill = cpuSkills.find(id => id === 'PAINT_TILE' || id === 'EXCHANGE_TILE');
                        if (BattleConfig.RULES.SKILLS_ENABLED && cpuSetupSkill) {
                            SkillFlows.executeCpuTileExchange(this, cpuSetupSkill);
                        }

                        const p1Skills = CharacterData.find(c => c.id === this.p1.id).skills;
                        if (BattleConfig.RULES.SKILLS_ENABLED && (p1Skills.includes('EXCHANGE_TILE') || p1Skills.includes('PAINT_TILE'))) {
                            this.enterTileExchangeState();
                        } else {
                            this.currentState = this.STATE_WAIT_FOR_DRAW;
                            this.timer = 0;
                        }
                    } else {
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
                break;

            case this.STATE_CPU_TURN:
                if (this.timer > (this.isAutoTest() ? 3 : BattleConfig.SPEED.CPU_THINK_TIME)) {
                    this.cpuDraw();
                }
                break;

            case this.STATE_WIN:
            case this.STATE_LOSE:
                // 롤링 애니메이션(160프레임) 종료 후 입력 수신.
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

    playerDraw: function () {
        this.checkRoundEnd();

        if (this.currentState === this.STATE_FX_PLAYING ||
            this.currentState === this.STATE_NAGARI ||
            this.currentState === this.STATE_MATCH_OVER) {
            return;
        }

        this.dialogueTriggeredThisTurn = false;
        this.skillsUsedThisTurn = false;

        this.manageBuffs(this.p1);

        if (this.p1.hp <= 0) return;

        const t = this.drawTiles(1, this.p1);
        if (t.length > 0) {
            const drawnTile = t[0];
            this.events.push({ type: 'DRAW', player: 'P1' });
            this.p1.hand.push(drawnTile);
            console.log(`[Draw] P1: ${drawnTile.color} ${drawnTile.type}`);
            this.lastDrawGroupSize = 1;
        }

        // possibleActions 갱신 후 리치 중이면 쯔모 자동 발동.
        if (this.checkSelfActions() && this.p1.isRiichi) {
            const tsumoAction = this.possibleActions.find(a => a.type === 'TSUMO');
            if (tsumoAction) {
                this.executeAction(tsumoAction);
                return;
            }
        }

        this.currentState = this.STATE_PLAYER_TURN;
        this.hoverIndex = this.p1.hand.length - 1;
        this.actionFocused = false;
        this.timer = 0;
    },

    cpuDraw: function () {
        if (this.cpu.needsToDiscard) {
            this.cpu.needsToDiscard = false;
            this.cpuDrawInfo = null;
        } else {
            // 드로우 전 패 스냅샷: GOOD_DRAW/BAD_DRAW 판정용(경량, yaku 재계산 없음).
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

        this.manageBuffs(this.cpu);
        this.checkCpuActiveSkills();

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

        if (!this.cpu.isRiichi && this.cpu.isMenzen && this.cpu.hand.length >= 2 && this.turnCount < 20) {
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
                this.cpu.declaringRiichi = true;

                this.setExpression('CPU', 'smile');
                this.currentBgm = 'audio/bgm_tension';
                this.currentState = this.STATE_FX_PLAYING;

                const riichiKey = this.p1.isRiichi ? 'COUNTER_RIICHI' : 'RIICHI';
                this.triggerDialogue(riichiKey, 'cpu');

                this.sequencing = {
                    active: true,
                    timer: 0,
                    currentStep: 0,
                    steps: [
                        { type: 'FX', asset: 'fx/riichi', x: BattleConfig.POPUP.x, y: BattleConfig.POPUP.y, anim: 'SLIDE', slideFrom: 'RIGHT', scale: 1.0, popupType: 'RIICHI', blocking: true },
                        { type: 'MUSIC', id: 'audio/bgm_tension', loop: true },
                        { type: 'WAIT', duration: 60 },
                        {
                            type: 'CALLBACK', callback: () => {
                                this.sequencing.active = false;
                                this.currentState = this.STATE_CPU_TURN;
                                this.discardTileCPU(riichiDiscardIndex);
                            }
                        }
                    ]
                };
                return; // Stop CPU turn logic here
            }
        }

        let discardIdx;
        if (this.cpu.isRiichi) {
            discardIdx = this.cpu.hand.length - 1;
        } else {
            const context = {
                discards: this.discards,
                opponentRiichi: this.p1.isRiichi,
                doras: this.doras,
                turnCount: this.turnCount,
                charId: this.cpu.id
            };
            discardIdx = AILogic.decideDiscard(this.cpu.hand, this.cpuSkill, this.cpu.aiProfile, context);
        }

        // 드로우한 패를 잠깐 보여주고 버림(FX_PLAYING으로 CPU_TURN 재발화 차단). autotest는 0.
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

        if (!this.dialogueTriggeredThisTurn && this.turnCount < 20 && !this.cpu.isRiichi) {
            const CH = BattleConfig.DIALOGUE.CHANCE;
            if (this.p1.isRiichi) {
                if (Math.random() < CH.WORRY_RON) this.triggerDialogue('WORRY_RON', 'cpu');
            } else {
                const key = this.classifyCpuDraw();
                const chance = key === 'GOOD_DRAW' ? CH.DRAW_GOOD
                    : key === 'BAD_DRAW' ? CH.DRAW_BAD
                        : CH.RANDOM;
                if (Math.random() < chance) this.triggerDialogue(key, 'cpu', 'RANDOM');
            }
        }
        this.cpuDrawInfo = null;

        this.discards.push(discarded);
        console.log(`[Discard] CPU: ${discarded.color} ${discarded.type}${discarded.isRiichi ? ' [Riichi]' : ''}`);

        // Reset Expressions
        this.setExpressions('idle', 'idle');

        // 리치 론은 자동 발동. 펑은 강제 모달 없음 — 드로우 창까지 possibleActions 유지.
        if (this.checkPlayerActions(discarded) && this.p1.isRiichi) {
            const ronAction = this.possibleActions.find(a => a.type === 'RON');
            if (ronAction) {
                this.executeAction(ronAction);
                return;
            }
        }

        this.turnCount++;
        this.checkRoundEnd();
        if (this.currentState === this.STATE_NAGARI ||
            this.currentState === this.STATE_MATCH_OVER ||
            this.currentState === this.STATE_FX_PLAYING ||
            this.turnCount > 20) return;

        if (this.p1.isRiichi) {
            this.currentState = this.STATE_PLAYER_TURN;
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

    checkCpuActiveSkills: function () {
        if (!BattleConfig.RULES.SKILLS_ENABLED) return;
        if (this.skillsUsedThisTurn) return;

        const skills = this.cpu.skills || [];
        const cpuProfile = CharacterData.find(c => c.id === this.cpu.id).aiProfile;
        if (!cpuProfile) return;

        // cpuSkill: 스킬 발동 빈도(기회를 얼마나 잡는가). 타이밍 품질은 aiScore가 담당.
        const skillUseChance = 0.3 + 0.7 * this.cpuSkill;

        for (const skillId of skills) {
            const skill = SkillData[skillId];
            if (!skill) continue;

            // Core Validation
            if (!this.canUseSkill(skillId, 'CPU', true)) continue;

            const entry = SkillRegistry[skillId];
            if (!entry || !entry.aiScore) continue;

            const threshold = 0.6;
            const ctx = {
                isTenpai: this.checkTenpai(this.cpu.hand, this.cpu.id),
                isPlayerRiichi: this.p1.isRiichi,
                turn: this.turnCount,
                profile: cpuProfile
            };
            const score = entry.aiScore(this, ctx);
            const randomFactor = Math.random() * 0.2;

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

        this.possibleActions = [];

        this.events.push({ type: 'DISCARD', player: 'P1' });
        const discarded = this.p1.hand.splice(index, 1)[0];
        discarded.owner = 'p1';
        if (this.p1.declaringRiichi) {
            discarded.isRiichi = true;
            this.p1.declaringRiichi = false;
            this.riichiTargetIndex = -1;
            this.validRiichiDiscardIndices = null;
        }
        this.discards.push(discarded);
        console.log(`[Discard] P1: ${discarded.color} ${discarded.type}${discarded.isRiichi ? ' [Riichi]' : ''}`);

        this.sortHand(this.p1.hand);

        // Reset Expressions
        this.setExpressions('idle', 'idle');

        this.hoverIndex = -1;

        if (this.checkCpuActions(discarded)) {
            return;
        }

        this.currentState = this.STATE_CPU_TURN;
        this.timer = 0;

    },

    checkCpuActions: function (discardedTile) {
        if (this.p1.buffs && this.p1.buffs.discardGuard > 0) {
            return false;
        }

        // 론은 리치 선언 시에만 허용(펑 이후 오픈패 방지와 동일 규칙).
        const checkHand = [...this.getFullHand(this.cpu), discardedTile];
        const win = YakuLogic.checkYaku(checkHand, this.cpu.id);
        if (win && this.cpu.isRiichi) {
            const reactiveSkillId = this.p1 && this.p1.skills ? this.p1.skills.find(id => {
                const s = SkillData[id];
                return s && s.type === 'REACTIVE' && (id === 'EXCHANGE_RON' || id === 'SUPER_IAI');
            }) : null;

            // P1 리치 중에는 카운터 스킬 사용 불가(CPU 가드와 대칭).
            if (reactiveSkillId && !this.p1.isRiichi) {
                const canAfford = this.checkSkillCost(SkillData[reactiveSkillId]);

                if (canAfford) {
                    this.triggerReaction(reactiveSkillId, () => {
                        if (this.useSkill(reactiveSkillId, 'P1', true)) {
                            if (reactiveSkillId === 'SUPER_IAI') {
                                SkillFlows.activateSuperIaido(this, 'P1');
                            } else if (reactiveSkillId === 'EXCHANGE_RON') {
                                SkillFlows.activateRonTileExchange(this, 'P1');
                            }
                        } else {
                            this.finishRon(win);
                        }

                    }, () => {
                        this.finishRon(win);
                    });
                    return true; // Block standard flow
                }
            }

            this.finishRon(win);
            return true;
        }

        let pairCount = 0;
        this.cpu.hand.forEach(t => {
            if (t.type === discardedTile.type && t.color === discardedTile.color) pairCount++;
        });

        if (pairCount >= 2 && !this.cpu.isRiichi && this.cpu.hand.length >= 3) {
            const context = { isMenzen: this.cpu.isMenzen, turnCount: this.turnCount };
            if (AILogic.shouldPon(this.cpu.hand, discardedTile, this.cpuSkill, this.cpu.aiProfile, context)) {
                this.executeCpuPon(discardedTile);
                return true;
            }
        }

        return false;
    },
    // 리치 선언 후 텐파이 유지 버림 가능 인덱스 목록.
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

    executeCpuPon: function (tile) {
        this.setExpressions('shocked', 'smile');
        this.showPopup('PON', { blocking: true });
        this.triggerDialogue('PON', 'cpu');
        this.dialogueTriggeredThisTurn = true;

        this.currentState = this.STATE_FX_PLAYING;
        this.setTimeout(() => {
            if (!this.applyPon(this.cpu, tile)) return;

            this.currentState = this.STATE_CPU_TURN;
            this.timer = 15;
            this.cpu.needsToDiscard = true;
        }, BattleConfig.SPEED.ACTION_WAIT);
    },


    checkPlayerActions: function (discardedTile) {
        if (this.cpu.buffs && this.cpu.buffs.discardGuard > 0) {
            return false;
        }
        this.possibleActions = [];
        const hand = this.p1.hand;
        const fullHand = this.getFullHand(this.p1);

        let matchCount = 0;
        hand.forEach(t => {
            if (t.type === discardedTile.type) matchCount++;
        });
        if (matchCount >= 2 && this.turnCount !== 1 && this.turnCount < 20 && !this.p1.isRiichi && hand.length >= 3) {
            const ponAction = { type: 'PON', label: '펑', targetTile: discardedTile };
            this.possibleActions.push(ponAction);
        }

        // 론은 리치 선언 시에만 허용(펑 후 오픈패 방지와 동일).
        const tempHand = [...fullHand, discardedTile];
        if (this.p1.isRiichi && YakuLogic.checkYaku(tempHand, this.p1.id)) {
            this.possibleActions.push({ type: 'RON', label: '론' });
        }

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

        const yakuResult = YakuLogic.checkYaku(fullHand, this.p1.id);

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

        // Tiger Strike/Spirit Riichi 활성 시 리치 강제.
        if (this.p1.buffs && (this.p1.buffs.guaranteedWin || this.p1.buffs.spiritTimer > 0)) {
            if (!this.p1.isRiichi) {
                // Filter actions to only keep RIICHI
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
        if (action.type === 'PON') {
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

                this.currentState = this.STATE_PLAYER_TURN;
                this.possibleActions = [];
                this.timer = 0;
                this.hoverIndex = this.p1.hand.length - 1;
            }, BattleConfig.SPEED.ACTION_WAIT);
        } else if (action.type === 'RIICHI') {
            this.p1.isRiichi = true;
            this.p1.declaringRiichi = true;
            this.validRiichiDiscardIndices = this.getValidRiichiDiscards();

            this.showPopup('RIICHI', { slideFrom: 'LEFT' });

            const riichiKey = this.cpu.isRiichi ? 'COUNTER_RIICHI' : 'RIICHI';
            this.triggerDialogue(riichiKey, 'p1');
            this.setTimeout(() => {
                this.triggerDialogue('RIICHI_REPLY', 'cpu');
            }, BattleConfig.DIALOGUE.replyDelay);

            this.currentBgm = 'audio/bgm_showdown';
            this.events.push({ type: 'MUSIC', id: this.currentBgm, loop: true });

            this.setExpression('P1', 'smile');

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


            if (candidates.length === 0) {
                console.error("Riichi declared but no valid discards found? Should not happen.");
            }

            this.riichiTargetIndex = -1;
            this.p1.riichiValidDiscards = null;

            this.updateBattleMusic();
            this.currentState = this.STATE_PLAYER_TURN;

        } else if (action.type === 'TSUMO') {
            const fullHand = this.getFullHand(this.p1);
            this.showPopup('TSUMO', { blocking: true });
            this.setExpressions('smile', 'shocked');

            this.winningYaku = YakuLogic.checkYaku(fullHand, this.p1.id);

            if (this.winningYaku) {
                const score = this.calculateScore(this.winningYaku.score, this.p1.isMenzen, this.p1, this.cpu);
                this.pendingDamage = { target: 'CPU', amount: score };
                BattleSequencer.startWinSequence(this, 'TSUMO', 'P1', score);
            } else {
                console.error("CRITICAL: TSUMO allowed but checkYaku failed during execution!");
                return;
            }

        } else if (action.type === 'RON') {
            if (BattleConfig.RULES.SKILLS_ENABLED && !this.cpu.isRiichi) {
                const reactiveSkillId = this.cpu.skills ? this.cpu.skills.find(id => {
                    const s = SkillData[id];
                    return s && s.type === 'REACTIVE' && (id === 'EXCHANGE_RON' || id === 'SUPER_IAI');
                }) : null;

                if (reactiveSkillId && this.checkSkillCost(SkillData[reactiveSkillId], 'CPU')) {
                    if (this.cpu.hp < 8000 || Math.random() < 0.8) {
                        if (this.useSkill(reactiveSkillId, 'CPU', true)) {
                            if (reactiveSkillId === 'SUPER_IAI') {
                                SkillFlows.activateSuperIaido(this, 'CPU');
                            } else if (reactiveSkillId === 'EXCHANGE_RON') {
                                SkillFlows.activateRonTileExchange(this, 'CPU');
                            }
                            return;
                        }
                    }
                }
            }

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
                return;
            }
        }
    },




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

    // 리치 선언 가능 여부. 멘젠·미선언·시간내·1장 버려 텐파이 가능 조건.
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

    // 스킬용 리치 잠금(TIGER_STRIKE/SPIRIT_RIICHI). 팝업/FX 없이 리치만 커밋. P1 전용 유효버림 인덱스도 갱신.
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

    setExpression: function (who, state) {
        this.events.push({ type: 'EXPRESSION', who: who, state: state });
    },

    setExpressions: function (p1State, cpuState) {
        this.setExpression('P1', p1State);
        this.setExpression('CPU', cpuState);
    },

    // 패에서 일치 타일 2장을 빼 오픈 펑 세트 구성. 버림패 제거. 페어 없으면 false.
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



    checkTenpai: function (hand, returnDetails) {
        return YakuLogic.checkTenpai(hand, returnDetails);
    },

    updateBattleMusic: function () {
        // 우선순위: showdown(양측 리치) > tension(CPU만) > basic. 양측 리치 중 tension이면 유지.
        let targetBgm = 'audio/bgm_basic';

        if (this.p1.isRiichi && this.cpu.isRiichi) {
            if (this.currentBgm === 'audio/bgm_tension') targetBgm = 'audio/bgm_tension';
            else targetBgm = 'audio/bgm_showdown';
        } else if (this.cpu.isRiichi) {
            targetBgm = 'audio/bgm_tension';
        } else if (this.p1.isRiichi) {
            targetBgm = 'audio/bgm_showdown';
        }

        if (this.currentBgm !== targetBgm) {
            this.currentBgm = targetBgm;
            this.events.push({ type: 'MUSIC', id: targetBgm, loop: true });
        }
    },

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

    classifyCpuDraw: function () {
        const info = this.cpuDrawInfo;
        if (!info || !info.tile) return 'RANDOM';
        const tile = info.tile;
        const preHand = info.preHand || [];

        // O(N) 경량 판정. 역은 트리플렛/색 기반이므로 같은 타입 수만으로 충분.
        const sameType = preHand.filter(t => t.type === tile.type).length;
        const sameColor = preHand.filter(t => t.color === tile.color).length;

        if (sameType >= 2) return 'GOOD_DRAW';
        if (sameType === 0 && sameColor <= 2) return 'BAD_DRAW';

        return 'RANDOM';
    },

    // fallbackKey: 캐릭터에 key가 없으면 같은 캐릭터의 fallbackKey → 전체 default 순으로 탐색.
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
        }
    },

    activeStateTileExchange: function () {
    },

    toggleExchangeSelection: function (index) {
        if (this.exchangeIndices.includes(index)) {
            this.exchangeIndices = this.exchangeIndices.filter(i => i !== index);
            Assets.playSound('audio/cursor');
        } else {
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
        const charData = CharacterData.find(c => c.id === this.p1.id);
        const p1Skills = charData ? charData.skills : [];

        let skillId = null;
        if (p1Skills.includes('PAINT_TILE')) skillId = 'PAINT_TILE';
        else if (p1Skills.includes('EXCHANGE_TILE')) skillId = 'EXCHANGE_TILE';

        const skill = SkillData[skillId];
        if (!skill) {
            this.currentState = this.STATE_WAIT_FOR_DRAW;
            this.timer = 0;
            return;
        }

        const count = this.exchangeIndices.length;

        if (count === 0) {
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

        this.consumeMp('P1', totalCost);
        this.exchangeTiles(this.p1, this.exchangeIndices);

        this.events.push({ type: 'SOUND', id: 'audio/skill_activate' });
        this.showPopup('SKILL', { text: skill.name, blocking: false });

        this.exchangeIndices = [];

        this.currentState = this.STATE_WAIT_FOR_DRAW;
        this.timer = 0;
    },

    performAutoTurn: function () {
        if (this.currentState !== this.STATE_PLAYER_TURN) {
            return;
        }

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
