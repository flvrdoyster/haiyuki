// Battle Configuration (Rules & UI)
const FONTS = {
    regular: '"KoddiUDOnGothic-Regular"',
    bold: '"KoddiUDOnGothic-Bold"'
};

const BattleConfig = {
    GAME_ID: 'HAIYUKI_WEB',
    SCREEN: {
        width: 640,
        height: 480,
        centerX: 320,
        centerY: 240
    },
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
    NAME_DISPLAY: {
        font: `bold 28px ${FONTS.bold}`,
        color: '#4848c7', // Text fill color
        stroke: 'white', // Text border color
        strokeWidth: 3,
        P1: { x: 10, y: 324, align: 'left' },
        CPU: { x: 630, y: 324, align: 'right' }
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
        cpuY: 10,
        tileWidth: 40,
        tileHeight: 53,
        gap: 0,
        hoverYOffset: -10,
        hoverColor: '#ffaa00',
        hoverColors: ['#ffaa00', '#9cc041', '#b4dcff'],
        hoverBlinkSpeed: 8,
        hoverWidth: 3,
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
        // Center-Relative Offsets (Center = 320)
        // Turn = Center - Offset
        // Round = Center + Offset
        turnLabel: { offset: 60, y: 180, align: 'right' },
        turnNumber: { offset: 60, y: 200, align: 'right', pad: 2 }, // pad는 자릿수를 의미함
        roundLabel: { offset: 60, y: 180, align: 'left' },
        roundNumber: { offset: 60, y: 200, align: 'left', pad: 2 },
        numbers: { path: 'ui/number.png', w: 14, gap: 2 },
        labels: {
            turnPath: 'ui/turn.png',
            roundPath: 'ui/round.png'
        }
    },
    RIICHI_STICK: {
        path: 'ui/riichi.png',
        y: 246,
        offset: 58,            // Distance from Center (Dora)
        scale: 0.9
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
        buttonFont: `bold 16px ${FONTS.bold}`,
        helpFont: `16px ${FONTS.bold}`,

        // Colors (Match Battle Menu)
        cursor: 'rgba(255, 105, 180, 0.5)', // HotPink 0.5
        textDefault: 'white',
        textSelected: '#FFFF00',
        stroke: 'white',
        border: 'white',

        // Colors
        colors: {
        }
    },
    POPUP: {
        // Configuration for Action Callouts (Riichi, Pon, Ron, Tsumo, Nagari)
        // These use the FX system but are positioned according to these settings.
        x: 320,
        y: 200,
        scale: 1.0,
        life: 45, // Default Life
        align: 'center',

        // Sound mapping for Popups
        TYPES: {
            'RIICHI': { life: 80, anim: 'SLIDE', scale: 1.0, sound: 'audio/riichi' }, // 90 -> 70
            'PON': { life: 40, scale: 1.0, anim: 'BOUNCE_UP', sound: 'audio/pon' }, // 90 -> 60
            'RON': { life: 40, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/gong' }, // 120 -> 100
            'TSUMO': { life: 40, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/gong' }, // 120 -> 100
            'NAGARI': { life: 80, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/deal' } // 180 -> 140
        }
    },
    FX: {
        // Generic FX Animation Settings
        fadeInDuration: 3,  // Frames to fade in
        fadeOutDuration: 3, // Frames to fade out
        slideDuration: 6,   // Frames for slide animation
        zoomPulseDuration: 3, // Frames for initial zoom pulse 
        zoomSettleDuration: 3, // Frames for settling 
        zoomPeakScale: 1.2   // Peak scale factor
    },
    DIALOGUE: {
        bubblePath: 'ui/short_bubble.png',
        font: `18px ${FONTS.regular}`,
        color: 'white',
        lineHeight: 20, // Added for multi-line support
        life: 120, // Duration in frames
        P1: { offsetX: -20, offsetY: -86, textOffsetX: 20, textOffsetY: 0 },
        CPU: { offsetX: 20, offsetY: 86, textOffsetX: -20, textOffsetY: 0 }
    },

    // Legacy Sound map
    SOUNDS: {},

    // Global Audio Configuration
    AUDIO: {
        // Generic Battle Sounds
        DRAW: 'audio/draw',
        DISCARD: 'audio/discard',
        HIT: 'audio/hit', // Default hit sound
        DAMAGE: 'audio/hit', // Used if specific damage sound needed
    },

    // Background Music Configuration
    BGM: {
        BASIC: 'audio/bgm_basic',
        TENSION: 'audio/bgm_tension',
        SHOWDOWN: 'audio/bgm_showdown',
        WIN: 'audio/bgm_win',
        LOSE: 'audio/bgm_lose',
        ENDING: 'audio/bgm_ending',
        TITLE: 'audio/bgm_title',
        CHRSEL: 'audio/bgm_chrsel'
    },

    RESULT: {
        // --- Window Configuration ---
        x: 120, y: 90, w: 400, h: 300,
        windowColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: 'white',
        borderWidth: 2,

        // --- Title Configuration ---
        titleX: 320,         // Centered horizontally
        titleY: 140,         // Title Y Position
        titleFont: `bold 36px ${FONTS.bold}`,

        // --- Layout Constants (Split View) ---
        yakuListX: 140,      // Left Column Start X
        scoreListX: 500,     // Right Column Align X (Right Aligned)
        yakuY: 180,          // Start Y for Yaku List
        lineHeight: 32,      // Vertical spacing between items
        separatorGap: 15,    // Gap before separator line
        damageGap: 15,       // Gap after separator line before "Damage" text
        pressSpaceOffset: -40, // Offset Y for 'Press Space' from bottom of window

        // --- Fonts ---
        yakuFont: `bold 20px ${FONTS.bold}`,
        scoreFont: `bold 20px ${FONTS.bold}`,
        infoFont: `24px ${FONTS.regular}`,

        // --- Colors ---
        yakuColor: 'white',
        scoreColor: '#FFD700', // Gold
        resultColor: 'white',  // Legacy/Fallback
        subColor: '#FFFF00',   // Legacy/Fallback
        infoColor: 'white',    // Legacy/Fallback

        // --- Type Specific Configuration ---
        TYPES: {
            WIN: {
                title: "승!",
                text: "{yaku}\n데미지: {score}",
                color: "white",
                sound: "audio/fanfare" // Configurable Sound
            },
            LOSE: {
                title: "패!",
                text: "{yaku}\n데미지: -{score}",
                color: "white",
                sound: "audio/lose" // Configurable Sound
            },
            NAGARI: {
                title: "무승부!",
                text: "플레이어: {p1Status} / 상대: {cpuStatus}\n{damageMsg}",
                color: "white",
                sound: "audio/wrong" // Configurable Sound
            },
            MATCH_WIN: {
                title: "다음 상대로!",
                color: "gold",
                sound: "audio/victory", // Configurable Sound
                historyFont: `16px ${FONTS.regular}`,
                historyLineHeight: 20,
                historyMaxVisible: 7,
                historyY: 200
            }
        },
        TEXTS: {
            pressSpace: "계속 진행하기"
        },

        // Bonus Display Configuration
        BONUS: {
            font: `bold 20px ${FONTS.bold}`,
            color: 'white',
            lineHeight: 32    // Match main list
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
        tileTextFont: `bold 12px ${FONTS.bold}`,
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
        font: `bold 16px ${FONTS.bold}`,
        dimmer: 'rgba(0, 0, 0, 0.5)',
        cursor: 'rgba(255, 105, 180, 0.5)',
        textColor: 'white'
    },
    BATTLE_MENU: {
        w: 140,
        h: 150,
        x: 500, // 640 - 140
        y: 330, // 480 - 150
        font: `bold 16px ${FONTS.bold}`,
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
