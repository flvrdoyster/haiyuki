const BattleScene = {
    init: function (data) {
        QADebug.reset();
        // 난이도는 규칙 엔진이 saveData를 직접 읽지 않도록 여기서 주입
        data = data || {};
        if (!data.difficulty) {
            data.difficulty = (Game.saveData && Game.saveData.difficulty) || 'normal';
        }
        BattleEngine.init(data, this);
        BattleRenderer.reset();
        this.initPortraits();
        this.activeFX = [];
        this.confirmData = null;
        this._confirmLayout = null;
    },

    endMatch: function () {
        Game.fadeTo(() => this.proceedFromMatchOver());
    },

    proceedFromMatchOver: function () {
        const e = BattleEngine;

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
        this.cpuMasked = (cpuData && cpuData.id === 'mayu' && (!p1Data || p1Data.id !== 'mayu'));

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
                    // 공격자 캐릭터에 따라 피격 효과음 분기 (검사: slash, 나머지: impact 랜덤)
                    let attackerId = null;
                    if (evt.target === 'P1') {
                        attackerId = engine.cpu.id;
                    } else if (evt.target === 'CPU') {
                        attackerId = engine.p1.id;
                    }

                    if (attackerId) {
                        const isSword = (attackerId === 'smash' || attackerId === 'yuri');
                        if (isSword) {
                            Assets.playSound('audio/slash');
                        } else {
                            const r = Math.floor(Math.random() * 3) + 1;
                            Assets.playSound(`audio/impact-${r}`);
                        }
                    } else {
                        Assets.playSound(BattleConfig.AUDIO.DAMAGE);
                    }

                    Game.shake(BattleConfig.SHAKE.mag, BattleConfig.SHAKE.frames);

                    engine.events.splice(i, 1);
                    continue;
                }

                if (evt.type === 'DRAW') {
                    Assets.playSound(BattleConfig.AUDIO.DRAW);
                    engine.events.splice(i, 1);
                    continue;
                }

                if (evt.type === 'DISCARD') {
                    Assets.playSound(BattleConfig.AUDIO.DISCARD);
                    engine.events.splice(i, 1);
                    continue;
                }

                const isBlocked = this.activeFX.some(fx => fx.blocking);
                if (!isBlocked) {
                    if (evt.type === 'FX') {
                        if (evt.options && evt.options.popupType) {
                            const conf = BattleConfig.POPUP.TYPES[evt.options.popupType];
                            if (conf && conf.sound) {
                                Assets.playSound(conf.sound);
                            }
                        }
                        this.spawnFX(evt.asset, evt.x, evt.y, evt.options);
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

    spawnFX: function (type, x, y, options = {}) {
        const img = Assets.get(type);
        if (img) {
            const life = options.life || 45;
            const scale = options.scale || 1.0;
            const slideFrom = options.slideFrom;
            const anim = options.anim;
            const blocking = options.blocking || false;

            let startX = x;
            let endX = x;
            let startY = y;
            let endY = y;

            if (slideFrom === 'LEFT') {
                startX = -img.width * scale;
                endX = x;
            } else if (slideFrom === 'RIGHT') {
                startX = 640 + img.width * scale;
                endX = x;
            } else if (slideFrom === 'TOP') {
                startY = -img.height * scale;
                endY = y;
            } else if (slideFrom === 'BOTTOM') {
                startY = 480 + img.height * scale;
                endY = y;
            }

            this.activeFX.push({
                type: type, img: img,
                x: startX, y: startY,
                startX: startX, startY: startY,
                endX: endX, endY: endY,
                timer: 0, life: life, maxLife: life,
                scale: scale, alpha: 0,
                baseScale: scale,
                anim: anim,
                slideFrom: slideFrom,
                blocking: blocking
            });
        }
    },

    updateFX: function (dt = 1.0) {
        for (let i = this.activeFX.length - 1; i >= 0; i--) {
            const fx = this.activeFX[i];
            fx.life -= dt;
            fx.timer += dt;

            const fadeInDur = BattleConfig.FX.fadeInDuration;
            if (fx.maxLife - fx.life <= fadeInDur) {
                fx.alpha = (fx.maxLife - fx.life) / fadeInDur;
            }

            if (fx.slideFrom) {
                const slideDur = BattleConfig.FX.slideDuration;
                const p = Math.min(1, (fx.maxLife - fx.life) / slideDur);
                // EaseOutCubic: UI 슬라이드에 Quad보다 부드러움
                const ease = 1 - Math.pow(1 - p, 3);
                fx.x = fx.startX + (fx.endX - fx.startX) * ease;
                fx.y = fx.startY + (fx.endY - fx.startY) * ease;
            } else if (fx.anim === 'ZOOM_IN') {
                const popDur = BattleConfig.FX.zoomPopDuration;
                const age = fx.maxLife - fx.life;
                const overshoot = BattleConfig.FX.zoomOvershoot;

                if (age < popDur) {
                    let p = age / popDur;
                    p = p - 1;
                    const scaleP = p * p * ((overshoot + 1) * p + overshoot) + 1;
                    fx.scale = fx.baseScale * scaleP;
                } else {
                    fx.scale = fx.baseScale;
                }
            } else if (fx.anim === 'BOUNCE_UP') {
                const age = fx.maxLife - fx.life;
                const dropDur = BattleConfig.FX.bounceDropDuration;
                const bounceDur = BattleConfig.FX.bounceUpDuration;
                const startOffX = BattleConfig.FX.bounceStartOffsetX;
                const startOffY = BattleConfig.FX.bounceStartOffsetY;
                const floorOffY = BattleConfig.FX.bounceFloorOffsetY;
                const impactOffX = BattleConfig.FX.bounceImpactOffsetX;

                if (age < dropDur) {
                    const p = age / dropDur;
                    const easeIn = p * p;

                    fx.x = (fx.endX + startOffX) + (impactOffX - startOffX) * p;
                    fx.y = (fx.endY + startOffY) + (floorOffY - startOffY) * easeIn;

                    fx.alpha = Math.min(1, age / 4);

                    if (p > 0.9) fx.scaleY = fx.baseScale * 0.8;
                    else fx.scaleY = fx.baseScale;

                } else {
                    const bounceAge = age - dropDur;
                    let p = Math.min(1, bounceAge / bounceDur);

                    const easeOut = p * (2 - p);

                    fx.x = (fx.endX + impactOffX) + (0 - impactOffX) * easeOut;
                    fx.y = (fx.endY + floorOffY) + (0 - floorOffY) * easeOut;

                    fx.scaleY = fx.baseScale;
                    fx.alpha = 1.0;
                }
                if (age >= dropDur + bounceDur) {
                    fx.x = fx.endX;
                    fx.y = fx.endY;
                }
            } else if (fx.anim === 'SLIDE') {
                const slideDur = BattleConfig.FX.slideDuration + 4;
                const age = fx.maxLife - fx.life;

                if (age <= slideDur) {
                    const p = age / slideDur;
                    const ease = 1 - Math.pow(1 - p, 4);
                    fx.x = fx.startX + (fx.endX - fx.startX) * ease;
                    fx.y = fx.startY + (fx.endY - fx.startY) * ease;
                } else {
                    fx.x = fx.endX;
                    fx.y = fx.endY;
                }
            }

            const fadeOutDur = BattleConfig.FX.fadeOutDuration;
            if (fx.life < fadeOutDur) {
                fx.alpha = fx.life / fadeOutDur;
            } else {
                if (fx.maxLife - fx.life > fadeInDur) fx.alpha = 1.0;
            }

            if (fx.life <= 0) {
                this.activeFX.splice(i, 1);
            }
        }
    },

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        QADebug.sync(BattleEngine);

        if (this.confirmData) {
            this.updateConfirm(dt);
            return;
        }

        this.processEvents(BattleEngine);
        this.updateFX(dt);
        BattleDialogue.update(dt);

        // 블로킹 FX 중에도 포트레이트 애니메이션은 계속 실행
        if (this.p1Character) this.p1Character.update(dt);
        if (this.cpuCharacter) this.cpuCharacter.update(dt);

        const isBlocking = this.activeFX.some(fx => fx.blocking);
        if (isBlocking) {
            return;
        }

        BattleEngine.updateLogic();

        const engine = BattleEngine;

        if (Input.isJustPressed(Input.ESC) || Input.isMouseRightClick()) {
            // 리치 자동 버림 중에는 메뉴 금지
            if (engine.p1 && engine.p1.isRiichi) return;

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

            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z)) {
                engine.confirmDraw();
            } else if (Input.isMouseJustPressed() && onButton) {
                engine.confirmDraw();
            }
        } else if (engine.currentState === engine.STATE_WIN ||
            engine.currentState === engine.STATE_LOSE ||
            engine.currentState === engine.STATE_NAGARI) {

            // stateTimer > 120 (약 2초) 후에만 입력 수락 — 승리키 블리드스루 방지
            if (engine.stateTimer > 120 && (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed())) {
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

        const hovered = BattleRenderer.getMenuItemAt(Input.mouseX, Input.mouseY, BattleMenuSystem.menuItems);
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

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE)) {
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
        const hovered = BattleRenderer.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
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

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE) || Input.isMouseJustPressed()) {

            if (engine.actionFocused && (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE))) {
                BattleMenuSystem.toggle();
                return;
            }

            if (Input.isMouseJustPressed()) {
                const clickIndex = BattleRenderer.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
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
        BattleRenderer.draw(ctx, BattleEngine, this.activeFX);

        if (this.confirmData) {
            this.drawConfirm(ctx);
        }
    },

    showConfirm: function (msg, onYes, onNo, options = {}) {
        this.confirmData = {
            msg: msg,
            onYes: onYes,
            onNo: onNo,
            selected: 1,
            timer: 10,
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
                if (d.onYes) d.onYes();
                this.confirmData = null;
                return;
            }
        } else if (isOverNo) {
            if (Input.hasMouseMoved()) d.selected = 1;
            if (Input.isMouseJustPressed()) {
                if (d.onNo) d.onNo();
                this.confirmData = null;
                return;
            }
        }

        if (Input.isJustPressed(Input.LEFT) || Input.isJustPressed(Input.RIGHT) ||
            Input.isJustPressed(Input.UP) || Input.isJustPressed(Input.DOWN)) {
            d.selected = (d.selected === 0) ? 1 : 0;
        }

        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE)) {
            if (d.selected === 0) {
                if (d.onYes) d.onYes();
            } else {
                if (d.onNo) d.onNo();
            }
            this.confirmData = null;
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
        const hovered = BattleRenderer.getHandTileAt(Input.mouseX, Input.mouseY, engine.p1, groupSize);
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
        if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE) || (Input.isMouseJustPressed() && hovered !== -1)) {
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
