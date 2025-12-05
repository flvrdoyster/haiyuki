// Scene Configuration
const SelectConfig = {
    BACKGROUND: { path: 'bg/CHRBAK.png' },
    TITLE: { path: 'face/CHRSELE.png', y: 20 },
    VS_LOGO: { path: 'VS.png', y: 200 },
    PORTRAIT: {
        w: 280, h: 304,
        P1: { x: 20, y: 65 },
        CPU: { x: 340, y: 65 }
    },
    NAME: {
        yOffset: 280, // from portrait Y top
        font: 'bold 32px "KoddiUDOnGothic-Bold", sans-serif',
        strokeWidth: 4,
        xPadding: 20
    },
    ICON_ROW: {
        y: 380,
        gap: 14,
        dimOpacity: 0.5,
        cursorPath: 'face/CHRSELEF_cursor.png'
    }
};

const CharacterSelectScene = {
    // States
    STATE_PLAYER_SELECT: 0,
    STATE_CPU_SELECT: 1,
    STATE_READY: 2,

    currentState: 0,

    // Character Data
    // We assume frames are horizontal strips in CHRSELEF_face.png
    // Character Data
    // Loaded from js/data/characterData.js
    // Filter out hidden characters if needed, or handle them in UI
    characters: CharacterData.filter(c => !c.hidden),


    playerIndex: 0,
    cpuIndex: 0,

    // Timer for CPU roulette
    cpuTimer: 0,
    cpuSelectDuration: 60, // frames to spin

    // Debug: Manually select CPU
    isDebug: false, // Set to true to enable manual CPU selection
    debugSkipDialogue: false, // Skip EncounterScene if true

    init: function (data) {
        this.currentState = this.STATE_PLAYER_SELECT;
        this.playerIndex = 0;
        this.cpuIndex = 0; // Initialize to 0 to avoid draw crash
        this.timer = 0;
        this.cpuTimer = 0; // Ensure timer is reset
        this.readyTimer = 0;

        // Tournament Data
        this.mode = data && data.mode ? data.mode : 'NEW_GAME';
        this.defeatedOpponents = data && data.defeatedOpponents ? data.defeatedOpponents : [];

        if (this.mode === 'NEXT_MATCH') {
            this.playerIndex = data.playerIndex;
            this.currentState = this.STATE_CPU_SELECT; // Skip player select

            // Auto-select CPU
            this.selectNextOpponent();
        }
    },

    selectNextOpponent: function () {
        // Filter available opponents
        const available = [];
        for (let i = 0; i < CharacterData.length; i++) {
            if (i !== this.playerIndex && !this.defeatedOpponents.includes(i)) {
                available.push(i);
            }
        }

        if (available.length > 0) {
            // Randomly pick one
            const rand = Math.floor(Math.random() * available.length);
            this.cpuIndex = available[rand];
            console.log(`Auto-selected CPU: ${this.cpuIndex}`);

            // Transition to Encounter
            Game.changeScene(EncounterScene, {
                playerIndex: this.playerIndex,
                cpuIndex: this.cpuIndex,
                defeatedOpponents: this.defeatedOpponents
            });
        } else {
            // No opponents left -> Tournament Win?
            console.log("All opponents defeated! Tournament Win!");
            // For now, return to title or show credits
            Game.changeScene(TitleScene);
        }
    },

    update: function () {
        if (this.currentState === this.STATE_PLAYER_SELECT) {
            // Player Selection
            if (Input.isJustPressed(Input.LEFT)) {
                this.playerIndex--;
                if (this.playerIndex < 0) this.playerIndex = this.characters.length - 1;
            } else if (Input.isJustPressed(Input.RIGHT)) {
                this.playerIndex++;
                if (this.playerIndex >= this.characters.length) this.playerIndex = 0;
            }

            if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isJustPressed(Input.SPACE)) {
                // Confirm Player
                // Play sound
                this.currentState = this.STATE_CPU_SELECT;
                this.cpuTimer = 0;
            }

            // Mouse Input
            if (Input.isMouseJustPressed()) {
                const clickedIndex = this.getClickedCharacterIndex();
                if (clickedIndex !== -1) {
                    this.playerIndex = clickedIndex;
                    // Auto-confirm on click? Or just select?
                    // User said "Select with mouse click". Usually implies selection + confirm or just selection.
                    // Let's do Select + Confirm for smoother UX, or just Select.
                    // "Click to select" -> usually means "Choose this one".
                    // Let's just update index. If they click again (or double click?), confirm?
                    // For now, let's just update index. User can press Space/Enter or click a "Confirm" button (which doesn't exist).
                    // Actually, standard web behavior: Click updates selection.
                    // But wait, if there's no "OK" button, how do they confirm with mouse?
                    // Maybe clicking the *currently selected* one confirms it?
                    // Or just confirm immediately?
                    // Let's try: Click updates index. If already selected, confirm.

                    if (this.playerIndex === clickedIndex) {
                        this.currentState = this.STATE_CPU_SELECT;
                        this.cpuTimer = 0;
                    }
                }
            }
        } else if (this.currentState === this.STATE_CPU_SELECT) {

            if (this.isDebug) {
                // Manual CPU Selection
                if (Input.isJustPressed(Input.LEFT)) {
                    this.cpuIndex--;
                    if (this.cpuIndex < 0) this.cpuIndex = this.characters.length - 1;
                } else if (Input.isJustPressed(Input.RIGHT)) {
                    this.cpuIndex++;
                    if (this.cpuIndex >= this.characters.length) this.cpuIndex = 0;
                }

                if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isJustPressed(Input.SPACE)) {
                    // Confirm CPU
                    this.currentState = this.STATE_READY;
                    this.readyTimer = 0;
                    console.log(`Ready (Manual): P1(${this.characters[this.playerIndex].name}) vs CPU(${this.characters[this.cpuIndex].name})`);
                }

                // Mouse Input (Debug Manual)
                if (Input.isMouseJustPressed()) {
                    const clickedIndex = this.getClickedCharacterIndex();
                    if (clickedIndex !== -1) {
                        this.cpuIndex = clickedIndex;
                        // Confirm if clicked again?
                        if (this.cpuIndex === clickedIndex) {
                            this.currentState = this.STATE_READY;
                            this.readyTimer = 0;
                            console.log(`Ready (Manual): P1(${this.characters[this.playerIndex].name}) vs CPU(${this.characters[this.cpuIndex].name})`);
                        }
                    }
                }

                // Mouse Input (Debug Manual)
                if (Input.isMouseJustPressed()) {
                    const clickedIndex = this.getClickedCharacterIndex();
                    if (clickedIndex !== -1) {
                        this.cpuIndex = clickedIndex;
                        // Confirm if clicked again?
                        if (this.cpuIndex === clickedIndex) {
                            this.currentState = this.STATE_READY;
                            this.readyTimer = 0;
                            console.log(`Ready (Manual): P1(${this.characters[this.playerIndex].name}) vs CPU(${this.characters[this.cpuIndex].name})`);
                        }
                    }
                }

            } else {
                // Original Roulette Logic
                this.cpuTimer++;

                // Spin effect: change index every few frames
                if (this.cpuTimer % 5 === 0) {
                    let nextIndex = Math.floor(Math.random() * this.characters.length);
                    // Simple retry to avoid player index
                    while (nextIndex === this.playerIndex) {
                        nextIndex = Math.floor(Math.random() * this.characters.length);
                    }
                    this.cpuIndex = nextIndex;
                }

                if (this.cpuTimer > this.cpuSelectDuration) {
                    // Ensure final selection is valid
                    if (this.cpuIndex === this.playerIndex) {
                        this.cpuIndex = (this.playerIndex + 1) % this.characters.length;
                    }
                    this.currentState = this.STATE_READY;
                    this.readyTimer = 0;
                    console.log(`Ready: P1(${this.characters[this.playerIndex].name}) vs CPU(${this.characters[this.cpuIndex].name})`);
                }
            }
        } else if (this.currentState === this.STATE_READY) {
            // Auto transition after a short delay
            this.readyTimer++;
            if (this.readyTimer > 60) {
                if (this.debugSkipDialogue) {
                    Game.changeScene(BattleScene, {
                        playerIndex: this.playerIndex,
                        cpuIndex: this.cpuIndex
                    });
                } else {
                    Game.changeScene(EncounterScene, {
                        playerIndex: this.playerIndex,
                        cpuIndex: this.cpuIndex
                    });
                }
            }
        }
    },

    draw: function (ctx) {
        // 1. Background
        const bg = Assets.get(SelectConfig.BACKGROUND.path);
        if (bg) {
            const pattern = ctx.createPattern(bg, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, 640, 480);
        }

        // 2. Title "CHARACTER SELECT"
        const title = Assets.get(SelectConfig.TITLE.path);
        if (title) {
            ctx.drawImage(title, (640 - title.width) / 2, SelectConfig.TITLE.y);
        }

        // 3. VS Logo
        const vs = Assets.get(SelectConfig.VS_LOGO.path);
        if (vs) {
            ctx.drawImage(vs, (640 - vs.width) / 2, SelectConfig.VS_LOGO.y);
        }

        // 4. Big Portrait (Left - Player 1)
        const charData = this.characters[this.playerIndex];
        const faceX = SelectConfig.PORTRAIT.P1.x;
        const faceY = SelectConfig.PORTRAIT.P1.y;

        // Draw frame 0 (Left facing)
        Assets.drawFrame(ctx, charData.face, faceX, faceY, 0, SelectConfig.PORTRAIT.w, SelectConfig.PORTRAIT.h);

        // 5. Name (Text)
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = SelectConfig.NAME.strokeWidth;
        ctx.font = SelectConfig.NAME.font;

        // Draw Player Name
        ctx.textAlign = 'left';
        // Use displayName from data
        const pNameText = charData.name;

        const pNameX = faceX + SelectConfig.NAME.xPadding;
        const pNameY = faceY + SelectConfig.NAME.yOffset;
        ctx.strokeText(pNameText, pNameX, pNameY);
        ctx.fillText(pNameText, pNameX, pNameY);

        // Draw CPU Portrait & Name (Mirroring Player)
        if (this.currentState >= this.STATE_CPU_SELECT) {
            const cpuCharData = this.characters[this.cpuIndex];
            const cpuFaceX = SelectConfig.PORTRAIT.CPU.x;
            const cpuFaceY = SelectConfig.PORTRAIT.CPU.y;

            // Draw frame 1 (Right facing)
            Assets.drawFrame(ctx, cpuCharData.face, cpuFaceX, cpuFaceY, 1, SelectConfig.PORTRAIT.w, SelectConfig.PORTRAIT.h);

            // CPU Name (Right Aligned)
            ctx.textAlign = 'right';
            const cpuNameText = cpuCharData.name;
            const cpuNameX = cpuFaceX + SelectConfig.PORTRAIT.w - SelectConfig.NAME.xPadding;
            const cpuNameY = cpuFaceY + SelectConfig.NAME.yOffset;

            ctx.strokeText(cpuNameText, cpuNameX, cpuNameY);
            ctx.fillText(cpuNameText, cpuNameX, cpuNameY);
        }

        ctx.restore();

        // 6. Draw Icon Row (Using Individual Icons)
        const iconY = SelectConfig.ICON_ROW.y;
        const gap = SelectConfig.ICON_ROW.gap;

        // Calculate total width
        // Assume all icons have same width? Or check first one?
        // Let's assume standard width from first char
        const firstIcon = Assets.get(this.characters[0].selectIcon);
        const iconW = firstIcon ? firstIcon.width : 40; // Fallback
        const iconH = firstIcon ? firstIcon.height : 40;

        const totalW = (iconW * this.characters.length) + (gap * (this.characters.length - 1));
        const startX = (640 - totalW) / 2;

        this.characters.forEach((char, index) => {
            const x = startX + index * (iconW + gap);
            const y = iconY;

            // Dim if already selected by Player (during CPU phase/Ready)
            const isPlayerSelected = (this.currentState >= this.STATE_CPU_SELECT && index === this.playerIndex);

            ctx.save();
            if (isPlayerSelected) {
                ctx.globalAlpha = SelectConfig.ICON_ROW.dimOpacity;
            }

            // Draw Icon
            const iconImg = Assets.get(char.selectIcon);
            if (iconImg) {
                ctx.drawImage(iconImg, x, y);
            }

            ctx.restore();
        });

        // 7. Draw Cursors
        const cursorImg = Assets.get(SelectConfig.ICON_ROW.cursorPath);
        if (cursorImg) {
            const cursorW = cursorImg.width / 2; // contains 2 frames
            const cursorH = cursorImg.height;

            // Player Cursor (Green) - Frame 0
            const pX = startX + this.playerIndex * (iconW + gap);
            const pY = iconY;
            const cX = pX + (iconW - cursorW) / 2;
            const cY = pY + (iconH - cursorH) / 2;

            Assets.drawFrame(ctx, SelectConfig.ICON_ROW.cursorPath, cX, cY, 0, cursorW, cursorH);

            // CPU Cursor (Red) - Frame 1
            if (this.currentState >= this.STATE_CPU_SELECT) {
                const cpuX = startX + this.cpuIndex * (iconW + gap);
                const cpuCX = cpuX + (iconW - cursorW) / 2;
                Assets.drawFrame(ctx, SelectConfig.ICON_ROW.cursorPath, cpuCX, cY, 1, cursorW, cursorH);
            }
        }
    },

    getClickedCharacterIndex: function () {
        const firstIcon = Assets.get(this.characters[0].selectIcon);
        if (!firstIcon) return -1;

        const iconW = firstIcon.width;
        const iconH = firstIcon.height;
        const gap = SelectConfig.ICON_ROW.gap;
        const totalW = (iconW * this.characters.length) + (gap * (this.characters.length - 1));
        const startX = (640 - totalW) / 2;
        const startY = SelectConfig.ICON_ROW.y;

        const mx = Input.mouseX;
        const my = Input.mouseY;

        // Check bounds
        if (my >= startY && my <= startY + iconH) {
            for (let i = 0; i < this.characters.length; i++) {
                const x = startX + i * (iconW + gap);
                if (mx >= x && mx <= x + iconW) {
                    return i;
                }
            }
        }
        return -1;
    }
};
