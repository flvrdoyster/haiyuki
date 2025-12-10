// Ending Scene
// Displays the ending illustration and waits for input.
// Checks for True Ending condition (continues === 0).

const EndingScene = {
    timer: 0,
    canSkip: false,

    init: function (data) {
        console.log("Ending Scene Init");
        this.timer = 0;
        this.canSkip = false;
        this.playerIndex = data ? data.playerIndex : 0;
        this.skipTrueEnd = data ? data.skipTrueEnd : false;

        // Map Player ID to Ending Image
        // Map Player ID to Ending Image
        // Ataho -> ENDATA, etc.

        const charId = CharacterData[this.playerIndex].id;
        this.endingImageKey = 'ending/END' + charId.substring(0, 3).toUpperCase() + '.png'; // ENDATA, ENDRIN, ENDFAR... 

        // Manual Overrides if naming inconsistent
        if (charId === 'ataho') this.endingImageKey = 'ending/ENDATA.png';
        if (charId === 'rinxiang') this.endingImageKey = 'ending/ENDRIN.png';
        if (charId === 'fari') this.endingImageKey = 'ending/ENDFAR.png';
        if (charId === 'smash') this.endingImageKey = 'ending/ENDSMA.png';
        if (charId === 'yuri') this.endingImageKey = 'ending/ENDYUR.png';
        if (charId === 'mayu') this.endingImageKey = 'ending/ENDMAY.png';
        if (charId === 'petum') this.endingImageKey = 'ending/ENDFAR.png';
    },

    update: function () {
        this.timer++;

        if (this.timer > (Game.isAutoTest ? 10 : 60)) {
            this.canSkip = true;
        }

        if (this.canSkip) {
            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed() || Game.isAutoTest) {
                this.checkTrueEnding();
            }
        }
    },

    draw: function (ctx) {
        // Clear screen (black)
        ctx.fillStyle = '#000000';
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
            console.log("Missing ending image: " + this.endingImageKey);
            ctx.fillStyle = 'white';
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
    },

    checkTrueEnding: function () {
        console.log(`Check True Ending. Continue Count: ${Game.continueCount}, Skip: ${this.skipTrueEnd}`);

        if (this.skipTrueEnd) {
            console.log("Skipping True Ending Check (Watch Mode). Returning to Title.");
            Game.isAutoTest = false; // Stop Auto-Test
            Game.changeScene(TitleScene);
            return;
        }

        const isMayuUnlocked = Game.saveData && Game.saveData.unlocked && Game.saveData.unlocked.includes('mayu');

        if (Game.continueCount === 0 && !isMayuUnlocked) {
            console.log("TRUE ENDING PATH TRIGGERED!");
            // Transition to Mayu Encounter
            // Transition to Mayu Encounter
            // 1. Encounter Scene
            // 2. Battle Scene

            // We need Mayu's index.
            const mayu = CharacterData.find(c => c.id === 'mayu');
            if (mayu) {
                // Determine Mayu's index in the original array
                const mayuIndex = CharacterData.indexOf(mayu);

                // Transition to Intrusion Scene (Warning)
                Game.changeScene(HerecomeScene, {
                    playerIndex: this.playerIndex,
                    cpuIndex: mayuIndex,
                    defeatedOpponents: []
                });
            } else {
                console.error("Mayu not found!");
                Game.isAutoTest = false; // Stop Auto-Test
                Game.changeScene(TitleScene);
            }

        } else {
            console.log("Normal Ending. Returning to Title.");
            Game.isAutoTest = false; // Stop Auto-Test
            Game.changeScene(TitleScene);
        }
    }
};
