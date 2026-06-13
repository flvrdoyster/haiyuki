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

        // Declaration commands (아가리/펑/리치) — original-game style fixed commands.
        // Always listed and greyed when not currently available (like skills), rather
        // than a forced popup. 아가리 = win = TSUMO (RON is riichi-auto, so it never
        // surfaces here). The bound action comes from the engine's possibleActions;
        // when absent the item is disabled and selecting it does nothing.
        const pa = this.engine.possibleActions || [];
        const findAction = type => pa.find(a => a.type === type) || null;
        [
            { id: 'TSUMO', label: '아가리' },
            { id: 'PON', label: '펑' },
            { id: 'RIICHI', label: '리치' }
        ].forEach(decl => {
            const action = findAction(decl.id);
            this.menuItems.push({ id: decl.id, label: decl.label, type: 'ACTION', action: action, disabled: !action });
        });

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
        } else if (selectedItem.type === 'SKILL') {
            if (selectedItem.disabled) {
                return;
            }

            this.toggle();
            this.engine.useSkill(selectedId);
            return;
        } else if (selectedItem.type === 'ACTION') {
            // Declaration (아가리/펑/리치) chosen from the menu → run its effect.
            // Greyed (unavailable) commands do nothing, same as disabled skills.
            if (selectedItem.disabled || !selectedItem.action) {
                return;
            }
            this.toggle();
            this.engine.executeAction(selectedItem.action);
            return;
        }

        this.toggle();
    }
};
