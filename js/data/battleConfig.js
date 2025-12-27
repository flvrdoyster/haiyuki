// Battle Configuration (Rules & UI)
const FONTS = {
    regular: '"KoddiUDOnGothic-Regular"',
    bold: '"KoddiUDOnGothic-Bold"'
};

const BattleConfig = {
    // ----------------------------------------------------------------
    // 1. Core Settings
    // ----------------------------------------------------------------
    GAME_ID: 'HAIYUKI_WEB',
    SCREEN: {
        width: 640,
        height: 480,
        centerX: 320,
        centerY: 240
    },
    RULES: {
        INITIAL_HP: 10000,
        INITIAL_MP: 100,
        NAGARI_DAMAGE: 1000,
        SKILLS_ENABLED: true,

        // AI Difficulty Settings
        // 0: EASY   - Discard: Random from Top 4 (Frequent mistakes)
        //             Action: 50% chance to miss Riichi/Pon opportunities
        // 1: NORMAL - Discard: Weighted Random from Top 3 (Standard personality behavior)
        //             Action: Standard profile chance
        // 2: HARD   - Discard: Always Top 1 (Optimal play)
        //             Action: Standard profile chance (Optimal)
        AI_DIFFICULTY: 2
    },
    SPEED: {
        RIICHI_AUTO_DISCARD: 40, // Frames to wait before auto-discarding in Riichi
        CPU_THINK_TIME: 80       // Frames to wait for CPU action
    },

    // ----------------------------------------------------------------
    // 2. Visuals & Animation
    // ----------------------------------------------------------------
    UI_BG: { path: 'bg/GAMEBG.png', color: '#225522' },
    BG: { prefix: 'bg/', min: 0, max: 11, x: 320, y: 220, align: 'center' },
    PORTRAIT: {
        P1: { x: -34, y: 60, scale: 1, align: 'left' },
        CPU: { x: 674, y: 60, scale: 1, align: 'right' },
        baseW: 264,
        baseH: 280
    },
    ANIMATION: {
        BLINK_SPEED: 4,       // Frames per blink frame
        TALK_SPEED: 10,        // Frames per mouth frame
        BLINK_INTERVAL: 200    // Interval between blinks (frames)
    },
    FX: {
        // Generic FX Animation Settings
        fadeInDuration: 4,  // Frames to fade in
        fadeOutDuration: 12, // Frames to fade out
        slideDuration: 20,   // Frames for slide animation

        // ZOOM_IN (Pop) Settings
        zoomPopDuration: 16,
        zoomOvershoot: 2.0,

        // BOUNCE_UP Settings
        bounceDropDuration: 10,
        bounceUpDuration: 10,
        bounceStartOffsetX: -200,
        bounceStartOffsetY: -200,
        bounceImpactOffsetX: -30,
        bounceFloorOffsetY: 80
    },

    // ----------------------------------------------------------------
    // 3. Table Elements
    // ----------------------------------------------------------------
    HAND: {
        playerY: 410,     // Unified Player Hand Y Position
        openSetRightAnchor: 620, // Right padding/anchor for open sets
        cpuY: 10,
        tileWidth: 40,
        tileHeight: 53,
        // Spacing
        tileGap: 0,       // Standard gap between tiles
        drawGap: 10,      // Gap for newly drawn tile
        sectionGap: 10,   // Gap between Hand and Open Sets

        hoverYOffset: -10,
        hoverColor: '#ffaa00',
        hoverColors: ['#ffaa00', '#9cc041', '#b4dcff'],
        hoverBlinkSpeed: 8,
        hoverWidth: 3
    },
    DISCARDS: {
        P1: { x: 214, y: 280 },
        CPU: { x: 214, y: 100 },
        tileWidth: 20,
        tileHeight: 27,
        gap: 2,
        rowMax: 10
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
    RIICHI_STICK: {
        path: 'ui/riichi.png',
        y: 246,
        offset: 58,            // Distance from Center (Dora)
        scale: 0.9
    },

    // ----------------------------------------------------------------
    // 4. UI / HUD
    // ----------------------------------------------------------------
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
    DIALOGUE: {
        bubblePath: 'ui/short_bubble.png',
        font: `18px ${FONTS.regular}`,
        color: 'white',
        lineHeight: 20, // Added for multi-line support
        life: 160, // Duration in frames
        replyDelay: 360, // Response delay in ms
        P1: { offsetX: -20, offsetY: -86, textOffsetX: 20, textOffsetY: 0 },
        CPU: { offsetX: 20, offsetY: 86, textOffsetX: -20, textOffsetY: 0 },
        CHANCE: {
            RANDOM: 0.3,      // Chance for random dialogue (0.0 - 1.0)
            WORRY_RON: 0.6    // Chance for worry dialogue when player is Riichi
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
            'RIICHI': { life: 80, anim: 'SLIDE', scale: 1.0, sound: 'audio/riichi' },
            'PON': { life: 40, scale: 1.0, anim: 'BOUNCE_UP', sound: 'audio/pon' },
            'RON': { life: 40, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/gong' },
            'TSUMO': { life: 40, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/gong' },
            'NAGARI': { life: 80, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/deal' }
        }
    },

    // ----------------------------------------------------------------
    // 5. Menus & Interaction
    // ----------------------------------------------------------------
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
    DRAW_BUTTON: {
        x: 500,
        y: 400,
        w: 100,
        h: 36,
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
    },

    CONFIRM: {
        y: 200,
        minWidth: 200,
        minHeight: 120, // Slightly taller to fit 2 lines comfortably
        padding: { x: 20, y: 20 }, // Increased horizontal padding
        font: `16px ${FONTS.regular}`,
        lineHeight: 24,
        buttonHeight: 32, // Slightly smaller buttons
        buttonWidth: 90,
        buttonGap: 10,
        buttonMarginTop: 20,
        labels: { yes: '그래', no: '아니' }, // Default labels
        labelsExchange: { confirm: '바꾸자', cancel: '싫어' } // Exchange specific
    },

    MESSAGES: {
        // Explicit messages to avoid generic "을(를)" post-positions
        SKILL_CONFIRM: {
            // Ataho
            'TIGER_STRIKE': (cost) => `맹호일발권을 사용할까요?`,
            'HELL_PILE': (cost) => `지옥쌓기를 사용할까요?`,

            // Rinxiang
            'WATER_MIRROR': (cost) => `수경을 사용할까요?`,
            'DORA_BOMB': (cost) => `도라폭진을 사용할까요?`,

            // Fari
            'RECOVERY': (cost) => `회복을 사용할까요?`,
            'DISCARD_GUARD': (cost) => `버린 패 방어를 사용할까요?`,

            // Smash 
            'EXCHANGE_TILE': (cost) => `바꿀 패를 선택하세요.`,
            'EXCHANGE_RON': (cost) => `론 패 교환을 사용할까요?`,

            // Mayu
            'PAINT_TILE': (cost) => `덧칠할 패를 선택하세요.`,

            // Petum
            'CRITICAL': (cost) => `크리티컬을 사용할까요?`,
            'LAST_CHANCE': (cost) => `라스트 찬스를 사용할까요?`,

            // Yuri
            'SPIRIT_RIICHI': (cost) => `기합 리치를 사용할까요?`,
            'SUPER_IAI': (cost) => `초 거합베기를 사용할까요?`,

            // Fallback (Functionally used if ID missing)
            'DEFAULT': (name, cost) => `${name} 스킬을 사용할까요?`
        }
    },


    // ----------------------------------------------------------------
    // 6. Audio
    // ----------------------------------------------------------------
    AUDIO: {
        // Generic Battle Sounds
        DRAW: 'audio/draw',
        DISCARD: 'audio/discard',
        HIT: 'audio/hit', // Default hit sound
        DAMAGE: 'audio/hit', // Used if specific damage sound needed
    },
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
    // Legacy Sound map
    SOUNDS: {},

    // ----------------------------------------------------------------
    // 7. Result Screen
    // ----------------------------------------------------------------
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
        scoreX: 320,         // Legacy/MatchWin Center X
        scoreY: 180,         // Legacy/MatchWin Start Y
        infoLineHeight: 30,  // Legacy Line Height
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
                title: "{winner} 승리!",
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

    // ----------------------------------------------------------------
    // 8. Data & Texts
    // ----------------------------------------------------------------
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
    }
};
