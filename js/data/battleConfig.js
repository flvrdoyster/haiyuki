// Battle Configuration (Rules & UI)
const BattleConfig = {
    RULES: {
        INITIAL_HP: 10000,
        NAGARI_DAMAGE: 1000,
        SKILLS_ENABLED: false,

        // AI Difficulty Settings
        // 0: EASY   - Discard: Random from Top 4 (Frequent mistakes)
        //             Action: 50% chance to miss Riichi/Pon opportunities
        // 1: NORMAL - Discard: Weighted Random from Top 3 (Standard personality behavior)
        //             Action: Standard profile chance
        // 2: HARD   - Discard: Always Top 1 (Optimal play)
        //             Action: Standard profile chance (Optimal)
        AI_DIFFICULTY: 2
    },
    UI_BG: { path: 'bg/GAMEBG.png', color: '#225522' },
    BG: { prefix: 'bg/', min: 0, max: 11, x: 320, y: 220, align: 'center' },
    PORTRAIT: {
        P1: { x: -34, y: 60, scale: 1, align: 'left' },
        CPU: { x: 674, y: 60, scale: 1, align: 'right' },
        baseW: 264,
        baseH: 280
    },
    BARS: {
        width: 140, height: 10,
        hpPath: 'ui/bar_blue.png',
        mpPath: 'ui/bar_yellow.png',
        P1: { x: 41, y: 347 },
        CPU: { x: 459, y: 347 },
        gap: 8, // Gap between HP and MP bars
    },
    HAND: {
        y: 400,
        playerHandY: 400, // Fixed Y for player hand
        openSetY: 400,    // Align with player hand Y
        openSetRightAnchor: 620, // Right padding/anchor for open sets
        cpuY: 20,
        tileWidth: 40,
        tileHeight: 53,
        gap: 0,
        hoverYOffset: -10,
        hoverColor: 'yellow',
        hoverWidth: 2,
        groupGap: 10,
        // Open Set specific settings
        openSetTileGap: 0, // Gap between tiles within a set (e.g. Pon)
        openSetGap: 10     // Gap between open sets or between hand and open sets
    },
    DORA: {
        x: 320, y: 180, // x is now center if align is center
        gap: 5,
        align: 'center',
        tileWidth: 40,
        tileHeight: 53,
        tileXOffset: 10, // New: Tile X alignment relative to frame
        tileYOffset: -6, // New: Tile Y alignment relative to frame
        frame: { path: 'ui/dora.png', xOffset: 0, yOffset: 40, align: 'center' }
    },
    INFO: {
        // Explicit coordinates for adjustable layout
        turnLabel: { x: 230, y: 180 },
        turnNumber: { x: 230, y: 200, align: 'center', pad: 2 },
        roundLabel: { x: 420, y: 180 },
        roundNumber: { x: 420, y: 200, align: 'center', pad: 2 },
        numbers: { path: 'ui/number.png', w: 14, gap: 2 },
        labels: { path: 'ui/turn_round.png' }
    },
    ACTION: {
        // Menu Layout
        y: 320,
        btnWidth: 80,
        btnHeight: 32,
        gap: 4,
        padding: 2, // New: Frame padding
        dimmer: 'rgba(0, 0, 0, 0.5)', // New: Dimmer color

        // Fonts
        buttonFont: 'bold 16px "KoddiUDOnGothic-Bold"',
        helpFont: '16px "KoddiUDOnGothic-Bold"',

        // Colors (Match Battle Menu)
        cursor: 'rgba(255, 105, 180, 0.5)', // HotPink 0.5
        textDefault: 'white',
        textSelected: '#FFFF00',
        stroke: 'white', // Keep stroke for button border if needed, or remove? 
        // User said "Button UI... handle directly", let's keep stroke option available but maybe not used if matching Battle Menu style exactly?
        // Battle menu has no button borders. 
        // But Action menu implies "Buttons". 
        // Let's keep `stroke` just in case, or default to none.
        // But the user said "Same as Battle Menu" for SELECTION.
        border: 'white', // For unselected buttons? Or just remove borders?
        // "ACTION button UI ... handle directly" implies I should probably render them as buttons (boxes).
        // But "Selection color ... same as Battle Manu" implies the pink cursor.
        // Let's provide the palette.

        // Colors
        colors: { // Deprecated by above, but keeping structure for now or replacing? 
            // Instruction says "Add setup part". 
            // I will overwrite `colors` with flat properties for cleaner access like BATTLE_MENU.
        }
    },
    POPUP: {
        // Configuration for Action Callouts (Riichi, Pon, Ron, Tsumo, Nagari)
        // These use the FX system but are positioned according to these settings.
        x: 320,
        y: 240,
        scale: 1.0,
        align: 'center',

        // Sound mapping for Popups
        // Now merging Visual Params here too for centralized control
        TYPES: {
            'RIICHI': { slideFrom: 'LEFT', life: 60, sound: 'audio/riichi' },
            'PON': { sound: 'audio/pon' },
            'RON': { sound: 'audio/fanfare' },
            'TSUMO': { life: 120, anim: 'ZOOM_IN', sound: 'audio/fanfare' },
            'NAGARI': { sound: 'audio/wrong' } // Default
        },

        // Legacy Sound map (if needed, but TYPES should supersede)
        SOUNDS: {}
    },
    RESULT: {
        // Window Layout
        x: 120, y: 90, w: 400, h: 300,

        // Colors
        dimmerColor: 'rgba(0, 0, 0, 0.5)',
        windowColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: 'white',
        borderWidth: 2,
        dimmer: 'rgba(0, 0, 0, 0.5)', // New: Inner dimmer for frame

        // Fonts & Text Colors
        titleFont: 'bold 48px "KoddiUDOnGothic-Bold"',
        scoreFont: 'bold 32px "KoddiUDOnGothic-Bold"',
        infoFont: '24px "KoddiUDOnGothic-Regular"',
        resultColor: 'white',
        subColor: '#FFFF00',
        infoColor: 'white',
        // Layout
        titleX: 320, titleY: 150,
        scoreX: 320, scoreY: 220,
        infoX: 320, infoY: 260,
        pressSpaceOffset: -40, // Distance below frame
        infoLineHeight: 30,

        // Configuration for Result Types
        TYPES: {
            WIN: {
                title: "승!",
                text: "{yaku}\n데미지: {score}",
                color: "white"
            },
            LOSE: {
                title: "패!",
                text: "{yaku}\n데미지: -{score}",
                color: "white"
            },
            NAGARI: {
                title: "무승부!",
                text: "플레이어: {p1Status} / 상대: {cpuStatus}\n{damageMsg}",
                color: "white"
            },
            MATCH_WIN: {
                title: "다음 상대로!",
                color: "gold"
            },
            MATCH_LOSE: {
                title: "게임 오버",
                color: "white"
            }
        },
        TEXTS: {
            pressSpace: "계속 진행하기"
        },

        // Bonus Display Configuration
        BONUS: {
            font: '16px "Noto Sans KR", sans-serif',
            color: '#FFD700', // Gold
            startYOffset: 10, // Offset from last info line
            lineHeight: 16,   // Spacing between bonus lines
            prefix: '+ '      // Prefix for each bonus line
        }
    },

    // Yaku Names for Configuration
    YAKU_NAMES: {
        IP_E_DAM: '입에 담을 수도 없는 엄청난 기술',

        BI_O_UI: '비오의',
        PAL_BO_CHAE: '팔보채',

        O_UI: '오의',
        JU_HO: '주호',
        SUN_IL_SAEK: {
            red: '순 적일색',
            blue: '순 청일색',
            yellow: '순 황일색'
        },
        YUK_BEOP_JEON_SEO: '육법전서',

        JIN_MAYU: '진 눈썹개',
        CROSS_COMBINATION: '크로스 콤비네이션',
        MAGU_DDAERIGI: '마구 때리기',
        CHO_IL_SAEK: {
            red: '초 적일색',
            blue: '초 청일색',
            yellow: '초 황일색'
        },
        NAM_TANG: '남탕',
        YEO_TANG: '여탕',
        CHWI_HO_JEON: '취호전',
        PO_MUL_JANG: '포물장',
        JAYU_BAKAE_PYEONGDEUNG: '자유 박애 평등',
        PIL_SAL_GI: {
            default: '필살기',
            ataho: '맹호난무',
            rinxiang: '유미쌍조',
            fari: '뇌격의 주문',
            smash: '백인일섬',
            petum: '대폭염의 주문',
            yuri: '선풍거합베기',
            mayu: '필살기'
        },
        SA_CHEON_YO_RI: '사천요리',

        SPECIAL_COMBINATION: '스페셜 콤비네이션',
        CHO_MAYU: '초 눈썹개',
        BYEON_TAE_GAE: '변태개',
        IL_SAEK: {
            red: '적일색',
            blue: '청일색',
            yellow: '황일색'
        },

        MAYU: '눈썹개',
        DOUBLE_COMBINATION: '더블 콤비네이션',
        COMBINATION: '콤비네이션',
        SAEK_HANA_SSIK: '색 하나씩',
        JANG_GI: {
            default: '장기',
            ataho: '호격권',
            rinxiang: '선열각',
            fari: '빙인의 주문',
            smash: '쾌진격',
            petum: '폭염의 주문',
            yuri: '진공거합베기',
            mayu: '장기'
        },
        SAM_DO_RIP: '삼도립',
        ALL_STARS: '올스타즈',
        SAM_YEON_GYEOK: '삼연격'
    },

    // Status Texts (Tenpai/Noten/Damage)
    STATUS_TEXTS: {
        TENPAI: "텐파이",
        NOTEN: "노텐",
        DAMAGE_CPU: "COM {damage}",
        DAMAGE_PLAYER: "MAN {damage}",
        NO_DAMAGE: "노 데미지"
    },

    FALLBACK: {
        tileBg: '#EEE',
        tileTextFont: '12px Arial',
        cardBackBg: '#B22222',
        cardBackStroke: '#FFFFFF',
        cardBackPattern: '#880000',
        unknownBg: '#444',
        unknownStroke: '#888'
    },
    DISCARDS: {
        P1: { x: 214, y: 280 },
        CPU: { x: 214, y: 100 },
        tileWidth: 20,
        tileHeight: 27,
        gap: 2,
        rowMax: 10
    },
    DRAW_BUTTON: {
        x: 270,
        y: 280,
        w: 100,
        h: 40,
        text: "패 가져오기",
        font: 'bold 16px "KoddiUDOnGothic-Bold"',
        dimmer: 'rgba(0, 0, 0, 0.5)',
        cursor: 'rgba(255, 105, 180, 0.5)',
        textColor: 'white'
    },
    BATTLE_MENU: {
        w: 140,
        h: 150,
        x: 500, // 640 - 140
        y: 330, // 480 - 150
        font: 'bold 16px "KoddiUDOnGothic-Bold"',
        textDefault: 'white',
        textSelected: '#FFFF00',
        cursor: 'rgba(255, 105, 180, 0.5)', // HotPink 0.5
        dimmer: 'rgba(0, 0, 0, 0.5)',
        padding: 2, // Increased padding for 9-slice look
        textOffsetX: 8,
        textOffsetY: 2,
        fixedLineHeight: 24, // Fixed height per item
        separatorHeight: 8, // Height for separator items
        cursorYOffset: -6,

        // Menu Layout Definition
        layout: [
            { id: 'AUTO', label: '자동 선택' },
            { id: 'RESTART', label: '다시 시작' },
            { type: 'SEPARATOR' },
            { id: 'SKILLS_PLACEHOLDER' }, // Insert Skills Here
            { type: 'SEPARATOR' },
            { id: 'HELP', label: '역 일람' }
        ]
    }
};
