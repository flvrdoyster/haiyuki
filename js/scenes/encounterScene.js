const EncounterLayout = {
    PORTRAIT: {
        P1: { x: 0, y: 65, w: 280, h: 304, align: 'left' },
        CPU: { x: 640, y: 65, w: 280, h: 304, align: 'right' }
    },
    VS_LOGO: { y: 200, widthConstraint: 640 },
    NAME: {
        y: 390,
        xPadding: 20,
        font: `bold 30px ${FONTS.bold}, sans-serif`,
        strokeWidth: 4
    },
    DIALOGUE: {
        marginBottom: 10,
        tailXOffset: 80,
        tailYOffset: 0,
        text: {
            font: `22px ${FONTS.regular}, sans-serif`,
            lineHeight: 28,
            xPadding: 40,
            baselineCorrection: 12 // 세로 중앙 미세 보정
        }
    }
};

// CHALLENGER 모드: 이름/VS 없이 눈썹개 실루엣만 표시 (HERE COMES는 EndingScene에서 처리)
const ChallengerConfig = {
    UNKNOWN: {
        BG: 'bg/MAYUBAK.png',
        SILHOUETTE: 'face/MAYU_unknown.png',
        scale: 1.0,
        y: 80 // MAYUBAK 어두운 띠 안, 대화창 위
    }
};

