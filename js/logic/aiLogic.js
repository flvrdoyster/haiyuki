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

        const discards = context ? context.discards : [];
        const opponentRiichi = context ? context.opponentRiichi : false;
        const doras = context ? context.doras : [];
        const charId = context ? context.charId : null;

        // Style is applied at full strength regardless of skill (difficulty never
        // flattens personality). Dora value is scaled by greed inside hand potential.
        const value = (profile.value != null) ? profile.value : 0.5;

        const candidates = [];
        for (let i = 0; i < hand.length; i++) {
            const tile = hand[i];
            const remainingHand = [...hand];
            remainingHand.splice(i, 1);

            // Base: maximize the potential of what's LEFT after discarding.
            let score = this.calculateHandPotential(remainingHand, profile, doras, 1);

            // Tenpai lookahead (competence) — a skilled AI avoids breaking a winning
            // wait. Only valid on a full concealed hand (11 tiles).
            if (skill > 0.05 && remainingHand.length === 11) {
                if (YakuLogic.checkTenpai(remainingHand)) {
                    score += this.TENPAI_BONUS * skill;
                    // value (큰 역/한 방 노림): among tenpai discards, prefer the one
                    // that can complete the BIGGER yaku. getRiichiScore simulates this
                    // discard × every completion tile and returns the best yaku score.
                    if (value > 0 && charId) {
                        const reach = YakuLogic.getRiichiScore(hand, charId, i);
                        score += reach.maxScore * value * this.VALUE_WEIGHT;
                    }
                }
            }

            // Defense (STYLE): under opponent Riichi prefer genbutsu (a tile already
            // discarded is guaranteed safe here) to avoid dealing into ron. profile.
            // defense alone drives how much the character plays safe vs pushes.
            if (opponentRiichi) {
                const isSafe = discards.some(d => d.type === tile.type && d.color === tile.color);
                if (isSafe) score += profile.defense * 200;
            }

            candidates.push({ index: i, score: score });
        }

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
