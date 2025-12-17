
// Scene Configuration
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
        yOffset: 280, // from portrait Y top
        font: `bold 32px ${FONTS.bold}, sans-serif`,
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
    // Loaded dynamically in init to support unlocking
    characters: [],

    playerIndex: 0,
    cpuIndex: 0,
    p1Portrait: null,
    cpuPortrait: null,

    // Timer for CPU roulette
    cpuTimer: 0,
    cpuSelectDuration: 60, // frames to spin

    // Debug: Manually select CPU
    isDebug: false, // Set to true to enable manual CPU selection
    debugSkipDialogue: false, // Skip EncounterScene if true

    init: function (data) {
        // Refresh character list (Check for unlocks)
        this.characters = CharacterData.filter(c => {
            if (!c.hidden) return true;
            if (Game.saveData && Game.saveData.unlocked.includes(c.id)) return true;
            return false;
        });

        this.currentState = this.STATE_PLAYER_SELECT;
        this.playerIndex = 0;
        this.cpuIndex = 0; // Initialize to 0 to avoid draw crash
        this.timer = 0;
        this.cpuTimer = 0; // Ensure timer is reset
        this.timer = 0;
        this.cpuTimer = 0; // Ensure timer is reset
        this.readyTimer = 0;
        this.lastHoveredIndex = -1; // Track mouse hover state

        // BGM
        Assets.playMusic('audio/bgm_chrsel');

        // Tournament Data
        this.mode = data && data.mode ? data.mode : 'STORY'; // Default to STORY if undefined (or NEW_GAME mapped to STORY?)
        // If data.mode is undefined, default 'STORY'.

        this.defeatedOpponents = data && data.defeatedOpponents ? data.defeatedOpponents : [];

        // Initial Portraits
        this.updateP1Portrait();
        this.updateCpuPortrait();

        if (this.mode === 'NEXT_MATCH') {
            this.playerIndex = data.playerIndex;
            this.updateP1Portrait();
            this.currentState = this.STATE_CPU_SELECT; // Skip player select

            // Auto-select CPU
            this.selectNextOpponent();
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
        // Simple auto-config similar to EncounterScene
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

    selectNextOpponent: function () {
        // Filter available opponents
        const available = [];
        for (let i = 0; i < CharacterData.length; i++) {
            // Ignore hidden chars (Mayu) for now
            if (CharacterData[i].hidden) continue;

            if (i !== this.playerIndex && !this.defeatedOpponents.includes(i)) {
                available.push(i);
            }
        }

        if (available.length > 0) {
            // Check if my rival is in the available list.
            const myChar = this.characters[this.playerIndex];
            const rivalId = myChar.rival;

            // Find rival index (using original CharacterData)
            const rivalIndex = CharacterData.findIndex(c => c.id === rivalId);

            let candidates = available;

            if (available.length > 1 && rivalIndex !== -1) {
                // Filter out rival from candidates
                candidates = available.filter(idx => idx !== rivalIndex);
                console.log(`Excluding Rival (Index ${rivalIndex}) from selection. Candidates left: ${candidates.length}`);
            }

            // Fallback if candidates became empty (shouldn't happen if logic is correct, but just in case)
            if (candidates.length === 0) candidates = available;

            // Randomly pick one
            const rand = Math.floor(Math.random() * candidates.length);
            this.cpuIndex = candidates[rand];
            this.updateCpuPortrait(); // Update Visual
            console.log(`Auto - selected CPU: ${this.cpuIndex} (Rival: ${rivalId} / Index: ${rivalIndex})`);

            // Transition to Encounter
            Game.changeScene(EncounterScene, {
                playerIndex: this.playerIndex,
                cpuIndex: this.cpuIndex,
                defeatedOpponents: this.defeatedOpponents
            });
        } else {
            // No opponents left -> Tournament Win
            // Trigger Ending Dialogue (Story Mode)
            console.log("TRIGGER ENDING DIALOGUE");

            // Determine Rival Index from ID
            const myChar = this.characters[this.playerIndex];
            const rivalId = myChar.rival;
            let rivalIndex = this.characters.findIndex(c => c.id === rivalId);
            if (rivalIndex === -1) rivalIndex = 0; // Safeguard

            Game.changeScene(EncounterScene, {
                playerIndex: this.playerIndex,
                cpuIndex: rivalIndex,
                mode: 'ENDING'
            });
        }
    },

    update: function () {
        // Update Animation States
        if (this.p1Portrait) this.p1Portrait.update();
        if (this.cpuPortrait) this.cpuPortrait.update();

        if (this.currentState === this.STATE_PLAYER_SELECT) {
            // Auto Test: Select First Character
            if (Game.isAutoTest) {
                this.currentState = this.STATE_CPU_SELECT;
                this.cpuTimer = 0;
                this.updateCpuPortrait();
            }

            // Player Selection
            if (Input.isJustPressed(Input.LEFT)) {
                this.playerIndex--;
                if (this.playerIndex < 0) this.playerIndex = this.characters.length - 1;
                this.updateP1Portrait();
                Assets.playSound('audio/tick');
            } else if (Input.isJustPressed(Input.RIGHT)) {
                this.playerIndex++;
                if (this.playerIndex >= this.characters.length) this.playerIndex = 0;
                this.updateP1Portrait();
                Assets.playSound('audio/tick');
            }

            if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isJustPressed(Input.SPACE)) {
                // Confirm Player
                // Play sound
                this.currentState = this.STATE_CPU_SELECT;
                this.cpuTimer = 0;
                this.updateCpuPortrait(); // Init CPU

                // WATCH Mode Check: Skip CPU Select
                if (this.mode === 'WATCH') {
                    this.startWatchMode();
                }
            }
            // Mouse Input
            // Hybrid: Update selection on hover change
            const hoveredIndex = this.getHoveredCharacterIndex();
            if (hoveredIndex !== -1 && hoveredIndex !== this.lastHoveredIndex) {
                this.playerIndex = hoveredIndex;
                this.updateP1Portrait();
                this.lastHoveredIndex = hoveredIndex;
                // Add sound?
                Assets.playSound('audio/tick');
            } else if (hoveredIndex === -1) {
                this.lastHoveredIndex = -1;
            }

            if (Input.isMouseJustPressed()) {
                if (hoveredIndex !== -1) {
                    // Click confirms current selection (which is already sync'd via hover)
                    this.currentState = this.STATE_CPU_SELECT;
                    this.cpuTimer = 0;
                    this.updateCpuPortrait();

                    // WATCH Mode Check: Skip CPU Select
                    if (this.mode === 'WATCH') {
                        this.startWatchMode();
                    }
                }
            }
        } else if (this.currentState === this.STATE_CPU_SELECT) {

            if (this.isDebug) {
                // Manual CPU Selection
                if (Input.isJustPressed(Input.LEFT)) {
                    this.cpuIndex--;
                    if (this.cpuIndex < 0) this.cpuIndex = this.characters.length - 1;
                    this.updateCpuPortrait();
                } else if (Input.isJustPressed(Input.RIGHT)) {
                    this.cpuIndex++;
                    if (this.cpuIndex >= this.characters.length) this.cpuIndex = 0;
                    this.updateCpuPortrait();
                }

                if (Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isJustPressed(Input.SPACE)) {
                    // Confirm CPU
                    this.currentState = this.STATE_READY;
                    this.readyTimer = 0;
                    console.log(`Ready(Manual): P1(${this.characters[this.playerIndex].name}) vs CPU(${this.characters[this.cpuIndex].name})`);
                }

                // Mouse Input (Debug Manual)
                if (Input.isMouseJustPressed()) {
                    const clickedIndex = this.getHoveredCharacterIndex();
                    if (clickedIndex !== -1) {
                        this.cpuIndex = clickedIndex;
                        this.updateCpuPortrait();
                        // Confirm if clicked again?
                        if (this.cpuIndex === clickedIndex) {
                            this.currentState = this.STATE_READY;
                            this.readyTimer = 0;
                            console.log(`Ready(Manual): P1(${this.characters[this.playerIndex].name}) vs CPU(${this.characters[this.cpuIndex].name})`);
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
                    this.updateCpuPortrait();
                }

                if (this.cpuTimer > this.cpuSelectDuration) {
                    // Force selection to be a valid candidate (respecting Rival logic)
                    // Logic similar to selectNextOpponent
                    const available = [];
                    for (let i = 0; i < this.characters.length; i++) {
                        if (i !== this.playerIndex && !this.defeatedOpponents.includes(i)) {
                            available.push(i);
                        }
                    }

                    const myChar = this.characters[this.playerIndex];
                    const rivalId = myChar.rival;
                    const rivalIndex = this.characters.findIndex(c => c.id === rivalId);

                    // Filter out rival from candidates
                    let candidates = available;
                    if (available.length > 1 && rivalIndex !== -1) {
                        candidates = available.filter(idx => idx !== rivalIndex);
                        console.log(`Excluding Rival (Index ${rivalIndex}) from Roulette. Candidates left: ${candidates.length}`);
                    }
                    if (candidates.length === 0) candidates = available;

                    // Fix: If still empty (e.g. all defeated but loop restart issue), or naturally empty in Roulette mode
                    if (candidates.length === 0) {
                        console.log("Roulette determined No Opponents -> Trigger Ending");
                        // Reuse Ending Logic
                        const myChar = this.characters[this.playerIndex];
                        const rivalId = myChar.rival;
                        let rivalIndex = this.characters.findIndex(c => c.id === rivalId);
                        if (rivalIndex === -1) rivalIndex = 0; // Safeguard

                        Game.changeScene(EncounterScene, {
                            playerIndex: this.playerIndex,
                            cpuIndex: rivalIndex,
                            mode: 'ENDING'
                        });
                        return;
                    }

                    const rand = Math.floor(Math.random() * candidates.length);
                    this.cpuIndex = candidates[rand];
                    this.updateCpuPortrait();

                    this.currentState = this.STATE_READY;
                    this.readyTimer = 0;
                    console.log(`Ready: P1(${this.characters[this.playerIndex].name}) vs CPU(${this.characters[this.cpuIndex].name})`);
                }
            }
        } else if (this.currentState === this.STATE_READY) {
            // Auto transition after a short delay
            this.readyTimer++;
            if (this.readyTimer > (Game.isAutoTest ? 10 : 60)) {
                if (this.debugSkipDialogue) {
                    Game.changeScene(BattleScene, {
                        playerIndex: this.playerIndex, // Use BattleScene wrapper
                        cpuIndex: this.cpuIndex
                    });
                } else {
                    Game.changeScene(EncounterScene, {
                        playerIndex: this.playerIndex,
                        cpuIndex: this.cpuIndex,
                        defeatedOpponents: this.defeatedOpponents
                    });
                }
            }
        }
    },

    draw: function (ctx) {
        // 1. Background
        const bg = Assets.get(SelectConfig.BACKGROUND.path);
        if (bg) {
            const pattern = Assets.getPattern(ctx, bg, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, 640, 480);
        }

        // 2. Title "CHARACTER SELECT"
        // const title = Assets.get(SelectConfig.TITLE.path);
        // if (title) {
        //     ctx.drawImage(title, (640 - title.width) / 2, SelectConfig.TITLE.y);
        // }
        // Replacement: Retro Font Title
        const titleText = "CHARACTER SELECT";
        const titleX = (640 - (titleText.length * 32)) / 2;
        Assets.drawAlphabet(ctx, titleText, titleX, SelectConfig.TITLE.y, 'yellow');

        // 3. VS Logo
        const vs = Assets.get(SelectConfig.VS_LOGO.path);
        if (vs) {
            ctx.drawImage(vs, (640 - vs.width) / 2, SelectConfig.VS_LOGO.y);
        }

        // 4. Big Portrait (Left - Player 1)
        if (this.p1Portrait) {
            this.p1Portrait.draw(ctx);
        }

        // 5. Name (Text)
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = SelectConfig.NAME.strokeWidth;
        ctx.font = SelectConfig.NAME.font;

        // Draw Player Name
        ctx.textAlign = 'left';
        if (this.characters[this.playerIndex]) {
            const pNameText = this.characters[this.playerIndex].name;
            // Use Fixed UI Positions (Ignore Sprite Offsets)
            const pNameX = SelectConfig.PORTRAIT.P1.x + SelectConfig.NAME.xPadding;
            const pNameY = SelectConfig.PORTRAIT.P1.y + SelectConfig.NAME.yOffset;
            ctx.strokeText(pNameText, pNameX, pNameY);
            ctx.fillText(pNameText, pNameX, pNameY);
        }

        // Draw CPU Portrait & Name (Mirroring Player)
        if (this.currentState >= this.STATE_CPU_SELECT) {
            if (this.cpuPortrait) {
                this.cpuPortrait.draw(ctx);
            }

            // CPU Name (Right Aligned)
            ctx.textAlign = 'right';
            if (this.characters[this.cpuIndex]) {
                const cpuNameText = this.characters[this.cpuIndex].name;

                // Align relative to the fixed UI slot (Right Aligned)
                const cpuNameX = SelectConfig.PORTRAIT.CPU.x - SelectConfig.NAME.xPadding;
                const cpuNameY = SelectConfig.PORTRAIT.CPU.y + SelectConfig.NAME.yOffset;

                ctx.strokeText(cpuNameText, cpuNameX, cpuNameY);
                ctx.fillText(cpuNameText, cpuNameX, cpuNameY);
            }
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

        const hoveredIndex = this.getHoveredCharacterIndex();

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

    getHoveredCharacterIndex: function () {
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
    },

    startWatchMode: function () {
        // Create a queue of all other characters
        const queue = [];
        for (let i = 0; i < this.characters.length; i++) {
            if (i !== this.playerIndex) {
                queue.push(i);
            }
        }

        // RIVAL ORDER LOGIC for WATCH MODE
        // Move Rival to the end of the queue
        const myChar = this.characters[this.playerIndex];
        const rivalId = myChar.rival;
        const rivalIndex = this.characters.findIndex(c => c.id === rivalId);

        if (rivalIndex !== -1) {
            const idxInQueue = queue.indexOf(rivalIndex);
            if (idxInQueue !== -1) {
                // Remove from current pos
                queue.splice(idxInQueue, 1);
                // Push to end
                queue.push(rivalIndex);
                console.log(`Watch Mode: Moved Rival(${rivalId}) to end of queue.`);
            }
        }

        if (queue.length > 0) {
            const firstCpu = queue.shift();
            console.log(`Starting Watch Mode: P1(${this.playerIndex}) vs CPU(${firstCpu}).Remaining: ${queue.length} `);
            Game.changeScene(EncounterScene, {
                playerIndex: this.playerIndex,
                cpuIndex: firstCpu,
                mode: 'WATCH',
                queue: queue
            });
        }
    }
};
