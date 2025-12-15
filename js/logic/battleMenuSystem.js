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
        // Construct Dynamic Battle Menu based on Config
        this.menuItems = [];
        const layout = BattleConfig.BATTLE_MENU.layout;

        // Access player data via engine
        // We need to resolve p1Data similar to how Engine did it, 
        // or Engine should pass p1Data to init? 
        // Engine init happens first. We can access CharacterData using engine.playerIndex

        const p1Data = CharacterData.find(c => c.index === this.engine.playerIndex) || CharacterData[this.engine.playerIndex];

        layout.forEach(item => {
            if (item.id === 'SKILLS_PLACEHOLDER') {
                if (p1Data && p1Data.skills) {
                    p1Data.skills.forEach(skillId => {
                        const skill = SkillData[skillId];
                        if (skill) {
                            const isDisabled = !BattleConfig.RULES.SKILLS_ENABLED;
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

                // Sync toolbar button state
                const yakuBtn = document.getElementById('yaku-btn');
                if (yakuBtn) {
                    yakuBtn.classList.remove('toggle-on', 'toggle-off');
                    yakuBtn.classList.add(isHidden ? 'toggle-on' : 'toggle-off');
                }

                if (isHidden) {
                    // Reload iframe src to force scroll to anchor
                    const iframe = document.getElementById('yaku-frame');
                    if (iframe) {
                        iframe.src = iframe.src;
                    }
                }
            } else {
                window.open('https://atah.io/haiyuki_manual/index.html#yaku', '_blank', 'width=640,height=800,status=no,toolbar=no');
            }
        } else if (selectedId === 'AUTO') {
            if (this.lastStateBeforeMenu !== this.engine.STATE_PLAYER_TURN) {
                // Optional: Play error sound
            } else {
                this.toggle(); // Close menu
                this.engine.performAutoTurn();
                return; // Prevent double toggle
            }
        } else if (selectedId === 'RESTART') {
            // Restart Round Strategy - Show in-game confirmation
            // Restart Round Strategy - Show Local Confirmation
            if (this.engine.scene && this.engine.scene.showConfirm) {
                this.engine.scene.showConfirm(
                    '정말로 이 라운드를 다시 시작할까요?',
                    () => {
                        this.toggle(); // Close menu
                        this.engine.startRound();
                    },
                    () => {
                        this.toggle(); // Close menu
                    }
                );
            } else {
                // Fallback if scene not linked
                this.toggle();
                this.engine.startRound();
            }
            return; // Don't auto-close menu, let dialog handle it
        } else if (selectedItem.type === 'SKILL') {
            if (selectedItem.disabled) {
                // Play error sound?
                return; // Do not close menu
            }

            // Delegate Skill Execution to Engine
            // this.engine.useSkill(selectedId);
            // Placeholder until Engine implements useSkill
        }

        this.toggle();
    }
};
