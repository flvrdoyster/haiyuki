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

    checkYaku: function (hand) {
        if (!hand || hand.length !== 12) return null;

        const a = this.analyzeHand(hand);
        const matches = [];

        // --- 9-piece Yakus ---
        if (this.isIpEDam(a)) matches.push({ name: '입에 담을 수도 없는 엄청난 기술', score: this.SCORES.IP_E_DAM });

        // --- 8-piece Yakus ---
        if (this.isBiOUi(a)) matches.push({ name: '비오의', score: this.SCORES.BI_O_UI });
        if (this.isPalBoChae(a)) matches.push({ name: '팔보채', score: this.SCORES.PAL_BO_CHAE });

        // --- 6-piece Yakus ---
        if (this.isOUi(a)) matches.push({ name: '오의', score: this.SCORES.O_UI });
        if (this.isJuHo(a)) matches.push({ name: '주호', score: this.SCORES.JU_HO });
        if (this.isSunIlSaek(a)) matches.push({ name: '순일색', score: this.SCORES.SUN_IL_SAEK });
        if (this.isYukBeopJeonSeo(a)) matches.push({ name: '육법전서', score: this.SCORES.YUK_BEOP_JEON_SEO });

        // --- 4-piece Yakus ---
        if (this.isJinMayu(a)) matches.push({ name: '진 눈썹개', score: this.SCORES.JIN_MAYU });
        if (this.isCrossCombination(a)) matches.push({ name: '크로스 콤비네이션', score: this.SCORES.CROSS_COMBINATION });
        if (this.isMaGuTtaeRiGi(a)) matches.push({ name: '마구 때리기', score: this.SCORES.MAGU_DDAERIGI });
        if (this.isChoIlSaek(a)) matches.push({ name: '초일색', score: this.SCORES.CHO_IL_SAEK });
        if (this.isNamTang(a)) matches.push({ name: '남탕', score: this.SCORES.NAM_TANG });
        if (this.isYeoTang(a)) matches.push({ name: '여탕', score: this.SCORES.YEO_TANG });
        if (this.isChwiHoJeon(a)) matches.push({ name: '취호전', score: this.SCORES.CHWI_HO_JEON });
        if (this.isPoMulJang(a)) matches.push({ name: '포물장', score: this.SCORES.PO_MUL_JANG });
        if (this.isJaYuBakAePyeongDeung(a)) matches.push({ name: '자유박애평등', score: this.SCORES.JAYU_BAKAE_PYEONGDEUNG });
        if (this.isPilSalGi(a)) matches.push({ name: '필살기', score: this.SCORES.PIL_SAL_GI });
        if (this.isSaCheonYoRi(a)) matches.push({ name: '사천요리', score: this.SCORES.SA_CHEON_YO_RI });

        // --- 3-piece Yakus ---
        if (this.isSpecialCombination(a)) matches.push({ name: '스페셜 콤비네이션', score: this.SCORES.SPECIAL_COMBINATION });
        if (this.isChoMayu(a)) matches.push({ name: '초 눈썹개', score: this.SCORES.CHO_MAYU });
        if (this.isByeonTaeGae(a)) matches.push({ name: '변태개', score: this.SCORES.BYEON_TAE_GAE });
        if (this.isIlSaek(a)) matches.push({ name: '일색', score: this.SCORES.IL_SAEK }); // Requires Purple Mayu
        if (this.isMayu(a)) matches.push({ name: '눈썹개', score: this.SCORES.MAYU });
        if (this.isDoubleCombination(a)) matches.push({ name: '더블 콤비네이션', score: this.SCORES.DOUBLE_COMBINATION });
        if (this.isCombination(a)) matches.push({ name: '콤비네이션', score: this.SCORES.COMBINATION });
        if (this.isSaekHanaSsik(a)) matches.push({ name: '색 하나씩', score: this.SCORES.SAEK_HANA_SSIK });
        if (this.isJangGi(a)) matches.push({ name: '장기', score: this.SCORES.JANG_GI });
        if (this.isSamDoRip(a)) matches.push({ name: '삼도립', score: this.SCORES.SAM_DO_RIP });

        // --- 2-piece Yakus ---
        if (this.isAllStars(a)) matches.push({ name: '올스타즈', score: this.SCORES.ALL_STARS });
        if (this.isSamYeonGyeok(a)) matches.push({ name: '삼연격', score: this.SCORES.SAM_YEON_GYEOK });

        if (matches.length === 0) return null;
        matches.sort((a, b) => b.score - a.score);

        // Return object compatible with BattleRenderer
        // Renderer expects { score: number, yaku: string[] }
        return {
            score: matches[0].score,
            yaku: [matches[0].name]
        };
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
        const c3s = piles.filter(c => c.count >= 3 && c.tile.color === color && c !== c6);
        return c3s.length >= 2;
    },

    // --- 4 Piece ---
    isSaCheonYoRi(a) { return this.checkCounts(a, 4, 3); },
    isPilSalGi(a) {
        // Same Color Char 4, Wep 4. (+ Any 4)
        const fours = Object.values(a.counts).filter(c => c.count >= 4);
        if (fours.length < 3) return false; // Need 3 sets of 4 total

        // Find required pair
        for (const c1 of fours) {
            for (const c2 of fours) {
                if (c1 === c2) continue;
                if (c1.tile.color !== c2.tile.color) continue;

                const t1 = PaiData.TYPES.find(t => t.id === c1.tile.type);
                const t2 = PaiData.TYPES.find(t => t.id === c2.tile.type);

                if ((t1.category === 'character' && t2.category === 'weapon') ||
                    (t1.category === 'weapon' && t2.category === 'character')) return true;
            }
        }
        return false;
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
        // Same Color x 4, 3 types
        // "Red x 4, Red x 4, Red x 4"
        const fours = Object.values(a.counts).filter(c => c.count >= 4);
        // Group by color
        const colorMap = {};
        fours.forEach(c => {
            if (!colorMap[c.tile.color]) colorMap[c.tile.color] = 0;
            colorMap[c.tile.color]++;
        });
        return Object.values(colorMap).some(count => count >= 3);
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
        const fours = Object.values(a.counts).filter(c => c.count >= 4);
        // Group by color
        const byColor = { red: [], blue: [], yellow: [], purple: [] };
        fours.forEach(c => byColor[c.tile.color].push(c.tile.type));

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
        const weps = Object.values(a.counts).filter(c => c.count >= 4 && PaiData.TYPES.find(t => t.id === c.tile.type).category === 'weapon');
        return weps.length >= 3;
    },

    // --- 3 Piece ---
    isSamDoRip(a) { return this.checkCounts(a, 3, 4); },
    isJangGi(a) {
        // Same Color Char+Wep x 3 + 2 Any sets
        // Total 4 sets of 3.
        const threes = Object.values(a.counts).filter(c => c.count >= 3);
        if (threes.length < 4) return false;

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
        if (threes.length < 4) return false;

        const byColor = { red: [], blue: [], yellow: [], purple: [] };
        threes.forEach(c => byColor[c.tile.color].push(c.tile.type));

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
        return Object.values(byColor).some(count => count >= 3);
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

        const femaleSets = Object.values(a.counts).filter(c => {
            const t = PaiData.TYPES.find(x => x.id === c.tile.type);
            return c.count >= 3 && t.category === 'character' && t.gender === 'female';
        });

        // Need 3 unique female types? Or just 3 sets?
        // Rules say "Smash and Female Char 3 types".
        const uniqueFems = new Set(femaleSets.map(c => c.tile.type));
        return uniqueFems.size >= 3;
    },
    isSpecialCombination(a) {
        // Same Color: 4 types x 3
        const threes = Object.values(a.counts).filter(c => c.count >= 3);
        const byColor = {};
        threes.forEach(c => {
            if (!byColor[c.tile.color]) byColor[c.tile.color] = 0;
            byColor[c.tile.color]++;
        });
        return Object.values(byColor).some(cnt => cnt >= 4);
    },

    // --- 2 Piece ---
    isAllStars(a) {
        // 6 chars x 2
        // Strict types: ataho, rin, smash, yuri, pet, fari
        const targets = ['ataho', 'rin', 'smash', 'yuri', 'pet', 'fari'];
        return targets.every(tId => {
            // Check typeCounts for relaxed color requirement?
            // "YukBeop" manual image showed RED Ataho / RED Pet.
            // "AllStars" manual image shows Mixed Colors.
            // So use typeCounts.
            return a.typeCounts[tId] && a.typeCounts[tId].count >= 2;
        });
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
    }
};
