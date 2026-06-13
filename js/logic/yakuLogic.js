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

        // 캐릭터 변형(필살기·장기): 역을 이룬 캐릭터 패의 종류로 정해진다 — meta.char.
        // (config 키는 타일 id: ataho/rin/smash/yuri/pet/fari)
        if (meta && meta.char && config[meta.char]) {
            return config[meta.char];
        }

        // 색 변형(일색류): meta.color
        if (meta && meta.color && config[meta.color]) {
            return config[meta.color];
        }

        // (구) 플레이 캐릭터 fallback — 캐릭터 변형 역명은 위 meta.char가 우선.
        if (charId && config[charId]) {
            return config[charId];
        }

        // Fallback
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
        // That pile implies 12 (count >= 12)
        // Or there exists another pile with count >= 3
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
        // 순일색(매뉴얼): "같은 색만으로 2종류를 3개씩, 다른 1종류는 6개" →
        // 한 색(빨/파/노)의 패가 정확히 3종류이고 종류별 개수가 [6,3,3], 합 12.
        // 보라는 제외(보라 섞임은 일색 IL_SAEK).
        // 종류별 개수를 색별로 모은다.
        const byColor = {};
        Object.values(a.counts).forEach(c => {
            if (c.tile.color === 'purple') return;
            (byColor[c.tile.color] = byColor[c.tile.color] || []).push(c.count);
        });
        for (const color in byColor) {
            const counts = byColor[color].slice().sort((x, y) => y - x); // 내림차순
            const total = counts.reduce((s, n) => s + n, 0);
            if (total === 12 && counts.length === 3 &&
                counts[0] === 6 && counts[1] === 3 && counts[2] === 3) {
                // 색을 넘겨 resolveYakuName이 순 적/청/황일색을 고르게 함.
                return { match: true, meta: { color } };
            }
        }
        return false;
    },

    // --- 4 Piece ---
    isSaCheonYoRi(a) { return this.checkCounts(a, 4, 3); },
    isPilSalGi(a) {
        // 필살기: 같은 색 캐릭터 1종 + 무기를 4개씩 (+ 아무거나 4개씩 1벌). 역명은 그 색에서
        // 무기와 짝지은 캐릭터 패의 종류로 정해진다(맹호난무·유미쌍조… meta.char).
        if (!this.checkCounts(a, 4, 3)) return false;

        const byColor = {};
        Object.values(a.counts).forEach(c => {
            const numSets = Math.floor(c.count / 4);
            const cat = PaiData.TYPES.find(t => t.id === c.tile.type).category;
            for (let k = 0; k < numSets; k++) (byColor[c.tile.color] = byColor[c.tile.color] || []).push({ id: c.tile.type, cat });
        });

        for (const color in byColor) {
            const sets = byColor[color];
            const charSet = sets.find(s => s.cat === 'character');
            const hasWep = sets.some(s => s.cat === 'weapon');
            if (charSet && hasWep) return { match: true, meta: { char: charSet.id } };
        }
        return false;
    },
    isJaYuBakAePyeongDeung(a) {
        // 3색(빨강/파랑/노랑) × 4장씩. 보라색은 해당하지 않음(역 설명 명시).
        const VALID_COLORS = ['red', 'blue', 'yellow'];
        const fours = Object.values(a.counts).filter(c => c.count >= 4 && VALID_COLORS.includes(c.tile.color));
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
        // 초일색(매뉴얼): "같은 색의 패를 4개씩 모은다" — 사천요리(뭐든 4개씩)의 같은색판.
        // 종류 제한 없는 세트 기반: 한 색(빨/파/노)만으로 4개씩 3벌(=12장). 8+4·12단일도 성립.
        // 보라는 제외(보라 단색 일색류는 명명 없음).
        if (!this.checkCounts(a, 4, 3)) return false;
        const colorMap = {};
        Object.values(a.counts).forEach(c => {
            if (c.tile.color === 'purple' || c.count < 4) return;
            colorMap[c.tile.color] = (colorMap[c.tile.color] || 0) + Math.floor(c.count / 4);
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
        // 크로스 콤비네이션: 같은 색 캐릭터 2종류 + 무기 1종류를 4장씩(=3세트, 12장).
        // "2종류"는 서로 다른 캐릭터 타입 2개 — 같은 캐릭터 8장은 1종류로만 센다.
        if (!this.checkCounts(a, 4, 3)) return false;

        const byColor = {}; // color -> {chars:Set, weps:Set}
        Object.values(a.counts).forEach(c => {
            if (c.count < 4) return;
            const cat = PaiData.TYPES.find(t => t.id === c.tile.type).category;
            const e = byColor[c.tile.color] = byColor[c.tile.color] || { chars: new Set(), weps: new Set() };
            if (cat === 'character') e.chars.add(c.tile.type);
            else if (cat === 'weapon') e.weps.add(c.tile.type);
        });
        return Object.values(byColor).some(e => e.chars.size >= 2 && e.weps.size >= 1);
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
        // 장기: 같은 색 캐릭터 1종 + 무기를 3개씩 (+ 아무거나 3개씩 2벌). 역명은 무기와 짝지은
        // 캐릭터 패의 종류로 정해진다(호격권·선열각… meta.char).
        const threes = Object.values(a.counts).filter(c => c.count >= 3);
        if (!this.checkCounts(a, 3, 4)) return false;

        for (let i = 0; i < threes.length; i++) {
            for (let j = i + 1; j < threes.length; j++) {
                if (threes[i].tile.color !== threes[j].tile.color) continue;
                const t1 = PaiData.TYPES.find(t => t.id === threes[i].tile.type);
                const t2 = PaiData.TYPES.find(t => t.id === threes[j].tile.type);
                if (t1.category === 'character' && t2.category === 'weapon') return { match: true, meta: { char: threes[i].tile.type } };
                if (t1.category === 'weapon' && t2.category === 'character') return { match: true, meta: { char: threes[j].tile.type } };
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
        // 콤비네이션: 같은 색 캐릭터 2종류 + 무기 1종류를 3개씩(=3세트) + 아무거나 3개씩 1벌.
        // "2종류"는 서로 다른 캐릭터 타입 2개 — 같은 캐릭터를 6장 쌓은 건 1종류로만 센다.
        if (!this.checkCounts(a, 3, 4)) return false; // 총 4세트

        const byColor = {}; // color -> {chars:Set, weps:Set}
        Object.values(a.counts).forEach(c => {
            if (c.count < 3) return;
            const cat = PaiData.TYPES.find(t => t.id === c.tile.type).category;
            const e = byColor[c.tile.color] = byColor[c.tile.color] || { chars: new Set(), weps: new Set() };
            if (cat === 'character') e.chars.add(c.tile.type);
            else if (cat === 'weapon') e.weps.add(c.tile.type);
        });
        return Object.values(byColor).some(e => e.chars.size >= 2 && e.weps.size >= 1);
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
        // 눈썹개: 빨/노/파 눈썹개 3개씩 + 아무거나 3개씩 1벌(= 총 4세트).
        // 세트 수는 floor(count/3) 합으로 센다 — 눈썹개를 6장 쌓은 것(2세트)도 한 세트는
        // 필수, 한 세트는 "아무거나"로 인정.
        const hasRed = Object.values(a.counts).some(c => c.tile.type === 'mayu_red' && c.count >= 3);
        const hasYel = Object.values(a.counts).some(c => c.tile.type === 'mayu_yellow' && c.count >= 3);
        const hasBlu = Object.values(a.counts).some(c => c.tile.type === 'mayu_blue' && c.count >= 3);
        const totalSets = Object.values(a.counts).reduce((s, c) => s + Math.floor(c.count / 3), 0);

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
        // 변태개: 스마슈 + 여성 캐릭터 3종류를 3개씩. 서로 다른 여성 3타입 필요 —
        // 한 여성을 6장 쌓아도 1종류로만 센다(여성은 rin/yuri/fari 3종뿐 → 전부 필요).
        const smash = Object.values(a.counts).find(c => c.tile.type === 'smash' && c.count >= 3);
        if (!smash) return false;

        const femaleTypes = new Set();
        Object.values(a.counts).forEach(c => {
            if (c.count < 3) return;
            const t = PaiData.TYPES.find(x => x.id === c.tile.type);
            if (t.category === 'character' && t.gender === 'female') femaleTypes.add(c.tile.type);
        });
        return femaleTypes.size >= 3;
    },
    isSpecialCombination(a) {
        // 스페셜 콤비네이션: 같은 색으로 4종류를 3개씩(=4세트, 12장). 서로 다른 4타입 필요
        // — 같은 타입을 6장 쌓아도 1종류로만 센다.
        if (!this.checkCounts(a, 3, 4)) return false;

        const byColor = {}; // color -> Set(types)
        Object.values(a.counts).forEach(c => {
            if (c.count < 3) return;
            (byColor[c.tile.color] = byColor[c.tile.color] || new Set()).add(c.tile.type);
        });
        return Object.values(byColor).some(types => types.size >= 4);
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
    },

    // ----------------------------------------------------------------
    // Hand evaluation helpers (pure functions, moved from BattleEngine)
    // ----------------------------------------------------------------

    /**
     * Tenpai check: an 11-tile hand is tenpai if adding any single tile type
     * completes a winning hand. Pass returnDetails=true to get the list of
     * potential yaku names instead of a boolean.
     */
    checkTenpai: function (hand, returnDetails) {
        const potentialYakus = new Set();
        let isTenpai = false;

        for (const type of PaiData.TYPES) {
            const tile = { type: type.id, color: type.color, img: type.img };
            const tempHand = [...hand, tile];

            const win = this.checkYaku(tempHand);
            if (win) {
                isTenpai = true;
                if (returnDetails) {
                    potentialYakus.add(win.yaku[0]);
                } else {
                    return true; // Early exit when only a boolean is needed
                }
            }
        }

        if (returnDetails && isTenpai) {
            return Array.from(potentialYakus);
        }

        return isTenpai;
    },

    /**
     * Win bonuses (tenho / haitei / houtei / dora). Round state is passed in
     * via ctx: { turnCount, doras, uraDoras }.
     */
    calculateBonuses: function (hand, winType, isRiichi, ctx) {
        let totalBonus = 0;
        const details = []; // Array of { name, score }

        // Tenho (Heavenly Hand): 1st turn & Tsumo
        if (ctx.turnCount <= 1 && winType === 'TSUMO') {
            const s = 800;
            totalBonus += s;
            details.push({ name: '텐호 보너스', score: s });
        }

        // Haitei / Houtei (Last Turn)
        if (ctx.turnCount >= 20) {
            if (winType === 'TSUMO') {
                const s = 800;
                totalBonus += s;
                details.push({ name: '해저 보너스', score: s });
            } else if (winType === 'RON') {
                const s = 800;
                totalBonus += s;
                details.push({ name: '하저 보너스', score: s });
            }
        }

        // Dora (visible; ura-dora only counts with Riichi)
        let doraCount = 0;
        const countDoras = (doras) => {
            doras.forEach(dora => {
                hand.forEach(tile => {
                    if (tile.type === dora.type && tile.color === dora.color) {
                        doraCount++;
                    }
                });
            });
        };
        countDoras(ctx.doras);
        if (isRiichi) countDoras(ctx.uraDoras);

        if (doraCount > 0) {
            const s = 400 * doraCount;
            totalBonus += s;
            details.push({ name: `도라 보너스 x${doraCount}`, score: s });
        }

        return { score: totalBonus, details: details, names: details.map(d => d.name) };
    },

    /**
     * Riichi preview: simulate discarding hand[discardIdx], then measure the
     * best / average winning score and the number of winning tile types.
     */
    getRiichiScore: function (hand, charId, discardIdx) {
        const tempHand = [...hand];
        tempHand.splice(discardIdx, 1);

        let maxScore = 0;
        let totalScore = 0;
        let waitCount = 0;

        PaiData.TYPES.forEach(type => {
            const testHand = [...tempHand, { type: type.id, color: type.color, img: type.img }];
            const result = this.checkYaku(testHand, charId);
            if (result) {
                waitCount++;
                if (result.score > maxScore) maxScore = result.score;
                totalScore += result.score;
            }
        });

        return {
            maxScore: maxScore,
            avgScore: waitCount > 0 ? (totalScore / waitCount) : 0,
            waitCount: waitCount
        };
    },

    /**
     * Rate how much a candidate tile improves a hand, judged against the REAL
     * yaku table (checkYaku) — not just mechanical stacking. Used by the
     * easy-mode draw assist. Three tiers:
     *   1. completes a yaku NOW            → 100000 + actual yaku score
     *   2. reaches tenpai after a discard  → 10000 + best reachable yaku score
     *      (simulates every distinct discard × every completion tile, so a tile
     *       leading toward a 9600-point hand beats one leading toward 2400)
     *   3. otherwise (early game)          → stack-building heuristic fallback
     * @param {Array} hand      concealed hand tiles (discard candidates)
     * @param {Object} tile     candidate tile {type, color}
     * @param {string} charId   for character-specific yaku
     * @param {Array} fullHand  hand + open-set tiles (yaku checks need 11)
     */
    rateTileForHand: function (hand, tile, charId, fullHand, out) {
        // out (optional): filled with { tier, yaku, score } describing WHY the tile
        // rated as it did — lets the draw assist report what yaku it's steering
        // toward. Numeric return is unchanged; callers can ignore `out`.
        const report = (tier, yaku, score) => {
            if (out) { out.tier = tier; out.yaku = yaku || null; out.score = score || 0; }
        };

        // Tier 3 value doubles as a fractional tie-breaker inside tiers 1–2
        const sameType = hand.filter(t => t.type === tile.type).length;
        const sameColor = hand.filter(t => t.color === tile.color).length;
        const building = (sameType * sameType * 10) + sameColor;

        if (fullHand && fullHand.length === 11) {
            const fullPlus = [...fullHand, tile];

            // Tier 1: this tile completes a winning hand — rank by the yaku score
            const win = this.checkYaku(fullPlus, charId);
            if (win) {
                report('complete', win.yaku && win.yaku[0], win.score);
                return 100000 + win.score;
            }

            // Tier 2: after keeping this tile and discarding one (concealed tiles
            // or the tile itself), can some draw complete a yaku? Rank by the
            // best yaku score reachable across all discard choices.
            let best = 0;
            let bestYaku = null;
            const tried = new Set();
            for (const d of [...hand, tile]) {
                const key = d.type + '_' + d.color;
                if (tried.has(key)) continue;
                tried.add(key);

                const kept = [...fullPlus];
                kept.splice(kept.findIndex(x => x.type === d.type && x.color === d.color), 1);

                for (const t of PaiData.TYPES) {
                    const w = this.checkYaku([...kept, { type: t.id, color: t.color, img: t.img }], charId);
                    if (w && w.score > best) { best = w.score; bestYaku = w.yaku && w.yaku[0]; }
                }
            }
            if (best > 0) {
                report('tenpai', bestYaku, best);
                return 10000 + best + building / 1000;
            }
        }

        // Tier 3: too far from any yaku to measure — build tall stacks
        // (quadratic on stack height) with color concentration as tie-break.
        report('building', null, building);
        return building;
    }
};
