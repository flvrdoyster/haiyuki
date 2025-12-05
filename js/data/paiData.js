
const PaiData = {
    TILE_COUNT_PER_TYPE: 9,
    TYPES: [
        {
            id: 'ataho', name: '아타호', color: 'red', category: 'character', img: 'tiles/pai_ata.png',
            gender: 'male', appearances: ['취호전']
        },
        {
            id: 'rin', name: '린샹', color: 'red', category: 'character', img: 'tiles/pai_rin.png',
            gender: 'female', appearances: ['취호전']
        },
        {
            id: 'smash', name: '스마슈', color: 'blue', category: 'character', img: 'tiles/pai_smsh.png',
            gender: 'male', appearances: ['포물장', '취호전']
        },
        {
            id: 'yuri', name: '유리와카마루', color: 'blue', category: 'character', img: 'tiles/pai_yuri.png',
            gender: 'female', appearances: ['포물장']
        },
        {
            id: 'pet', name: '페톰', color: 'yellow', category: 'character', img: 'tiles/pai_pet.png',
            gender: 'male', appearances: []
        },
        {
            id: 'fari', name: '화린', color: 'yellow', category: 'character', img: 'tiles/pai_fari.png',
            gender: 'female', appearances: ['포물장']
        },

        { id: 'punch', name: '주먹', color: 'red', category: 'weapon', img: 'tiles/pai_punch.png' },
        { id: 'sword', name: '검', color: 'blue', category: 'weapon', img: 'tiles/pai_sword.png' },
        { id: 'wand', name: '지팡이', color: 'yellow', category: 'weapon', img: 'tiles/pai_wand.png' },

        { id: 'mayu_red', name: '빨간 눈썹개', color: 'red', category: 'mayu', img: 'tiles/pai_red.png' },
        { id: 'mayu_blue', name: '파란 눈썹개', color: 'blue', category: 'mayu', img: 'tiles/pai_blue.png' },
        { id: 'mayu_yellow', name: '노란 눈썹개', color: 'yellow', category: 'mayu', img: 'tiles/pai_yellow.png' },
        { id: 'mayu_purple', name: '보라 눈썹개', color: 'purple', category: 'mayu', img: 'tiles/pai_purple.png' }
    ],

    // Helper to get image path (simplified)
    getImg: function (typeId) {
        const type = this.TYPES.find(t => t.id === typeId);
        return type ? type.img : null;
    }
};
