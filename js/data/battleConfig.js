// haiyuki.css @font-face 패밀리('KoddiUDOnGothic')와 일치해야 함. 굵기는 family가 아닌 canvas font 'bold' 접두어로 결정.
const FONTS = {
    regular: '"KoddiUDOnGothic"',
    bold: '"KoddiUDOnGothic"'
};

// 패 가져오기/날 수 있어/리치 걸 수 있어 세 버튼이 같은 슬롯을 공유. 폭은 텍스트+padX로 가변, 오른쪽 끝만 고정. (BattleRenderer._actionButtonRect)
const ACTION_BUTTON_BOX = { right: 640, y: 400, h: 36, padX: 14 };

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
        INITIAL_MP: 100,
        NAGARI_DAMAGE: 1000,
        SKILLS_ENABLED: true,

        // 플레이어 운 보정: chance 확률로 상위 peek장을 들여다보고 최고득점 패를 꺼냄. CPU는 적용 안 됨.
        DRAW_ASSIST: { chance: 1.0, peek: 20 },
        // AI 실력은 여기 없음 — BattleEngine.computeCpuSkill / AILogic에서 연속값(0..1)으로 산출.
    },
    SPEED: {
        // ~50 ticks ≈ 0.85s @60fps — 리치 자동 버림 전 드로 패 인지 여유
        RIICHI_AUTO_DISCARD: 50,
        CPU_THINK_TIME: 24,      // CPU 드로 전 간격 (~0.4s)
        CPU_DISCARD_HOLD: 36,    // CPU 드로→버림 간격 (~0.6s); autotest에선 0
        ACTION_WAIT: 30,
        WIN_WAIT: 80
    },

    UI_BG: { path: 'bg/GAMEBG.png', color: 'rgba(34, 85, 34, 1)' },
    BG: { prefix: 'bg/', min: 0, max: 11, x: 320, y: 220, align: 'center' },
    PORTRAIT: {
        P1: { x: -34, y: 60, scale: 1, align: 'left' },
        CPU: { x: 674, y: 60, scale: 1, align: 'right' },
        baseW: 264,
        baseH: 280
    },
    // MAYU_unknown.png(280×256) — BattleRenderer가 portrait 슬라이스 우회하여 직접 그림
    MASKED_BOSS: { x: 400, y: 80, scale: 1.0 },
    ANIMATION: {
        BLINK_SPEED: 4,
        TALK_SPEED: 10,
        BLINK_INTERVAL: 200
    },
    FX: {
        fadeInDuration: 4,
        fadeOutDuration: 12,
        slideDuration: 20,
        zoomPopDuration: 16,
        zoomOvershoot: 2.0,
        bounceDropDuration: 10,
        bounceUpDuration: 10,
        bounceStartOffsetX: -200,
        bounceStartOffsetY: -200,
        bounceImpactOffsetX: -30,
        bounceFloorOffsetY: 80
    },

    HAND: {
        playerY: 410,
        openSetRightAnchor: 620,
        cpuY: 10,
        tileWidth: 40,
        tileHeight: 53,
        tileGap: 0,
        drawGap: 10,      // 드로 직후 패와의 간격
        sectionGap: 10,   // 손패↔공개세트 간격

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
        x: 320, y: 180,
        gap: 5,
        align: 'center',
        tileWidth: 40,
        tileHeight: 53,
        tileXOffset: 10,
        tileYOffset: -6,
        frame: { path: 'ui/dora.png', xOffset: 0, yOffset: 40, align: 'center' }
    },
    RIICHI_STICK: {
        path: 'ui/riichi.png',
        y: 246,
        offset: 58,            // 도라 중심에서의 거리
        scale: 0.9
    },

    NAME_DISPLAY: {
        font: `bold 28px ${FONTS.bold}`,
        color: 'rgba(72, 72, 199, 1)',
        stroke: 'rgba(255, 255, 255, 1)',
        strokeWidth: 3,
        P1: { x: 10, y: 324, align: 'left' },
        CPU: { x: 630, y: 324, align: 'right' }
    },
    BUFF_DISPLAY: {
        font: `bold 16px ${FONTS.bold}`,
        color: 'rgba(72, 72, 199, 1)',
        stroke: 'rgba(255, 255, 255, 1)',
        strokeWidth: 2,
        P1: { offsetX: 6, offsetY: -4 },
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
        gap: 8,
    },
    INFO: {
        // 중심(320) 기준 오프셋: 턴 = 중심-offset, 라운드 = 중심+offset
        turnLabel: { offset: 60, y: 180, align: 'right' },
        turnNumber: { offset: 60, y: 200, align: 'right', pad: 2 }, // pad = 자릿수
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
        lineHeight: 20,
        life: 120,
        replyDelay: 0,
        P1: { offsetX: -20, offsetY: -86, textOffsetX: 20, textOffsetY: 0 },
        CPU: { offsetX: 20, offsetY: 86, textOffsetX: -20, textOffsetY: 0 },
        CHANCE: {
            RANDOM: 0.7,
            WORRY_RON: 0.7,
            DRAW_GOOD: 0.7,
            DRAW_BAD: 0.7
        }
    },
    POPUP: {
        x: 320,
        y: 200,
        scale: 1.0,
        life: 45,
        align: 'center',
        TYPES: {
            'RIICHI': { life: 80, anim: 'SLIDE', scale: 1.0, sound: 'audio/riichi' },
            'PON': { life: 50, scale: 1.0, anim: 'BOUNCE_UP', sound: 'audio/pon' },
            'RON': { life: 50, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/gong' },
            'TSUMO': { life: 50, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/gong' },
            'NAGARI': { life: 80, scale: 1.0, anim: 'ZOOM_IN', sound: 'audio/deal' }
        }
    },

    // 어떤 버튼이 활성인지는 BattleRenderer.getActiveAction(state)가 단일 결정
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
    // mag=최대 진폭(CSS px), frames=지속 프레임; 진폭 선형 감쇠(Game.shake)
    SHAKE: { mag: 10, frames: 10 },
    BATTLE_MENU: {
        w: 140,
        h: 150,
        x: 500,
        y: 330,
        font: `bold 16px ${FONTS.bold}`,
        textDefault: 'rgba(255, 255, 255, 1)',
        textSelected: 'rgba(255, 255, 0, 1)',
        cursor: 'rgba(255, 105, 180, 0.5)',
        dimmer: 'rgba(0, 0, 0, 0.5)',
        padding: 2,
        textOffsetX: 8,
        textOffsetY: 2,
        fixedLineHeight: 24,
        separatorHeight: 8,
        cursorYOffset: -6,
        // 아가리/펑/리치 선언은 constructMenu()가 앞에 동적 삽입; 여기선 스킬+역일람만
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
        minHeight: 120,
        padding: { x: 20, y: 20 },
        font: `16px ${FONTS.regular}`,
        lineHeight: 24,
        buttonHeight: 32,
        buttonWidth: 90,
        buttonGap: 10,
        buttonMarginTop: 20,
        labels: { yes: '그래', no: '아니' },
        // 패 교환 전용 — ESC로 확정
        labelsExchange: { confirm: '바꾸자', cancel: '싫어', key: 'ESC' }
    },

    MESSAGES: {
        // 조사 오용 방지 — 스킬별 개별 문구
        SKILL_CONFIRM: {
            'TIGER_STRIKE': (cost) => `맹호일발권을 사용할까요?`,
            'HELL_PILE': (cost) => `지옥쌓기를 사용할까요?`,
            'WATER_MIRROR': (cost) => `수경을 사용할까요?`,
            'DORA_BOMB': (cost) => `도라폭진을 사용할까요?`,
            'RECOVERY': (cost) => `회복을 사용할까요?`,
            'DISCARD_GUARD': (cost) => `버린 패 방어를 사용할까요?`,
            'EXCHANGE_TILE': (cost) => `바꿀 패를 선택하세요.`,
            'EXCHANGE_RON': (cost) => `론 패 교환을 사용할까요?`,
            'PAINT_TILE': (cost) => `덧칠할 패를 선택하세요.`,
            'CRITICAL': (cost) => `크리티컬을 사용할까요?`,
            'LAST_CHANCE': (cost) => `라스트 찬스를 사용할까요?`,
            'SPIRIT_RIICHI': (cost) => `기합 리치를 사용할까요?`,
            'SUPER_IAI': (cost) => `초 거합베기를 사용할까요?`,
            'DEFAULT': (name, cost) => `${name} 스킬을 사용할까요?`
        }
    },


    AUDIO: {
        DRAW: 'audio/draw',
        DISCARD: 'audio/discard',
        HIT: 'audio/impact-1',
        DAMAGE: 'audio/impact-2',
        TICK: 'audio/tick'
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
    RESULT: {
        x: 120, y: 90, w: 400, h: 300,
        windowColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: 'rgba(255, 255, 255, 1)',
        borderWidth: 2,

        titleX: 320,
        titleY: 140,
        titleFont: `bold 36px ${FONTS.bold}`,

        yakuListX: 140,
        scoreListX: 500,
        yakuY: 180,
        scoreX: 320,
        scoreY: 180,
        infoLineHeight: 30,
        lineHeight: 32,
        separatorGap: 15,
        damageGap: 15,
        pressSpaceOffset: -40,

        yakuFont: `bold 20px ${FONTS.bold}`,
        scoreFont: `bold 20px ${FONTS.bold}`,
        infoFont: `24px ${FONTS.regular}`,

        yakuColor: 'rgba(255, 255, 255, 1)',
        scoreColor: 'rgba(255, 215, 0, 1)',
        resultColor: 'rgba(255, 255, 255, 1)',
        subColor: 'rgba(255, 255, 0, 1)',
        infoColor: 'rgba(255, 255, 255, 1)',

        TYPES: {
            WIN: {
                title: "승!",
                text: "{yaku}\n데미지: {score}",
                color: "rgba(255, 255, 255, 1)",
                sound: "audio/fanfare"
            },
            LOSE: {
                title: "패!",
                text: "{yaku}\n데미지: -{score}",
                color: "rgba(255, 255, 255, 1)",
                sound: "audio/lose"
            },
            NAGARI: {
                title: "무승부!",
                text: "플레이어: {p1Status} / 상대: {cpuStatus}\n{damageMsg}",
                color: "rgba(255, 255, 255, 1)",
                sound: "audio/wrong"
            },
            MATCH_WIN: {
                title: "{winner} 승리!",
                color: "gold",
                sound: "audio/victory",
                historyFont: `16px ${FONTS.regular}`,
                historyLineHeight: 20,
                historyMaxVisible: 7,
                historyY: 200
            }
        },
        TEXTS: {
            pressSpace: "계속 진행하기"
        },

        BONUS: {
            font: `bold 20px ${FONTS.bold}`,
            color: 'rgba(255, 255, 255, 1)',
            lineHeight: 32
        }
    },

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
