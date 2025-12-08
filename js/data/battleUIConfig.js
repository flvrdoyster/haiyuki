// Battle UI Configuration
const BattleUIConfig = {
    UI_BG: { path: 'bg/GAMEBG.png', color: '#225522' },
    BG: { prefix: 'bg/', min: 0, max: 11 },
    PORTRAIT: {
        P1: { x: -24, y: 60, scale: 1, align: 'left' },
        CPU: { x: 664, y: 60, scale: 1, align: 'right' },
        baseW: 264,
        baseH: 280
    },
    BARS: {
        width: 140, height: 10,
        hpPath: 'ui/bar_blue.png',
        mpPath: 'ui/bar_yellow.png',
        P1: { x: 41, y: 347 },
        CPU: { x: 459, y: 347 },
        gap: 8, // Gap between HP and MP bars
    },
    HAND: {
        y: 400,
        playerHandY: 400, // Fixed Y for player hand
        openSetY: 400,    // Align with player hand Y
        openSetRightAnchor: 620, // Right padding/anchor for open sets
        cpuY: 20,
        tileWidth: 40,
        tileHeight: 53,
        gap: 0,
        hoverYOffset: -10,
        hoverColor: 'yellow',
        hoverWidth: 2,
        groupGap: 10,
        // Open Set specific settings
        openSetTileGap: 0, // Gap between tiles within a set (e.g. Pon)
        openSetGap: 10     // Gap between open sets or between hand and open sets
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
    INFO: {
        // Explicit coordinates for adjustable layout
        turnLabel: { x: 230, y: 180 },
        turnNumber: { x: 230, y: 200, align: 'center', pad: 2 },
        roundLabel: { x: 420, y: 180 },
        roundNumber: { x: 420, y: 200, align: 'center', pad: 2 },
        numbers: { path: 'ui/number.png', w: 14, gap: 2 },
        labels: { path: 'ui/turn_round.png' }
    },
    ACTION: {
        // Menu Layout
        y: 320,
        btnWidth: 80,
        btnHeight: 40,
        gap: 10,

        // Fonts
        buttonFont: 'bold 20px "KoddiUDOnGothic-Bold"',
        helpFont: '16px "KoddiUDOnGothic-Bold"',

        // Colors
        colors: {
            normal: 'rgba(0, 0, 0, 0.8)',
            selected: '#FFFF00',
            text: 'white',
            selectedText: 'black',
            stroke: 'white'
        }
    },
    POPUP: {
        // Configuration for Action Callouts (Riichi, Pon, Ron, Tsumo, Nagari)
        // These use the FX system but are positioned according to these settings.
        x: 320,
        y: 240,
        scale: 1.0,
        align: 'center'
    },
    RESULT: {
        // Window Layout
        x: 70, y: 70, w: 500, h: 360,

        // Colors
        dimmerColor: 'rgba(0, 0, 0, 0.5)',
        windowColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: 'white',
        borderWidth: 2,

        // Fonts & Text Colors
        titleFont: 'bold 48px "KoddiUDOnGothic-Bold"',
        scoreFont: 'bold 32px "KoddiUDOnGothic-Bold"',
        infoFont: '24px "KoddiUDOnGothic-Regular"',
        resultColor: 'white',
        subColor: '#FFFF00',
        infoColor: 'white',
        // Layout
        titleX: 320, titleY: 150,
        scoreX: 320, scoreY: 220,
        infoX: 320, infoY: 260,
        infoLineHeight: 30
    },
    FALLBACK: {
        tileBg: '#EEE',
        tileTextFont: '12px Arial',
        cardBackBg: '#B22222',
        cardBackStroke: '#FFFFFF',
        cardBackPattern: '#880000',
        unknownBg: '#444',
        unknownStroke: '#888'
    },
    DISCARDS: {
        P1: { x: 214, y: 280 },
        CPU: { x: 214, y: 100 },
        tileWidth: 20,
        tileHeight: 27,
        gap: 2,
        rowMax: 10
    },
    BATTLE_MENU: {
        font: '16px "KoddiUDOnGothic-Regular"',
        textDefault: 'white',
        textSelected: '#FFFF00',
        cursor: 'rgba(255, 105, 180, 0.5)', // HotPink 0.5
        dimmer: 'rgba(0, 0, 0, 0.5)',
        padding: 5, // Inner padding for content
        textOffsetX: 15,
        textOffsetY: 0,
        lineHeightRatio: 7, // 1/7th of height
        cursorYOffset: -10
    }
};
