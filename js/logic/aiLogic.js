const AILogic = {
    DEFAULT_PROFILE: { type: 'DEFAULT', aggression: 0.5, speed: 0.5, defense: 0.5, colorBias: 0.3, greed: 0.3 },

    // Reward for a discard that leaves the hand one tile from winning (tenpai).
    TENPAI_BONUS: 300,

    /**
     * Choose which tile to discard.
     * @param {number} skill 0..1 continuous AI competence. Controls mistake rate,
     *        defense/dora awareness, and how much the tenpai lookahead is trusted.
     *        Character STYLE comes from `profile` (orthogonal to skill).
     */
    decideDiscard: function (hand, skill, profile, context) {
        if (!profile) profile = this.DEFAULT_PROFILE;
        if (skill == null) skill = 0.5;

        const discards = context ? context.discards : [];
        const opponentRiichi = context ? context.opponentRiichi : false;
        const doras = context ? context.doras : [];

        // Strategic awareness scales with skill (weak AI is "blind")
        const defenseAwareness = skill;       // 0 = ignores opponent threats entirely
        const doraAwareness = skill * skill;   // ramps in later than defense

        const candidates = [];
        for (let i = 0; i < hand.length; i++) {
            const tile = hand[i];
            const remainingHand = [...hand];
            remainingHand.splice(i, 1);

            // Base: maximize the potential of what's LEFT after discarding.
            let score = this.calculateHandPotential(remainingHand, profile, doras, doraAwareness);

            // Tenpai lookahead — the key skill signal. A skilled AI strongly avoids
            // breaking a winning wait; a weak AI doesn't even notice. Only valid on a
            // full concealed hand (11 tiles); skip after a Pon shortens the hand.
            if (skill > 0.05 && remainingHand.length === 11) {
                if (YakuLogic.checkTenpai(remainingHand)) {
                    score += this.TENPAI_BONUS * skill;
                }
            }

            // Defense: when the opponent has declared Riichi, prefer genbutsu (a tile
            // already in the discards is guaranteed safe in this set-based ruleset).
            if (opponentRiichi && defenseAwareness > 0) {
                const isSafe = discards.some(d => d.type === tile.type && d.color === tile.color);
                if (isSafe) score += profile.defense * 200 * defenseAwareness;
            }

            candidates.push({ index: i, score: score });
        }

        // Higher score = better hand left behind = better tile to discard.
        candidates.sort((a, b) => b.score - a.score);

        // Mistakes: with probability (1-skill)*0.6 pick a sub-optimal tile. The lower
        // the skill, the deeper into the ranked list the mistake can reach.
        const mistakeChance = (1 - skill) * 0.6;
        if (candidates.length > 1 && Math.random() < mistakeChance) {
            const depth = Math.min(candidates.length - 1, 1 + Math.floor((1 - skill) * 3));
            const pick = 1 + Math.floor(Math.random() * depth);
            return candidates[pick].index;
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

        // Dora Bonus
        if (doras && doras.length > 0 && doraModifier > 0) {
            hand.forEach(t => {
                const isDora = doras.some(d => d.type === t.type && d.color === t.color);
                if (isDora) {
                    score += (50 * doraModifier); // Protect Dora scaled by difficulty awareness
                }
            });
        }

        // Character Specific Synergies? (Simple heuristic from YakuLogic)
        // E.g. Check for Char+Weapon pairs if aggression/greed is high

        return score;
    },

    shouldRiichi: function (hand, skill, profile) {
        if (!profile) profile = this.DEFAULT_PROFILE;
        if (skill == null) skill = 0.5;

        // Weak AI sometimes misses the Riichi chance entirely.
        // skill 0 → 40% chance to declare, skill 1 → always.
        if (Math.random() > (0.4 + 0.6 * skill)) return false;

        // Very passive personalities may stay quiet (Dama) regardless of skill.
        if (profile.aggression < 0.3 && Math.random() < 0.4) return false;

        return true;
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

        // STRATEGY: closed hands aim for Riichi, so avoid opening unless desperate.
        if (isMenzen) {
            if (turnCount < 14) {
                // Disciplined (high-skill) AI keeps the hand closed; a weak AI pons
                // impulsively and throws away its Riichi potential.
                const impulse = profile.speed * 0.1 + (1 - skill) * 0.2;
                return Math.random() < impulse;
            }
            // Late game: pon to finish in time
            return Math.random() < profile.speed;
        }

        // Already open — go for speed
        return Math.random() < profile.speed;
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
