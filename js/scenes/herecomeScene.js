// Herecome Scene Configuration
const HerecomeConfig = {
    UNKNOWN: {
        BG: 'bg/CHRBAK.png',
        VS_LOGO: { path: 'ui/vs.png', y: 200 },
        PORTRAIT: {
            P1: { x: 0, y: 65, w: 280, h: 304 },
            CPU: {
                x: 720, y: -15, w: 280, h: 304,
                align: 'right',
                scale: 1.5         // Scale up Unknown Mayu
            }
        },
        NAME: {
            TEXT: "???",
            x: 620, // Right aligned padding
            y: 345,  // 65 (Portrait Y) + 280 (Offset from SelectConfig)
            font: 'bold 32px "KoddiUDOnGothic-Bold", sans-serif',
            strokeWidth: 4
        },
        headerText1: "HERE COMES",
        headerText2: "A NEW CHALLENGER"
    }
};

const HerecomeScene = {
    timer: 0,
    state: 0, // 0: Fade In, 1: Flash/Hold, 2: Fade Out, 3: Show Unknown

    init: function (data) {
        this.playerIndex = data.playerIndex;
        this.cpuIndex = data.cpuIndex;
        this.defeatedOpponents = data.defeatedOpponents || [];

        this.timer = 0;
        this.state = 3; // Start directly at Unknown View

        // Initialize Portraits
        const p1Data = CharacterData[this.playerIndex];
        // Use PortraitCharacter for P1 (Handles sprite sheet slicing automatically)
        this.p1Portrait = new PortraitCharacter(p1Data, HerecomeConfig.UNKNOWN.PORTRAIT.P1, false);
        // Setup simple anim (blink) if valid
        const idMap = { 'ataho': 'ATA', 'rinxiang': 'RIN', 'smash': 'SMSH', 'petum': 'PET', 'fari': 'FARI', 'yuri': 'YURI', 'mayu': 'MAYU' };
        const p1Prefix = idMap[p1Data.id] || p1Data.id.toUpperCase();
        const p1Base = `face/${p1Prefix}_base.png`;
        if (Assets.get(p1Base)) {
            this.p1Portrait.setAnimationConfig({ base: p1Base });
        }

        // Initialize CPU Portrait (Unknown Mayu)
        // Manually create data since it's a special "Unknown" state
        const cpuData = {
            id: 'unknown',
            face: 'face/MAYU_unknown.png',
            battleFaceR: 'face/MAYU_unknown.png', // Explicitly set for PortraitCharacter to pick it up
            singleSprite: true, // Prevent slicing/cropping logic
            battleOffsetX: 0,
            battleOffsetY: 0
        };
        this.cpuPortrait = new PortraitCharacter(cpuData, HerecomeConfig.UNKNOWN.PORTRAIT.CPU, true);
        // No animation config for static unknown image, but set base to ensure slicing logic works if it's a sheet
        // If MAYU_unknown.png is just a static image used for both (or specifically right side), we rely on default draw logic.
        // PortraitCharacter fallback draws 'face' property if no animConfig. 
        // We just need to check if MAYU_unknown.png is a sheet. 
        // If it is, PortraitCharacter._drawImageAutoSlice will handle it if we pass it as 'face'.

        Assets.stopMusic();
    },

    update: function () {
        this.timer++;

        // Update Portraits
        if (this.p1Portrait) this.p1Portrait.update();
        if (this.cpuPortrait) this.cpuPortrait.update();

        // State Machine
        if (this.state === 3) { // Show Unknown
            // Hold ~3s or Input to skip
            if (this.timer > 180 || Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed()) {
                Game.changeScene(BattleScene, {
                    playerIndex: this.playerIndex,
                    cpuIndex: this.cpuIndex,
                    defeatedOpponents: this.defeatedOpponents
                });
            }
        }
    },

    draw: function (ctx) {
        const w = 640;
        const h = 480;

        this.drawUnknown(ctx, w, h);
    },

    drawUnknown: function (ctx, w, h) {
        // 1. Background
        const bg = Assets.get(HerecomeConfig.UNKNOWN.BG);
        if (bg) {
            const pattern = ctx.createPattern(bg, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, w, h);
        } else {
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, w, h);
        }

        // 2. P1 Portrait
        if (this.p1Portrait) {
            this.p1Portrait.draw(ctx);
        }

        // 3. Unknown Helper Portrait
        if (this.cpuPortrait) {
            this.cpuPortrait.draw(ctx);
        }

        // 4. VS Logo
        const vs = Assets.get(HerecomeConfig.UNKNOWN.VS_LOGO.path);
        if (vs) {
            ctx.drawImage(vs, (w - vs.width) / 2, HerecomeConfig.UNKNOWN.VS_LOGO.y);
        }

        // 5. Name "???" using Standard Font (Matched to Character Select)
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = HerecomeConfig.UNKNOWN.NAME.strokeWidth;
        ctx.font = HerecomeConfig.UNKNOWN.NAME.font;
        ctx.textAlign = 'right'; // CPU side is right aligned

        const nameText = HerecomeConfig.UNKNOWN.NAME.TEXT;
        const nameX = HerecomeConfig.UNKNOWN.NAME.x;
        const nameY = HerecomeConfig.UNKNOWN.NAME.y;

        ctx.strokeText(nameText, nameX, nameY);
        ctx.fillText(nameText, nameX, nameY);
        ctx.restore();

        // 6. Challenger Text (Centered)
        const line1 = HerecomeConfig.UNKNOWN.headerText1;
        const line2 = HerecomeConfig.UNKNOWN.headerText2;

        const calcWidth = (str) => {
            let w = 0;
            for (let char of str) {
                w += (char === ' ') ? 16 : 32;
            }
            return w;
        };

        const x1 = (w - calcWidth(line1)) / 2;
        const x2 = (w - calcWidth(line2)) / 2;

        const textOption = { color: 'yellow', spaceWidth: 16 };

        Assets.drawAlphabet(ctx, line1, x1, 20, textOption);
        Assets.drawAlphabet(ctx, line2, x2, 52, textOption);
    }
};

