const TutorialData = {
    LESSONS: [
        {
            hand: { smash: 3, yuri: 3, pet: 3, mayu_red: 1, mayu_blue: 1 },
            dora: 'fari',
            uraDora: 'sword',
            cpuDraws: ['wand', 'sword'],
            plan: [
                { draw: 'fari' },
                { discard: 'mayu_red' },
                { draw: 'fari' },
                { discard: 'mayu_blue', tenpai: '삼도립' },
                { draw: 'fari', win: { yaku: '삼도립', score: 2400, dora: 3 } }
            ],
            script: [
                {
                    on: 'wait', say: [
                        '환세패유기는 일대일로 승부하는 게임입니다.\n맨 처음 11개의 패가 주어집니다.',
                        '패를 가져오면 손패에 남기거나 버려 가면서\n같은 무늬의 패를 몇 종류씩 모아 갑니다.',
                        '패는 캐릭터패 6종류, 무기패 3종류,\n눈썹개패 4종류의 총 13종류가 있으며\n빨강·노랑·파랑의 3색으로 나뉘어 있습니다.',
                        '단, 눈썹개패는 보라색도 있습니다.',
                        '차례가 오면 패를 1장 가져옵니다.\n{패 가져오기}를 선택하세요.'
                    ]
                },
                { on: 'drawn', say: ['필요 없는 패를 1장 버립니다.\n{빨강 눈썹개}패를 선택하세요.'] },
                {
                    on: 'discarded', discards: 2, say: [
                        '뭐든지 좋으니 각각 3개씩 모두 4벌 모으면\n"삼도립"이라는 역이 완성됩니다.',
                        '즉, 앞으로 화린패가 1개만 더 오면 날 수 있습니다.'
                    ]
                },
                {
                    on: 'tsumoChance', say: [
                        '역은 항상 12개의 패로 구성됩니다.\n이제 역이 완성되어 날 수 있습니다.',
                        'ESC나 화면의 {날 수 있어!} 버튼을 누르면 메뉴를 엽니다.\n메뉴에서 {아가리}를 선택하세요.'
                    ]
                },
                {
                    on: 'win', say: [
                        '완성한 역의 점수와 보너스 점수를 더한 만큼을\n진 상대에게 데미지로 줍니다.',
                        '났을 때 도라와 같은 패를 들고 있으면\n도라 보너스를 받을 수 있습니다.'
                    ]
                },
                { on: 'afterResult', say: ['환세패유기의 역은 전부 30종류가 있습니다.\n화면 상단의 {역 일람}을 누르면 볼 수 있습니다.'] }
            ]
        },
        {
            hand: { smash: 3, yuri: 3, pet: 3, mayu_red: 1, mayu_blue: 1 },
            dora: 'wand',
            uraDora: 'sword',
            cpuDraws: ['wand', 'sword', 'mayu_purple', 'rin'],
            needRiichi: true,
            failSay: '리치를 하지 않았습니다.\n처음부터 다시 해 봅시다.',
            plan: [
                { draw: 'fari' },
                { discard: 'mayu_red' },
                { draw: 'fari' },
                { discard: 'mayu_blue', tenpai: '삼도립' },
                { draw: 'punch' },
                { discard: 'punch' },
                { draw: 'mayu_yellow' },
                { discard: 'mayu_yellow' },
                { draw: 'fari', win: { yaku: '삼도립', score: 2400 } }
            ],
            script: [
                { on: 'wait', say: ['앞에서와 같은 패입니다.\n이번에는 리치를 걸고 기다려 봅시다.'] },
                { on: 'drawn', discards: 0, say: ['{빨강 눈썹개}패를 선택하세요.'] },
                { on: 'wait', discards: 1, say: ['리치는 패를 가져온 뒤에 선언할 수 있습니다.\n{패 가져오기}를 선택하세요.'] },
                { on: 'drawn', discards: 1, say: ['앞으로 1개로 날 수 있을 때 리치를 선언할 수 있습니다.\n메뉴에서 {리치}를 선택하세요.'] },
                { on: 'riichi', say: ['{파랑 눈썹개}패를 선택하세요.'] },
                {
                    on: 'discarded', say: [
                        '리치를 걸면 자동적으로 사용되는\n비기 이외에는 조작이 불가능해집니다.',
                        '이제부터는 패를 가져오고 버리는 것이\n자동으로 진행됩니다.'
                    ]
                },
                { on: 'win', say: [
                                '?로 표시된 「숨김 도라」는\n리치로 난 경우에만 모양이 표시됩니다.',
                                '안타깝지만 이번에 숨김 도라는 들고 있지 않았네요.'
                                ] }
            ]
        },
        {
            hand: { ataho: 2, rin: 3, punch: 3, mayu_purple: 2, sword: 1 },
            dora: 'smash',
            uraDora: 'yuri',
            cpuDraws: ['mayu_yellow', 'ataho', 'mayu_blue'],
            needPon: true,
            failSay: '펑을 하지 않았습니다.\n처음부터 다시 해 봅시다.',
            plan: [
                { draw: 'wand' },
                { discard: 'sword' },
                { draw: 'pet' },
                { discard: 'pet' },
                { pon: 'ataho' },
                { discard: 'wand', tenpai: '적일색' },
                { draw: 'mayu_purple', win: { yaku: '적일색', score: 3600 } }
            ],
            script: [
                { on: 'wait', say: ['같은 색의 패로 3종류를 3개씩,\n보라색 눈썹개패를 3개 모으면\n"일색"이라는 역이 완성됩니다.'] },
                {
                    on: 'ponChance', say: [
                        '펑은 패를 새로 가져오지 않고\n상대가 버린 패를 받아\n3개 모음으로 만드는 것을 말합니다.',
                        '패 가져오기 대신, ESC 등을 눌러 메뉴를 열고 {펑}을 선택하세요.'
                    ]
                },
                { on: 'afterPon', say: ['펑을 하면 바로 1장 버립니다.'] },
                {
                    on: 'discarded', say: [
                        '펑을 한 뒤에 난다면 역의 점수가 3/4로 줄어듭니다.',
                        '펑은 패를 3개 묶음으로 만들기 때문에\n2개·4개·8개 역은 완성할 수 없습니다.',
                        '또한 펑을 한 손패는 리치를 걸 수 없으므로\n쯔모로만 날 수 있습니다.'
                    ]
                },
                { on: 'win', say: ['펑을 했기 때문에 4800점이 3600점이 되었습니다.'] }
            ]
        },
        {
            hand: { ataho: 4, rin: 4, smash: 2, yuri: 1 },
            dora: 'pet',
            uraDora: 'wand',
            cpuDraws: ['mayu_yellow', 'smash'],
            needRiichi: true,
            failSay: '리치를 하지 않았습니다.\n처음부터 다시 해 봅시다.',
            plan: [
                { draw: 'smash' },
                { discard: 'yuri', tenpai: '취호전' },
                { draw: 'mayu_red' },
                { discard: 'mayu_red' },
                { ron: 'smash', win: { yaku: '취호전', score: 7200 } }
            ],
            script: [
                { on: 'wait', say: ['취호전의 캐릭터 3인(아타호, 린샹, 스마슈)을\n4개씩 모아 완성하는 역도 있습니다.\n4개씩 모으는 역은 펑을 하면 만들 수 없습니다.'] },
                { on: 'drawn', discards: 0, say: ['메뉴에서 {리치}를 선택하세요.'] },
                { on: 'ron', say: ['리치를 걸고 있을 때, 상대가 버린 패로 나면\n론이 선언되며 이깁니다.'] },
                {
                    on: 'afterResult', say: [
                        '또한 각 캐릭터에게는 각각의 비기가 있어\nMP를 소비해 사용할 수 있습니다.',
                        '더 많은 설명은 해설서에서 볼 수 있습니다.\n튜토리얼을 마쳤습니다. 타이틀로 돌아갑니다.'
                    ]
                }
            ]
        }
    ]
};
