const AILogic = {
    DEFAULT_PROFILE: { type: 'DEFAULT', value: 0.5, speed: 0.5, defense: 0.5, colorBias: 0.3, greed: 0.3, luck: 0 },

    // Reward for a discard that leaves the hand one tile from winning (tenpai).
    TENPAI_BONUS: 300,
    // `value` (큰 역/한 방 노림) weight: scales the reachable yaku score (2000..12800)
    // into the discard ranking. Higher = chases bigger hands harder.
    VALUE_WEIGHT: 0.05,
    // Softmax mistake temperature scale (see decideDiscard). Higher = more mistakes
    // at a given skill. Tune this to widen/narrow the skill→accuracy curve.
    MISTAKE_TEMP: 0.6,

    // Yaku-aware discard tiers (decideDiscard smart/closed-hand path). Tuned so the
    // softmax stays calibrated: TENPAI clearly dominates 1-SHANTEN, which dominates raw
    // building. Tweak to retune the AI's priorities (higher tier = stronger preference).
    MAX_YAKU: 12800,     // top yaku score — normalizes the reachable-yaku rewards
    TENPAI_TIER: 1500,   // base for a discard that LEAVES a tenpai (winning wait)
    YAKU_REACH_W: 800,   // × (reachable maxScore / MAX_YAKU) — prefer bigger reachable yaku
    WAIT_W: 30,          // × wait width — prefer wider waits
    SHANTEN_TIER: 400,   // base for a non-tenpai discard that still has accepting draws
    ACCEPT_W: 25,        // × acceptance count (ukeire) — prefer wider acceptance
    STYLE_W: 0.5,        // weight of the set-shape/color/dora/style flavor layered on top
    DEFENSE_BASE: 300,   // 상대 리치 시 안전패(겐부츠) 기본 보너스 — 모든 캐릭이 챙기도록
    DEFENSE_W: 600,      // × profile.defense — 방어형일수록 더 안전 지향
    COLOR_W: 350,        // colorBias: 우세색이 모였을 때 비우세 패를 버리면 가산(순·초일색 노림)
    DORA_KEEP_W: 400,    // greed: 도라를 버리면 감점(도라 애착) — 욕심 많을수록 강함
    VALUE_BUILD_W: 300,  // value: 비텐파이에서도 도달 가능 최고 역 선호(빌드업 단계, 텐파이보다 약하게)

    /**
     * Choose which tile to discard.
     * @param {number} skill 0..1 = CONSISTENCY/COMPETENCE only. Controls the mistake
     *        rate (softmax temperature), dora awareness, the tenpai lookahead, and
     *        riichi-miss. Character STYLE (value/speed/defense/colorBias/greed) comes
     *        from `profile` and is applied at full strength regardless of skill, so
     *        difficulty never flattens personality.
     */
    decideDiscard: function (hand, skill, profile, context) {
        if (!profile) profile = this.DEFAULT_PROFILE;
        if (skill == null) skill = 0.5;

        const candidates = this.scoreDiscards(hand, profile, context);

        // Higher score = better hand left behind = better tile to discard.
        candidates.sort((a, b) => b.score - a.score);

        // Mistakes via softmax over the ranked scores, with temperature set by skill.
        // High skill → T≈0 → near-greedy (best tile). Low skill → flatter, but still
        // score-weighted: small slips (near-tie tiles) are common while big blunders
        // (far-worse tiles) stay rare — unlike a uniform pick that blunders as often
        // as it slips. Personality survives because the scores already encode it; the
        // temperature only adds skill-scaled noise on top of that ranking.
        if (candidates.length <= 1) return candidates[0].index;
        const top = candidates[0].score;
        const spread = (top - candidates[candidates.length - 1].score) || 1;
        const T = spread * (1 - skill) * this.MISTAKE_TEMP;
        if (T < 1e-6) return candidates[0].index; // perfect play at max skill
        let sum = 0;
        const weights = candidates.map(c => { const w = Math.exp((c.score - top) / T); sum += w; return w; });
        let r = Math.random() * sum;
        for (let i = 0; i < candidates.length; i++) {
            r -= weights[i];
            if (r <= 0) return candidates[i].index;
        }
        return candidates[0].index;
    },

    // Score each possible discard (higher = better tile to throw = better hand left
    // behind). Pure & deterministic — no skill, no randomness; decideDiscard layers the
    // skill-scaled softmax on top. Split out so the mistake rate can be measured.
    scoreDiscards: function (hand, profile, context) {
        if (!profile) profile = this.DEFAULT_PROFILE;
        const discards = context ? context.discards : [];
        const opponentRiichi = context ? context.opponentRiichi : false;
        const doras = context ? context.doras : [];
        const charId = context ? context.charId : null;
        // Style is applied at full strength regardless of skill (difficulty never
        // flattens personality). Dora value is scaled by greed inside hand potential.
        const value = (profile.value != null) ? profile.value : 0.5;

        // Yaku-aware competence is only well-defined for a full concealed hand (12),
        // where every 11-tile remainder can be measured against the real yaku table.
        // Open (pon'd) hands keep the lighter shape/style heuristic.
        const smart = (hand.length === 12);

        // Personality helpers, computed once and reused per candidate.
        const greed = (profile.greed != null) ? profile.greed : 0.3;
        // Dominant color of the full hand (for 순·초일색 steering).
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
                // Judge the hand we'd LEAVE BEHIND against the real yaku table, in tiers
                // (the same intelligence the easy-mode draw assist uses):
                const reach = YakuLogic.getRiichiScore(hand, charId, i); // tenpai reachability of this discard
                if (reach.waitCount > 0) {
                    // TENPAI — keep this wait. Reward best reachable yaku + wait width.
                    score = this.TENPAI_TIER
                        + (reach.maxScore / this.MAX_YAKU) * this.YAKU_REACH_W
                        + Math.min(reach.waitCount, 12) * this.WAIT_W;
                    if (value > 0) score += reach.maxScore * value * this.VALUE_WEIGHT; // chase big (style)
                } else {
                    // Not tenpai — reward acceptance (ukeire) AND the best reachable yaku
                    // one improvement away, so value steers the BUILD, not just tenpai.
                    const acc = this.acceptanceInfo(remainingHand, charId);
                    score = (acc.accept > 0 ? this.SHANTEN_TIER : 0) + acc.accept * this.ACCEPT_W;
                    if (value > 0 && acc.bestYaku > 0) score += (acc.bestYaku / this.MAX_YAKU) * value * this.VALUE_BUILD_W;
                }
                // Generic shape/flavor baseline (speed via set-shape multiplier lives here).
                score += this.calculateHandPotential(remainingHand, profile, doras, 1) * this.STYLE_W;

                // --- Personality steer (STYLE) on the discarded tile ---
                // colorBias (순·초일색): once a color is forming, prefer tossing off-color.
                if (domCount >= 5 && tile.color !== domColor) score += profile.colorBias * this.COLOR_W;
                // greed (도라 애착): keep dora — penalize discarding one (greedier = stronger).
                if (doraSet.has(tile.type + '_' + tile.color)) score -= greed * this.DORA_KEEP_W;
            } else {
                // Open hand: shape/style heuristic only.
                score = this.calculateHandPotential(remainingHand, profile, doras, 1);
            }

            // Defense (STYLE): under opponent Riichi prefer discarding genbutsu (a tile
            // already in the discards is guaranteed safe). Base bonus everyone gets +
            // a defense-scaled part, so all characters value safety (방어형일수록 더).
            if (opponentRiichi) {
                const isSafe = discards.some(d => d.type === tile.type && d.color === tile.color);
                if (isSafe) score += this.DEFENSE_BASE + profile.defense * this.DEFENSE_W;
            }

            candidates.push({ index: i, score: score });
        }
        return candidates;
    },

    // Ukeire + reachable value for an 11-tile (non-tenpai) hand:
    //   accept   — how many distinct draws advance it to tenpai (after the best discard)
    //   bestYaku — best yaku score reachable one improvement away (for value steering)
    // Closed-hand measure (12-tile yaku check via checkTenpai/getRiichiScore).
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

        // Set Efficiency (Speed)
        // Prefer Pairs (2) and Triplets (3+).
        // Heavily penalize Singles (1).

        Object.values(counts).forEach(c => {
            const count = c.count;
            if (count >= 3) {
                score += (100 * (0.5 + profile.speed)); // Triplet
            } else if (count === 2) {
                score += (40 * (0.5 + profile.speed)); // Pair
            } else {
                // Single: 0 points.
                // Maybe small penalty to encourage clearing? 
                // No, simply having 0 vs 40 makes pairs better.
            }
        });

        // Color Bias (Greed / Strategy)
        // If colorBias is high, boost score for tiles of dominant color.
        const byColor = { red: 0, blue: 0, yellow: 0, purple: 0 };
        hand.forEach(t => {
            if (byColor[t.color] !== undefined) byColor[t.color]++;
        });

        // Find max color count
        let maxColorCount = 0;
        let maxColor = 'red';
        for (const c in byColor) {
            if (byColor[c] > maxColorCount) {
                maxColorCount = byColor[c];
                maxColor = c;
            }
        }

        // Apply Bonus for dominant color tiles
        // Only if we actually have a significant bias
        if (profile.colorBias > 0.3) {
            hand.forEach(t => {
                if (t.color === maxColor) {
                    score += (10 * profile.colorBias);
                }
            });
        }

        // Dora Bonus — greedy characters chase/protect dora harder (린샹·아타호 high,
        // 스마슈 low). profile.greed defaults to 0.3 if unset.
        if (doras && doras.length > 0 && doraModifier > 0) {
            const greed = (profile.greed != null) ? profile.greed : 0.3;
            hand.forEach(t => {
                const isDora = doras.some(d => d.type === t.type && d.color === t.color);
                if (isDora) {
                    score += (50 * doraModifier * (0.5 + greed));
                }
            });
        }

        // Character Specific Synergies? (Simple heuristic from YakuLogic)
        // E.g. Check for Char+Weapon pairs if value/greed is high

        return score;
    },

    shouldRiichi: function (hand, skill, profile) {
        if (skill == null) skill = 0.5;

        // Riichi has no real trade-off in this ruleset (ron is riichi-only), so
        // declaring when tenpai is simply correct play — NOT a personality axis. Gate
        // only on competence: a weak AI sometimes fails to take the obvious riichi.
        return Math.random() <= (0.6 + 0.4 * skill); // skill 0 → 60%, skill 1 → always
    },

    shouldRon: function (hand, discardedTile, skill, profile) {
        // Always Ron if possible, winning is paramount.
        return true;
    },

    shouldTsumo: function (hand, skill, profile) {
        // Always Tsumo if possible
        return true;
    },

    shouldPon: function (hand, tile, skill, profile, context) {
        if (!profile) profile = this.DEFAULT_PROFILE;
        if (skill == null) skill = 0.5;

        const isMenzen = context ? context.isMenzen : true;
        const turnCount = context ? context.turnCount : 0;

        // Pon eagerness is personality: speed pushes to open, greed pulls back (a
        // greedy character stays closed to keep riichi + dora; 스마슈 pons freely,
        // 아타호 almost never). greed defaults to 0.3 if unset.
        const greed = (profile.greed != null) ? profile.greed : 0.3;
        const ponBias = profile.speed * (1 - 0.6 * greed);

        // STRATEGY: closed hands aim for Riichi, so avoid opening unless desperate.
        if (isMenzen) {
            if (turnCount < 14) {
                return Math.random() < (ponBias * 0.1);
            }
            // Late game: pon to finish in time
            return Math.random() < ponBias;
        }

        // Already open — go for speed
        return Math.random() < ponBias;
    },

    /**
     * Indices of tiles that are not part of any set (triplet/pair).
     * Used to decide which tiles to discard or exchange.
     */
    getBadTileIndices: function (hand) {
        const counts = YakuLogic.analyzeHand(hand).counts;
        const badIndices = [];

        hand.forEach((tile, index) => {
            const key = `${tile.type}_${tile.color}`;
            const c = counts[key] ? counts[key].count : 0;
            if (c < 2) {
                badIndices.push(index);
            }
        });

        return badIndices;
    }
};
