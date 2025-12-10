
window.UIPreview = {
    init: function () {
        console.log("UI Preview Initialized");
        this.bindEvents();
    },

    bindEvents: function () {
        document.getElementById('btn-title').onclick = () => Game.changeScene(TitleScene);
        document.getElementById('btn-select').onclick = () => Game.changeScene(CharacterSelectScene);

        document.getElementById('btn-encounter').onclick = () => {
            Game.changeScene(EncounterScene, {
                playerIndex: 0, // Ataho
                cpuIndex: 1,    // Rinxiang
                mode: 'STORY'
            });
        };
        document.getElementById('btn-encounter-mayu').onclick = () => {
            Game.changeScene(EncounterScene, {
                playerIndex: 0, // Ataho
                cpuIndex: 6,    // Mayu
                mode: 'STORY'
            });
        };

        document.getElementById('btn-battle-mock').onclick = () => {
            this.startMockBattle();
        };

        document.getElementById('btn-battle-mayu').onclick = () => {
            this.startMockBattle(0, 6); // Ataho vs Mayu
        };

        document.getElementById('btn-result-win').onclick = () => {
            this.startMockResult('WIN');
        };

        document.getElementById('btn-result-lose').onclick = () => {
            this.startMockResult('LOSE');
        };

        document.getElementById('btn-ending').onclick = () => {
            Game.changeScene(EndingScene, { playerIndex: 0 });
        };

        document.getElementById('btn-herecome').onclick = () => {
            Game.changeScene(HerecomeScene, {
                playerIndex: 0,
                cpuIndex: 6, // Mayu
                defeatedOpponents: []
            });
        };

        document.getElementById('btn-credits').onclick = () => {
            Game.changeScene(CreditsScene);
        };
    },

    startMockBattle: function (p1Index = 0, cpuIndex = 1) {
        // Create a Mock Scene that mimics the data structure required by BattleRenderer
        const MockBattle = {
            // Mock Logic Constants
            STATE_PLAYER_TURN: 4,
            STATE_ACTION_SELECT: 8,
            STATE_WIN: 5,
            STATE_LOSE: 6,
            STATE_NAGARI: 7,
            STATE_BATTLE_MENU: 20,

            currentState: 4, // PLAYER_TURN

            p1Character: null,
            cpuCharacter: null,

            p1: {
                hp: 8000, maxHp: 10000, mp: 50, maxMp: 100,
                hand: this.createMockHand(13),
                openSets: [
                    { tiles: [this.createTile('1m'), this.createTile('1m'), this.createTile('1m')] }
                ]
            },
            cpu: {
                hp: 9500, maxHp: 10000, mp: 20, maxMp: 100,
                hand: this.createMockHand(13),
                openSets: [],
                isRevealed: false
            },

            turnCount: 5,
            currentRound: 1,
            doras: [this.createTile('1p')],
            uraDoraRevealed: false,
            discards: [
                this.createTile('1s', 'P1'), this.createTile('2s', 'CPU'),
                this.createTile('9m', 'P1'), this.createTile('5z', 'CPU')
            ],

            bgPath: 'bg/01.png',

            activeFX: [],

            init: function () {
                const idMap = {
                    'ataho': 'ATA', 'rinxiang': 'RIN', 'smash': 'SMSH',
                    'petum': 'PET', 'fari': 'FARI', 'yuri': 'YURI',
                    'mayu': 'MAYU'
                };

                const getAnimConfig = (charData) => {
                    if (!charData) return null;
                    const prefix = idMap[charData.id] || charData.id.toUpperCase();
                    const base = `face/${prefix}_base.png`;
                    if (Assets.get(base)) {
                        return { base: base };
                    }
                    return null;
                };

                // Initialize Portraits
                this.p1Character = new PortraitCharacter(CharacterData[p1Index], { ...BattleConfig.PORTRAIT.P1, isBattle: true }, false);
                this.p1Character.setAnimationConfig(getAnimConfig(CharacterData[p1Index]));

                this.cpuCharacter = new PortraitCharacter(CharacterData[cpuIndex], { ...BattleConfig.PORTRAIT.CPU, isBattle: true }, true);
                this.cpuCharacter.setAnimationConfig(getAnimConfig(CharacterData[cpuIndex]));

                // Initialize Renderer if needed (it's stateless mostly)
            },

            update: function () {
                if (this.p1Character) this.p1Character.update();
                if (this.cpuCharacter) this.cpuCharacter.update();
            },

            draw: function (ctx) {
                BattleRenderer.draw(ctx, this);
            }
        };

        MockBattle.init();
        Game.currentScene = MockBattle;
    },

    startMockResult: function (type) {
        // Read bonus configuration
        const bonuses = [];
        let bonusScore = 0;

        if (document.getElementById('bonus-tenho').checked) {
            bonuses.push('Tenho');
            bonusScore += 800;
        }
        if (document.getElementById('bonus-haitei').checked) {
            bonuses.push('Haitei');
            bonusScore += 800;
        }
        if (document.getElementById('bonus-houtei').checked) {
            bonuses.push('Houtei');
            bonusScore += 800;
        }
        if (document.getElementById('bonus-dora').checked) {
            const doraCount = parseInt(document.getElementById('bonus-dora-count').value) || 0;
            if (doraCount > 0) {
                bonuses.push(`Dora x${doraCount}`);
                bonusScore += (400 * doraCount);
            }
        }

        const baseScore = (type === 'WIN') ? 8000 : 12000;
        const finalScore = baseScore + bonusScore;

        const MockResult = {
            // Mock Logic Constants
            STATE_WIN: 5,
            STATE_LOSE: 6,
            STATE_NAGARI: 7,

            currentState: (type === 'WIN') ? 5 : 6,
            stateTimer: 180, // Force "Press Space" to appear

            resultInfo: {
                type: type,
                score: finalScore,
                yakuName: (type === 'WIN') ? "맹호일발권\\n올스타즈" : "국사무쌍",
                bonuses: bonuses,
                bonusScore: bonusScore,
                p1Status: (type === 'WIN') ? "WIN" : "LOSE",
                cpuStatus: (type === 'WIN') ? "LOSE" : "WIN",
                damageMsg: ""
            },

            draw: function (ctx) {
                // Background placeholder
                ctx.fillStyle = '#223322';
                ctx.fillRect(0, 0, 640, 480);

                BattleRenderer.drawResult(ctx, this);
            },

            update: function () { }
        };
        Game.currentScene = MockResult;
    },

    createMockHand: function (count) {
        const hand = [];
        const types = ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z'];
        for (let i = 0; i < count; i++) {
            const t = types[i % types.length];
            hand.push(this.createTile(t));
        }
        return hand;
    },

    createTile: function (type, owner = null) {
        return {
            type: type,
            img: `tiles/${type}.png`,
            owner: owner,
            isRiichi: false
        };
    }
};

// Wait for Assets to load before initializing UI
const checkLoad = setInterval(() => {
    // Check if Game and Assets are ready. 
    // Assets.loaded is not directly exposed as boolean, but we can check if loadedCount > 0 and loading is done?
    // Game.init calls Assets.load which has a callback.
    // We can hook into Game.currentScene.
    if (Game.currentScene) {
        clearInterval(checkLoad);
        UIPreview.init();
    }
}, 200);
