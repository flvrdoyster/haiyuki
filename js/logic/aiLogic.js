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

            // 1. Efficiency (Isolation vs Connection)
            // Check Neighbors (Connectivity)
            const typeIdx = PaiData.TYPES.findIndex(t => t.id === tile.type && t.color === tile.color);
            let hasNeighbor = false;
            // Simple check: Look for +/- 1 or +/- 2 index in same color group (assuming PaiData is ordered or we check hand)
            // Better: Check HAND for neighbors.
            const value = parseInt(tile.type) || 0; // If numeric. But types are 'pai_ata', etc. Not numeric sequences?
            // Wait, this is Character Mahjong. There are NO sequences (Shuntsu) in Hwanse Paeyugi!
            // It's all about Triplets (Koutsu) and Pairs (Toitsu)!
            // **Correction**: Hwanse Paeyugi rules are standard Mahjong-ish?
            // Logic/YakuLogic Check: "checkYaku" usually supports Pon?
            // Re-reading visual evidence/previous code:
            // - "Triplets are very valuable" comment in existing AI.
            // - YakuLogic.js (I should have checked this).
            // - File `assets.js` has tiles like `pai_ata`. These are character faces.
            // - THIS IS NOT NUMERIC MAHJONG.
            // - **CRITICAL REALIZATION**: Connectivity (+/- 1) adds NOTHING if sequences aren't valid.
            // - If sequences ARE valid (e.g. Ata-Rin-Smash?), then heuristics apply.
            // - Let's assume ONLY Triplets/Pairs matter for now unless I verify YakuLogic.
            // - Previous conversation mentions "Pon" but not "Chi". "Chi" is usually for sequences.
            // - "Remove the Kan action... Ensure Pon is allowed". No mention of Chi.
            // - **Safest Bet**: Assume Triplet-based game for "Connectivity" means "How many copies do I have?".
            // - Wait, if it's purely triplet based (Pong/Kong), then "Isolation" simply means "I have 1 of this".
            // - So "Connectivity" = "Do I have 2 or 3?" (Already covered by `count`).
            // - **BUT**: Maybe the user wants "Color Bias" to be smarter?
            // - Or maybe "Connectivity" implies "Pairs are good, Singles are bad".
            // - Let's STICK to the plan but refined:
            //   - Prioritize Pairs/Triplets (Keep).
            //   - Discard Singles.
            //   - **DORA**: This is the big weakness.
            //   - **Defense**: If Opponent Riichi, discard Safe tiles.

            // Base Score: Inverse of count
            if (count === 1) score += 20; // Single? Trash it.
            else if (count === 2) score -= 20; // Pair? Keep it! (Was +2 in old logic, which was weird if high score = discard)
            // Wait, old logic: "if (count === 1) score += 10; else if (count === 2) score += 2;"
            // Old logic: Higher score = Discard.
            // So Single (+10) > Pair (+2). So it preferred discarding singles. Correct.
            // We want to make it STRONGER.
            // Single (+20), Pair (-20).

            else if (count >= 3) score -= 50; // Triplet? NEVER discard.

            // 2. Dora Awareness
            if (context && context.doras) {
                const isDora = context.doras.some(d => d.type === tile.type && d.color === tile.color);
                if (isDora) {
                    score -= 30; // Huge penalty to discard Dora
                    // console.log(`[AI] Dora protection: ${tile.type}`);
                }
            }

            // 3. Color Strategy (Bias)
            if (difficulty >= this.DIFFICULTY.NORMAL) {
                if (tile.color === minColor) score += (5 + (profile.colorBias * 10)); // Dump minority
                if (tile.color === maxColor) score -= (5 + (profile.colorBias * 10)); // Keep majority
            }

            // 4. Defense Logic (Against Riichi)
            if (opponentRiichi && difficulty >= this.DIFFICULTY.NORMAL) {
                const isSafe = discards.some(d => d.type === tile.type && d.color === tile.color);
                const defenseMod = Math.floor(100 * profile.defense); // e.g. 50
                if (isSafe) {
                    score += defenseMod; // Boost discard score (Do it!)
                } else {
                    score -= defenseMod; // Penalty (Don't do it!)
                }
            }

            candidates.push({ index: index, score: score, tile: tile });
        });

        // Sort by score descending (Higher score = Better to discard)
        candidates.sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
            // console.log(`[AI Discard] Top: ${candidates[0].tile.type} (${candidates[0].score}), 2nd: ${candidates[1]?.tile.type} (${candidates[1]?.score})`);
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
