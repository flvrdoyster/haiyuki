const AILogic = {
    DEFAULT_PROFILE: { type: 'DEFAULT', value: 0.5, speed: 0.5, defense: 0.5, colorBias: 0.3, greed: 0.3, luck: 0 },

    VALUE_WEIGHT: 0.05,
    MISTAKE_TEMP: 0.6,

    MAX_YAKU: 12800,
    TENPAI_TIER: 1500,
    YAKU_REACH_W: 800,
    WAIT_W: 30,
    SHANTEN_TIER: 400,
    ACCEPT_W: 25,
    STYLE_W: 0.5,
    DEFENSE_BASE: 300,
    DEFENSE_W: 600,
    COLOR_W: 350,
    DORA_KEEP_W: 400,
    VALUE_BUILD_W: 300,

    // skill(0..1)은 softmax 온도만 좌우(실력). 스타일 축은 skill 무관 full 적용.
    decideDiscard: function (hand, skill, profile, context) {
        if (!profile) profile = this.DEFAULT_PROFILE;
        if (skill == null) skill = 0.5;

        const candidates = this.scoreDiscards(hand, profile, context);

        candidates.sort((a, b) => b.score - a.score);

        // 실수 = 점수 분포 softmax. 온도 ∝ 점수폭×(1-skill) → 근소차 슬립은 잦고 대형
        // 헛수는 드묾. skill 1이면 무실수.
        if (candidates.length <= 1) return candidates[0].index;
        const top = candidates[0].score;
        const spread = (top - candidates[candidates.length - 1].score) || 1;
        const T = spread * (1 - skill) * this.MISTAKE_TEMP;
        if (T < 1e-6) return candidates[0].index;
        let sum = 0;
        const weights = candidates.map(c => { const w = Math.exp((c.score - top) / T); sum += w; return w; });
        let r = Math.random() * sum;
        for (let i = 0; i < candidates.length; i++) {
            r -= weights[i];
            if (r <= 0) return candidates[i].index;
        }
        return candidates[0].index;
    },

    // 후보별 버림 점수(높을수록 버리기 좋음). 결정적 — softmax/난수는 decideDiscard에서.
    scoreDiscards: function (hand, profile, context) {
        if (!profile) profile = this.DEFAULT_PROFILE;
        const discards = context ? context.discards : [];
        const opponentRiichi = context ? context.opponentRiichi : false;
        const doras = context ? context.doras : [];
        const charId = context ? context.charId : null;
        const value = (profile.value != null) ? profile.value : 0.5;

        // 닫힌 손패(12)만 실제 yaku 평가가 성립; 펑 손패는 휴리스틱 폴백.
        const smart = (hand.length === 12);

        const greed = (profile.greed != null) ? profile.greed : 0.3;
        let domColor = null, domCount = 0; const byColor = {};
        for (const t of hand) { byColor[t.color] = (byColor[t.color] || 0) + 1; if (byColor[t.color] > domCount) { domCount = byColor[t.color]; domColor = t.color; } }
        const doraSet = new Set((doras || []).map(d => d.type + '_' + d.color));

        const candidates = [];
        for (let i = 0; i < hand.length; i++) {
            const tile = hand[i];
            const remainingHand = [...hand];
            remainingHand.splice(i, 1);

            let score;
            if (smart) {
                const reach = YakuLogic.getRiichiScore(hand, charId, i);
                if (reach.waitCount > 0) {
                    score = this.TENPAI_TIER
                        + (reach.maxScore / this.MAX_YAKU) * this.YAKU_REACH_W
                        + Math.min(reach.waitCount, 12) * this.WAIT_W;
                    if (value > 0) score += reach.maxScore * value * this.VALUE_WEIGHT;
                } else {
                    const acc = this.acceptanceInfo(remainingHand, charId);
                    score = (acc.accept > 0 ? this.SHANTEN_TIER : 0) + acc.accept * this.ACCEPT_W;
                    if (value > 0 && acc.bestYaku > 0) score += (acc.bestYaku / this.MAX_YAKU) * value * this.VALUE_BUILD_W;
                }
                score += this.calculateHandPotential(remainingHand, profile, doras, 1) * this.STYLE_W;

                if (domCount >= 5 && tile.color !== domColor) score += profile.colorBias * this.COLOR_W;
                if (doraSet.has(tile.type + '_' + tile.color)) score -= greed * this.DORA_KEEP_W;
            } else {
                score = this.calculateHandPotential(remainingHand, profile, doras, 1);
            }

            // 겐부츠(이미 버려진 패 = 론 불가) 선호. 베이스 + 성격(defense).
            if (opponentRiichi) {
                const isSafe = discards.some(d => d.type === tile.type && d.color === tile.color);
                if (isSafe) score += this.DEFENSE_BASE + profile.defense * this.DEFENSE_W;
            }

            candidates.push({ index: i, score: score });
        }
        return candidates;
    },

    // 비텐파이 11패: ukeire(accept) + 한 수 앞 도달 가능 최고 역(bestYaku, value 스티어용).
    acceptanceInfo: function (hand11, charId) {
        let accept = 0, bestYaku = 0;
        for (const D of PaiData.TYPES) {
            const h12 = [...hand11, { type: D.id, color: D.color, img: D.img }];
            const tried = new Set();
            let foundJ = -1;
            for (let j = 0; j < h12.length && foundJ < 0; j++) {
                const d = h12[j];
                const k = d.type + '_' + d.color;
                if (tried.has(k)) continue;
                tried.add(k);
                const h11b = [...h12];
                h11b.splice(j, 1);
                if (YakuLogic.checkTenpai(h11b)) foundJ = j;
            }
            if (foundJ >= 0) {
                accept++;
                const rs = YakuLogic.getRiichiScore(h12, charId, foundJ);
                if (rs.maxScore > bestYaku) bestYaku = rs.maxScore;
            }
        }
        return { accept, bestYaku };
    },

    calculateHandPotential: function (hand, profile, doras, doraModifier = 1.0) {
        const analysis = YakuLogic.analyzeHand(hand);
        const counts = analysis.counts;
        let score = 0;

        Object.values(counts).forEach(c => {
            const count = c.count;
            if (count >= 3) {
                score += (100 * (0.5 + profile.speed));
            } else if (count === 2) {
                score += (40 * (0.5 + profile.speed));
            }
        });

        const byColor = { red: 0, blue: 0, yellow: 0, purple: 0 };
        hand.forEach(t => {
            if (byColor[t.color] !== undefined) byColor[t.color]++;
        });

        let maxColorCount = 0;
        let maxColor = 'red';
        for (const c in byColor) {
            if (byColor[c] > maxColorCount) {
                maxColorCount = byColor[c];
                maxColor = c;
            }
        }

        if (profile.colorBias > 0.3) {
            hand.forEach(t => {
                if (t.color === maxColor) {
                    score += (10 * profile.colorBias);
                }
            });
        }

        if (doras && doras.length > 0 && doraModifier > 0) {
            const greed = (profile.greed != null) ? profile.greed : 0.3;
            hand.forEach(t => {
                const isDora = doras.some(d => d.type === t.type && d.color === t.color);
                if (isDora) {
                    score += (50 * doraModifier * (0.5 + greed));
                }
            });
        }

        return score;
    },

    shouldRiichi: function (hand, skill, profile) {
        if (skill == null) skill = 0.5;
        // 론=리치 전제라 텐파이면 리치가 정답(성격 축 아님). 실력으로만 게이팅.
        return Math.random() <= (0.6 + 0.4 * skill);
    },

    shouldRon: function (hand, discardedTile, skill, profile) {
        return true;
    },

    shouldTsumo: function (hand, skill, profile) {
        return true;
    },

    shouldPon: function (hand, tile, skill, profile, context) {
        if (!profile) profile = this.DEFAULT_PROFILE;
        if (skill == null) skill = 0.5;

        const isMenzen = context ? context.isMenzen : true;
        const turnCount = context ? context.turnCount : 0;

        // speed=펑 적극, greed=자제(닫고 리치+도라 노림).
        const greed = (profile.greed != null) ? profile.greed : 0.3;
        const ponBias = profile.speed * (1 - 0.6 * greed);

        // 멘젠은 리치 노려 늦게까지 안 엶.
        if (isMenzen) {
            if (turnCount < 14) {
                return Math.random() < (ponBias * 0.1);
            }
            return Math.random() < ponBias;
        }
        return Math.random() < ponBias;
    }
};
