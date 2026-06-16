// Battle Configuration (Rules & UI)
// Must match the @font-face family in haiyuki.css ('KoddiUDOnGothic', weights 400/700).
// Bold is selected via the 'bold' prefix in canvas font strings, not by family name.
const FONTS = {
    regular: '"KoddiUDOnGothic"',
    bold: '"KoddiUDOnGothic"'
};

// Shared footprint for the draw button ("패 가져오기") and the win button
// ("날 수 있어!"). Flush to the canvas right edge (x + w = 640), like the battle
// menu. They never render at once (draw = WAIT_FOR_DRAW, win = PLAYER_TURN), so
// they take turns occupying this exact spot. Move them together by editing here.
// Shared geometry for the action-slot buttons: 패 가져오기 (draw) / 날 수 있어 (win) /
// 리치 걸 수 있어 (riichi). They occupy the same slot one at a time. Rather than fixed
// widths (which give uneven padding for different label lengths), each box is sized
// to its text plus a shared padding and anchored to the same right edge — so padding
// and margin are identical and only the total width differs. (Box computed in
// BattleRenderer._actionButtonRect.)
const ACTION_BUTTON_BOX = { right: 640, y: 400, h: 36, padX: 14 };

const BattleConfig = {
    // ----------------------------------------------------------------
    // Core Settings
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

        // Easy-mode player draw assist (luck smoothing): on a single draw,
        // peek the top `peek` tiles with probability `chance` and surface the
        // one that builds the highest-scoring hand. Player-favor only — the
        // CPU never gets rigged draws on any difficulty.
        DRAW_ASSIST: { chance: 1.0, peek: 6 },

        // AI competence is no longer a fixed bucket here. It is a continuous
        // skill (0..1) computed per battle from the player's difficulty band ×
        // tournament progress — see BattleEngine.computeCpuSkill / AILogic.
    },
    SPEED: {
        // Hold the drawn tile before auto-discarding in Riichi.
        // ~50 ticks ≈ 0.85s @60fps — slow enough to clearly register each draw.
        RIICHI_AUTO_DISCARD: 50,
        CPU_THINK_TIME: 24,      // Beat before the CPU draws (~0.4s) — "CPU is acting now"
        CPU_DISCARD_HOLD: 36,    // Hold between the CPU's draw and discard (~0.6s) so the
        //                          drawn tile registers before it's thrown (0 in autotest)
        ACTION_WAIT: 30,        // Wait time after Pon/Ron (ticks)
        WIN_WAIT: 80            // Wait before revealing hand on win (ticks)
    },

    // ----------------------------------------------------------------
    // Visuals & Animation
    // ----------------------------------------------------------------
    UI_BG: { path: 'bg/GAMEBG.png', color: 'rgba(34, 85, 34, 1)' },
    BG: { prefix: 'bg/', min: 0, max: 11, x: 320, y: 220, align: 'center' },
    PORTRAIT: {
        P1: { x: -34, y: 60, scale: 1, align: 'left' },
        CPU: { x: 674, y: 60, scale: 1, align: 'right' },
        baseW: 264,
        baseH: 280
    },
    // Hidden-boss masked silhouette in battle — MAYU_unknown.png (280×256) drawn
    // directly by BattleRenderer (bypasses the portrait auto-slice). Tune x/y/scale.
    MASKED_BOSS: { x: 400, y: 80, scale: 1.0 },
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
    // Table Elements
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
        hoverColor: 'rgba(255, 170, 0, 1)',
        hoverColors: ['rgba(255, 170, 0, 1)', 'rgba(156, 192, 65, 1)', 'rgba(180, 220, 255, 1)'],
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
    // UI / HUD
    // ----------------------------------------------------------------
    NAME_DISPLAY: {
        font: `bold 28px ${FONTS.bold}`,
        color: 'rgba(72, 72, 199, 1)', // Text fill color
        stroke: 'rgba(255, 255, 255, 1)', // Text border color
        strokeWidth: 3,
        P1: { x: 10, y: 324, align: 'left' },
        CPU: { x: 630, y: 324, align: 'right' }
    },
    BUFF_DISPLAY: {
        font: `bold 16px ${FONTS.bold}`,
        color: 'rgba(72, 72, 199, 1)',
        stroke: 'rgba(255, 255, 255, 1)',
        strokeWidth: 2,
        P1: { offsetX: 6, offsetY: -4 }, // Gap from Name's end
        CPU: { offsetX: 6, offsetY: -4 },
        icons: {
            discardGuard: '버린 패 방어 ',
            curseDraw: '지옥쌓기 ',
            spiritTimer: '기합 리치 ',
            guaranteedWin: '맹호일발권 '
        }
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
        color: 'rgba(255, 255, 255, 1)',
        lineHeight: 20, // Added for multi-line support
        life: 120,      // Duration in frames
        replyDelay: 0, // Response delay (ticks)
        P1: { offsetX: -20, offsetY: -86, textOffsetX: 20, textOffsetY: 0 },
        CPU: { offsetX: 20, offsetY: 86, textOffsetX: -20, textOffsetY: 0 },
        CHANCE: {
            RANDOM: 0.7,      // Neutral draw chatter (0.0 - 1.0)
            WORRY_RON: 0.7,   // Chance for worry dialogue when player is Riichi
            DRAW_GOOD: 0.7,   // Reaction when a useful tile is drawn (GOOD_DRAW)
            DRAW_BAD: 0.7     // Reaction when a useless tile is drawn (BAD_DRAW)
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
            'PON': { life: 50, scale: 1.0, anim: 'BOUNCE_UP', sound: 'audio/pon' },
            'RON': { life: 50, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/gong' },
            'TSUMO': { life: 50, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/gong' },
            'NAGARI': { life: 80, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/deal' }
        }
    },

    // ----------------------------------------------------------------
    // Menus & Interaction
    // ----------------------------------------------------------------
    // 액션 버튼 — 화면 우하단 한 슬롯에 한 번에 하나만 표시. 상태에 따라 패 가져오기
    // (draw, WAIT_FOR_DRAW) / 날 수 있어 (win) / 리치 걸 수 있어 (riichi, PLAYER_TURN)
    // 중 하나가 뜬다. 지오메트리는 셋이 공유(ACTION_BUTTON_BOX, 텍스트맞춤 폭·공통
    // 패딩/마진)하고 여기엔 라벨·스타일만. win/riichi는 눌러도 바로 실행하지 않고 배틀
    // 메뉴를 열어 고르게 하며(닫고 더 높은 역을 노릴 수 있음), draw는 패를 가져온다.
    // 키보드는 핸드 커서를 맨 오른쪽 패 너머로 옮기면 닿는다(BattleScene). 지금 어떤
    // 버튼이 떠 있는지는 단일 진입점 BattleRenderer.getActiveAction(state)가 결정한다.
    ACTION_BUTTON_BOX: ACTION_BUTTON_BOX,
    ACTION_BUTTONS: {
        draw: {
            text: "패 가져오기",
            font: `bold 16px ${FONTS.bold}`,
            cursor: 'rgba(255, 105, 180, 0.5)'
        },
        win: {
            text: "날 수 있어!",
            font: `bold 16px ${FONTS.bold}`,
            cursor: 'rgba(255, 105, 180, 0.5)'
        },
        riichi: {
            text: "리치 걸 수 있어!",
            font: `bold 16px ${FONTS.bold}`,
            cursor: 'rgba(255, 105, 180, 0.5)'
        }
    },
    // 피격 시 화면 전체 흔들림 — #game-container를 CSS translate로 위아래로 짧고 빠르게
    // 흔든다(Game.shake). mag=강도(최대 진폭, CSS px), frames=시간(지속 프레임). 매
    // 프레임 위/아래가 뒤집히고 진폭은 0까지 선형 감쇠. 여기 두 값만 바꿔 느낌 조절.
    SHAKE: { mag: 10, frames: 10 },
    BATTLE_MENU: {
        w: 140,
        h: 150,
        x: 500, // 640 - 140
        y: 330, // 480 - 150
        font: `bold 16px ${FONTS.bold}`,
        textDefault: 'rgba(255, 255, 255, 1)',
        textSelected: 'rgba(255, 255, 0, 1)',
        cursor: 'rgba(255, 105, 180, 0.5)', // HotPink 0.5
        dimmer: 'rgba(0, 0, 0, 0.5)',
        padding: 2, // Increased padding for 9-slice look
        textOffsetX: 8,
        textOffsetY: 2,
        fixedLineHeight: 24, // Fixed height per item
        separatorHeight: 8, // Height for separator items
        cursorYOffset: -6,

        // Menu Layout Definition. The 아가리/펑/리치 declaration commands are
        // prepended dynamically in constructMenu(), so this layout is just the
        // skills block and the yaku-list help below them.
        layout: [
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
        // Exchange-specific labels + key hint (commit with ESC).
        labelsExchange: { confirm: '바꾸자', cancel: '싫어', key: 'ESC' }
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
    // Audio
    // ----------------------------------------------------------------
    AUDIO: {
        // Generic Battle Sounds
        DRAW: 'audio/draw',
        DISCARD: 'audio/discard',
        HIT: 'audio/impact-1', // Default hit sound
        DAMAGE: 'audio/impact-2', // Slightly heavier default for total damage
        TICK: 'audio/tick' // Score rolling sound
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
    // Result Screen
    // ----------------------------------------------------------------
    RESULT: {
        // --- Window Configuration ---
        x: 120, y: 90, w: 400, h: 300,
        windowColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: 'rgba(255, 255, 255, 1)',
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
        yakuColor: 'rgba(255, 255, 255, 1)',
        scoreColor: 'rgba(255, 215, 0, 1)', // Gold
        resultColor: 'rgba(255, 255, 255, 1)',  // Legacy/Fallback
        subColor: 'rgba(255, 255, 0, 1)',   // Legacy/Fallback
        infoColor: 'rgba(255, 255, 255, 1)',    // Legacy/Fallback

        // --- Type Specific Configuration ---
        TYPES: {
            WIN: {
                title: "승!",
                text: "{yaku}\n데미지: {score}",
                color: "rgba(255, 255, 255, 1)",
                sound: "audio/fanfare" // Configurable Sound
            },
            LOSE: {
                title: "패!",
                text: "{yaku}\n데미지: -{score}",
                color: "rgba(255, 255, 255, 1)",
                sound: "audio/lose" // Configurable Sound
            },
            NAGARI: {
                title: "무승부!",
                text: "플레이어: {p1Status} / 상대: {cpuStatus}\n{damageMsg}",
                color: "rgba(255, 255, 255, 1)",
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
            color: 'rgba(255, 255, 255, 1)',
            lineHeight: 32    // Match main list
        }
    },

    // ----------------------------------------------------------------
    // Data & Texts
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
        MAGU_DDAERIGI: '일제공격',
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
        // 캐릭터 변형 역명 — 키는 타일 id(rin/pet 주의). 역에 들어간 캐릭터 패로 정해짐.
        PIL_SAL_GI: {
            default: '필살기',
            ataho: '맹호난무',
            rin: '유미쌍조',
            fari: '뇌격의 주문',
            smash: '백인일섬',
            pet: '대폭염의 주문',
            yuri: '선풍거합베기'
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
            rin: '선열각',
            fari: '빙인의 주문',
            smash: '쾌진격',
            pet: '폭염의 주문',
            yuri: '진공거합베기'
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
        tileBg: 'rgba(238, 238, 238, 1)',
        tileTextFont: `bold 12px ${FONTS.bold}`,
        cardBackBg: 'rgba(178, 34, 34, 1)',
        cardBackStroke: 'rgba(255, 255, 255, 1)',
        cardBackPattern: 'rgba(136, 0, 0, 1)',
        unknownBg: 'rgba(68, 68, 68, 1)',
        unknownStroke: 'rgba(136, 136, 136, 1)'
    }
};
