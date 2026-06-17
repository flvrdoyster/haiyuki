// Skill Definitions
const SkillData = {
    // Ataho
    'TIGER_STRIKE': {
        name: '맹호일발권',
        desc: '리치를 걸 수 있을 때 사용하면 다음 쯔모로 반드시 난다. 20턴 째엔 사용할 수 없다.',
        type: 'ACTIVE',
        cost: 100,
        sfx: 'audio/roar',
        effect: {}
    },
    'HELL_PILE': {
        name: '지옥쌓기',
        desc: '3턴 간 상대가 받는 패를 쓸모 없는 패로 바꿔 쯔모로 나는 것을 막는다.',
        type: 'ACTIVE',
        cost: 18,
        sfx: 'audio/skill_activate',
        effect: {}
    },

    // Rinxiang
    'WATER_MIRROR': {
        name: '수경',
        desc: '상대가 났을 때 자신이 받는 데미지를 25% 감소시킨다.',
        type: 'ACTIVE',
        cost: 22,
        sfx: 'audio/barrier',
        effect: {}
    },
    'DORA_BOMB': {
        name: '도라폭진',
        desc: '리치로 났을 때 숨김 도라를 자신이 가진 패로 바꾼다.',
        type: 'REACTIVE',
        cost: 32,
        sfx: 'audio/quake',
        effect: {}
    },

    // Fari
    'RECOVERY': {
        name: '회복',
        desc: 'HP를 조금 회복한다. 한 라운드에 몇 번이고 사용할 수 있다.',
        type: 'ACTIVE',
        cost: 24,
        sfx: 'audio/recovery',
        effect: {}
    },
    'DISCARD_GUARD': {
        name: '버린 패 방어',
        desc: '5턴 간 상대가 내가 버린 패로 펑과 론을 할 수 없다. 한 라운드에 몇 번이고 사용할 수 있다.',
        type: 'ACTIVE',
        cost: 18,
        sfx: 'audio/barrier',
        effect: {}
    },

    // Smash
    'EXCHANGE_TILE': {
        name: '패 교환',
        desc: '라운드 시작 시 필요 없는 패를 교환한다.',
        type: 'SETUP',
        cost: 6,
        sfx: 'audio/flip',
        effect: {}
    },
    'EXCHANGE_RON': {
        name: '론 패 교환',
        desc: '상대 론 시, 내가 버린 패를 다른 패로 바꿔 론을 무효화한다. 내가 리치를 걸고 있을 때는 사용할 수 없다.',
        type: 'REACTIVE',
        cost: 10,
        sfx: 'audio/skill_activate',
        effect: {}
    },

    // Petum
    'CRITICAL': {
        name: '크리티컬',
        desc: '내가 났을 때 상대에게 주는 데미지를 25% 증가시킨다.',
        type: 'ACTIVE',
        cost: 24,
        sfx: 'audio/buff',
        effect: {}
    },
    'LAST_CHANCE': {
        name: '라스트 찬스',
        desc: '텐파이 상태로 나가리가 되었을 때 남은 패 룰렛에 도전할 수 있다. 룰렛에 성공하면 난다.',
        type: 'REACTIVE',
        cost: 18,
        sfx: 'audio/skill_activate',
        effect: {}
    },

    // Yuri
    'SUPER_IAI': {
        name: '초 거합베기',
        desc: '상대 론 시, 내가 버린 패를 거합베기로 잘라 무효화한다. 내가 리치를 걸고 있을 때는 사용할 수 없다.',
        type: 'REACTIVE',
        cost: 22,
        sfx: 'audio/slash',
        effect: {}
    },
    'SPIRIT_RIICHI': {
        name: '기합 리치',
        desc: '리치 가능 시 사용하면 5턴 후 쯔모로 반드시 난다. 16턴 이후에는 사용할 수 없다.',
        type: 'ACTIVE',
        cost: 24,
        sfx: 'audio/buff',
        effect: {}
    },

    // Mayu
    'PAINT_TILE': {
        name: '패 덧칠',
        desc: '라운드 시작 시 필요 없는 패를 교환한다.', // EXCHANGE_TILE의 상위 호환 (MP가 더 적게 소비)
        type: 'SETUP',
        cost: 4, // Per tile
        sfx: 'audio/flip',
        effect: {}
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHARACTER PERSONAS (reference) — derived from the official manual (haiyuki_manual/
// char.html). These describe the INTENDED play personality each `aiProfile` should
// express; tune the trait values to match these, not the other way around. Goal is
// distinct personalities first; cross-character balance is secondary.
//
// Trait axes (each pulls ONE distinct in-game lever with a real trade-off):
//   value      — 큰 역 / 한 방을 노림: steer discards toward a high-scoring reachable
//                yaku (slow but big) vs settle for a fast cheap win. (← was aggression)
//   speed      — pon eagerness / rush cheap fast hands
//   colorBias  — chase the one-color big yaku (순일색/초일색)
//   greed      — chase & protect dora (value via dora)
//   defense    — under opponent riichi, prefer safe tiles (genbutsu) to avoid ron
//   luck       — CPU draw quality (+ useful, − poor). not a choice; flavor only.
// (Riichi itself has no trade-off here — ron is riichi-only — so riichi eagerness is
//  COMPETENCE/skill, not a personality axis.)
//
//   아타호  — 펑 거의 안 하고 한 색을 뚝심 있게 모아 크고 느린 손. 안 서두르고
//             리치/한 방 지향. 위험 패도 잘 안 접음. 운은 평범.
//   린샹    — 무난·효율적이되 도라를 끝까지 챙겨 점수를 키움. 공수 균형, 평균 실력.
//   화린    — 좋은 패가 잘 들어와 초반부터 리치/텐파이. 상대 리치엔 잘 접고 버팀
//             (회복·방어 스킬 궁합). 리치는 적극적.
//   페톰    — 위험 패 안 가리고 마구 밀어붙임(거의 안 접음). 대신 패가 잘 안 들어와
//             손이 더딤 → 크리/라스트찬스로 한탕 만회형.
//   유리    — 공격도 하지만 상대 리치엔 안전패로 확실히 접는 단단한 방어, 실수 드묾
//             (엘리트). 론 무효로 역전형.
//   스마슈  — 펑 적극적으로 빠르게 싸고 작은 손을 후딱 완성. 큰 손·도라·색엔 욕심
//             없음. 초반 러시(장기전 약함).
//   눈썹개  — 전부 강함: 빠르고 잘 막고 운도 좋고 실수 거의 없음(보스).
// ─────────────────────────────────────────────────────────────────────────────
const CharacterData = [
    {
        id: 'ataho', name: '아타호', face: 'face/ATA_base.png', selectIcon: 'face/select_ATA.png', rival: 'rinxiang', skills: ['TIGER_STRIKE', 'HELL_PILE'], battleOffsetX: 0, battleOffsetY: 0,
        // 한 색 큰 손 천천히, 멘젠 고집, 잘 안 접음. 운 평범.
        aiProfile: { type: 'POWER', value: 0.85, speed: 0.15, defense: 0.40, colorBias: 0.85, greed: 0.60, luck: 0.25 },
    },
    {
        id: 'rinxiang', name: '린샹', face: 'face/RIN_base.png', selectIcon: 'face/select_RIN.png', rival: 'ataho', skills: ['WATER_MIRROR', 'DORA_BOMB'], battleOffsetX: 0, battleOffsetY: 0,
        // 평균 밸런스 + 도라 욕심으로 점수 축적.
        aiProfile: { type: 'BALANCED', value: 0.50, speed: 0.45, defense: 0.50, colorBias: 0.35, greed: 0.80, luck: 0.25 },
    },
    {
        id: 'fari', name: '화린', face: 'face/FARI_base.png', selectIcon: 'face/select_FARI.png', rival: 'petum', skills: ['RECOVERY', 'DISCARD_GUARD'], battleOffsetX: 0, battleOffsetY: 0,
        // 운 좋아 초반부터 리치, 상대 리치엔 잘 접고 버팀.
        aiProfile: { type: 'LUCKY', value: 0.35, speed: 0.45, defense: 0.65, colorBias: 0.30, greed: 0.35, luck: 0.75 },
    },
    {
        id: 'smash', name: '스마슈', face: 'face/SMSH.png', selectIcon: 'face/select_SMSH.png', rival: 'yuri', skills: ['EXCHANGE_TILE', 'EXCHANGE_RON'], battleOffsetX: 5, battleOffsetY: 0,
        // 펑 적극, 빠르고 싸게. 큰 손·도라·색 욕심 없음.
        aiProfile: { type: 'ZAP_SPEED', value: 0.15, speed: 0.95, defense: 0.50, colorBias: 0.20, greed: 0.15, luck: 0.25 },
    },
    {
        id: 'petum', name: '페톰', face: 'face/PET_base.png', selectIcon: 'face/select_PET.png', rival: 'fari', skills: ['CRITICAL', 'LAST_CHANCE'], battleOffsetX: 0, battleOffsetY: 0, cpuOffsetX: 20,
        // 무방비로 마구 밀어붙임(거의 안 접음). 운 0 — 베이스(0.1)보다 낮아 상대적으로 패
        // 운 나쁨. (음수로 CPU에 플레이어보다 나쁜 패를 억지로 주면 CPU가 약해져 난이도↓라 안 씀.)
        aiProfile: { type: 'TRICKY_ATTACK', value: 0.80, speed: 0.50, defense: 0.15, colorBias: 0.55, greed: 0.55, luck: 0.00 },
    },
    {
        id: 'yuri', name: '유리와카마루', face: 'face/YURI_base.png', selectIcon: 'face/select_YURI.png', rival: 'smash', skills: ['SUPER_IAI', 'SPIRIT_RIICHI'], battleOffsetX: 0, battleOffsetY: 0,
        // 엘리트: 공격하되 상대 리치엔 확실히 안전패로 접는 단단한 방어.
        aiProfile: { type: 'ELITE', value: 0.65, speed: 0.50, defense: 0.85, colorBias: 0.50, greed: 0.55, luck: 0.25 },
    },
    // Hidden / Bosses
    {
        id: 'mayu', name: '눈썹개', face: 'face/MAYU_base.png', selectIcon: 'face/select_MAYU.png', hidden: true, singleSprite: true, rival: 'yuri', skills: ['PAINT_TILE'], battleOffsetX: 0, battleOffsetY: -24,
        // 보스: 전부 강함 — 빠르고 잘 막고 운도 좋고 실수 거의 없음.
        aiProfile: { type: 'GOD', value: 0.80, speed: 0.80, defense: 0.90, colorBias: 0.55, greed: 0.65, luck: 0.75 },
    }
];
