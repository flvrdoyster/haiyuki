// Skill Definitions
const SkillData = {
    // ... (Skills remain unchanged)
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
        aiProfile: { type: 'POWER', aggression: 0.6, speed: 0.1, defense: 0.5, colorBias: 0.9 },
        dialogue: {
            // 1. Match Flow
            'MATCH_START': '자, 한판 붙어보자고!',
            'MATCH_START_REPLY': '좋아, 덤벼!', // 대답 대사 추가

            // 2. Battle Actions
            'SELF_RIICHI': '승부수다! 리치!',
            'ENEMY_RIICHI': '호오... 제법인데?',
            'IPPATSU_CHANCE': '이번에 끝낸다!',
            'WIN_CALL': '하하하! 맹호의 승리다!', // 론/쯔모 공통
            'LOSE_CALL': '크윽... 실수가 있었나?', // 쏘였을 때

            // 3. Situation
            'MISSED_WIN_TILE': '아차! 저게 나왔어야 했는데...',
            'SLOW_PACE': '흐음... 패가 잘 안 풀리는군.',

            // 4. Skills
            'TIGER_STRIKE': '받아라! 맹호일발권!',
            'HELL_PILE': '네 운도 여기까지다.'
        }
    },
    {
        id: 'rinxiang', name: '린샹', face: 'face/RIN_base.png', selectIcon: 'face/CHRSELRIN.png', rival: 'ataho', skills: ['WATER_MIRROR', 'DORA_BOMB'], battleOffsetX: 0, battleOffsetY: 0,
        // Rinxiang: Balanced Type. Equipped with both Attack and Defense skills.
        aiProfile: { type: 'BALANCED', aggression: 0.55, speed: 0.4, defense: 0.55, colorBias: 0.4 },
        dialogue: {
            'MATCH_START': '당신의 실력, 확인해보겠어요.',
            'MATCH_START_REPLY': '저도 전력을 다하죠.',
            'SELF_RIICHI': '놓치지 않아요.',
            'ENEMY_RIICHI': '어머, 벌써 오셨나요?',
            'IPPATSU_CHANCE': '지금이에요!',
            'WIN_CALL': '예상대로네요.',
            'LOSE_CALL': '방심했군요...',
            'MISSED_WIN_TILE': '아... 아깝네요.',
            'SLOW_PACE': '조금 답답한 흐름이네요...',
            'WATER_MIRROR': '흐르는 물처럼...',
            'DORA_BOMB': '이것이 저의 비기입니다!'
        }
    },
    {
        id: 'fari', name: '화린', face: 'face/FARI_base.png', selectIcon: 'face/CHRSELFARI.png', rival: 'petum', skills: ['RECOVERY', 'DISCARD_GUARD'], battleOffsetX: 0, battleOffsetY: 0,
        // Fari: Support/Healing but "Good Luck" = Early Riichi. High Aggression (Riichi chance) + Good Defense.
        aiProfile: { type: 'LUCKY', aggression: 0.8, speed: 0.3, defense: 0.7, colorBias: 0.3 },
        dialogue: {
            'MATCH_START': '아하하! 재밌게 해요~',
            'MATCH_START_REPLY': '네~ 잘 부탁해요!',
            'SELF_RIICHI': '에잇, 공격!',
            'ENEMY_RIICHI': '으앙, 무서워요~',
            'IPPATSU_CHANCE': '나에게 행운을!',
            'WIN_CALL': '와아! 이겼다!',
            'LOSE_CALL': '힝... 너무해...',
            'MISSED_WIN_TILE': '앗! 저거 필요한 건데!',
            'SLOW_PACE': '으음... 패가 왜 이러지?',
            'RECOVERY': '잠깐 쉴래요~',
            'DISCARD_GUARD': '이건 못 가져가요!'
        }
    },
    {
        id: 'smash', name: '스마슈', face: 'face/SMSH.png', selectIcon: 'face/CHRSELSMSH.png', rival: 'yuri', skills: ['EXCHANGE_TILE', 'EXCHANGE_RON'], battleOffsetX: 5, battleOffsetY: 0,
        // Smash: Ninja = Quick movements. High Speed (Calls often).
        aiProfile: { type: 'ZAP_SPEED', aggression: 0.4, speed: 0.9, defense: 0.6, colorBias: 0.2 },
        dialogue: {
            'MATCH_START': '닌자의 속도를 보여주지.',
            'MATCH_START_REPLY': '눈 깜짝할 새에 끝날 거다!',
            'SELF_RIICHI': '필살!',
            'ENEMY_RIICHI': '살기가 느껴지는군.',
            'IPPATSU_CHANCE': '빈틈 발견!',
            'WIN_CALL': '임무 완료.',
            'LOSE_CALL': '큭... 후퇴한다.',
            'MISSED_WIN_TILE': '젠장! 놓쳤나.',
            'SLOW_PACE': '시간이 지체되고 있어...',
            'EXCHANGE_TILE': '바 바꿔치기 술법!',
            'EXCHANGE_RON': '통나무 변신술!'
        }
    },
    {
        id: 'petum', name: '페톰', face: 'face/PET_base.png', selectIcon: 'face/CHRSELPET.png', rival: 'fari', skills: ['CRITICAL', 'LAST_CHANCE'], battleOffsetX: 0, battleOffsetY: 0, cpuOffsetX: 20,
        // Petum: Tricky / Attack Skills. Opposite of Fari. Unpredictable.
        aiProfile: { type: 'TRICKY_ATTACK', aggression: 0.75, speed: 0.6, defense: 0.2, colorBias: 0.7 },
        dialogue: {
            'MATCH_START': '크크크... 내 속임수를 간파할 수 있을까?',
            'MATCH_START_REPLY': '조심하는 게 좋을걸?',
            'SELF_RIICHI': '함정 발동!',
            'ENEMY_RIICHI': '어라라? 무서워라.',
            'IPPATSU_CHANCE': '럭키~!',
            'WIN_CALL': '속았지?',
            'LOSE_CALL': '계산 착오인가...',
            'MISSED_WIN_TILE': '칫, 빗나갔군.',
            'SLOW_PACE': '지루해지는데...',
            'CRITICAL': '약점 포착!',
            'LAST_CHANCE': '마지막 도박이다!'
        }
    },
    {
        id: 'yuri', name: '유리와카마루', face: 'face/YURI_base.png', selectIcon: 'face/CHRSELYURI.png', rival: 'smash', skills: ['SUPER_IAI', 'SPIRIT_RIICHI'], battleOffsetX: 0, battleOffsetY: 0,
        // Yuri: Master of Iai. Powerful Attack AND Defense. High Stats overall.
        aiProfile: { type: 'ELITE', aggression: 0.8, speed: 0.5, defense: 0.8, colorBias: 0.5 },
        dialogue: {
            'MATCH_START': '검에게 자비란 없다.',
            'MATCH_START_REPLY': '정정당당하게 승부하죠.',
            'SELF_RIICHI': '일도양단!',
            'ENEMY_RIICHI': '살기가... 느껴지는군요.',
            'IPPATSU_CHANCE': '단칼에 베어주마.',
            'WIN_CALL': '적을 베었다.',
            'LOSE_CALL': '나의... 패배인가.',
            'MISSED_WIN_TILE': '베지 못했는가...',
            'SLOW_PACE': '호흡을... 가다듬자.',
            'SUPER_IAI': '참!',
            'SPIRIT_RIICHI': '기합!'
        }
    },
    // Hidden / Bosses
    {
        id: 'mayu', name: '눈썹개', face: 'face/MAYU_base.png', selectIcon: 'face/CHRSELMAYU.png', hidden: true, singleSprite: true, rival: 'yuri', skills: ['PAINT_TILE'], battleOffsetX: 0, battleOffsetY: -24,
        aiProfile: { type: 'GOD', aggression: 0.9, speed: 0.9, defense: 0.9, colorBias: 0.5 },
        dialogue: {
            // Placeholder: Add lines here
            'MATCH_START': '멍!',
            'MATCH_START_REPLY': '왈!',
            'SELF_RIICHI': '으르릉!',
            'WIN_CALL': '멍멍!',
            'LOSE_CALL': '끼잉...'
        }
    }
];
