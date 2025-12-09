const AILogic = {
    DIFFICULTY: {
        EASY: 0,
        NORMAL: 1,
        HARD: 2
    },

    // Main decision function for Discard
    decideDiscard: function (hand, difficulty, profile, context) {
        // Default profile if missing
        if (!profile) profile = { type: 'DEFAULT', aggression: 0.5, speed: 0.5, defense: 0.5, colorBias: 0.3 };

        // Extract Context
        const discards = context ? context.discards : [];
        const opponentRiichi = context ? context.opponentRiichi : false;

        // Analyze hand
        const analysis = YakuLogic.analyzeHand(hand);
        const counts = analysis.counts; // Key: "color_id"

        // Strategy: Color Priority
        // Count tiles per color
        const colorCounts = { red: 0, blue: 0, yellow: 0, purple: 0 };
        hand.forEach(t => {
            if (colorCounts[t.color] !== undefined) colorCounts[t.color]++;
        });

        // Find most and least frequent colors
        let maxColor = 'red';
        let minColor = 'red';
        let maxCount = -1;
        let minCount = 99;

        for (const col in colorCounts) {
            if (colorCounts[col] > maxCount) {
                maxCount = colorCounts[col];
                maxColor = col;
            }
            if (colorCounts[col] < minCount) {
                minCount = colorCounts[col];
                minColor = col;
            }
        }

        // Candidates for discard
        let candidates = [];

        hand.forEach((tile, index) => {
            const key = `${tile.color}_${tile.type}`;
            const count = counts[key].count;

            let score = 0;

            // Base Score: Inverse of count (Singles are high priority to discard)
            if (count === 1) score += 10;
            else if (count === 2) score += 2; // Pairs are valuable
            else if (count >= 3) score += 0; // Triplets are very valuable

            // Color Score (Normal+)
            if (difficulty >= this.DIFFICULTY.NORMAL) {
                // Bias Influence: 0.0 ~ 1.0 (Current Logic was static +/- 5)
                // New Logic: 
                // Discard Minority: Base 5 + (Bias * 10) -> Stronger bias = Hates wrong color more
                // Keep Majority: Base -5 - (Bias * 10) -> Stronger bias = Loves main color more

                if (tile.color === minColor) score += (5 + (profile.colorBias * 10));
                if (tile.color === maxColor) score -= (5 + (profile.colorBias * 10));
            }

            // Defense Logic: Against Riichi
            if (opponentRiichi && difficulty >= this.DIFFICULTY.NORMAL) {
                // Check if tile matches any in discards (Genbutsu / Safe)
                const isSafe = discards.some(d => d.type === tile.type && d.color === tile.color);

                // Scale defense strength by profile
                // Strong defense (>0.8) = Huge shift (+/- 80)
                // Weak defense (<0.3) = Tiny shift (+/- 20)
                const defenseMod = Math.floor(100 * profile.defense);

                if (isSafe) {
                    // Safe Tile: Bonus to Discard Score (Encourage discard)
                    score += defenseMod;
                    // Log debug
                    // console.log(`[AI Defense] Safe Tile identified: ${tile.type}`);
                } else {
                    // Dangerous Tile: Penalty to Discard Score (Discourage discard)
                    score -= defenseMod;
                }
            }

            // Defense Logic (General Profile) - Deprecated/Merged above
            // if (profile.defense > 0.7) { ... }

            candidates.push({ index: index, score: score, tile: tile });
        });

        // Sort by score descending (Higher score = Better to discard)
        candidates.sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
            console.log(`[AI Discard] Top: ${candidates[0].tile.type} (${candidates[0].score}), 2nd: ${candidates[1]?.tile.type} (${candidates[1]?.score})`);
        }

        // Add some randomness for Easy/Normal
        // Difficulty Logic
        if (difficulty === this.DIFFICULTY.EASY) {
            // Easy: Pick random from top 4 (Frequent mistakes)
            const range = Math.min(candidates.length, 4);
            const r = Math.floor(Math.random() * range);
            return candidates[r].index;

        } else if (difficulty === this.DIFFICULTY.NORMAL) {
            // Normal: Weighted Random from Top 3
            // Higher score = Higher chance
            const range = Math.min(candidates.length, 3);
            const topCandidates = candidates.slice(0, range);

            // Calculate total weight (offset by min score to keep positive if negative exist, though scores here are usually >=0)
            // Just use simple weighting: Score + 10 to ensure base weight
            const weightTotal = topCandidates.reduce((sum, c) => sum + (c.score + 10), 0);
            let r = Math.random() * weightTotal;

            for (let i = 0; i < range; i++) {
                r -= (topCandidates[i].score + 10);
                if (r <= 0) return topCandidates[i].index;
            }
            return topCandidates[0].index; // Fallback

        } else {
            // Hard: Always Top 1 (Optimal for Profile)
            return candidates[0].index;
        }
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