const EncounterScene = {
    playerIndex: 0,
    cpuIndex: 0,
    p1Portrait: null,
    cpuPortrait: null,

    // Timer/State
    // 0: Init/Fade In
    // 1: Wait for input
    dialogueSequence: [],
    currentLineIndex: 0,
    textTimer: 0,

    characters: CharacterData, // 히든/보스 캐릭터 포함 전체 목록

    init: function (data) {
        this.playerIndex = data.playerIndex;
        this.cpuIndex = data.cpuIndex;
        this.textTimer = 0;

        this.defeatedOpponents = data.defeatedOpponents || [];
        this.mode = data.mode || 'STORY';
        this.queue = data.queue || [];
        this.state = 0;
        this.currentLineIndex = 0;

        Assets.stopAll();

        if (this.mode === 'ENDING' || this.mode === 'ENDING_WATCH' || this.mode === 'TRUE_ENDING') {
            Assets.playMusic('audio/bgm_ending'); // TRUE_ENDING도 같은 BGM
        } else if (this.mode !== 'CHALLENGER') {
            Assets.playMusic('audio/bgm_trail');
        }
        // CHALLENGER: stopAll로 직전 음악만 끄고 새 BGM 없음

        let p1 = this.characters[this.playerIndex];
        let cpu = this.characters[this.cpuIndex];

        // 엔딩 크래시 방지 폴백
        if (!p1) {
            console.error(`P1 undefined (Index: ${this.playerIndex}). Fallback to 0.`);
            this.playerIndex = 0;
            p1 = this.characters[0];
        }
        if (!cpu) {
            console.error(`CPU undefined (Index: ${this.cpuIndex}). Fallback to valid opponent.`);
            this.cpuIndex = (this.playerIndex === 0) ? 1 : 0;
            cpu = this.characters[this.cpuIndex];
        }

        let key = `${p1.id}_${cpu.id}`;

        if (this.mode === 'ENDING' || this.mode === 'ENDING_WATCH') {
            key += "_ending";
        } else if (this.mode === 'TRUE_ENDING') {
            key += "_true_ending";
        }

        if (!DialogueData[key]) {
            const reverseKey = `${cpu.id}_${p1.id}`;
            if (DialogueData[reverseKey]) {
                key = reverseKey;
            }
        }

        if (DialogueData[key]) {
            this.dialogueSequence = DialogueData[key];
        } else {
            this.dialogueSequence = DialogueData["default"];
        }

        // CHALLENGER 모드: CPU를 미지의 실루엣으로 대체
        if (this.mode === 'CHALLENGER') {
            this.p1Portrait = new PortraitCharacter(p1, EncounterLayout.PORTRAIT.P1, false);

            const cpuDataUnknown = {
                id: 'unknown',
                face: 'face/MAYU_unknown.png',
                battleFaceR: 'face/MAYU_unknown.png',
                singleSprite: true,
                battleOffsetX: 0,
                battleOffsetY: 0
            };
            this.cpuPortrait = new PortraitCharacter(cpuDataUnknown, EncounterLayout.PORTRAIT.CPU, true);

        } else {
            this.p1Portrait = new PortraitCharacter(p1, EncounterLayout.PORTRAIT.P1, false);
            this.cpuPortrait = new PortraitCharacter(cpu, EncounterLayout.PORTRAIT.CPU, true);
        }

        this.setupCharacterAnimation(this.p1Portrait, p1.id);
        if (this.mode !== 'CHALLENGER') {
            this.setupCharacterAnimation(this.cpuPortrait, cpu.id);
        }

        // 유리 talk 에셋 자동감지 실패 시 수동 폴백
        if (p1.id === 'yuri' || cpu.id === 'yuri') {
            const yuriPortrait = (p1.id === 'yuri') ? this.p1Portrait : this.cpuPortrait;
            if (!yuriPortrait.animConfig || !yuriPortrait.animConfig.talk) {
                yuriPortrait.setAnimationConfig({
                    base: 'face/YURI_base.png',
                    blink: ['face/YURI_blink-2.png', 'face/YURI_blink-1.png'],
                    talk: ['face/YURI_talk-1.png', 'face/YURI_talk-2.png'],
                    talkSequence: [0, 1],
                    shocked: 'face/YURI_shocked.png',
                    smile: 'face/YURI_smile.png'
                });
            }
        }
    },

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        this.textTimer += dt;

        if (this.p1Portrait) this.p1Portrait.update(dt);
        if (this.cpuPortrait) this.cpuPortrait.update(dt);

        // 입력으로 대사 진행, AutoTest는 타이머로 자동 진행
        if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed() || (Game.isAutoTest && this.textTimer > 2)) {

            if (Game.isAutoTest) this.textTimer = 0;

            this.currentLineIndex++;
            if (this.currentLineIndex >= this.dialogueSequence.length) {
                if (this.mode === 'WATCH') {
                    // Watch Mode: Go to next character in queue
                    if (this.queue.length > 0) {
                        const nextCpu = this.queue.shift();
                        Game.changeScene(EncounterScene, {
                            playerIndex: this.playerIndex,
                            cpuIndex: nextCpu,
                            mode: 'WATCH',
                            queue: this.queue
                        });
                    } else {
                        // 라이벌 = 마지막으로 관전한 상대(this.cpuIndex)
                        Game.changeScene(EncounterScene, {
                            playerIndex: this.playerIndex,
                            cpuIndex: this.cpuIndex,
                            mode: 'ENDING_WATCH',
                            defeatedOpponents: []
                        });
                    }
                } else if (this.mode === 'TRUE_ENDING') {
                    Game.fadeTo(() => Game.changeScene(CreditsScene));
                } else if (this.mode === 'ENDING' || this.mode === 'ENDING_WATCH') {
                    Game.changeScene(EndingScene, {
                        playerIndex: this.playerIndex,
                        cpuIndex: this.cpuIndex,
                        skipTrueEnd: (this.mode === 'ENDING_WATCH')
                    });
                } else {
                    Game.changeScene(BattleScene, {
                        playerIndex: this.playerIndex,
                        cpuIndex: this.cpuIndex,
                        defeatedOpponents: this.defeatedOpponents
                    });
                }
            }
        }
    },

    draw: function (ctx) {

        if (this.mode === 'CHALLENGER') {
            this.drawChallengerMonologue(ctx);
            return;
        }

        // 타일 배경: 매 프레임 패턴 객체를 새로 만들지 않고 캐시 사용
        const bg = Assets.get('bg/CHRBAK.png');
        if (bg) {
            ctx.fillStyle = Assets.getPattern(ctx, bg, 'repeat');
            ctx.fillRect(0, 0, 640, 480);
        }

        const currentLine = this.dialogueSequence[this.currentLineIndex] || {};
        const p1Char = this.characters[this.playerIndex];
        const cpuChar = this.characters[this.cpuIndex];

        let speakerSide = 'none';

        if (currentLine.speaker === p1Char.id || currentLine.speaker === 'p1') {
            speakerSide = 'p1';
        } else if (currentLine.speaker === cpuChar.id || currentLine.speaker === 'cpu') {
            speakerSide = 'cpu';
        }

        let p1State = 'idle';
        let cpuState = 'idle';
        let p1Talking = (speakerSide === 'p1');
        let cpuTalking = (speakerSide === 'cpu');

        // speakerState/listenerState로 말하는 쪽·듣는 쪽을 대칭 지정 가능
        if (speakerSide !== 'none') {
            const isP1Speaker = (speakerSide === 'p1');

            if (currentLine.speakerState) {
                if (isP1Speaker) p1State = currentLine.speakerState;
                else cpuState = currentLine.speakerState;
            }
            if (currentLine.listenerState) {
                if (isP1Speaker) cpuState = currentLine.listenerState;
                else p1State = currentLine.listenerState;
            }
        }

        // 레거시 개별 override 호환
        if (currentLine.p1State) p1State = currentLine.p1State;
        if (currentLine.cpuState) cpuState = currentLine.cpuState;

        if (this.p1Portrait) {
            this.p1Portrait.setState(p1State);
            this.p1Portrait.setTalking(p1Talking);
        }
        if (this.cpuPortrait) {
            this.cpuPortrait.setState(cpuState);
            this.cpuPortrait.setTalking(cpuTalking);
        }

        if (this.p1Portrait) {
            this.p1Portrait.draw(ctx);
        }
        if (this.cpuPortrait) {
            this.cpuPortrait.draw(ctx);
        }

        ctx.globalAlpha = 1.0;

        // VS 로고: 대전 전(STORY/WATCH)에만 표시. 엔딩/진엔딩 대화 모드에서는 숨김
        const isDialogueMode = this.mode === 'ENDING' || this.mode === 'ENDING_WATCH' ||
            this.mode === 'TRUE_ENDING';
        if (!isDialogueMode) {
            const vs = Assets.get('ui/vs.png');
            if (vs) {
                ctx.drawImage(vs, (EncounterLayout.VS_LOGO.widthConstraint - vs.width) / 2, EncounterLayout.VS_LOGO.y);
            }
        }

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.lineWidth = EncounterLayout.NAME.strokeWidth;
        ctx.font = EncounterLayout.NAME.font;

        ctx.textAlign = 'left';
        const p1Name = p1Char.name;
        const nameY = EncounterLayout.NAME.y;
        ctx.strokeText(p1Name, EncounterLayout.NAME.xPadding, nameY);
        ctx.fillStyle = (speakerSide === 'p1') ? 'rgba(170, 170, 255, 1)' : 'rgba(136, 136, 136, 1)';
        ctx.fillText(p1Name, EncounterLayout.NAME.xPadding, nameY);

        ctx.textAlign = 'right';
        const cpuName = cpuChar.name;
        const rightX = 640 - EncounterLayout.NAME.xPadding;
        ctx.strokeText(cpuName, rightX, nameY);
        ctx.fillStyle = (speakerSide === 'cpu') ? 'rgba(255, 136, 136, 1)' : 'rgba(136, 136, 136, 1)';
        ctx.fillText(cpuName, rightX, nameY);
        ctx.restore();


        const box = Assets.get('ui/long_bubble.png');
        const tail = Assets.get('ui/long_bubble_tail.png');

        if (box && tail) {
            const maxWidth = 640;
            let scale = 1;
            if (box.width > maxWidth) {
                scale = maxWidth / box.width;
            }

            const drawWidth = box.width * scale;
            const drawHeight = box.height * scale;
            const boxX = (640 - drawWidth) / 2;
            const boxY = 480 - drawHeight - EncounterLayout.DIALOGUE.marginBottom;

            ctx.drawImage(box, boxX, boxY, drawWidth, drawHeight);

            if (speakerSide !== 'none') {
                const tailY = boxY + EncounterLayout.DIALOGUE.tailYOffset;
                if (speakerSide === 'p1') {
                    ctx.drawImage(tail, boxX + EncounterLayout.DIALOGUE.tailXOffset * scale, tailY);
                } else {
                    ctx.save();
                    ctx.translate(boxX + drawWidth - EncounterLayout.DIALOGUE.tailXOffset * scale, tailY);
                    ctx.scale(-1, 1);
                    ctx.drawImage(tail, 0, 0);
                    ctx.restore();
                }
            }

            ctx.save();
            ctx.font = EncounterLayout.DIALOGUE.text.font;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';

            if (currentLine.text) {
                const text = currentLine.text;
                const lines = text.split('\n');
                const lineHeight = EncounterLayout.DIALOGUE.text.lineHeight;
                const totalTextHeight = lines.length * lineHeight;
                const verticalCenter = boxY + (drawHeight / 2);
                // 0.7: baseline 기준으로 아래 밀기
                let startY = verticalCenter - (totalTextHeight / 2) + (lineHeight * 0.7);
                startY += EncounterLayout.DIALOGUE.text.baselineCorrection;

                lines.forEach((line, i) => {
                    ctx.fillText(line, boxX + EncounterLayout.DIALOGUE.text.xPadding, startY + i * lineHeight);
                });
            }
            ctx.restore();
        }
    },

    setupCharacterAnimation: function (portrait, id) {
        const idMap = {
            'ataho': 'ATA',
            'rinxiang': 'RIN',
            'smash': 'SMSH',
            'petum': 'PET',
            'fari': 'FARI',
            'yuri': 'YURI',
            'mayu': 'MAYU'
        };
        const prefix = idMap[id] || id.toUpperCase();
        const base = `face/${prefix}_base.png`;
        if (Assets.get(base)) {
                portrait.setAnimationConfig({ base: base });
        }
    },

    drawChallengerMonologue: function (ctx) {
        const w = 640, h = 480;

        const bg = Assets.get(ChallengerConfig.UNKNOWN.BG);
        if (bg) {
            ctx.fillStyle = Assets.getPattern(ctx, bg, 'repeat');
            ctx.fillRect(0, 0, w, h);
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            ctx.fillRect(0, 0, w, h);
        }

        const sil = Assets.get(ChallengerConfig.UNKNOWN.SILHOUETTE);
        if (sil) {
            const s = ChallengerConfig.UNKNOWN.scale;
            const sw = sil.width * s, sh = sil.height * s;
            ctx.drawImage(sil, (w - sw) / 2, ChallengerConfig.UNKNOWN.y, sw, sh);
        }

        const currentLine = this.dialogueSequence[this.currentLineIndex] || {};
        const box = Assets.get('ui/long_bubble.png');
        const tail = Assets.get('ui/long_bubble_tail.png');
        if (box) {
            const scale = box.width > w ? w / box.width : 1;
            const dw = box.width * scale, dh = box.height * scale;
            const bx = (w - dw) / 2;
            const by = h - dh - EncounterLayout.DIALOGUE.marginBottom;
            ctx.drawImage(box, bx, by, dw, dh);
            if (tail) ctx.drawImage(tail, bx + dw / 2 - tail.width / 2, by + EncounterLayout.DIALOGUE.tailYOffset);

            if (currentLine.text) {
                ctx.save();
                ctx.font = EncounterLayout.DIALOGUE.text.font;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillStyle = 'rgba(255, 255, 255, 1)';
                const lines = currentLine.text.split('\n');
                const lh = EncounterLayout.DIALOGUE.text.lineHeight;
                let sy = by + dh / 2 - (lines.length * lh) / 2 + lh * 0.7 + EncounterLayout.DIALOGUE.text.baselineCorrection;
                lines.forEach((line, i) => ctx.fillText(line, bx + EncounterLayout.DIALOGUE.text.xPadding, sy + i * lh));
                ctx.restore();
            }
        }
    }
};
