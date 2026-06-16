// UI Layout Configuration
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
        marginBottom: 10,  // Distance from bottom of screen
        tailXOffset: 80,   // Distance of tail from left/right edge of bubble
        tailYOffset: 0,    // Vertical offset for tail (0 = flush)
        text: {
            font: `22px ${FONTS.regular}, sans-serif`,
            lineHeight: 28,
            xPadding: 40,
            baselineCorrection: 12 // Fine tune vertical centering
        }
    }
};

// Hidden-boss intrusion monologue: tiled MAYUBAK background + the masked Mayu
// silhouette drawn centered (no name/VS — the "HERE COMES" text is flashed over
// the ending illustration in EndingScene; the "???" name shows in battle).
const ChallengerConfig = {
    UNKNOWN: {
        BG: 'bg/MAYUBAK.png',
        SILHOUETTE: 'face/MAYU_unknown.png',  // 280×256
        scale: 1.0,
        y: 80                                 // fills MAYUBAK's dark band, above the dialogue box
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

    characters: CharacterData, // Use full list to support Hidden/Boss characters (e.g. Mayu)

    init: function (data) {
        this.playerIndex = data.playerIndex;
        this.cpuIndex = data.cpuIndex;
        this.textTimer = 0;

        this.defeatedOpponents = data.defeatedOpponents || [];
        this.mode = data.mode || 'STORY';
        this.queue = data.queue || [];
        this.state = 0;

        // CHALLENGER uses the normal dialogue flow (state 0): the masked Mayu
        // delivers her monologue, then advances to battle. The "HERE COMES A NEW
        // CHALLENGER" flash happens earlier, over the ending illustration.
        this.state = 0;

        this.currentLineIndex = 0;

        // BGM - Ensure previous music is stopped before starting new track

        Assets.stopAll();

        if (this.mode === 'ENDING' || this.mode === 'ENDING_WATCH' || this.mode === 'TRUE_ENDING') {
            // 진엔딩 정체 공개 마무리(TRUE_ENDING)도 엔딩과 같은 BGM.
            Assets.playMusic('audio/bgm_ending');
        } else if (this.mode !== 'CHALLENGER') {
            Assets.playMusic('audio/bgm_trail');
        }
        // CHALLENGER(눈썹개 난입)는 무음 — stopAll로 직전 음악만 끄고 새 BGM은 안 깐다.

        // Load Dialogue
        let p1 = this.characters[this.playerIndex];
        let cpu = this.characters[this.cpuIndex];

        // Safeguard for undefined characters (prevents Ending Crash)
        if (!p1) {
            console.error(`P1 undefined (Index: ${this.playerIndex}). Fallback to 0.`);
            this.playerIndex = 0;
            p1 = this.characters[0];
        }
        if (!cpu) {
            console.error(`CPU undefined (Index: ${this.cpuIndex}). Fallback to valid opponent.`);
            // Pick anyone who isn't P1
            this.cpuIndex = (this.playerIndex === 0) ? 1 : 0;
            cpu = this.characters[this.cpuIndex];
        }

        let key = `${p1.id}_${cpu.id}`;

        if (this.mode === 'ENDING' || this.mode === 'ENDING_WATCH') {
            key += "_ending";
        } else if (this.mode === 'TRUE_ENDING') {
            // Use True Ending Dialogue (Post-Battle)
            key += "_true_ending";
        }

        if (!DialogueData[key]) {
            // Try reverse key
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

        // Initialize Portraits
        // Challenger Mode override for CPU Portrait
        if (this.mode === 'CHALLENGER') {
            // P1 Normal
            this.p1Portrait = new PortraitCharacter(p1, EncounterLayout.PORTRAIT.P1, false);

            // CPU Unknown
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

        // MANUAL OVERRIDE (Safety fallback for Yuri if auto-detect fails due to timing/naming)
        if (p1.id === 'yuri' || cpu.id === 'yuri') {
            const yuriPortrait = (p1.id === 'yuri') ? this.p1Portrait : this.cpuPortrait;
            // Only re-apply if auto-detect missed talk assets
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

        // Update Portraits
        if (this.p1Portrait) this.p1Portrait.update(dt);
        if (this.cpuPortrait) this.cpuPortrait.update(dt);

        // Simple input to advance text OR Auto Test
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
                        // End of watch list
                        // Trigger Rival Ending Dialogue
                        // Rival is the LAST one we just watched (this.cpuIndex).
                        Game.changeScene(EncounterScene, {
                            playerIndex: this.playerIndex,
                            cpuIndex: this.cpuIndex,
                            mode: 'ENDING_WATCH',
                            defeatedOpponents: []
                        });
                    }
                } else if (this.mode === 'TRUE_ENDING') {
                    // True Ending Clear -> Credits
                    Game.changeScene(CreditsScene);
                } else if (this.mode === 'ENDING' || this.mode === 'ENDING_WATCH') {
                    // Ending Dialogue Finished -> Go to Ending Image
                    Game.changeScene(EndingScene, {
                        playerIndex: this.playerIndex,
                        cpuIndex: this.cpuIndex, // Pass CPU Index for checks
                        skipTrueEnd: (this.mode === 'ENDING_WATCH')
                    });
                } else {
                    // Story/Normal Mode: Go to Battle
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

        // Tiled Background (cached pattern — don't allocate a new one each frame)
        const bg = Assets.get('bg/CHRBAK.png');
        if (bg) {
            ctx.fillStyle = Assets.getPattern(ctx, bg, 'repeat');
            ctx.fillRect(0, 0, 640, 480);
        }

        // Portraits & Highlighting
        const currentLine = this.dialogueSequence[this.currentLineIndex] || {};

        const p1Char = this.characters[this.playerIndex];
        const cpuChar = this.characters[this.cpuIndex];

        // Speaker Logic (ID based)
        let speakerSide = 'none';

        if (currentLine.speaker === p1Char.id || currentLine.speaker === 'p1') {
            speakerSide = 'p1';
        } else if (currentLine.speaker === cpuChar.id || currentLine.speaker === 'cpu') {
            speakerSide = 'cpu';
        }

        // -- STATE MANAGEMENT --
        // Defaults
        let p1State = 'idle';
        let cpuState = 'idle';
        let p1Talking = (speakerSide === 'p1');
        let cpuTalking = (speakerSide === 'cpu');

        // Logic for Speaker/Listener State
        // This allows symmetric dialogues (e.g. data can say "listenerState: shocked")
        // and it will apply to whoever is NOT speaking.
        if (speakerSide !== 'none') {
            const isP1Speaker = (speakerSide === 'p1');

            // Apply 'speakerState' if present
            if (currentLine.speakerState) {
                if (isP1Speaker) p1State = currentLine.speakerState;
                else cpuState = currentLine.speakerState;
            }

            // Apply 'listenerState' if present
            if (currentLine.listenerState) {
                if (isP1Speaker) cpuState = currentLine.listenerState;
                else p1State = currentLine.listenerState;
            }
        }

        // Fallback for legacy specific overrides if they exist (optional, but good for safety)
        if (currentLine.p1State) p1State = currentLine.p1State;
        if (currentLine.cpuState) cpuState = currentLine.cpuState;

        // Apply to Portraits
        if (this.p1Portrait) {
            this.p1Portrait.setState(p1State);
            this.p1Portrait.setTalking(p1Talking);
        }
        if (this.cpuPortrait) {
            this.cpuPortrait.setState(cpuState);
            this.cpuPortrait.setTalking(cpuTalking);
        }
        // ----------------------

        // P1 Left
        if (this.p1Portrait) {
            this.p1Portrait.draw(ctx);
        }

        // CPU Right
        if (this.cpuPortrait) {
            this.cpuPortrait.draw(ctx);
        }

        ctx.globalAlpha = 1.0; // Reset

        // VS Logo — only for pre-battle matchups (STORY/WATCH). Hidden in every
        // dialogue/ending mode, including the true-ending reveal where Mayu's identity
        // is shown and the two just talk (no matchup).
        const isDialogueMode = this.mode === 'ENDING' || this.mode === 'ENDING_WATCH' ||
            this.mode === 'TRUE_ENDING';
        if (!isDialogueMode) {
            const vs = Assets.get('ui/vs.png');
            if (vs) {
                ctx.drawImage(vs, (EncounterLayout.VS_LOGO.widthConstraint - vs.width) / 2, EncounterLayout.VS_LOGO.y);
            }
        }

        // Names
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.lineWidth = EncounterLayout.NAME.strokeWidth;
        ctx.font = EncounterLayout.NAME.font;

        // P1 Name
        ctx.textAlign = 'left';
        const p1Name = p1Char.name;
        const nameY = EncounterLayout.NAME.y; // Moved up from 380
        ctx.strokeText(p1Name, EncounterLayout.NAME.xPadding, nameY);
        ctx.fillStyle = (speakerSide === 'p1') ? 'rgba(170, 170, 255, 1)' : 'rgba(136, 136, 136, 1)'; // Highlight text color
        ctx.fillText(p1Name, EncounterLayout.NAME.xPadding, nameY);

        // CPU Name
        ctx.textAlign = 'right';
        const cpuName = cpuChar.name;
        const rightX = 640 - EncounterLayout.NAME.xPadding;
        ctx.strokeText(cpuName, rightX, nameY);
        ctx.fillStyle = (speakerSide === 'cpu') ? 'rgba(255, 136, 136, 1)' : 'rgba(136, 136, 136, 1)';
        ctx.fillText(cpuName, rightX, nameY);
        ctx.restore();


        // Dialogue Box & Text
        const box = Assets.get('ui/long_bubble.png');
        const tail = Assets.get('ui/long_bubble_tail.png');

        if (box && tail) {
            // Calculate scale to fit width if needed, preserving aspect ratio
            const maxWidth = 640;
            let scale = 1;
            if (box.width > maxWidth) {
                scale = maxWidth / box.width;
            }

            const drawWidth = box.width * scale;
            const drawHeight = box.height * scale;
            const boxX = (640 - drawWidth) / 2;
            const boxY = 480 - drawHeight - EncounterLayout.DIALOGUE.marginBottom; // Align to bottom with padding

            // Draw Box (Body) first, so Tail covers it
            ctx.drawImage(box, boxX, boxY, drawWidth, drawHeight);

            // Draw Tail
            if (speakerSide !== 'none') {
                // Tail position same as Bubble Body Top
                const tailY = boxY + EncounterLayout.DIALOGUE.tailYOffset;

                if (speakerSide === 'p1') {
                    // Tail to P1 (Left)
                    ctx.drawImage(tail, boxX + EncounterLayout.DIALOGUE.tailXOffset * scale, tailY);
                } else {
                    // Tail to CPU (Right)
                    ctx.save();
                    // Translate to the right side position
                    ctx.translate(boxX + drawWidth - EncounterLayout.DIALOGUE.tailXOffset * scale, tailY);
                    ctx.scale(-1, 1);
                    ctx.drawImage(tail, 0, 0);
                    ctx.restore();
                }
            }

            // Text
            ctx.save();
            ctx.font = EncounterLayout.DIALOGUE.text.font;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic'; // Reset baseline to ensure consistency
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';

            if (currentLine.text) {
                const text = currentLine.text;
                const lines = text.split('\n');
                const lineHeight = EncounterLayout.DIALOGUE.text.lineHeight; // Increased slightly for readability

                // Vertical Centering
                // Box content area is drawHeight.
                // We want to center the block of text within the box.

                const totalTextHeight = lines.length * lineHeight;
                const verticalCenter = boxY + (drawHeight / 2);
                let startY = verticalCenter - (totalTextHeight / 2) + (lineHeight * 0.7); // 0.7 to push down to baseline

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
            // console.log(`Auto-configuring animation for ${id} with base ${base}`);
            portrait.setAnimationConfig({ base: base });
        }
    },

    // Hidden-boss intrusion monologue (SS2): tiled MAYUBAK + masked Mayu
    // silhouette centered + the boss's {player}_mayu dialogue. No name/VS.
    drawChallengerMonologue: function (ctx) {
        const w = 640, h = 480;

        // Tiled background (cached pattern — don't allocate a new one each frame)
        const bg = Assets.get(ChallengerConfig.UNKNOWN.BG);
        if (bg) {
            ctx.fillStyle = Assets.getPattern(ctx, bg, 'repeat');
            ctx.fillRect(0, 0, w, h);
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            ctx.fillRect(0, 0, w, h);
        }

        // Masked silhouette, centered
        const sil = Assets.get(ChallengerConfig.UNKNOWN.SILHOUETTE);
        if (sil) {
            const s = ChallengerConfig.UNKNOWN.scale;
            const sw = sil.width * s, sh = sil.height * s;
            ctx.drawImage(sil, (w - sw) / 2, ChallengerConfig.UNKNOWN.y, sw, sh);
        }

        // Dialogue box + text (centered tail up to the silhouette)
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
