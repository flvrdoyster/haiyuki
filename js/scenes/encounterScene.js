// UI Layout Configuration
const EncounterLayout = {
    PORTRAIT: {
        P1: { x: 0, y: 65, w: 280, h: 304 },
        CPU: { x: 360, y: 65, w: 280, h: 304 }
    },
    VS_LOGO: { y: 200, widthConstraint: 640 },
    NAME: {
        y: 390,
        xPadding: 20,
        font: 'bold 30px "KoddiUDOnGothic-Bold", sans-serif',
        strokeWidth: 4
    },
    DIALOGUE: {
        marginBottom: 10,  // Distance from bottom of screen
        tailXOffset: 80,   // Distance of tail from left/right edge of bubble
        tailYOffset: 0,    // Vertical offset for tail (0 = flush)
        text: {
            font: '22px "KoddiUDOnGothic-Regular", sans-serif',
            lineHeight: 28,
            xPadding: 40,
            baselineCorrection: 10 // Fine tune vertical centering
        }
    }
};

const EncounterScene = {
    playerIndex: 0,
    cpuIndex: 0,

    // Timer/State
    // 0: Init/Fade In
    // 1: Wait for input
    dialogueSequence: [],
    currentLineIndex: 0,
    textTimer: 0,

    characters: CharacterData.filter(c => !c.hidden),

    init: function (data) {
        this.playerIndex = data.playerIndex;
        this.cpuIndex = data.cpuIndex;
        this.cpuIndex = data.cpuIndex;
        this.defeatedOpponents = data.defeatedOpponents || [];
        this.mode = data.mode || 'STORY';
        this.queue = data.queue || [];
        this.state = 0;
        this.currentLineIndex = 0;

        // Load Dialogue
        const p1 = this.characters[this.playerIndex];
        const cpu = this.characters[this.cpuIndex];
        let key = `${p1.id}_${cpu.id}`;

        if (this.mode === 'ENDING' || this.mode === 'ENDING_WATCH') {
            key += "_ending";
        }

        console.log(`Loading dialogue for: ${key}`);

        if (!DialogueData[key]) {
            // Try reverse key
            const reverseKey = `${cpu.id}_${p1.id}`;
            console.log(`Key not found, trying reverse: ${reverseKey}`);
            if (DialogueData[reverseKey]) {
                key = reverseKey;
            }
        }

        if (DialogueData[key]) {
            this.dialogueSequence = DialogueData[key];
        } else {
            this.dialogueSequence = DialogueData["default"];
        }
    },

    update: function () {
        // Simple input to advance text
        if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed()) {
            this.currentLineIndex++;
            if (this.currentLineIndex >= this.dialogueSequence.length) {
                console.log('Dialogue finished.');

                if (this.mode === 'WATCH') {
                    // Watch Mode: Go to next character in queue
                    if (this.queue.length > 0) {
                        const nextCpu = this.queue.shift();
                        console.log(`Next interaction: CPU(${nextCpu})`);
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
                        console.log("All conversations viewed. Triggering Ending Dialogue.");
                        Game.changeScene(EncounterScene, {
                            playerIndex: this.playerIndex,
                            cpuIndex: this.cpuIndex,
                            mode: 'ENDING_WATCH',
                            defeatedOpponents: []
                        });
                    }
                } else if (this.mode === 'ENDING' || this.mode === 'ENDING_WATCH') {
                    // Ending Dialogue Finished -> Go to Ending Image
                    console.log('Ending Dialogue finished. Go to Ending Scene.');
                    Game.changeScene(EndingScene, {
                        playerIndex: this.playerIndex,
                        skipTrueEnd: (this.mode === 'ENDING_WATCH')
                    });
                } else {
                    // Story/Normal Mode: Go to Battle
                    console.log('Go to battle');
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
        // 1. Tiled Background
        const bg = Assets.get('bg/CHRBAK.png');
        if (bg) {
            const pattern = ctx.createPattern(bg, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, 640, 480);
        }

        // 2. Portraits & Highlighting
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

        // P1 Left (Frame 0)
        Assets.drawFrame(ctx, p1Char.face, EncounterLayout.PORTRAIT.P1.x, EncounterLayout.PORTRAIT.P1.y, 0, EncounterLayout.PORTRAIT.P1.w, EncounterLayout.PORTRAIT.P1.h);

        // CPU Right (Frame 1)
        Assets.drawFrame(ctx, cpuChar.face, EncounterLayout.PORTRAIT.CPU.x, EncounterLayout.PORTRAIT.CPU.y, 1, EncounterLayout.PORTRAIT.CPU.w, EncounterLayout.PORTRAIT.CPU.h);

        ctx.globalAlpha = 1.0; // Reset

        // 3. VS Logo (Hide in Ending Mode)
        if (this.mode !== 'ENDING' && this.mode !== 'ENDING_WATCH') {
            const vs = Assets.get('ui/vs.png');
            if (vs) {
                ctx.drawImage(vs, (EncounterLayout.VS_LOGO.widthConstraint - vs.width) / 2, EncounterLayout.VS_LOGO.y);
            }
        }

        // 4. Names
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = EncounterLayout.NAME.strokeWidth;
        ctx.font = EncounterLayout.NAME.font;

        // P1 Name
        ctx.textAlign = 'left';
        const p1Name = p1Char.name;
        const nameY = EncounterLayout.NAME.y; // Moved up from 380
        ctx.strokeText(p1Name, EncounterLayout.NAME.xPadding, nameY);
        ctx.fillStyle = (speakerSide === 'p1') ? '#AAAAFF' : '#888888'; // Highlight text color
        ctx.fillText(p1Name, EncounterLayout.NAME.xPadding, nameY);

        // CPU Name
        ctx.textAlign = 'right';
        const cpuName = cpuChar.name;
        const rightX = 640 - EncounterLayout.NAME.xPadding;
        ctx.strokeText(cpuName, rightX, nameY);
        ctx.fillStyle = (speakerSide === 'cpu') ? '#FF8888' : '#888888';
        ctx.fillText(cpuName, rightX, nameY);
        ctx.restore();


        // 5. Dialogue Box & Text
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

            // 6. Text
            ctx.save();
            ctx.font = EncounterLayout.DIALOGUE.text.font;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#FFFFFF';

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
    }
};
