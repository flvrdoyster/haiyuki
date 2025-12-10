const AILogic = {
    DIFFICULTY: {
        EASY: 0,
        NORMAL: 1,
        HARD: 2
    },

    // Main decision function for Discard
    decideDiscard: function (hand, difficulty, profile, context) {
        // Default profile if missing
        if (!profile) profile = { type: 'DEFAULT', aggression: 0.5, speed: 0.5, defense: 0.5, colorBias: 0.3, greed: 0.3 };

        // Extract Context
        const discards = context ? context.discards : [];
        const opponentRiichi = context ? context.opponentRiichi : false;
        const doras = context ? context.doras : [];

        // Candidates for discard
        let candidates = [];

        // Difficulty Modifiers (Strategic Blindness)
        let defenseModifier = 1.0;
        let doraModifier = 1.0;

        if (difficulty === this.DIFFICULTY.EASY) {
            defenseModifier = 0.0; // Completely ignore opponent threats
            doraModifier = 0.0;    // Ignore Dora value (treat as normal)
        } else if (difficulty === this.DIFFICULTY.NORMAL) {
            defenseModifier = 0.5; // Partial awareness
            doraModifier = 1.0;
        } else {
            defenseModifier = 1.0; // Full awareness
            doraModifier = 1.0;
        }

        // Evaluate each potential discard
        for (let i = 0; i < hand.length; i++) {
            const tile = hand[i];

            // 1. Simulate Discard
            const remainingHand = [...hand];
            remainingHand.splice(i, 1);

            // 2. Calculate Potential of Remaining Hand
            // We want to MAXIMIZE the potential of what's left.
            // Pass modifiers to calculation if needed, or apply here.
            // Currently calculateHandPotential uses hardcoded weights, let's inject modifier there or wrap it.
            // Actually, let's keep calc pure and apply modifiers to the *result* or *inputs*.

            // Dora Check locally to apply modifier? 
            // calculateHandPotential handles Dora. We should pass the modifier.
            const potential = this.calculateHandPotential(remainingHand, profile, doras, doraModifier);
            let score = potential;

            // 3. Defense Logic (If Opponent Riichi)
            // If Riichi, we prioritise SAFETY over potential.
            if (opponentRiichi && defenseModifier > 0) {
                const isSafe = discards.some(d => d.type === tile.type && d.color === tile.color);
                const defenseFactor = profile.defense * 200 * defenseModifier; // Strong weight * difficulty

                if (isSafe) {
                    score += defenseFactor; // Good to discard (Safe)
                } else {
                    // Penalty logic if needed
                }
            }

            // 4. Synergies with already discarded tiles? (Genbutsu logic is above)
            // If we have 3, and we discard 1, we are left with Pair.
            // If we have 1, and discard 1, we are left with 0. 
            // Potential calc handles this.

            candidates.push({ index: i, score: score, tile: tile });
        }

        // Sort by score descending (Higher score = Better to discard)
        // Because Score = Potential of Remaining Hand. 
        // We want to keep the best hand, implies we discard the tile that leaves the best hand.
        candidates.sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
            // console.log(`[AI Discard] Top: ${candidates[0].tile.type} (${candidates[0].score})`);
        }

        // Difficulty Logic - Selection
        if (difficulty === this.DIFFICULTY.EASY) {
            // Random top 3 (Mistakes)
            const range = Math.min(candidates.length, 3);
            const r = Math.floor(Math.random() * range);
            return candidates[r].index;
        } else if (difficulty === this.DIFFICULTY.NORMAL) {
            // Weighted top 2
            return candidates[Math.random() < 0.7 ? 0 : 1].index;
        } else {
            // Hard: Optimal
            return candidates[0].index;
        }
    },

    calculateHandPotential: function (hand, profile, doras, doraModifier = 1.0) {
        const analysis = YakuLogic.analyzeHand(hand);
        const counts = analysis.counts;
        let score = 0;

        // 1. Set Efficiency (Speed)
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

        // 2. Color Bias (Greed / Strategy)
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

        // 3. Dora Bonus
        if (doras && doras.length > 0 && doraModifier > 0) {
            hand.forEach(t => {
                const isDora = doras.some(d => d.type === t.type && d.color === t.color);
                if (isDora) {
                    score += (50 * doraModifier); // Protect Dora scaled by difficulty awareness
                }
            });
        }

        // 4. Character Specific Synergies? (Simple heuristic from YakuLogic)
        // E.g. Check for Char+Weapon pairs if aggression/greed is high

        return score;
    },

    shouldRiichi: function (hand, difficulty, profile) {
        if (!profile) profile = { aggression: 0.5 };

        // Aggression check
        // Higher aggression = More likely to Riichi instantly
        // Lower aggression = Might stay silent (Dama) to surprise? (Not implemented yet, just chance to NOT do it if < threshold?)
        // For now: 
        // If Aggression > 0.3, do it. 
        // If Aggression is low, maybe 30% chance to skip?

        // Difficulty Effect: Easy AI might miss the chance to Riichi
        if (difficulty === this.DIFFICULTY.EASY && Math.random() < 0.5) return false;

        if (profile.aggression < 0.3) {
            return Math.random() < 0.5; // 50% chance to skip Riichi if very passive
        }
        return true;
    },

    shouldRon: function (hand, discardedTile, difficulty, profile) {
        // Always Ron if possible, winning is paramount.
        return true;
    },

    shouldTsumo: function (hand, difficulty, profile) {
        // Always Tsumo if possible
        return true;
    },

    shouldPon: function (hand, tile, difficulty, profile) {
        if (!profile) profile = { speed: 0.5 };

        // Speed check
        // High speed = Likes to Pon (Open Hand)
        // Low speed = Dislikes Pon (Menzen)

        // Base chance: Speed value (0.2 ~ 0.9)
        // If has pair, Logic usually asks.

        // If Speed is high (0.8), 80% chance to Pon.
        // If Speed is low (0.2), 20% chance to Pon.

        // Difficulty Effect: Easy AI might miss the chance to Pon
        if (difficulty === this.DIFFICULTY.EASY && Math.random() < 0.5) return false;

        return Math.random() < profile.speed;
    }
};
