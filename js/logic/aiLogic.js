const AILogic = {
    DIFFICULTY: {
        EASY: 0,
        NORMAL: 1,
        HARD: 2
    },

    // Main decision function for Discard
    decideDiscard: function (hand, difficulty) {
        // 1. Check for Tenpai (and potential Riichi)
        // If discarding a tile leads to Tenpai, prioritize it?
        // For now, let's stick to the strategy:
        // - Keep Pairs/Triplets
        // - Keep Color
        // - Discard Useless

        // Analyze hand
        const analysis = YakuLogic.analyzeHand(hand);
        const counts = analysis.counts; // Key: "color_id"
        const typeCounts = analysis.typeCounts; // Key: "id"

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

        // 1. Singles (Count == 1)
        // 2. Wrong Color (if Normal/Hard)

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
                if (tile.color === minColor) score += 5; // Discard minority color
                if (tile.color === maxColor) score -= 5; // Keep majority color
            }

            candidates.push({ index: index, score: score, tile: tile });
        });

        // Sort by score descending (Higher score = Better to discard)
        candidates.sort((a, b) => b.score - a.score);

        // Add some randomness for Easy/Normal
        if (difficulty === this.DIFFICULTY.EASY) {
            // Pick random from top 5?
            const range = Math.min(candidates.length, 5);
            const r = Math.floor(Math.random() * range);
            return candidates[r].index;
        } else {
            // Normal: Top 1
            return candidates[0].index;
        }
    },

    shouldRiichi: function (hand, difficulty) {
        // If Tenpai and Menzen (assumed checked by caller or passed in), declare Riichi
        // For simple AI, always Riichi if possible
        return true;
    },

    shouldRon: function (hand, discardedTile, difficulty) {
        // Always Ron if possible
        return true;
    },

    shouldTsumo: function (hand, difficulty) {
        // Always Tsumo if possible
        return true;
    }
};
