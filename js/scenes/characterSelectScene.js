
const SelectConfig = {
    BACKGROUND: { path: 'bg/CHRBAK.png' },
    TITLE: { y: 20 },
    VS_LOGO: { path: 'ui/vs.png', y: 200 },
    PORTRAIT: {
        w: 280, h: 304,
        P1: { x: 0, y: 65, align: 'left' },
        CPU: { x: 640, y: 65, align: 'right' }
    },
    NAME: {
        yOffset: 280, // 초상화 상단 기준 오프셋
        font: `bold 32px ${FONTS.bold}, sans-serif`,
        strokeWidth: 4,
        xPadding: 20
    },
    ICON_ROW: {
        y: 380,
        gap: 14,
        dimOpacity: 0.5,
        cursorPath: 'face/select_cursor.png',
        // 마유(숨김 캐릭터)는 VS 로고 아래 별도 슬롯 — 기본 6인 행에 포함되지 않음
        hiddenSlotY: 292
    }
};

const CharacterSelectScene = {
    STATE_PLAYER_SELECT: 0,
    STATE_CPU_SELECT: 1,
    STATE_READY: 2,

    currentState: 0,

    // 언락 여부에 따라 init에서 동적으로 채움
    characters: [],

    playerIndex: 0,
    cpuIndex: 0,
    p1Portrait: null,
    cpuPortrait: null,

    cpuTimer: 0,
    cpuSelectDuration: 60, // 룰렛 스핀 프레임 수

    init: function (data) {
        this.characters = CharacterData.filter(c => {
            if (!c.hidden) return true;
            if (Game.saveData && Game.saveData.unlocked.includes(c.id)) return true;
            return false;
        });

        this.currentState = this.STATE_PLAYER_SELECT;
        this.playerIndex = 0;
        this.cpuIndex = 0; // 0으로 초기화하지 않으면 draw에서 크래시
        this.timer = 0;
        this.cpuTimer = 0;
        this.readyTimer = 0;
        this.lastHoveredIndex = -1;

        Assets.playMusic('audio/bgm_chrsel');

        this.mode = data && data.mode ? data.mode : 'STORY';
        this.defeatedOpponents = data && data.defeatedOpponents ? data.defeatedOpponents : [];

        this.updateP1Portrait();
        this.updateCpuPortrait();

        if (this.mode === 'NEXT_MATCH') {
            this.playerIndex = data.playerIndex;
            this.updateP1Portrait();
            // NEXT_MATCH도 룰렛 스핀을 거쳐 상대를 선정 — 직접 인카운터로 점프하지 않음
            this.currentState = this.STATE_CPU_SELECT;
            this.cpuTimer = 0;
        }
    },

    updateP1Portrait: function () {
        if (!this.characters[this.playerIndex]) return;

        const charData = this.characters[this.playerIndex];

        if (!this.p1Portrait) {
            this.p1Portrait = new PortraitCharacter(charData, SelectConfig.PORTRAIT.P1, false);
        } else {
            this.p1Portrait.updateCharacter(charData);
        }

        this.setupPortraitAnim(this.p1Portrait, charData.id);
    },

    updateCpuPortrait: function () {
        if (!this.characters[this.cpuIndex]) return;
        this.cpuPortrait = new PortraitCharacter(this.characters[this.cpuIndex], SelectConfig.PORTRAIT.CPU, true);
        this.setupPortraitAnim(this.cpuPortrait, this.characters[this.cpuIndex].id);
    },

    setupPortraitAnim: function (portrait, id) {
        const idMap = {
            'ataho': 'ATA', 'rinxiang': 'RIN', 'smash': 'SMSH',
            'petum': 'PET', 'fari': 'FARI', 'yuri': 'YURI',
            'mayu': 'MAYU'
        };
        const prefix = idMap[id] || id.toUpperCase();
        const base = `face/${prefix}_base.png`;
        if (Assets.get(base)) {
            portrait.setAnimationConfig({ base: base });
        }
    },

    // 숨김 캐릭터(마유)는 토너먼트 상대 후보에서 항상 제외 — 진엔딩 보스 전용
    getAvailableOpponents: function () {
        const out = [];
        for (let i = 0; i < this.characters.length; i++) {
            if (i === this.playerIndex) continue;
            if (this.defeatedOpponents.includes(i)) continue;
            if (this.characters[i].hidden) continue;
            out.push(i);
        }
        return out;
    },

    // 라이벌을 마지막으로 아끼고, 남은 후보가 없으면 null 반환(엔딩 진입)
    chooseOpponentIndex: function () {
        const available = this.getAvailableOpponents();
        if (available.length === 0) return null;

        const rivalId = this.characters[this.playerIndex].rival;
        const rivalIndex = this.characters.findIndex(c => c.id === rivalId);

        let candidates = available;
        if (available.length > 1 && rivalIndex !== -1) {
            candidates = available.filter(idx => idx !== rivalIndex);
            if (candidates.length === 0) candidates = available;
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
    },

    goToEnding: function () {
        const rivalId = this.characters[this.playerIndex].rival;
        let rivalIndex = this.characters.findIndex(c => c.id === rivalId);
        if (rivalIndex === -1) rivalIndex = 0; // 라이벌 미지정 안전장치
        Game.changeScene(EncounterScene, {
            playerIndex: this.playerIndex,
            cpuIndex: rivalIndex,
            mode: 'ENDING'
        });
    },

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        // Update Animation States
        if (this.p1Portrait) this.p1Portrait.update(dt);
        if (this.cpuPortrait) this.cpuPortrait.update(dt);

        if (this.currentState === this.STATE_PLAYER_SELECT) {
            if (Game.isAutoTest) {
                this.currentState = this.STATE_CPU_SELECT;
                this.cpuTimer = 0;
                this.updateCpuPortrait();
            }

            // UP으로 숨김 슬롯(마유)에 진입, DOWN/LEFT/RIGHT으로 행으로 복귀
            const hiddenIdx = this.characters.findIndex(c => c.hidden);
            const rowCount = (hiddenIdx === -1) ? this.characters.length : hiddenIdx;
            const onHidden = (this.playerIndex === hiddenIdx);
            const moveTo = (idx) => { this.playerIndex = idx; this.updateP1Portrait(); Assets.playSound('audio/tick'); };
            const backToRow = () => moveTo((this._rowReturnIndex !== undefined && this._rowReturnIndex < rowCount) ? this._rowReturnIndex : 0);

            if (Input.isJustPressed(Input.LEFT)) {
                if (onHidden) backToRow();
                else moveTo((this.playerIndex - 1 + rowCount) % rowCount);
            } else if (Input.isJustPressed(Input.RIGHT)) {
                if (onHidden) backToRow();
                else moveTo((this.playerIndex + 1) % rowCount);
            } else if (Input.isJustPressed(Input.UP)) {
                if (hiddenIdx !== -1 && !onHidden) { this._rowReturnIndex = this.playerIndex; moveTo(hiddenIdx); }
            } else if (Input.isJustPressed(Input.DOWN)) {
                if (onHidden) backToRow();
            }

            if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.SPACE)) {
                this.currentState = this.STATE_CPU_SELECT;
                this.cpuTimer = 0;
                this.updateCpuPortrait();

                if (this.mode === 'WATCH') {
                    this.startWatchMode();
                }
            }
            // 호버 변경 시 즉시 선택 반영 (하이브리드 마우스 입력)
            const hoveredIndex = this.getHoveredCharacterIndex();
            if (hoveredIndex !== -1 && hoveredIndex !== this.lastHoveredIndex) {
                if (Input.hasMouseMoved()) {
                    this.playerIndex = hoveredIndex;
                    this.updateP1Portrait();
                    Assets.playSound('audio/tick');
                }
                this.lastHoveredIndex = hoveredIndex;
            } else if (hoveredIndex === -1) {
                this.lastHoveredIndex = -1;
            }

            if (Input.isMouseJustPressed()) {
                if (hoveredIndex !== -1) {
                    this.currentState = this.STATE_CPU_SELECT;
                    this.cpuTimer = 0;
                    this.updateCpuPortrait();

                    if (this.mode === 'WATCH') {
                        this.startWatchMode();
                    }
                }
            }
        } else if (this.currentState === this.STATE_CPU_SELECT) {

            // challengerTest() 디버그: 토너먼트 건너뛰고 엔딩 시퀀스 직행
            if (this.mode !== 'NEXT_MATCH' && DebugCheats.forceChallenger) {
                this.goToEnding();
                return;
            }

            this.cpuTimer += dt;
            // Spin effect: change index every few frames based on absolute time
            const spinInterval = 5;
            const prevSpin = Math.floor((this.cpuTimer - dt) / spinInterval);
            const currentSpin = Math.floor(this.cpuTimer / spinInterval);

            if (currentSpin > prevSpin) {
                const skipCount = currentSpin - prevSpin;

                // 플레이어·숨김 캐릭터·이미 이긴 상대는 룰렛 표시에서도 제외
                let nextIndex = (this.cpuIndex + skipCount) % this.characters.length;
                let guard = 0;
                while ((nextIndex === this.playerIndex || this.characters[nextIndex].hidden ||
                    this.defeatedOpponents.includes(nextIndex)) &&
                    guard++ < this.characters.length) {
                    nextIndex = (nextIndex + 1) % this.characters.length;
                }

                this.cpuIndex = nextIndex;
                this.updateCpuPortrait();
                Assets.playSound('audio/tick');
            }

            if (this.cpuTimer > this.cpuSelectDuration) {
                const idx = this.chooseOpponentIndex();
                if (idx === null) {
                    this.goToEnding();
                    return;
                }

                this.cpuIndex = idx;
                this.updateCpuPortrait();
                this.currentState = this.STATE_READY;
                this.readyTimer = 0;
            }
        } else if (this.currentState === this.STATE_READY) {
            this.readyTimer += dt;
            if (this.readyTimer > (Game.isAutoTest ? 10 : 60)) {
                Game.changeScene(EncounterScene, {
                    playerIndex: this.playerIndex,
                    cpuIndex: this.cpuIndex,
                    defeatedOpponents: this.defeatedOpponents
                });
            }
        }
    },

    draw: function (ctx) {
        const bg = Assets.get(SelectConfig.BACKGROUND.path);
        if (bg) {
            const pattern = Assets.getPattern(ctx, bg, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, 640, 480);
        }

        const titleText = "CHARACTER SELECT";
        const titleX = (640 - (titleText.length * 32)) / 2;
        Assets.drawAlphabet(ctx, titleText, titleX, SelectConfig.TITLE.y, 'yellow');

        const vs = Assets.get(SelectConfig.VS_LOGO.path);
        if (vs) {
            ctx.drawImage(vs, (640 - vs.width) / 2, SelectConfig.VS_LOGO.y);
        }

        if (this.p1Portrait) {
            this.p1Portrait.draw(ctx);
        }

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.lineWidth = SelectConfig.NAME.strokeWidth;
        ctx.font = SelectConfig.NAME.font;

        ctx.textAlign = 'left';
        if (this.characters[this.playerIndex]) {
            const pNameText = this.characters[this.playerIndex].name;
            const pNameX = SelectConfig.PORTRAIT.P1.x + SelectConfig.NAME.xPadding;
            const pNameY = SelectConfig.PORTRAIT.P1.y + SelectConfig.NAME.yOffset;
            ctx.strokeText(pNameText, pNameX, pNameY);
            ctx.fillText(pNameText, pNameX, pNameY);
        }

        if (this.currentState >= this.STATE_CPU_SELECT) {
            if (this.cpuPortrait) {
                this.cpuPortrait.draw(ctx);
            }

            ctx.textAlign = 'right';
            if (this.characters[this.cpuIndex]) {
                const cpuNameText = this.characters[this.cpuIndex].name;
                const cpuNameX = SelectConfig.PORTRAIT.CPU.x - SelectConfig.NAME.xPadding;
                const cpuNameY = SelectConfig.PORTRAIT.CPU.y + SelectConfig.NAME.yOffset;

                ctx.strokeText(cpuNameText, cpuNameX, cpuNameY);
                ctx.fillText(cpuNameText, cpuNameX, cpuNameY);
            }
        }

        ctx.restore();

        this.characters.forEach((char, index) => {
            // 숨겨진 캐릭터(눈썹개): 평소엔 빈자리. 커서/마우스 호버가 그 슬롯(=playerIndex)에
            // 닿았을 때만 얼굴(select_MAYU)을 드러낸다.
            if (char.hidden && index !== this.playerIndex) return;

            const r = this.getIconRect(index);

            const isPlayerSelected = (this.currentState >= this.STATE_CPU_SELECT && index === this.playerIndex);
            // 이미 이긴 상대는 어둡게 표시해 선택 불가임을 시각적으로 나타냄
            const isDefeated = this.defeatedOpponents.includes(index);

            ctx.save();
            if (isPlayerSelected || isDefeated) {
                ctx.globalAlpha = SelectConfig.ICON_ROW.dimOpacity;
            }
            const iconImg = Assets.get(char.selectIcon);
            if (iconImg) {
                ctx.drawImage(iconImg, r.x, r.y);
                // Defeated: overlay a dark shade on top of the (already dimmed) icon.
                if (isDefeated) {
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                    ctx.fillRect(r.x, r.y, r.w, r.h);
                }
            }
            ctx.restore();
        });

        const cursorImg = Assets.get(SelectConfig.ICON_ROW.cursorPath);
        if (cursorImg) {
            const cursorW = cursorImg.width / 2; // 2프레임(플레이어·CPU) 포함
            const cursorH = cursorImg.height;

            const pr = this.getIconRect(this.playerIndex);
            Assets.drawFrame(ctx, SelectConfig.ICON_ROW.cursorPath,
                pr.x + (pr.w - cursorW) / 2, pr.y + (pr.h - cursorH) / 2, 0, cursorW, cursorH);

            if (this.currentState >= this.STATE_CPU_SELECT) {
                const cr = this.getIconRect(this.cpuIndex);
                Assets.drawFrame(ctx, SelectConfig.ICON_ROW.cursorPath,
                    cr.x + (cr.w - cursorW) / 2, cr.y + (cr.h - cursorH) / 2, 1, cursorW, cursorH);
            }
        }
    },

    // 마유는 hiddenSlotY 중앙 단독 슬롯, 나머지는 행 중앙 정렬
    getIconRect: function (index) {
        const firstIcon = Assets.get(this.characters[0].selectIcon);
        const iconW = firstIcon ? firstIcon.width : 40;
        const iconH = firstIcon ? firstIcon.height : 40;
        const gap = SelectConfig.ICON_ROW.gap;
        const char = this.characters[index];

        if (char && char.hidden) {
            // 마유 전용 아이콘은 크기가 다를 수 있으므로 별도 측정
            const ownIcon = Assets.get(char.selectIcon);
            const w = ownIcon ? ownIcon.width : iconW;
            const h = ownIcon ? ownIcon.height : iconH;
            return { x: Math.round((640 - w) / 2), y: SelectConfig.ICON_ROW.hiddenSlotY, w, h };
        }

        const rowChars = this.characters.filter(c => !c.hidden);
        const rowIndex = rowChars.indexOf(char);
        const totalW = (iconW * rowChars.length) + (gap * (rowChars.length - 1));
        const startX = (640 - totalW) / 2;
        return { x: Math.round(startX + rowIndex * (iconW + gap)), y: SelectConfig.ICON_ROW.y, w: iconW, h: iconH };
    },

    getHoveredCharacterIndex: function () {
        if (!Assets.get(this.characters[0].selectIcon)) return -1;

        const mx = Input.mouseX;
        const my = Input.mouseY;
        for (let i = 0; i < this.characters.length; i++) {
            const r = this.getIconRect(i);
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                return i;
            }
        }
        return -1;
    },

    startWatchMode: function () {
        const queue = [];
        for (let i = 0; i < this.characters.length; i++) {
            if (i !== this.playerIndex) {
                queue.push(i);
            }
        }

        // WATCH 모드: 라이벌을 큐 맨 끝으로 이동
        const myChar = this.characters[this.playerIndex];
        const rivalId = myChar.rival;
        const rivalIndex = this.characters.findIndex(c => c.id === rivalId);

        if (rivalIndex !== -1) {
            const idxInQueue = queue.indexOf(rivalIndex);
            if (idxInQueue !== -1) {
                queue.splice(idxInQueue, 1);
                queue.push(rivalIndex);
            }
        }

        if (queue.length > 0) {
            const firstCpu = queue.shift();
            Game.changeScene(EncounterScene, {
                playerIndex: this.playerIndex,
                cpuIndex: firstCpu,
                mode: 'WATCH',
                queue: queue
            });
        }
    }
};
