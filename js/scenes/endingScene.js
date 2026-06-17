const EndingScene = {
    timer: 0,
    canSkip: false,

    init: function (data) {
        this.timer = 0;
        this.canSkip = false;
        this.playerIndex = data ? data.playerIndex : 0;
        this.skipTrueEnd = data ? data.skipTrueEnd : false;

        // 진엔딩: 일러스트 위에 "HERE COMES A NEW CHALLENGER" 플래시 후 마유 인카운터로 전환
        this.challengerIntro = false;
        this.challengerTimer = 0;
        this._mayuIndex = -1;

        // 파일명 규칙이 일정하지 않아 캐릭터별 수동 매핑
        const charId = CharacterData[this.playerIndex].id;
        this.endingImageKey = 'ending/END' + charId.substring(0, 3).toUpperCase() + '.png';

        if (charId === 'ataho') this.endingImageKey = 'ending/ending_ATA.png';
        if (charId === 'rinxiang') this.endingImageKey = 'ending/ending_RIN.png';
        if (charId === 'fari') this.endingImageKey = 'ending/ending_FARI.png';
        if (charId === 'smash') this.endingImageKey = 'ending/ending_SMSH.png';
        if (charId === 'yuri') this.endingImageKey = 'ending/ending_YURI.png';
        if (charId === 'mayu') this.endingImageKey = 'ending/ending_MAYU.png';
        if (charId === 'petum') this.endingImageKey = 'ending/ending_FARI.png'; // petum 전용 엔딩 없음, FARI 대용
    },

    update: function (dt = 1.0) {
        dt = dt || 1.0;
        this.timer += dt;

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
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, 640, 480);

        ctx.imageSmoothingEnabled = false;

        const img = Assets.get(this.endingImageKey);
        if (img) {
            const scale = 1.5;
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (640 - w) / 2, (480 - h) / 2 - 20, w, h);
        } else {
            console.warn("Missing ending image: " + this.endingImageKey);
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.textAlign = 'center';
            ctx.fillText("ENDING (Image Missing)", 320, 240);
        }

        const endImg = Assets.get('ending/theend.png');
        if (endImg) {
            const ex = 640 - endImg.width - 20;
            const ey = 480 - endImg.height - 20;
            ctx.drawImage(endImg, ex, ey);
        }

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

        // 마유 플레이 중에는 자기 자신과 싸우는 루트를 막음 (unlock 여부와 무관)
        const playerIsMayu = CharacterData[this.playerIndex] && CharacterData[this.playerIndex].id === 'mayu';

        if ((DebugCheats.forceChallenger || (Game.continueCount === 0 && !isMayuUnlocked)) && !playerIsMayu) {
            const mayu = CharacterData.find(c => c.id === 'mayu');
            if (mayu) {
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
            Game.changeScene(CreditsScene);
        }
    }
};
