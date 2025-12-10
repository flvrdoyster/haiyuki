// Skill Definitions
const SkillData = {
    // Ataho
    'TIGER_STRIKE': {
        name: '맹호일발권',
        desc: '리치를 걸 수 있을 때 사용하면 다음 쯔모로 반드시 난다. 20턴 째엔 사용할 수 없다.',
        type: '',
        cost: 100,
        effect: {}
    },
    'HELL_PILE': {
        name: '지옥쌓기',
        desc: '3턴 간 상대가 받는 패를 쓸모 없는 패로 바꿔 쯔모로 나는 것을 막는다.',
        type: '',
        cost: 18,
        effect: {}
    },

    // Rinxiang
    'WATER_MIRROR': {
        name: '수경',
        desc: '상대가 났을 때 자신이 받는 데미지를 25% 감소시킨다.',
        type: '',
        cost: 22,
        effect: {}
    },
    'DORA_BOMB': {
        name: '도라폭진',
        desc: '리치로 났을 때 숨김 도라를 자신이 가진 패로 바꾼다.',
        type: '',
        cost: 32,
        effect: {}
    },

    // Fari
    'RECOVERY': {
        name: '회복',
        desc: 'HP를 조금 회복한다. 한 라운드에 몇 번이고 사용할 수 있다.',
        type: '',
        cost: 24,
        effect: {}
    },
    'DISCARD_GUARD': {
        name: '버린 패 방어',
        desc: '5턴 간 상대가 내가 버린 패로 펑과 론을 할 수 없다. 한 라운드에 몇 번이고 사용할 수 있다.',
        type: '',
        cost: 18,
        effect: {}
    },

    // Smash
    'EXCHANGE_TILE': {
        name: '패 교환',
        desc: '라운드 시작 시 필요 없는 패를 교환한다.',
        type: '',
        cost: 6, // Per tile
        effect: {}
    },
    'EXCHANGE_RON': {
        name: '론 패 교환',
        desc: '상대 론 시, 내가 버린 패를 다른 패로 바꿔 론을 무효화한다. 내가 리치를 걸고 있을 때는 사용할 수 없다.',
        type: '',
        cost: 10,
        effect: {}
    },

    // Petum
    'CRITICAL': {
        name: '크리티컬',
        desc: '내가 났을 때 상대에게 주는 데미지를 25% 증가시킨다.',
        type: '',
        cost: 24,
        effect: {}
    },
    'LAST_CHANCE': {
        name: '라스트 찬스',
        desc: '텐파이 상태로 나가리가 되었을 때 남은 패 룰렛에 도전할 수 있다. 룰렛에 성공하면 난다.',
        type: '',
        cost: 18,
        effect: {}
    },

    // Yuri
    'SUPER_IAI': {
        name: '초 거합베기',
        desc: '상대 론 시, 내가 버린 패를 거합베기로 잘라 무효화한다. 내가 리치를 걸고 있을 때는 사용할 수 없다.',
        type: '',
        cost: 22,
        effect: {}
    },
    'SPIRIT_RIICHI': {
        name: '기합 리치',
        desc: '리치 가능 시 사용하면 5턴 후 쯔모로 반드시 난다. 16턴 이후에는 사용할 수 없다.',
        type: '',
        cost: 24,
        effect: {}
    },

    // Mayu
    'PAINT_TILE': {
        name: '패 덧칠',
        desc: '라운드 시작 시 필요 없는 패를 교환한다.', // EXCHANGE_TILE의 상위 호환 (MP가 더 적게 소비)
        type: '',
        cost: 4,
        effect: {}
    }
};

const CharacterData = [
    {
        id: 'ataho', name: '아타호', face: 'face/ATA_base.png', selectIcon: 'face/CHRSELATA.png', rival: 'rinxiang', skills: ['TIGER_STRIKE', 'HELL_PILE'], battleOffsetX: 0, battleOffsetY: 0,
        // Ataho: Power Type. Aims for big hands (One-Shot Reversal). High Color Bias to force specific Yaku.
        aiProfile: { type: 'POWER', aggression: 0.6, speed: 0.1, defense: 0.5, colorBias: 0.9 }
    },
    {
        id: 'rinxiang', name: '린샹', face: 'face/RIN_base.png', selectIcon: 'face/CHRSELRIN.png', rival: 'ataho', skills: ['WATER_MIRROR', 'DORA_BOMB'], battleOffsetX: 0, battleOffsetY: 0,
        // Rinxiang: Balanced Type. Equipped with both Attack and Defense skills.
        aiProfile: { type: 'BALANCED', aggression: 0.55, speed: 0.4, defense: 0.55, colorBias: 0.4 }
    },
    {
        id: 'fari', name: '화린', face: 'face/FARI_base.png', selectIcon: 'face/CHRSELFARI.png', rival: 'petum', skills: ['RECOVERY', 'DISCARD_GUARD'], battleOffsetX: 0, battleOffsetY: 0,
        // Fari: Support/Healing but "Good Luck" = Early Riichi. High Aggression (Riichi chance) + Good Defense.
        aiProfile: { type: 'LUCKY', aggression: 0.8, speed: 0.3, defense: 0.7, colorBias: 0.3 }
    },
    {
        id: 'smash', name: '스마슈', face: 'face/SMSH.png', selectIcon: 'face/CHRSELSMSH.png', rival: 'yuri', skills: ['EXCHANGE_TILE', 'EXCHANGE_RON'], battleOffsetX: 0, battleOffsetY: 0,
        // Smash: Ninja = Quick movements. High Speed (Calls often).
        aiProfile: { type: 'ZAP_SPEED', aggression: 0.4, speed: 0.9, defense: 0.6, colorBias: 0.2 }
    },
    {
        id: 'petum', name: '페톰', face: 'face/PET_base.png', selectIcon: 'face/CHRSELPET.png', rival: 'fari', skills: ['CRITICAL', 'LAST_CHANCE'], battleOffsetX: 0, battleOffsetY: 0, cpuOffsetX: 20,
        // Petum: Tricky / Attack Skills. Opposite of Fari. Unpredictable.
        aiProfile: { type: 'TRICKY_ATTACK', aggression: 0.75, speed: 0.6, defense: 0.2, colorBias: 0.7 }
    },
    {
        id: 'yuri', name: '유리와카마루', face: 'face/YURI_base.png', selectIcon: 'face/CHRSELYURI.png', rival: 'smash', skills: ['SUPER_IAI', 'SPIRIT_RIICHI'], battleOffsetX: 0, battleOffsetY: 0,
        // Yuri: Master of Iai. Powerful Attack AND Defense. High Stats overall.
        aiProfile: { type: 'ELITE', aggression: 0.8, speed: 0.5, defense: 0.8, colorBias: 0.5 }
    },
    // Hidden / Bosses
    {
        id: 'mayu', name: '눈썹 개', face: 'face/MAYU_base.png', selectIcon: 'face/CHRSELMAYU.png', hidden: true, singleSprite: true, rival: 'yuri', skills: ['PAINT_TILE'], battleOffsetX: 0, battleOffsetY: -24,
        aiProfile: { type: 'GOD', aggression: 0.9, speed: 0.9, defense: 0.9, colorBias: 0.5 }
    }
];
