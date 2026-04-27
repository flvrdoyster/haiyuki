const BattleMenuSystem = {
    engine: null,
    menuItems: [],
    selectedMenuIndex: 0,
    lastStateBeforeMenu: null,

    init: function (engine) {
        this.engine = engine;
        this.constructMenu();
    },

    constructMenu: function () {
        this.menuItems = [];
        const layout = BattleConfig.BATTLE_MENU.layout;

        const p1Data = CharacterData.find(c => c.index === this.engine.playerIndex) || CharacterData[this.engine.playerIndex];

        layout.forEach(item => {
            if (item.id === 'SKILLS_PLACEHOLDER') {
                if (p1Data && p1Data.skills) {
                    p1Data.skills.forEach(skillId => {
                        const skill = SkillData[skillId];
                        if (skill) {
                            const rulesEnabled = BattleConfig.RULES.SKILLS_ENABLED;
                            const canUse = this.engine.canUseSkill(skillId, 'P1');
                            const isDisabled = !rulesEnabled || !canUse;

                            this.menuItems.push({ id: skillId, label: skill.name, type: 'SKILL', data: skill, disabled: isDisabled });
                        }
                    });
                }
            } else {
                this.menuItems.push(item);
            }
        });
    },

    toggle: function () {
        if (this.engine.currentState === this.engine.STATE_BATTLE_MENU) {
            this.engine.currentState = this.lastStateBeforeMenu || this.engine.STATE_PLAYER_TURN;
        } else {
            this.constructMenu();
            this.lastStateBeforeMenu = this.engine.currentState;
            this.engine.currentState = this.engine.STATE_BATTLE_MENU;
            this.selectedMenuIndex = 0;
        }
    },

    handleSelection: function () {
        const selectedItem = this.menuItems[this.selectedMenuIndex];
        if (!selectedItem) return;
        const selectedId = selectedItem.id;

        if (selectedId === 'HELP') {
            const yakuContainer = document.getElementById('yaku-container');
            if (yakuContainer) {
                const isHidden = yakuContainer.classList.contains('hidden');
                yakuContainer.classList.toggle('hidden');

                const yakuBtn = document.getElementById('yaku-btn');
                if (yakuBtn) {
                    yakuBtn.classList.remove('toggle-on', 'toggle-off');
                    yakuBtn.classList.add(isHidden ? 'toggle-on' : 'toggle-off');
                }

                if (isHidden) {
                    const iframe = document.getElementById('yaku-frame');
                    if (iframe) {
                        iframe.src = iframe.src;
                    }
                }
            } else {
                window.open('https://atah.io/haiyuki_manual/index.html#yaku', '_blank', 'width=640,height=800,status=no,toolbar=no');
            }
        } else if (selectedId === 'AUTO') {
            if (this.lastStateBeforeMenu === this.engine.STATE_PLAYER_TURN) {
                this.toggle();
                this.engine.performAutoTurn();
                return;
            }
        } else if (selectedId === 'RESTART') {
            if (this.engine.scene && this.engine.scene.showConfirm) {
                this.engine.scene.showConfirm(
                    '정말로 이 라운드를 다시 시작할까요?',
                    () => {
                        this.toggle();
                        this.engine.startRound();
                    },
                    () => {
                        this.toggle();
                    }
                );
            } else {
                this.toggle();
                this.engine.startRound();
            }
            return;
        } else if (selectedItem.type === 'SKILL') {
            if (selectedItem.disabled) {
                return;
            }

            this.toggle();
            this.engine.useSkill(selectedId);
            return;
        }

        this.toggle();
    }
};
