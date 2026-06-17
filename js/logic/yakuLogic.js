const YakuLogic = {
    SCORES: {
        SAM_YEON_GYEOK: 2000,
        ALL_STARS: 2400,

        SAM_DO_RIP: 2400,
        JANG_GI: 2800,
        SAEK_HANA_SSIK: 3200,
        COMBINATION: 4000,
        IL_SAEK: 4800,
        DOUBLE_COMBINATION: 4800,
        MAYU: 4800,
        CHO_MAYU: 6400,
        BYEON_TAE_GAE: 6400,
        SPECIAL_COMBINATION: 8000,

        SA_CHEON_YO_RI: 3200,
        PIL_SAL_GI: 5600,
        JAYU_BAKAE_PYEONGDEUNG: 6400,
        NAM_TANG: 7200,
        YEO_TANG: 7200,
        CHWI_HO_JEON: 7200,
        PO_MUL_JANG: 7200,
        CHO_IL_SAEK: 8000,
        JIN_MAYU: 9600,
        CROSS_COMBINATION: 9600,
        MAGU_DDAERIGI: 9600,

        YUK_BEOP_JEON_SEO: 5600,
        SUN_IL_SAEK: 6400,
        JU_HO: 7200,
        O_UI: 9600,

        PAL_BO_CHAE: 8800,
        BI_O_UI: 12800,

        IP_E_DAM: 12800
    },

    checkYaku: function (hand, characterId) {
        if (!hand || hand.length !== 12) return null;

        const a = this.analyzeHand(hand);
        const matches = [];

        // 결과가 boolean이거나 { match, meta } 객체일 수 있음(역명 변형은 meta로 결정).
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

        pushIfMatch(this.isIpEDam(a), 'IP_E_DAM', this.SCORES.IP_E_DAM);

        pushIfMatch(this.isBiOUi(a), 'BI_O_UI', this.SCORES.BI_O_UI);
        pushIfMatch(this.isPalBoChae(a), 'PAL_BO_CHAE', this.SCORES.PAL_BO_CHAE);

        pushIfMatch(this.isOUi(a), 'O_UI', this.SCORES.O_UI);
        pushIfMatch(this.isJuHo(a), 'JU_HO', this.SCORES.JU_HO);
        pushIfMatch(this.isSunIlSaek(a), 'SUN_IL_SAEK', this.SCORES.SUN_IL_SAEK);
        pushIfMatch(this.isYukBeopJeonSeo(a), 'YUK_BEOP_JEON_SEO', this.SCORES.YUK_BEOP_JEON_SEO);

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

        pushIfMatch(this.isSpecialCombination(a), 'SPECIAL_COMBINATION', this.SCORES.SPECIAL_COMBINATION);
        pushIfMatch(this.isChoMayu(a), 'CHO_MAYU', this.SCORES.CHO_MAYU);
        pushIfMatch(this.isByeonTaeGae(a), 'BYEON_TAE_GAE', this.SCORES.BYEON_TAE_GAE);
        pushIfMatch(this.isIlSaek(a), 'IL_SAEK', this.SCORES.IL_SAEK);
        pushIfMatch(this.isMayu(a), 'MAYU', this.SCORES.MAYU);
        pushIfMatch(this.isDoubleCombination(a), 'DOUBLE_COMBINATION', this.SCORES.DOUBLE_COMBINATION);
        pushIfMatch(this.isCombination(a), 'COMBINATION', this.SCORES.COMBINATION);
        pushIfMatch(this.isSaekHanaSsik(a), 'SAEK_HANA_SSIK', this.SCORES.SAEK_HANA_SSIK);
        pushIfMatch(this.isJangGi(a), 'JANG_GI', this.SCORES.JANG_GI);
        pushIfMatch(this.isSamDoRip(a), 'SAM_DO_RIP', this.SCORES.SAM_DO_RIP);

        pushIfMatch(this.isAllStars(a), 'ALL_STARS', this.SCORES.ALL_STARS);
        pushIfMatch(this.isSamYeonGyeok(a), 'SAM_YEON_GYEOK', this.SCORES.SAM_YEON_GYEOK);

        if (matches.length === 0) {
            // 역은 없지만 기본 형(4세트)을 이루면 리치 전용 화료.
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
        if (!config) return key;
        if (typeof config === 'string') return config;

        // 캐릭터 변형(필살기·장기): 역을 이룬 캐릭터 패의 종류로 역명 결정(meta.char).
        if (meta && meta.char && config[meta.char]) {
            return config[meta.char];
        }

        // 색 변형(일색류): meta.color.
        if (meta && meta.color && config[meta.color]) {
            return config[meta.color];
        }

        if (charId && config[charId]) {
            return config[charId];
        }

        return config.default || key;
    },

    analyzeHand: function (hand) {
        const counts = {};      // key: "color_id"
        const typeCounts = {};  // key: "id"

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

    // 한 더미에서 여러 세트도 인정(예: 6장 = 3장 2세트). size 짜리 세트가 numSets개 이상인지.
    checkCounts(a, size, numSets) {
        let totalSets = 0;
        Object.values(a.counts).forEach(c => {
            totalSets += Math.floor(c.count / size);
        });
        return totalSets >= numSets;
    },

    // 입에담: 한 종류 9개 + 다른 종류 3개(또는 한 종류 12개).
    isIpEDam(a) {
        const c9 = Object.values(a.counts).find(c => c.count >= 9);
        if (!c9) return false;
        if (c9.count >= 12) return true;
        return Object.values(a.counts).some(c => c !== c9 && c.count >= 3);
    },

    // 팔보채: 한 종류 8개 + 다른 종류 4개(또는 12개).
    isPalBoChae(a) {
        const c8 = Object.values(a.counts).find(c => c.count >= 8);
        if (!c8) return false;
        if (c8.count >= 12) return true;
        return Object.values(a.counts).some(c => c !== c8 && c.count >= 4);
    },
    // 비오의: 같은 색 캐릭터 8 + 무기 4.
    isBiOUi(a) {
        const n8 = Object.values(a.counts).find(c => c.count >= 8);
        if (!n8) return false;

        const type8 = PaiData.TYPES.find(t => t.id === n8.tile.type);
        if (type8.category !== 'character') return false;

        const n4 = Object.values(a.counts).find(c => c.count >= 4 && c !== n8);
        if (!n4) return false;

        const type4 = PaiData.TYPES.find(t => t.id === n4.tile.type);
        return type4.category === 'weapon' && n4.tile.color === n8.tile.color;
    },

    isYukBeopJeonSeo(a) { return this.checkCounts(a, 6, 2); },
    // 주호: 아타호 6 + 페톰 6(엄격하게 색+종류 기준).
    isJuHo(a) {
        const atahos = Object.values(a.counts).filter(c => c.tile.type === 'ataho' && c.count >= 6);
        const pets = Object.values(a.counts).filter(c => c.tile.type === 'pet' && c.count >= 6);
        return atahos.length > 0 && pets.length > 0;
    },
    // 오의: 같은 색 캐릭터 6 + 무기 6.
    isOUi(a) {
        const sixes = Object.values(a.counts).filter(c => c.count >= 6);
        if (sixes.length < 2) return false;

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
    // 순일색: 한 색(빨/파/노)만으로 종류별 [6,3,3], 합 12. 보라 제외. meta.color로 역명 결정.
    isSunIlSaek(a) {
        const byColor = {};
        Object.values(a.counts).forEach(c => {
            if (c.tile.color === 'purple') return;
            (byColor[c.tile.color] = byColor[c.tile.color] || []).push(c.count);
        });
        for (const color in byColor) {
            const counts = byColor[color].slice().sort((x, y) => y - x);
            const total = counts.reduce((s, n) => s + n, 0);
            if (total === 12 && counts.length === 3 &&
                counts[0] === 6 && counts[1] === 3 && counts[2] === 3) {
                return { match: true, meta: { color } };
            }
        }
        return false;
    },

    isSaCheonYoRi(a) { return this.checkCounts(a, 4, 3); },
    // 필살기: 같은 색 캐릭터 1종 + 무기를 4개씩(+ 아무거나 4개씩 1벌). 역명은 그 색 캐릭터 종류(meta.char).
    isPilSalGi(a) {
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
    // 자유박애평등: 3색(빨/파/노) × 4장씩. 보라 제외.
    isJaYuBakAePyeongDeung(a) {
        const VALID_COLORS = ['red', 'blue', 'yellow'];
        const fours = Object.values(a.counts).filter(c => c.count >= 4 && VALID_COLORS.includes(c.tile.color));
        const colors = new Set(fours.map(c => c.tile.color));
        return colors.size >= 3;
    },
    // targetIds 종류가 각각 count개 이상인지(색+종류 더미 기준).
    checkTypeGroup(a, targetIds, count) {
        const validPiles = Object.values(a.counts).filter(c => c.count >= count);
        if (validPiles.length < targetIds.length) return false;

        const capturedIds = new Set();
        validPiles.forEach(p => {
            if (targetIds.includes(p.tile.type)) capturedIds.add(p.tile.type);
        });
        return capturedIds.size === targetIds.length;
    },
    // 남탕: 남성 캐릭터 3종 × 4.
    isNamTang(a) {
        const males = PaiData.TYPES.filter(t => t.category === 'character' && t.gender === 'male').map(t => t.id);
        const malePiles = Object.values(a.counts).filter(c => c.count >= 4 && males.includes(c.tile.type));
        const uniqueMales = new Set(malePiles.map(c => c.tile.type));
        return uniqueMales.size >= 3;
    },
    // 여탕: 여성 캐릭터 3종 × 4.
    isYeoTang(a) {
        const females = PaiData.TYPES.filter(t => t.category === 'character' && t.gender === 'female').map(t => t.id);
        const piles = Object.values(a.counts).filter(c => c.count >= 4 && females.includes(c.tile.type));
        const unique = new Set(piles.map(c => c.tile.type));
        return unique.size >= 3;
    },
    isChwiHoJeon(a) { return this.checkTypeGroup(a, ['ataho', 'rin', 'smash'], 4); },
    isPoMulJang(a) { return this.checkTypeGroup(a, ['fari', 'smash', 'yuri'], 4); },

    // 초일색: 한 색(빨/파/노)만으로 4개씩 3벌(사천요리의 같은색판). 보라 제외. meta.color.
    isChoIlSaek(a) {
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

    // 진마유: 빨/노/파 눈썹개 4개씩.
    isJinMayu(a) {
        const hasRed = Object.values(a.counts).some(c => c.tile.type === 'mayu_red' && c.count >= 4);
        const hasYel = Object.values(a.counts).some(c => c.tile.type === 'mayu_yellow' && c.count >= 4);
        const hasBlu = Object.values(a.counts).some(c => c.tile.type === 'mayu_blue' && c.count >= 4);
        return hasRed && hasYel && hasBlu;
    },
    // 크로스 콤비네이션: 같은 색 캐릭터 2종 + 무기 1종을 4장씩(=3세트). 같은 캐릭터 8장은 1종.
    isCrossCombination(a) {
        if (!this.checkCounts(a, 4, 3)) return false;

        const byColor = {};
        Object.values(a.counts).forEach(c => {
            if (c.count < 4) return;
            const cat = PaiData.TYPES.find(t => t.id === c.tile.type).category;
            const e = byColor[c.tile.color] = byColor[c.tile.color] || { chars: new Set(), weps: new Set() };
            if (cat === 'character') e.chars.add(c.tile.type);
            else if (cat === 'weapon') e.weps.add(c.tile.type);
        });
        return Object.values(byColor).some(e => e.chars.size >= 2 && e.weps.size >= 1);
    },
    // 마구때리기: 무기 3종 × 4.
    isMaGuTtaeRiGi(a) {
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

    isSamDoRip(a) { return this.checkCounts(a, 3, 4); },
    // 장기: 같은 색 캐릭터 1종 + 무기를 3개씩(+ 아무거나 3개씩 2벌). 역명은 그 색 캐릭터 종류(meta.char).
    isJangGi(a) {
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
    // 색하나씩: 4색 × 3개씩.
    isSaekHanaSsik(a) {
        const threes = Object.values(a.counts).filter(c => c.count >= 3);
        const colors = new Set(threes.map(c => c.tile.color));
        return colors.has('red') && colors.has('blue') && colors.has('yellow') && colors.has('purple');
    },
    // 콤비네이션: 같은 색 캐릭터 2종 + 무기 1종을 3개씩 + 아무거나 3개씩 1벌. 같은 캐릭터 6장은 1종.
    isCombination(a) {
        if (!this.checkCounts(a, 3, 4)) return false;

        const byColor = {};
        Object.values(a.counts).forEach(c => {
            if (c.count < 3) return;
            const cat = PaiData.TYPES.find(t => t.id === c.tile.type).category;
            const e = byColor[c.tile.color] = byColor[c.tile.color] || { chars: new Set(), weps: new Set() };
            if (cat === 'character') e.chars.add(c.tile.type);
            else if (cat === 'weapon') e.weps.add(c.tile.type);
        });
        return Object.values(byColor).some(e => e.chars.size >= 2 && e.weps.size >= 1);
    },
    // 일색: 같은 색 3종 × 3 + 보라 눈썹개 3.
    isIlSaek(a) {
        const threes = Object.values(a.counts).filter(c => c.count >= 3);
        const hasPurpleMayu = threes.some(c => c.tile.type === 'mayu_purple');
        if (!hasPurpleMayu) return false;

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
    // 더블 콤비네이션: 캐릭터+무기 3세트를 서로 다른 2색에서.
    isDoubleCombination(a) {
        const threes = Object.values(a.counts).filter(c => c.count >= 3);
        const pairs = [];

        ['red', 'blue', 'yellow'].forEach(col => {
            const colSets = threes.filter(c => c.tile.color === col);
            const chars = colSets.filter(c => PaiData.TYPES.find(t => t.id === c.tile.type).category === 'character');
            const weps = colSets.filter(c => PaiData.TYPES.find(t => t.id === c.tile.type).category === 'weapon');
            if (chars.length >= 1 && weps.length >= 1) pairs.push(col);
        });
        return pairs.length >= 2;
    },
    // 무유: 빨/노/파 눈썹개 3개씩 + 아무거나 3개씩 1벌(총 4세트).
    isMayu(a) {
        const hasRed = Object.values(a.counts).some(c => c.tile.type === 'mayu_red' && c.count >= 3);
        const hasYel = Object.values(a.counts).some(c => c.tile.type === 'mayu_yellow' && c.count >= 3);
        const hasBlu = Object.values(a.counts).some(c => c.tile.type === 'mayu_blue' && c.count >= 3);
        const totalSets = Object.values(a.counts).reduce((s, c) => s + Math.floor(c.count / 3), 0);

        return hasRed && hasYel && hasBlu && totalSets >= 4;
    },
    // 초무유: 빨/노/파/보라 눈썹개 3개씩.
    isChoMayu(a) {
        const hasRed = Object.values(a.counts).some(c => c.tile.type === 'mayu_red' && c.count >= 3);
        const hasYel = Object.values(a.counts).some(c => c.tile.type === 'mayu_yellow' && c.count >= 3);
        const hasBlu = Object.values(a.counts).some(c => c.tile.type === 'mayu_blue' && c.count >= 3);
        const hasPur = Object.values(a.counts).some(c => c.tile.type === 'mayu_purple' && c.count >= 3);
        return hasRed && hasYel && hasBlu && hasPur;
    },
    // 변태개: 스마슈 + 여성 캐릭터 3종을 3개씩(여성은 rin/yuri/fari 3종뿐 → 전부 필요).
    isByeonTaeGae(a) {
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
    // 스페셜 콤비네이션: 같은 색 4종 × 3개씩(서로 다른 4타입). 같은 타입 6장은 1종.
    isSpecialCombination(a) {
        if (!this.checkCounts(a, 3, 4)) return false;

        const byColor = {};
        Object.values(a.counts).forEach(c => {
            if (c.count < 3) return;
            (byColor[c.tile.color] = byColor[c.tile.color] || new Set()).add(c.tile.type);
        });
        return Object.values(byColor).some(types => types.size >= 4);
    },

    // 올스타: 6캐릭터(ataho/rin/smash/yuri/pet/fari)를 각각 쌍으로.
    isAllStars(a) {
        let pairCount = 0;
        const charIds = ['ataho', 'rin', 'smash', 'yuri', 'pet', 'fari'];

        const pairs = Object.values(a.counts).filter(c => c.count >= 2);

        charIds.forEach(id => {
            const hasPair = pairs.some(c => c.tile.type === id);
            if (hasPair) pairCount++;
        });

        return pairCount === 6;
    },
    // 삼연격: 빨/파/노 각각 캐릭터 쌍 + 무기 쌍.
    isSamYeonGyeok(a) {
        const pairs = Object.values(a.counts).filter(c => c.count >= 2);

        const checkColor = (col) => {
            const hasChar = pairs.some(c => c.tile.color === col && PaiData.TYPES.find(t => t.id === c.tile.type).category === 'character');
            const hasWep = pairs.some(c => c.tile.color === col && PaiData.TYPES.find(t => t.id === c.tile.type).category === 'weapon');
            return hasChar && hasWep;
        };

        return checkColor('red') && checkColor('blue') && checkColor('yellow');
    },

    // 기본 형: 3개짜리 4세트. (일반 6쌍은 이 룰셋에서 형이 아님 — 특정 6쌍 역만 별도 인정.)
    isBasicShape(a) {
        const sets = Object.values(a.counts).filter(c => c.count >= 3).length;
        return sets >= 4;
    },

    // 텐파이: 11패에 어떤 종류 1장을 더해 화료가 되면 텐파이. returnDetails면 가능 역명 목록 반환.
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
                    return true;
                }
            }
        }

        if (returnDetails && isTenpai) {
            return Array.from(potentialYakus);
        }

        return isTenpai;
    },

    // 화료 보너스(텐호/해저·하저/도라). 라운드 상태는 ctx={turnCount,doras,uraDoras}로 전달.
    calculateBonuses: function (hand, winType, isRiichi, ctx) {
        let totalBonus = 0;
        const details = [];

        if (ctx.turnCount <= 1 && winType === 'TSUMO') {
            const s = 800;
            totalBonus += s;
            details.push({ name: '텐호 보너스', score: s });
        }

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

        // 우라도라는 리치일 때만 계산.
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

    // discardIdx를 버린 뒤(텐파이 가정) 도달 가능한 최고/평균 역점수와 대기 종류 수.
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

    // 후보 타일이 손패를 얼마나 개선하는지 실제 yaku 테이블로 평가(드로우 어시스트용). 3단계:
    //   ① 지금 화료 → 100000+역점수  ② 버림 후 텐파이 → 10000+도달 최고역  ③ 그 외 → 빌드업 휴리스틱.
    // out(선택): {tier,yaku,score}로 어떤 역을 노리는지 보고.
    rateTileForHand: function (hand, tile, charId, fullHand, out) {
        const report = (tier, yaku, score) => {
            if (out) { out.tier = tier; out.yaku = yaku || null; out.score = score || 0; }
        };

        // 빌드업 점수는 ①②의 소수점 타이브레이커로도 쓰임.
        const sameType = hand.filter(t => t.type === tile.type).length;
        const sameColor = hand.filter(t => t.color === tile.color).length;
        const building = (sameType * sameType * 10) + sameColor;

        if (fullHand && fullHand.length === 11) {
            const fullPlus = [...fullHand, tile];

            const win = this.checkYaku(fullPlus, charId);
            if (win) {
                report('complete', win.yaku && win.yaku[0], win.score);
                return 100000 + win.score;
            }

            // 이 패를 들고 한 장 버린 뒤 어떤 드로우로 화료 가능한가 — 도달 최고역으로 순위.
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

        report('building', null, building);
        return building;
    }
};
