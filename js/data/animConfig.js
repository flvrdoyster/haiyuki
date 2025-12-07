const AnimConfig = {
    // Smashu
    'smash': {
        L: {
            base: 'face/btl/SMSH_L_base.png',
            idle: 'face/btl/SMSH_L_idle.png', // Explicit Idle exists for Smashu
        },
        R: {
            base: 'face/btl/SMSH_R_base.png',
            idle: 'face/btl/SMSH_R_idle.png',
        }
    },
    // Placeholders for other characters
    'ataho': {
        L: {
            base: 'face/btl/ATA_L_base.png',
        }, R: null // Placeholder
    },
    'rinxiang': {
        L: {
            base: 'face/btl/RIN_L_base.png',

            // Manual overrides for debugging/tuning
            // talkOffset: { x: 0, y: 0 }, 
            // blinkOffset: { x: 0, y: 0 },
        },
        R: {
            base: 'face/btl/RIN_R_base.png',
        }
    },
    'fari': { L: null, R: null },
    'petum': { L: null, R: null },
    'yuri': { L: null, R: null },
    'mayu': { L: null, R: null }
};
