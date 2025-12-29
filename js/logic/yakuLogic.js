const YakuLogic = {
    SCORES: {
        // 2-piece (6 pairs)
        SAM_YEON_GYEOK: 2000,
        ALL_STARS: 2400,

        // 3-piece (4 sets of 3)
        SAM_DO_RIP: 2400,
        JANG_GI: 2800,
        SAEK_HANA_SSIK: 3200, // One of each color (4 colors)
        COMBINATION: 4000,
        IL_SAEK: 4800,
        DOUBLE_COMBINATION: 4800,
        MAYU: 4800,
        CHO_MAYU: 6400,
        BYEON_TAE_GAE: 6400,
        SPECIAL_COMBINATION: 8000,

        // 4-piece (3 sets of 4)
        SA_CHEON_YO_RI: 3200,
        PIL_SAL_GI: 5600,
        JAYU_BAKAE_PYEONGDEUNG: 6400, // 3 colors x 4
        NAM_TANG: 7200,
        YEO_TANG: 7200,
        CHWI_HO_JEON: 7200,
        PO_MUL_JANG: 7200,
        CHO_IL_SAEK: 8000,
        JIN_MAYU: 9600,
        CROSS_COMBINATION: 9600,
        MAGU_DDAERIGI: 9600,

        // 6-piece (2 sets of 6 | 6+3+3)
        YUK_BEOP_JEON_SEO: 5600,
        SUN_IL_SAEK: 6400, // 6+3+3
        JU_HO: 7200,
        O_UI: 9600,

        // 8-piece (8+4)
        PAL_BO_CHAE: 8800,
        BI_O_UI: 12800,

        // 9-piece (9+3)
        IP_E_DAM: 12800
    },

    checkYaku: function (hand, characterId) {
        if (!hand || hand.length !== 12) return null;

        const a = this.analyzeHand(hand);
        const matches = [];

        // Helper to handle result: Boolean or Object { match: true, meta: {...} }
        const pushIfMatch = (result, key, score) => {
            let match = false;
            let meta = {};
            if (typeof result === 'boolean') {
                match = result;
            } else if (result && result.match) {
                match = true;
                meta = result.meta || {};
            }

            if (match) {
                const name = this.resolveYakuName(key, meta, characterId);
                matches.push({ name: name, score: score });
            }
        };

        // --- 9-piece Yakus ---
        pushIfMatch(this.isIpEDam(a), 'IP_E_DAM', this.SCORES.IP_E_DAM);

        // --- 8-piece Yakus ---
        pushIfMatch(this.isBiOUi(a), 'BI_O_UI', this.SCORES.BI_O_UI);
        pushIfMatch(this.isPalBoChae(a), 'PAL_BO_CHAE', this.SCORES.PAL_BO_CHAE);

        // --- 6-piece Yakus ---
        pushIfMatch(this.isOUi(a), 'O_UI', this.SCORES.O_UI);
        pushIfMatch(this.isJuHo(a), 'JU_HO', this.SCORES.JU_HO);
        pushIfMatch(this.isSunIlSaek(a), 'SUN_IL_SAEK', this.SCORES.SUN_IL_SAEK);
        pushIfMatch(this.isYukBeopJeonSeo(a), 'YUK_BEOP_JEON_SEO', this.SCORES.YUK_BEOP_JEON_SEO);

        // --- 4-piece Yakus ---
        pushIfMatch(this.isJinMayu(a), 'JIN_MAYU', this.SCORES.JIN_MAYU);
        pushIfMatch(this.isCrossCombination(a), 'CROSS_COMBINATION', this.SCORES.CROSS_COMBINATION);
        pushIfMatch(this.isMaGuTtaeRiGi(a), 'MAGU_DDAERIGI', this.SCORES.MAGU_DDAERIGI);
        pushIfMatch(this.isChoIlSaek(a), 'CHO_IL_SAEK', this.SCORES.CHO_IL_SAEK);
        pushIfMatch(this.isNamTang(a), 'NAM_TANG', this.SCORES.NAM_TANG);
        pushIfMatch(this.isYeoTang(a), 'YEO_TANG', this.SCORES.YEO_TANG);
        pushIfMatch(this.isChwiHoJeon(a), 'CHWI_HO_JEON', this.SCORES.CHWI_HO_JEON);
        pushIfMatch(this.isPoMulJang(a), 'PO_MUL_JANG', this.SCORES.PO_MUL_JANG);
        pushIfMatch(this.isJaYuBakAePyeongDeung(a), 'JAYU_BAKAE_PYEONGDEUNG', this.SCORES.JAYU_BAKAE_PYEONGDEUNG);
        pushIfMatch(this.isPilSalGi(a), 'PIL_SAL_GI', this.SCORES.PIL_SAL_GI);
        pushIfMatch(this.isSaCheonYoRi(a), 'SA_CHEON_YO_RI', this.SCORES.SA_CHEON_YO_RI);

        // --- 3-piece Yakus ---
        pushIfMatch(this.isSpecialCombination(a), 'SPECIAL_COMBINATION', this.SCORES.SPECIAL_COMBINATION);
        pushIfMatch(this.isChoMayu(a), 'CHO_MAYU', this.SCORES.CHO_MAYU);
        pushIfMatch(this.isByeonTaeGae(a), 'BYEON_TAE_GAE', this.SCORES.BYEON_TAE_GAE);
        pushIfMatch(this.isIlSaek(a), 'IL_SAEK', this.SCORES.IL_SAEK); // Requires Purple Mayu
        pushIfMatch(this.isMayu(a), 'MAYU', this.SCORES.MAYU);
        pushIfMatch(this.isDoubleCombination(a), 'DOUBLE_COMBINATION', this.SCORES.DOUBLE_COMBINATION);
        pushIfMatch(this.isCombination(a), 'COMBINATION', this.SCORES.COMBINATION);
        pushIfMatch(this.isSaekHanaSsik(a), 'SAEK_HANA_SSIK', this.SCORES.SAEK_HANA_SSIK);
        pushIfMatch(this.isJangGi(a), 'JANG_GI', this.SCORES.JANG_GI);
        pushIfMatch(this.isSamDoRip(a), 'SAM_DO_RIP', this.SCORES.SAM_DO_RIP);

        // --- 2-piece Yakus ---
        pushIfMatch(this.isAllStars(a), 'ALL_STARS', this.SCORES.ALL_STARS);
        pushIfMatch(this.isSamYeonGyeok(a), 'SAM_YEON_GYEOK', this.SCORES.SAM_YEON_GYEOK);

        if (matches.length === 0) {
            // Check Basic Shape (Structure Only) for Riichi
            if (this.isBasicShape(a)) {
                return { score: 0, yaku: ['RIICHI_ONLY'] };
            }
            return null;
        }
        matches.sort((a, b) => b.score - a.score);

        return {
            score: matches[0].score,
            yaku: [matches[0].name]
        };
    },

    resolveYakuName: function (key, meta, charId) {
        const config = BattleConfig.YAKU_NAMES[key];
        if (!config) return key; // Fallback to key
        if (typeof config === 'string') return config; // Simple string

        // 1. Check Character Specific
        if (charId && config[charId]) {
            return config[charId];
        }

        // 2. Check Color/Variant Specific
        if (meta && meta.color && config[meta.color]) {
            return config[meta.color];
        }

        // 3. Fallback
        return config.default || key;
    },

    analyzeHand: function (hand) {
        const counts = {}; // Key: "color_id"
        const typeCounts = {}; // Key: "id"
        let maxTypeCount = 0;

        hand.forEach(tile => {
            const key = `${tile.color}_${tile.type}`;
            if (!counts[key]) counts[key] = { tile: tile, count: 0 };
            counts[key].count++;

            if (!typeCounts[tile.type]) typeCounts[tile.type] = { type: tile.type, count: 0, tile: tile, colors: new Set() };
            typeCounts[tile.type].count++;
            typeCounts[tile.type].colors.add(tile.color);
        });

        return { counts, typeCounts, hand };
    },

    // --- Helpers ---
    checkCounts(a, size, numSets) {
        // Checks if there are `numSets` of `size`
        // Modified to allow multiple sets from same tile pile (e.g. 6 tiles = 2 sets of 3)
        let totalSets = 0;
        Object.values(a.counts).forEach(c => {
            totalSets += Math.floor(c.count / size);
        });
        return totalSets >= numSets;
    },

    // --- 9 Piece ---
    isIpEDam(a) {
        // 9 of one type + 3 of one type (total 12)
        // OR 12 of one type
        const c9 = Object.values(a.counts).find(c => c.count >= 9);
        if (!c9) return false;

        // Valid if:
        // 1. That pile implies 12 (count >= 12)
        // 2. Or there exists another pile with count >= 3
        if (c9.count >= 12) return true;

        return Object.values(a.counts).some(c => c !== c9 && c.count >= 3);
    },

    // --- 8 Piece ---
    isPalBoChae(a) {
        // 8 of one type + 4 of one type (total 12)
        const c8 = Object.values(a.counts).find(c => c.count >= 8);
        if (!c8) return false;

        if (c8.count >= 12) return true;

        return Object.values(a.counts).some(c => c !== c8 && c.count >= 4);
    },
    isBiOUi(a) {
        // Same Color: Char x 8, Wep x 4
        // Check 8-stack
        const n8 = Object.values(a.counts).find(c => c.count >= 8);
        if (!n8) return false;

        const type8 = PaiData.TYPES.find(t => t.id === n8.tile.type);
        if (type8.category !== 'character') return false;

        // Check 4-stack of same color, weapon
        const n4 = Object.values(a.counts).find(c => c.count >= 4 && c !== n8);
        if (!n4) return false;

        const type4 = PaiData.TYPES.find(t => t.id === n4.tile.type);
        return type4.category === 'weapon' && n4.tile.color === n8.tile.color;
    },

    // --- 6 Piece ---
    isYukBeopJeonSeo(a) { return this.checkCounts(a, 6, 2); },
    isJuHo(a) {
        // Ataho x 6, Pet x 6 (Any color?? Manual implies "Ataho 6, Pet 6", image shows same color?)
        // Manual 566: Image shows RED Ataho 6, RED Pet 6.
        // Assuming strict ID count or Color_ID? "YukBeop" is under 6-piece category. 
        // Using "counts" (Color+ID) for strict checking.
        const atahos = Object.values(a.counts).filter(c => c.tile.type === 'ataho' && c.count >= 6);
        const pets = Object.values(a.counts).filter(c => c.tile.type === 'pet' && c.count >= 6);
        return atahos.length > 0 && pets.length > 0;
    },
    isOUi(a) {
        // Same Color Char x 6, Wep x 6
        const sixes = Object.values(a.counts).filter(c => c.count >= 6);
        if (sixes.length < 2) return false;

        // Check if any pair of sixes matches the condition
        for (let i = 0; i < sixes.length; i++) {
            for (let j = i + 1; j < sixes.length; j++) {
                const s1 = sixes[i];
                const s2 = sixes[j];
                if (s1.tile.color !== s2.tile.color) continue;

                const t1 = PaiData.TYPES.find(t => t.id === s1.tile.type);
                const t2 = PaiData.TYPES.find(t => t.id === s2.tile.type);
                if ((t1.category === 'character' && t2.category === 'weapon') ||
                    (t1.category === 'weapon' && t2.category === 'character')) return true;
            }
        }
        return false;
    },
    isSunIlSaek(a) {
        // Same Color: 6, 3, 3
        const piles = Object.values(a.counts);
        const c6 = piles.find(c => c.count >= 6);
        if (!c6) return false;

        const color = c6.tile.color;
        // Remaining tiles must form at least 2 sets of 3 of the same color
        let remainingSets = 0;
        piles.forEach(c => {
            if (c.tile.color !== color) return;
            // If it's the 6-stack, we use the excess? No, rule is "6, 3, 3".
            // If we have 12 Atahos -> one pile of 12.
            // 12 = 6 (Head) + 3 + 3. Should pass.
            // Logic: Count total sets in this color. Must be >= 4 sets (6 counts as 2, + 1 + 1).
            // Actually "6, 3, 3" implies 3 sets if 6 is treated as one unit?
            // Usually 6-piece yaku means 6 is one unit.
            // So we need 1 unit of 6, and 2 units of 3.
            // Total tiles = 12.
            // Let's simplified: Total tiles of this color == 12?
            // And contain at least one block of 6?
            // If I have 4,4,4 red -> 12 red. But no 6. Fail.
            // If I have 6,3,3 red -> 12 red. Pass.
            // If I have 12 red -> 12 red. Pass (contains 6).
        });

        // Strict Check: One pile >= 6. Total tiles in this color == 12.
        // Also need to ensure we have enough "structures".
        // The only case 12 tiles fail is 4+4+4.
        // So: Has a 6-stack AND total color count is 12.

        const totalColorCount = piles.reduce((sum, c) => c.tile.color === color ? sum + c.count : sum, 0);
        return totalColorCount === 12;
    },

    // --- 4 Piece ---
    isSaCheonYoRi(a) { return this.checkCounts(a, 4, 3); },
    isPilSalGi(a) {
        // Same Color Char 4, Wep 4. (+ Any 4) => Total 3 sets of 4.
        if (!this.checkCounts(a, 4, 3)) return false;

        // Iterate Colors
        const byColor = { red: [], blue: [], yellow: [], purple: [] };
        Object.values(a.counts).forEach(c => {
            const numSets = Math.floor(c.count / 4);
            for (let k = 0; k < numSets; k++) byColor[c.tile.color].push(c.tile.type);
        });

        return Object.values(byColor).some(types => {
            // Need Char >= 1, Wep >= 1 within this color's 4-sets
            if (types.length < 2) return false; // Optimization
            let chars = 0, weps = 0;
            types.forEach(tid => {
                const t = PaiData.TYPES.find(x => x.id === tid);
                if (t.category === 'character') chars++;
                if (t.category === 'weapon') weps++;
            });
            return chars >= 1 && weps >= 1;
        });
    },
    isJaYuBakAePyeongDeung(a) {
        // 3 colors x 4
        // Need to find 3 sets of 4 that have different colors
        const fours = Object.values(a.counts).filter(c => c.count >= 4);
        const colors = new Set(fours.map(c => c.tile.color));
        return colors.size >= 3;
    },
    checkTypeGroup(a, targetIds, count) {
        // Helper for NamTang, YeoTang, etc.
        // Checks if all targetIds are present with at least `count`
        // Does NOT strictly enforce 1 color unless specified? Manual "3 types 4 each".
        // Use typeCounts (ignores color distinction, aggregating) OR counts (strict color)?
        // Manual rules implies specific piles. "Collect 4 each".
        // Let's assume strict piles (Color+ID).

        // Find piles that match criteria
        const validPiles = Object.values(a.counts).filter(c => c.count >= count);
        if (validPiles.length < targetIds.length) return false;

        const capturedIds = new Set();
        validPiles.forEach(p => {
            if (targetIds.includes(p.tile.type)) capturedIds.add(p.tile.type);
        });
        return capturedIds.size === targetIds.length;
    },
    isNamTang(a) {
        // 3 Male Character Types x 4
        const males = PaiData.TYPES.filter(t => t.category === 'character' && t.gender === 'male').map(t => t.id);
        // We need 3 DISTINCT male types, 4 count each.
        // Filtering unique IDs.
        const malePiles = Object.values(a.counts).filter(c => c.count >= 4 && males.includes(c.tile.type));
        const uniqueMales = new Set(malePiles.map(c => c.tile.type));
        return uniqueMales.size >= 3;
    },
    isYeoTang(a) {
        const females = PaiData.TYPES.filter(t => t.category === 'character' && t.gender === 'female').map(t => t.id);
        const piles = Object.values(a.counts).filter(c => c.count >= 4 && females.includes(c.tile.type));
        const unique = new Set(piles.map(c => c.tile.type));
        return unique.size >= 3;
    },
    isChwiHoJeon(a) { return this.checkTypeGroup(a, ['ataho', 'rin', 'smash'], 4); },
    isPoMulJang(a) { return this.checkTypeGroup(a, ['fari', 'smash', 'yuri'], 4); },

    isChoIlSaek(a) {
        // Same Color x 4, 3 sets
        // Check total sets
        if (!this.checkCounts(a, 4, 3)) return false;

        const colorMap = {};
        Object.values(a.counts).forEach(c => {
            if (c.count >= 4) {
                const numSets = Math.floor(c.count / 4);
                if (!colorMap[c.tile.color]) colorMap[c.tile.color] = 0;
                colorMap[c.tile.color] += numSets;
            }
        });

        const matchedColor = Object.keys(colorMap).find(color => colorMap[color] >= 3);
        if (matchedColor) {
            return { match: true, meta: { color: matchedColor } };
        }
        return false;
    },

    isJinMayu(a) {
        // Red Mayu 4, Yel Mayu 4, Blu Mayu 4
        const hasRed = Object.values(a.counts).some(c => c.tile.type === 'mayu_red' && c.count >= 4);
        const hasYel = Object.values(a.counts).some(c => c.tile.type === 'mayu_yellow' && c.count >= 4);
        const hasBlu = Object.values(a.counts).some(c => c.tile.type === 'mayu_blue' && c.count >= 4);
        return hasRed && hasYel && hasBlu;
    },
    isCrossCombination(a) {
        // Same Color: 2 Chars + 1 Wep x 4
        if (!this.checkCounts(a, 4, 3)) return false;

        const byColor = { red: [], blue: [], yellow: [], purple: [] };
        Object.values(a.counts).forEach(c => {
            const numSets = Math.floor(c.count / 4);
            for (let k = 0; k < numSets; k++) byColor[c.tile.color].push(c.tile.type);
        });

        return Object.values(byColor).some(types => {
            if (types.length < 3) return false;
            let chars = 0, weps = 0;
            types.forEach(tid => {
                const t = PaiData.TYPES.find(x => x.id === tid);
                if (t.category === 'character') chars++;
                if (t.category === 'weapon') weps++;
            });
            return chars >= 2 && weps >= 1;
        });
    },
    isMaGuTtaeRiGi(a) {
        // 3 Weapons x 4
        let wepSets = 0;
        Object.values(a.counts).forEach(c => {
            if (c.count >= 4) {
                const t = PaiData.TYPES.find(x => x.id === c.tile.type);
                if (t.category === 'weapon') {
                    wepSets += Math.floor(c.count / 4);
                }
            }
        });
        return wepSets >= 3;
    },

    // --- 3 Piece ---
    isSamDoRip(a) { return this.checkCounts(a, 3, 4); },
    isJangGi(a) {
        // Same Color Char+Wep x 3 + 2 Any sets
        // Total 4 sets of 3.
        const threes = Object.values(a.counts).filter(c => c.count >= 3);
        if (!this.checkCounts(a, 3, 4)) return false;

        // Find Char & Wep pair of same color
        for (let i = 0; i < threes.length; i++) {
            for (let j = i + 1; j < threes.length; j++) {
                if (threes[i].tile.color !== threes[j].tile.color) continue;
                const t1 = PaiData.TYPES.find(t => t.id === threes[i].tile.type);
                const t2 = PaiData.TYPES.find(t => t.id === threes[j].tile.type);
                if ((t1.category === 'character' && t2.category === 'weapon') ||
                    (t1.category === 'weapon' && t2.category === 'character')) return true;
            }
        }
        return false;
    },
    isSaekHanaSsik(a) {
        // 4 colors x 3 each
        const threes = Object.values(a.counts).filter(c => c.count >= 3);
        const colors = new Set(threes.map(c => c.tile.color));
        return colors.has('red') && colors.has('blue') && colors.has('yellow') && colors.has('purple');
    },
    isCombination(a) {
        // Same Color: 2 Chars + 1 Wep (3 each) + 1 Any
        const threes = Object.values(a.counts).filter(c => c.count >= 3);
        // BUG FIX: Check total sets instead of unique types
        if (!this.checkCounts(a, 3, 4)) return false;

        const byColor = { red: [], blue: [], yellow: [], purple: [] };
        // Note: If c.count >= 6, it counts as 1 type here, but distinct sets.
        // Rule: "2 Chars + 1 Wep".
        // If we have 6 Yuris -> 2 Chars?
        // Current logic: pushes 'yuri' once.
        // We should push it multiple times if count >= 6?
        // Logic below iterates types.
        // If 6 Yuris counts as 2 Chars, we need to handle it.
        // But usually "Combination" implies distinct types or sets?
        // Assume strict: "2 sets of characters". 6 Yuris = 2 sets.
        // Let's explode the counts back into sets for verification.

        Object.values(a.counts).forEach(c => {
            const numSets = Math.floor(c.count / 3);
            for (let k = 0; k < numSets; k++) {
                byColor[c.tile.color].push(c.tile.type);
            }
        });

        return Object.values(byColor).some(types => {
            let chars = 0, weps = 0;
            types.forEach(tid => {
                const t = PaiData.TYPES.find(x => x.id === tid);
                if (t.category === 'character') chars++;
                if (t.category === 'weapon') weps++;
            });
            return chars >= 2 && weps >= 1;
        });
    },
    isIlSaek(a) {
        // Same Color 3 types x 3 + Purple Mayu x 3
        const threes = Object.values(a.counts).filter(c => c.count >= 3);
        const hasPurpleMayu = threes.some(c => c.tile.type === 'mayu_purple');
        if (!hasPurpleMayu) return false;

        // Check for 3 of same color (Red, Blue, or Yellow)
        const byColor = { red: 0, blue: 0, yellow: 0 };
        threes.forEach(c => {
            if (byColor[c.tile.color] !== undefined) byColor[c.tile.color]++;
        });

        const matchedColor = Object.keys(byColor).find(color => byColor[color] >= 3);
        if (matchedColor) {
            return { match: true, meta: { color: matchedColor } };
        }
        return false;
    },
    isDoubleCombination(a) {
        // Char+Wep x 3 (Color A) AND Char+Wep x 3 (Color B)
        // Find sets of Char+Wep
        const threes = Object.values(a.counts).filter(c => c.count >= 3);
        const pairs = []; // List of colors that satisfy Char+Wep

        ['red', 'blue', 'yellow'].forEach(col => {
            const colSets = threes.filter(c => c.tile.color === col);
            const chars = colSets.filter(c => PaiData.TYPES.find(t => t.id === c.tile.type).category === 'character');
            const weps = colSets.filter(c => PaiData.TYPES.find(t => t.id === c.tile.type).category === 'weapon');
            if (chars.length >= 1 && weps.length >= 1) pairs.push(col);
        });
        return pairs.length >= 2;
    },
    isMayu(a) {
        // Red/Yel/Blu Mayu 3 each (+ 1 any)
        const hasRed = Object.values(a.counts).some(c => c.tile.type === 'mayu_red' && c.count >= 3);
        const hasYel = Object.values(a.counts).some(c => c.tile.type === 'mayu_yellow' && c.count >= 3);
        const hasBlu = Object.values(a.counts).some(c => c.tile.type === 'mayu_blue' && c.count >= 3);
        const totalSets = Object.values(a.counts).filter(c => c.count >= 3).length;

        return hasRed && hasYel && hasBlu && totalSets >= 4;
    },
    isChoMayu(a) {
        // Red, Yel, Blu, Pur Mayu 3 each
        const hasRed = Object.values(a.counts).some(c => c.tile.type === 'mayu_red' && c.count >= 3);
        const hasYel = Object.values(a.counts).some(c => c.tile.type === 'mayu_yellow' && c.count >= 3);
        const hasBlu = Object.values(a.counts).some(c => c.tile.type === 'mayu_blue' && c.count >= 3);
        const hasPur = Object.values(a.counts).some(c => c.tile.type === 'mayu_purple' && c.count >= 3);
        return hasRed && hasYel && hasBlu && hasPur;
    },
    isByeonTaeGae(a) {
        // Smash x 3 + 3 Females x 3
        const smash = Object.values(a.counts).find(c => c.tile.type === 'smash' && c.count >= 3);
        if (!smash) return false;

        let femaleSets = 0;
        Object.values(a.counts).forEach(c => {
            const t = PaiData.TYPES.find(x => x.id === c.tile.type);
            if (c.count >= 3 && t.category === 'character' && t.gender === 'female') {
                femaleSets += Math.floor(c.count / 3);
            }
        });

        return femaleSets >= 3;
    },
    isSpecialCombination(a) {
        // Same Color: 4 types x 3
        if (!this.checkCounts(a, 3, 4)) return false;

        const byColor = {};
        Object.values(a.counts).forEach(c => {
            const numSets = Math.floor(c.count / 3);
            if (!byColor[c.tile.color]) byColor[c.tile.color] = 0;
            byColor[c.tile.color] += numSets;
        });
        return Object.values(byColor).some(cnt => cnt >= 4);
    },

    // --- 2 Piece ---
    isAllStars(a) {
        // 6 chars x 2
        // All 6 specific characters must be present as pairs
        // Characters are single-color, but we use strict count check for clarity.
        // Targets: Red Ataho, Red Rin, Blue Smash, Blue Yuri, Yellow Pet, Yellow Fari

        // Check if we have 6 distinct character pairs
        let pairCount = 0;
        const charIds = ['ataho', 'rin', 'smash', 'yuri', 'pet', 'fari'];

        // Scan counts to find these specific chars
        const pairs = Object.values(a.counts).filter(c => c.count >= 2);

        charIds.forEach(id => {
            const hasPair = pairs.some(c => c.tile.type === id);
            if (hasPair) pairCount++;
        });

        return pairCount === 6;
    },
    isSamYeonGyeok(a) {
        // Char/Wep Pair x 3 Colors
        // Red Char Pair + Red Wep Pair
        // Blu Char Pair + Blu Wep Pair
        // Yel Char Pair + Yel Wep Pair
        const pairs = Object.values(a.counts).filter(c => c.count >= 2);

        const checkColor = (col) => {
            const hasChar = pairs.some(c => c.tile.color === col && PaiData.TYPES.find(t => t.id === c.tile.type).category === 'character');
            const hasWep = pairs.some(c => c.tile.color === col && PaiData.TYPES.find(t => t.id === c.tile.type).category === 'weapon');
            return hasChar && hasWep;
        };

        return checkColor('red') && checkColor('blue') && checkColor('yellow');
    },

    isBasicShape(a) {
        // Standard: 4 Sets of 3
        const sets = Object.values(a.counts).filter(c => c.count >= 3).length;
        if (sets >= 4) return true;

        // Pairs: Generic 6 pairs is NOT a valid shape in this game ruleset.
        // Only specific 6-pair Yakus (All Stars, SamYeonGyeok) are valid, 
        // and they are checked separately before this fallback.

        return false;
    }
};
