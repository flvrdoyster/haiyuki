const BattleScene = {
    init: function (data) {
        QADebug.reset();
        // 난이도는 규칙 엔진이 saveData를 직접 읽지 않도록 여기서 주입
        data = data || {};
        if (!data.difficulty) {
            data.difficulty = (Game.saveData && Game.saveData.difficulty) || 'normal';
        }
        if (data.tutorial) {
            this.skillsBeforeTutorial = BattleConfig.RULES.SKILLS_ENABLED;
            BattleConfig.RULES.SKILLS_ENABLED = false;
        }
        this.online = null;
        if (data.online) {
            const match = data.online;
            this.online = match;
            data.difficulty = 'normal';
            BattleConfig.RULES.SKILLS_ENABLED = match.skills !== false;
            data.seed = match.seed;
            data.localSeat = match.seat;
            data.defeatedOpponents = [];
            data.controllers = { P1: new HumanController(), CPU: new NetController(match) };
            data.onAction = (entry) => match.onAction(BattleEngine, entry);
        }
        BattleEngine.init(data, this);
        Game.syncSkillsButton();
        BattleRenderer.reset();
        this.initPortraits();
        this.fx = FXSystem.create();
        this.confirmData = null;
        this._confirmLayout = null;
    },

    exitTutorial: function () {
        BattleConfig.RULES.SKILLS_ENABLED = this.skillsBeforeTutorial;
        BattleEngine.tutorial = null;
        BattleEngine.narration = null;
        Game.syncSkillsButton();
        Assets.stopMusic();
        Game.changeScene(TitleScene);
    },

    exitOnline: function () {
        const match = this.online;
        this.online = null;
        BattleEngine.online = null;
        Assets.stopMusic();
        OnlineLobby.returnFromMatch(match);
    },

    endMatch: function () {
        const lost = BattleEngine.matchWinner !== 'P1';
        Game.fadeTo(() => this.proceedFromMatchOver(), lost ? BattleConfig.LOSE_FADE : undefined);
    },

    fadeRound: function (action) {
        Game.fadeTo(action, BattleConfig.ROUND_FADE);
    },

    proceedFromMatchOver: function () {
        const e = BattleEngine;

        if (this.online) {
            this.online.finish(e);
            this.exitOnline();
            return;
        }

        if (e.matchWinner === 'P1') {
            e.defeatedOpponents = [...e.defeatedOpponents, e.cpuIndex];

            // 마유는 히든 보스 — 격파 시 진엔딩 분기
            const mayuIndex = CharacterData.findIndex(c => c.id === 'mayu');
            if (e.cpuIndex === mayuIndex) {
                if (!Game.saveData.unlocked.includes('mayu')) {
                    Game.saveData.unlocked.push('mayu');
                    Game.save();
                }

                Game.isAutoTest = false;
                Game.changeScene(EncounterScene, {
                    playerIndex: e.playerIndex,
                    cpuIndex: e.cpuIndex,
                    mode: 'TRUE_ENDING',
                    defeatedOpponents: []
                });
                return;
            }

            // Proceed to next match
            Assets.stopMusic();
            Game.changeScene(CharacterSelectScene, {
                mode: 'NEXT_MATCH',
                playerIndex: e.playerIndex,
                defeatedOpponents: e.defeatedOpponents
            });
        } else {
            Game.continueCount++;
            Game.changeScene(ContinueScene, {
                playerIndex: e.playerIndex,
                cpuIndex: e.cpuIndex,
                defeatedOpponents: e.defeatedOpponents,
                isNextRound: false
            });
        }
    },

    p1Character: null,
    cpuCharacter: null,
    cpuMasked: false,

    initPortraits: function () {
        const idMap = {
            'ataho': 'ATA',
            'rinxiang': 'RIN',
            'smash': 'SMSH',
            'petum': 'PET',
            'fari': 'FARI',
            'yuri': 'YURI',
            'mayu': 'MAYU'
        };

        const getAnimConfig = (charData) => {
            if (!charData) return null;
            const prefix = idMap[charData.id] || charData.id.toUpperCase();
            const base = `face/${prefix}_base.png`;
            return Assets.get(base) ? { base: base } : null;
        };

        const p1Data = CharacterData.find(c => c.id === BattleEngine.p1.id);
        const cpuData = CharacterData.find(c => c.id === BattleEngine.cpu.id);

        this.p1Character = new PortraitCharacter(p1Data, {
            ...BattleConfig.PORTRAIT.P1,
            baseW: BattleConfig.PORTRAIT.baseW,
            baseH: BattleConfig.PORTRAIT.baseH,
            isBattle: true
        }, false);
        this.p1Character.setAnimationConfig(getAnimConfig(p1Data));

        // 마스크 보스: BattleRenderer가 실루엣(MAYU_unknown.png)을 직접 그림 — cpuCharacter는 이벤트 시스템용으로만 유지
        this.cpuMasked = (!this.online && cpuData && cpuData.id === 'mayu' && (!p1Data || p1Data.id !== 'mayu'));

        this.cpuCharacter = new PortraitCharacter(cpuData, {
            ...BattleConfig.PORTRAIT.CPU,
            baseW: BattleConfig.PORTRAIT.baseW,
            baseH: BattleConfig.PORTRAIT.baseH,
            isBattle: true
        }, true);
        this.cpuCharacter.setAnimationConfig(getAnimConfig(cpuData));

        this.p1Character.setState('idle');
        this.cpuCharacter.setState('idle');
    },

    // 메시지가 바뀔 때만 레이아웃 재계산 (매 프레임 히트 판정에 사용)
    getConfirmLayout: function (msg) {
        if (this._confirmLayout && this._confirmLayout.msg === msg) return this._confirmLayout;
        this._confirmLayout = UIHelpers.getConfirmLayout(msg);
        return this._confirmLayout;
    },

    processEvents: function (engine) {
        if (!engine.events) return;

        let i = 0;
        while (i < engine.events.length) {
            try {
                const evt = engine.events[i];
                const isAudio = (evt.type === 'MUSIC' || evt.type === 'SOUND' || evt.type === 'STOP_MUSIC');

                if (isAudio) {
                    if (evt.type === 'MUSIC') {
                        Assets.playMusic(evt.id, evt.loop);
                    } else if (evt.type === 'SOUND') {
                        Assets.playSound(evt.id);
                    } else if (evt.type === 'STOP_MUSIC') {
                        Assets.stopMusic();
                    }
                    engine.events.splice(i, 1);
                    continue;
                }

                if (evt.type === 'EXPRESSION') {
                    const ch = evt.who === 'P1' ? this.p1Character : this.cpuCharacter;
                    if (ch) ch.setState(evt.state);
                    engine.events.splice(i, 1);
                    continue;
                }

                if (evt.type === 'DIALOGUE') {
                    BattleDialogue.show(evt.text, evt.who);
                    engine.events.splice(i, 1);
                    continue;
                }

                if (evt.type === 'DAMAGE') {
                    Assets.playSound(BattleConfig.AUDIO.DAMAGE);

                    const tier = BattleConfig.SHAKE.find(t => evt.amount >= t.min) || BattleConfig.SHAKE[BattleConfig.SHAKE.length - 1];
                    Game.shake(tier.amp, tier.frames);

                    engine.events.splice(i, 1);
                    continue;
                }

                if (evt.type === 'DRAW') {
                    Assets.playSound(BattleConfig.AUDIO.DRAW);
                    engine.events.splice(i, 1);
                    continue;
                }

                if (evt.type === 'DISCARD') {
                    const who = evt.player === 'CPU' ? engine.cpu : engine.p1;
                    const guarded = who.id === 'fari' && who.buffs && who.buffs.discardGuard > 0;
                    Assets.playSound(guarded ? BattleConfig.AUDIO.DISCARD_GUARDED : BattleConfig.AUDIO.DISCARD);
                    engine.events.splice(i, 1);
                    continue;
                }

                const isBlocked = this.fx.isBlocking();
                if (!isBlocked) {
                    if (evt.type === 'FX') {
                        if (evt.options && evt.options.popupType) {
                            const conf = BattleConfig.POPUP.TYPES[evt.options.popupType];
                            if (conf && conf.sound) {
                                Assets.playSound(conf.sound);
                            }
                        }
                        this.fx.spawn(evt.asset, evt.x, evt.y, evt.options);
                    }
                    engine.events.splice(i, 1);
                    continue;
                } else {
                    i++;
                }
            } catch (e) {
                console.error("Error processing event:", e);
                engine.events.splice(i, 1);
            }
        }
    },

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        QADebug.sync(BattleEngine);

        if (this.online && this.online.failed) {
            this.exitOnline();
            return;
        }

        if (this.confirmData) {
            this.updateConfirm(dt);
            return;
        }

        this.processEvents(BattleEngine);
        this.fx.update(dt);
        BattleDialogue.update(dt);

        // 블로킹 FX 중에도 포트레이트 애니메이션은 계속 실행
        if (this.p1Character) this.p1Character.update(dt);
        if (this.cpuCharacter) this.cpuCharacter.update(dt);

        const narration = BattleEngine.narration;
        if (narration) {
            narration.age += dt;
            if (narration.age > 10 && (Input.isConfirmKey() || Input.isMouseJustPressed())) {
                BattleEngine.advanceNarration();
            }
            return;
        }

        const isBlocking = this.fx.isBlocking();
        if (isBlocking) {
            if (Input.isConfirmKey() || Input.isMouseJustPressed()) this.fx.skipHold();
            return;
        }

        BattleEngine.updateLogic();

        const engine = BattleEngine;

        if (Input.isJustPressed(Input.ESC) || Input.isMouseRightClick()) {
            if (engine.p1 && engine.p1.isRiichi && !engine.canCancelRiichi('P1')) return;

            // 패 교환 중에는 ESC를 교환 확인키로 쓰므로 메뉴 스킵
            if (engine.currentState !== engine.STATE_TILE_EXCHANGE) {
                BattleMenuSystem.toggle();
                return;
            }
        }

        if (engine.currentState === engine.STATE_BATTLE_MENU) {
            this.handleBattleMenuInput(engine);
        } else if (engine.currentState === engine.STATE_PLAYER_TURN) {
            this.handlePlayerTurnInput(engine);
        } else if (engine.currentState === engine.STATE_TILE_EXCHANGE) {
            this.handleTileExchangeInput(engine);
        } else if (engine.currentState === engine.STATE_WAIT_FOR_DRAW) {
            engine.actionFocused = true;
            const onButton = BattleRenderer.checkActionButton(Input.mouseX, Input.mouseY);
            engine.actionHover = engine.actionFocused || onButton;

            const ready = engine.timer > BattleConfig.SPEED.DRAW_INPUT_DELAY;
            if (ready && Input.isConfirmKey()) {
                engine.confirmDraw();
            } else if (ready && Input.isMouseJustPressed() && onButton) {
                engine.confirmDraw();
            }
        } else if (engine.currentState === engine.STATE_WIN ||
            engine.currentState === engine.STATE_LOSE ||
            engine.currentState === engine.STATE_NAGARI) {

            // stateTimer > 120 (약 2초) 후에만 입력 수락 — 승리키 블리드스루 방지
            if (engine.stateTimer > 120 && (Input.isConfirmKey() || Input.isMouseJustPressed())) {
                engine.confirmResult();
            }
        }
    },

    handleBattleMenuInput: function () {
        if (Input.isJustPressed(Input.UP)) {
            BattleMenuSystem.selectedMenuIndex--;
            if (BattleMenuSystem.selectedMenuIndex < 0) BattleMenuSystem.selectedMenuIndex = BattleMenuSystem.menuItems.length - 1;
        } else if (Input.isJustPressed(Input.DOWN)) {
            BattleMenuSystem.selectedMenuIndex++;
            if (BattleMenuSystem.selectedMenuIndex >= BattleMenuSystem.menuItems.length) BattleMenuSystem.selectedMenuIndex = 0;
        }

        const hovered = BattleLayout.getMenuItemAt(Input.mouseX, Input.mouseY, BattleMenuSystem.menuItems);
        if (hovered !== -1 && Input.hasMouseMoved()) {
            BattleMenuSystem.selectedMenuIndex = hovered;
        }

        if (Input.isMouseJustPressed()) {
            if (hovered !== -1) {
                BattleMenuSystem.selectedMenuIndex = hovered;
                BattleMenuSystem.handleSelection();
                return;
            }
        }

        if (Input.isConfirmKey()) {
            BattleMenuSystem.handleSelection();
        }
    },

    handlePlayerTurnInput: function (engine) {
        // 리치 자동 버림 중에는 선언 중일 때만 수동 입력 허용
        if (engine.p1.isRiichi && !engine.p1.declaringRiichi) return;

        const handSize = engine.p1.hand.length;

        // 액션 버튼(날 수 있어!/리치) — getActiveAction이 단일 진실 출처; 누르면 메뉴 열어 거절 가능
        const hasAction = BattleRenderer.getActiveAction(engine) !== null;
        if (!hasAction) engine.actionFocused = false;

        const onActionBtn = hasAction && BattleRenderer.checkActionButton(Input.mouseX, Input.mouseY);
        if (onActionBtn && Input.isMouseJustPressed()) {
            BattleMenuSystem.toggle();
            return;
        }

        const groupSize = engine.lastDrawGroupSize || 0;
        const hovered = BattleLayout.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
        if (hovered !== -1 && Input.hasMouseMoved()) {
            engine.hoverIndex = hovered;
            engine.actionFocused = false;
        }

        // ← : 액션 버튼에서 마지막 패로, 패에서 왼쪽으로. → : 마지막 패에서 버튼으로, 버튼에서 첫 패(0)로 순환
        if (Input.isJustPressed(Input.LEFT)) {
            if (engine.actionFocused) {
                engine.actionFocused = false;
                engine.hoverIndex = handSize - 1;
            } else {
                engine.hoverIndex--;
                if (engine.hoverIndex < 0) engine.hoverIndex = handSize - 1;
            }
        }
        if (Input.isJustPressed(Input.RIGHT)) {
            if (engine.actionFocused) {
                engine.actionFocused = false;
                engine.hoverIndex = 0; // wrap past the button to the first tile
            } else if (engine.hoverIndex >= handSize - 1 && hasAction) {
                engine.actionFocused = true;
            } else {
                engine.hoverIndex++;
                if (engine.hoverIndex >= handSize) engine.hoverIndex = 0;
            }
        }

        if (!engine.actionFocused) {
            if (engine.hoverIndex >= handSize) engine.hoverIndex = handSize - 1;
            if (engine.hoverIndex < 0) engine.hoverIndex = 0;
        }

        engine.actionHover = engine.actionFocused || onActionBtn;

        if (Input.isConfirmKey() || Input.isMouseJustPressed()) {

            if (engine.actionFocused && (Input.isConfirmKey())) {
                BattleMenuSystem.toggle();
                return;
            }

            if (Input.isMouseJustPressed()) {
                const clickIndex = BattleLayout.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
                if (clickIndex !== -1) {
                    if (engine.riichiTargetIndex !== -1 && engine.riichiTargetIndex !== clickIndex) {
                        return;
                    }

                    if (engine.p1.declaringRiichi) {
                        const validIndices = engine.validRiichiDiscardIndices;
                        if (!validIndices || !validIndices.includes(clickIndex)) {
                            Assets.playSound('audio/wrong');
                            return;
                        }
                    }

                    engine.hoverIndex = clickIndex;
                    engine.discardTile(clickIndex);
                } else {
                    engine.hoverIndex = -1;
                }
            } else if (!engine.actionFocused && engine.hoverIndex !== -1 && engine.hoverIndex < handSize) {
                if (engine.riichiTargetIndex !== -1 && engine.riichiTargetIndex !== engine.hoverIndex) {
                    return;
                }

                if (engine.p1.declaringRiichi) {
                    const validIndices = engine.validRiichiDiscardIndices;
                    if (!validIndices || !validIndices.includes(engine.hoverIndex)) {
                        Assets.playSound('audio/wrong');
                        return;
                    }
                }

                engine.discardTile(engine.hoverIndex);
            }
        }
    },

    draw: function (ctx) {
        BattleRenderer.draw(ctx, BattleEngine, this.fx.list);

        if (this.confirmData) {
            this.drawConfirm(ctx);
            if (this.confirmData && this.confirmData.limit > 0) {
                BattleRenderer.drawClock(ctx, 'P1', Math.ceil(this.confirmData.limit / BattleConfig.ONLINE.TICK_RATE), 'confirm');
            }
        } else if (this.online && BattleEngine.clock) {
            const seconds = OnlineClock.remaining(BattleEngine.clock);
            if (seconds !== null) BattleRenderer.drawClock(ctx, BattleEngine.clock.who, seconds, BattleEngine.clock.key);
        }
    },

    showConfirm: function (msg, onYes, onNo, options = {}) {
        this.confirmData = {
            msg: msg,
            onYes: onYes,
            onNo: onNo,
            selected: 1,
            timer: 10,
            limit: options.limit || 0,
            cost: options.cost || 0
        };
        this._confirmLayout = null;
    },

    updateConfirm: function (dt = 1.0) {
        const d = this.confirmData;
        if (d.timer > 0) {
            d.timer -= dt;
            return;
        }

        if (d.limit > 0) {
            d.limit -= dt;
            if (d.limit <= 0) {
                this.confirmData = null;
                if (d.onNo) d.onNo();
                return;
            }
        }

        const mx = Input.mouseX;
        const my = Input.mouseY;

        const layout = this.getConfirmLayout(d.msg);
        const yes = layout.yesBtn;
        const no = layout.noBtn;

        const isOverYes = (mx >= yes.x && mx <= yes.x + yes.w && my >= yes.y && my <= yes.y + yes.h);
        const isOverNo = (mx >= no.x && mx <= no.x + no.w && my >= no.y && my <= no.y + no.h);

        if (isOverYes) {
            if (Input.hasMouseMoved()) d.selected = 0;
            if (Input.isMouseJustPressed()) {
                this.confirmData = null;
                if (d.onYes) d.onYes();
                return;
            }
        } else if (isOverNo) {
            if (Input.hasMouseMoved()) d.selected = 1;
            if (Input.isMouseJustPressed()) {
                this.confirmData = null;
                if (d.onNo) d.onNo();
                return;
            }
        }

        if (Input.isJustPressed(Input.LEFT) || Input.isJustPressed(Input.RIGHT) ||
            Input.isJustPressed(Input.UP) || Input.isJustPressed(Input.DOWN)) {
            d.selected = (d.selected === 0) ? 1 : 0;
        }

        if (Input.isConfirmKey()) {
            this.confirmData = null;
            if (d.selected === 0) {
                if (d.onYes) d.onYes();
            } else {
                if (d.onNo) d.onNo();
            }
        }
    },

    drawConfirm: function (ctx) {
        const d = this.confirmData;
        if (!d) return;

        const layout = this.getConfirmLayout(d.msg);
        UIHelpers.drawConfirmDialog(ctx, layout, d.selected);
    },

    handleTileExchangeInput: function (engine) {
        const groupSize = 0;
        const hovered = BattleLayout.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
        if (hovered !== -1 && Input.hasMouseMoved()) { engine.hoverIndex = hovered; }

        // Keyboard/Mouse Navigation
        const handSize = engine.p1.hand.length;
        if (Input.isJustPressed(Input.LEFT)) {
            engine.hoverIndex--;
            if (engine.hoverIndex < 0) engine.hoverIndex = handSize - 1;
        } else if (Input.isJustPressed(Input.RIGHT)) {
            engine.hoverIndex++;
            if (engine.hoverIndex >= handSize) engine.hoverIndex = 0;
        }

        // Z(=Space)로 교환 대상 패 토글
        if (Input.isConfirmKey() || (Input.isMouseJustPressed() && hovered !== -1)) {
            if (engine.hoverIndex >= 0 && engine.hoverIndex < handSize) {
                engine.toggleExchangeSelection(engine.hoverIndex);
            }
        }

        const isHoverButton = BattleRenderer.checkExchangeButton(Input.mouseX, Input.mouseY);
        if (Input.hasMouseMoved()) {
            engine.exchangeButtonHover = isHoverButton;
        }

        // ESC로만 확인 — Z는 위에서 토글로 쓰임; 글로벌 메뉴 토글이 이 상태를 건너뛰므로 ESC가 여기까지 도달
        if (Input.isJustPressed(Input.ESC) || (Input.isMouseJustPressed() && isHoverButton)) {
            engine.confirmTileExchange();
        }
    },

};
