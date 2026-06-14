// Ending Scene
// Displays the ending illustration and waits for input.
// Checks for True Ending condition (continues === 0).

const EndingScene = {
    timer: 0,
    canSkip: false,

    init: function (data) {
        this.timer = 0;
        this.canSkip = false;
        this.playerIndex = data ? data.playerIndex : 0;
        this.skipTrueEnd = data ? data.skipTrueEnd : false;

        // True-ending intrusion: flash "HERE COMES A NEW CHALLENGER" over the
        // ending illustration before handing off to the Mayu encounter.
        this.challengerIntro = false;
        this.challengerTimer = 0;
        this._mayuIndex = -1;

        // Map Player ID to Ending Image
        // Map Player ID to Ending Image
        // Ataho -> ENDATA, etc.

        const charId = CharacterData[this.playerIndex].id;
        this.endingImageKey = 'ending/END' + charId.substring(0, 3).toUpperCase() + '.png'; // ENDATA, ENDRIN, ENDFAR... 

        // Manual Overrides if naming inconsistent
        if (charId === 'ataho') this.endingImageKey = 'ending/ending_ATA.png';
        if (charId === 'rinxiang') this.endingImageKey = 'ending/ending_RIN.png';
        if (charId === 'fari') this.endingImageKey = 'ending/ending_FARI.png';
        if (charId === 'smash') this.endingImageKey = 'ending/ending_SMSH.png';
        if (charId === 'yuri') this.endingImageKey = 'ending/ending_YURI.png';
        if (charId === 'mayu') this.endingImageKey = 'ending/ending_MAYU.png';
        if (charId === 'petum') this.endingImageKey = 'ending/ending_FARI.png'; // Placeholder fallback?
    },

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        this.timer += dt;

        // Challenger intrusion: hold on the illustration with the flashing text,
        // then hand off to the Mayu encounter (auto after ~3s, or input to skip).
        if (this.challengerIntro) {
            this.challengerTimer += dt;
            const pressed = Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed();
            const done = this.challengerTimer > 180 ||
                (this.challengerTimer > 30 && pressed) ||
                (Game.isAutoTest && this.challengerTimer > 5);
            if (done) {
                Game.changeScene(EncounterScene, {
                    playerIndex: this.playerIndex,
                    cpuIndex: this._mayuIndex,
                    mode: 'CHALLENGER',
                    defeatedOpponents: []
                });
            }
            return;
        }

        if (this.timer > (Game.isAutoTest ? 10 : 60)) {
            this.canSkip = true;
        }

        if (this.canSkip) {
            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isMouseJustPressed() || Game.isAutoTest) {
                this.checkTrueEnding();
            }
        }
    },

    draw: function (ctx) {
        // Clear screen (rgba(0, 0, 0, 1))
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, 640, 480);

        // Draw Ending Image
        // Disable interpolation for sharp pixel art scaling
        ctx.imageSmoothingEnabled = false;

        const img = Assets.get(this.endingImageKey);
        if (img) {
            // Scale 1.5x
            const scale = 1.5;
            const w = img.width * scale;
            const h = img.height * scale;

            // Center illustration
            // But we have 'theend' at bottom.
            // Let's just center it visually.
            ctx.drawImage(img, (640 - w) / 2, (480 - h) / 2 - 20, w, h);
        } else {
            console.warn("Missing ending image: " + this.endingImageKey);
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.textAlign = 'center';
            ctx.fillText("ENDING (Image Missing)", 320, 240);
        }

        // Draw 'theend.png'
        const endImg = Assets.get('ending/theend.png');
        if (endImg) {
            // Bottom right? Or Center bottom?
            // "screen bottom" usually implies center or right.
            // Reference image showed it at bottom right.
            const ex = 640 - endImg.width - 20;
            const ey = 480 - endImg.height - 20;
            ctx.drawImage(endImg, ex, ey);
        }

        // Challenger intrusion: "HERE COMES A / NEW CHALLENGER" flashes over the
        // illustration — image font (alphabet.png), two tight lines (32px apart),
        // blinking by alternating the font's two colours (yellow ↔ orange).
        if (this.challengerIntro) {
            const color = (Math.floor(this.challengerTimer / 10) % 2 === 0) ? 'yellow' : 'orange';
            const opt = { color: color, align: 'center', spaceWidth: 16 };
            Assets.drawAlphabet(ctx, 'HERE COMES A', 320, 200, opt);
            Assets.drawAlphabet(ctx, 'NEW CHALLENGER', 320, 232, opt);
        }
    },

    checkTrueEnding: function () {
        if (this.skipTrueEnd) {
            Game.isAutoTest = false; // Stop Auto-Test
            Game.changeScene(TitleScene);
            return;
        }

        const isMayuUnlocked = Game.saveData && Game.saveData.unlocked && Game.saveData.unlocked.includes('mayu');

        // Playing AS Mayu must never route into the Mayu hidden-boss / true-ending
        // path (you can't fight yourself). Normally implied by isMayuUnlocked being
        // true while she's playable, but guard explicitly so a forced/debug run as
        // Mayu still falls through to the normal credits.
        const playerIsMayu = CharacterData[this.playerIndex] && CharacterData[this.playerIndex].id === 'mayu';

        // Debug (window.challengerTest()): force the intrusion regardless of clear/unlock.
        if ((DebugCheats.forceChallenger || (Game.continueCount === 0 && !isMayuUnlocked)) && !playerIsMayu) {
            // Transition to Mayu Encounter
            // Transition to Mayu Encounter
            // Encounter Scene
            // Battle Scene

            // We need Mayu's index.
            const mayu = CharacterData.find(c => c.id === 'mayu');
            if (mayu) {
                // Don't jump yet — start the over-illustration flashing intro;
                // update() hands off to the Mayu encounter when it finishes.
                this._mayuIndex = CharacterData.indexOf(mayu);
                this.challengerIntro = true;
                this.challengerTimer = 0;
            } else {
                console.error("Mayu not found!");
                Game.isAutoTest = false; // Stop Auto-Test
                Game.changeScene(TitleScene);
            }

        } else {
            Game.isAutoTest = false; // Stop Auto-Test
            Game.changeScene(CreditsScene, { endingType: 'NORMAL' });
        }
    }
};
