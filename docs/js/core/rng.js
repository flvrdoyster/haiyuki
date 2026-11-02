const Rng = {
    randomSeed: function () {
        return Math.floor(Math.random() * 4294967296) >>> 0;
    },

    hash: function (seed, name) {
        let h = (seed ^ 0x9e3779b9) >>> 0;
        for (let i = 0; i < name.length; i++) {
            h = Math.imul(h ^ name.charCodeAt(i), 0x85ebca6b);
            h ^= h >>> 13;
        }
        h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35);
        return (h ^ (h >>> 15)) >>> 0;
    },

    stream: function (seed, name) {
        let a = Rng.hash(seed, name);
        const s = {
            random: function () {
                a = (a + 0x6d2b79f5) >>> 0;
                let t = a;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            },
            int: function (n) {
                return Math.floor(s.random() * n);
            },
            pick: function (array) {
                return array[s.int(array.length)];
            },
            shuffle: function (array) {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = s.int(i + 1);
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            }
        };
        return s;
    },

    create: function (seed) {
        if (seed == null) seed = Rng.randomSeed();
        seed = seed >>> 0;
        return {
            seed: seed,
            deck: Rng.stream(seed, 'deck'),
            fx: Rng.stream(seed, 'fx'),
            ai: Rng.stream(seed, 'ai')
        };
    }
};
