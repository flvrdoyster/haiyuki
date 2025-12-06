const AnimConfig = {
    // Smashu
    'smash': {
        L: {
            base: 'face/btl/SMSH_L_base.png',
            idle: 'face/btl/SMSH_L_idle.png',
            blink: [
                'face/btl/SMSH_L_blink-1.png',
                'face/btl/SMSH_L_blink-2.png',
                'face/btl/SMSH_L_blink-3.png'
            ],
            blinkSequence: [1, 0, 1], // 1(Half)->0(Closed)->1(Half). 2(Open)=Idle
            smile: 'face/btl/SMSH_L_smile.png',
            shocked: 'face/btl/SMSH_L_shocked.png',
            talk: [
                'face/btl/SMSH_L_talk-1.png',
                'face/btl/SMSH_L_talk-2.png',
                'face/btl/SMSH_L_talk-3.png'
            ],
            interval: 180, speed: 5, talkSpeed: 6
        },
        R: {
            base: 'face/btl/SMSH_R_base.png',
            idle: 'face/btl/SMSH_R_idle.png',
            blink: [
                'face/btl/SMSH_R_blink-1.png',
                'face/btl/SMSH_R_blink-2.png',
                'face/btl/SMSH_R_blink-3.png'
            ],
            blinkSequence: [1, 0, 1],
            smile: 'face/btl/SMSH_R_smile.png',
            shocked: 'face/btl/SMSH_R_shocked.png',
            talk: [
                'face/btl/SMSH_R_talk-1.png',
                'face/btl/SMSH_R_talk-2.png',
                'face/btl/SMSH_R_talk-3.png'
            ],
            interval: 180, speed: 5, talkSpeed: 6
        }
    },
    // Placeholders for other characters
    'ataho': {
        L: {
            base: 'face/btl/ATA_L_base.png',
            idle: null, // Keep base
            blink: [
                'face/btl/ATA_L_blink-1.png',
                'face/btl/ATA_L_blink-2.png',
                'face/btl/ATA_L_blink-3.png'
            ],
            smile: 'face/btl/ATA_L_smile.png',
            shocked: 'face/btl/ATA_L_shocked.png',
            talk: [], // No talk animation

            interval: 180,
            speed: 5,
            blinkSequence: [1, 0, 1]
        },
        R: null // Placeholder
    },
    'rinxiang': { L: null, R: null },
    'fari': { L: null, R: null },
    'petum': { L: null, R: null },
    'yuri': { L: null, R: null },
    'mayu': { L: null, R: null }
};
