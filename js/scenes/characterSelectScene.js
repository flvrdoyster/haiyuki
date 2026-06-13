
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
        cursorPath: 'face/select_cursor.png',
        // The hidden character (Mayu, unlocked after the true ending) sits in its
        // own slot centered below the VS logo (VS_LOGO.y = 200), as in the original
        // — not in the row with the base 6.
        hiddenSlotY: 292
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

    // ── Opponent selection ──────────────────────────────────────────────
    // A character is a valid regular opponent iff it is NOT the player, NOT
    // already defeated, and NOT hidden. Mayu (hidden) appears only as the
    // true-ending boss (see EndingScene) — never as a tournament opponent.
    // Both the auto-progression (selectNextOpponent) and the first-match
    // roulette go through this, so they can't diverge.
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

    // Pick the next opponent index, saving the player's rival for last.
    // Returns null when no valid opponents remain (→ ending).
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

    // No opponents left → transition into the character ending dialogue.
    goToEnding: function () {
        const rivalId = this.characters[this.playerIndex].rival;
        let rivalIndex = this.characters.findIndex(c => c.id === rivalId);
        if (rivalIndex === -1) rivalIndex = 0; // Safeguard
        console.log("All opponents defeated → ending dialogue");
        Game.changeScene(EncounterScene, {
            playerIndex: this.playerIndex,
            cpuIndex: rivalIndex,
            mode: 'ENDING'
        });
    },

    selectNextOpponent: function () {
        const idx = this.chooseOpponentIndex();
        if (idx === null) { this.goToEnding(); return; }

        this.cpuIndex = idx;
        this.updateCpuPortrait();
        Game.changeScene(EncounterScene, {
            playerIndex: this.playerIndex,
            cpuIndex: this.cpuIndex,
            defeatedOpponents: this.defeatedOpponents
        });
    },

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        // Update Animation States
        if (this.p1Portrait) this.p1Portrait.update(dt);
        if (this.cpuPortrait) this.cpuPortrait.update(dt);

        if (this.currentState === this.STATE_PLAYER_SELECT) {
            // Auto Test: Select First Character
            if (Game.isAutoTest) {
                this.currentState = this.STATE_CPU_SELECT;
                this.cpuTimer = 0;
                this.updateCpuPortrait();
            }

            // Player Selection. The base 6 form the row (LEFT/RIGHT cycle within it).
            // The hidden Mayu sits in the below-VS slot: UP jumps to it, DOWN (or
            // LEFT/RIGHT) drops back to the remembered row position. Without an unlocked
            // Mayu (hiddenIdx === -1) this reduces to the original LEFT/RIGHT cycle.
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
                if (Input.hasMouseMoved()) {
                    this.playerIndex = hoveredIndex;
                    this.updateP1Portrait();
                    // Add sound?
                    Assets.playSound('audio/tick');
                }
                this.lastHoveredIndex = hoveredIndex;
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
                        if (Input.hasMouseMoved()) {
                            this.cpuIndex = clickedIndex;
                            this.updateCpuPortrait();
                        }
                        // Confirm if clicked again?
                        if (this.cpuIndex === clickedIndex) {
                            this.currentState = this.STATE_READY;
                            this.readyTimer = 0;
                            console.log(`Ready(Manual): P1(${this.characters[this.playerIndex].name}) vs CPU(${this.characters[this.cpuIndex].name})`);
                        }
                    }
                }



            } else {
                this.cpuTimer += dt;
                // Spin effect: change index every few frames based on absolute time
                const spinInterval = 5;
                const prevSpin = Math.floor((this.cpuTimer - dt) / spinInterval);
                const currentSpin = Math.floor(this.cpuTimer / spinInterval);

                if (currentSpin > prevSpin) {
                    // Calculate how many indices to skip if dt was large
                    const skipCount = currentSpin - prevSpin;

                    // Cycle through the roster for a 'spin' feel, but skip the player
                    // and hidden chars (Mayu) so the roulette only flashes valid opponents.
                    let nextIndex = (this.cpuIndex + skipCount) % this.characters.length;
                    let guard = 0;
                    while ((nextIndex === this.playerIndex || this.characters[nextIndex].hidden) &&
                        guard++ < this.characters.length) {
                        nextIndex = (nextIndex + 1) % this.characters.length;
                    }

                    this.cpuIndex = nextIndex;
                    this.updateCpuPortrait();
                }

                if (this.cpuTimer > this.cpuSelectDuration) {
                    // Same selection rule as auto-progression (excludes hidden Mayu).
                    const idx = this.chooseOpponentIndex();
                    if (idx === null) {
                        console.log("Roulette: no opponents left → ending");
                        this.goToEnding();
                        return;
                    }

                    this.cpuIndex = idx;
                    this.updateCpuPortrait();
                    this.currentState = this.STATE_READY;
                    this.readyTimer = 0;
                    console.log(`Ready: P1(${this.characters[this.playerIndex].name}) vs CPU(${this.characters[this.cpuIndex].name})`);
                }
            }
        } else if (this.currentState === this.STATE_READY) {
            // Auto transition after a short delay
            this.readyTimer += dt;
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
        // Background
        const bg = Assets.get(SelectConfig.BACKGROUND.path);
        if (bg) {
            const pattern = Assets.getPattern(ctx, bg, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, 640, 480);
        }

        // Title "CHARACTER SELECT"
        // const title = Assets.get(SelectConfig.TITLE.path);
        // if (title) {
        //     ctx.drawImage(title, (640 - title.width) / 2, SelectConfig.TITLE.y);
        // }
        // Replacement: Retro Font Title
        const titleText = "CHARACTER SELECT";
        const titleX = (640 - (titleText.length * 32)) / 2;
        Assets.drawAlphabet(ctx, titleText, titleX, SelectConfig.TITLE.y, 'yellow');

        // VS Logo
        const vs = Assets.get(SelectConfig.VS_LOGO.path);
        if (vs) {
            ctx.drawImage(vs, (640 - vs.width) / 2, SelectConfig.VS_LOGO.y);
        }

        // Big Portrait (Left - Player 1)
        if (this.p1Portrait) {
            this.p1Portrait.draw(ctx);
        }

        // Name (Text)
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
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

        // Draw Icons (positions from the shared getIconRect helper, so the hidden
        // Mayu lands in its below-VS slot while the base 6 stay in the centered row).
        this.characters.forEach((char, index) => {
            const r = this.getIconRect(index);

            // Dim if already selected by Player (during CPU phase/Ready)
            const isPlayerSelected = (this.currentState >= this.STATE_CPU_SELECT && index === this.playerIndex);

            ctx.save();
            if (isPlayerSelected) {
                ctx.globalAlpha = SelectConfig.ICON_ROW.dimOpacity;
            }
            const iconImg = Assets.get(char.selectIcon);
            if (iconImg) {
                ctx.drawImage(iconImg, r.x, r.y);
            }
            ctx.restore();
        });

        // Draw Cursors
        const cursorImg = Assets.get(SelectConfig.ICON_ROW.cursorPath);
        if (cursorImg) {
            const cursorW = cursorImg.width / 2; // contains 2 frames
            const cursorH = cursorImg.height;

            // Player Cursor (Green) - Frame 0
            const pr = this.getIconRect(this.playerIndex);
            Assets.drawFrame(ctx, SelectConfig.ICON_ROW.cursorPath,
                pr.x + (pr.w - cursorW) / 2, pr.y + (pr.h - cursorH) / 2, 0, cursorW, cursorH);

            // CPU Cursor (Red) - Frame 1
            if (this.currentState >= this.STATE_CPU_SELECT) {
                const cr = this.getIconRect(this.cpuIndex);
                Assets.drawFrame(ctx, SelectConfig.ICON_ROW.cursorPath,
                    cr.x + (cr.w - cursorW) / 2, cr.y + (cr.h - cursorH) / 2, 1, cursorW, cursorH);
            }
        }
    },

    // Position+size of a character's select icon. Non-hidden characters form the
    // centered row (ICON_ROW.y). The hidden character (Mayu) gets its own slot
    // centered below the VS logo (ICON_ROW.hiddenSlotY).
    getIconRect: function (index) {
        const firstIcon = Assets.get(this.characters[0].selectIcon);
        const iconW = firstIcon ? firstIcon.width : 40;
        const iconH = firstIcon ? firstIcon.height : 40;
        const gap = SelectConfig.ICON_ROW.gap;
        const char = this.characters[index];

        if (char && char.hidden) {
            // Mayu uses its own (differently-sized) select icon — center on that.
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
