const YakuDistance = (() => {
    'use strict';

    const KINDS = 13;
    const KIND_IDS = ['ataho', 'rin', 'punch', 'mayu_red', 'pet', 'fari', 'wand', 'mayu_yellow', 'smash', 'yuri', 'sword', 'mayu_blue', 'mayu_purple'];
    const COLORS = ['red', 'yellow', 'blue'];
    const WEAPONS = [2, 6, 10];
    const PARTNERS = [[0, 1], [4, 5], [8, 9]];
    const ANY = 255;

    const YAKU = [
        { key: 'ALL_STARS', group: 2, closed: true, example: [0, 0, 1, 1, 4, 4, 5, 5, 8, 8, 9, 9] },
        { key: 'SAM_YEON_GYEOK', group: 2, closed: true, example: [0, 0, 2, 2, 5, 5, 6, 6, 8, 8, 10, 10] },
        { key: 'SPECIAL_COMBINATION', group: 3, closed: false, example: [4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7] },
        { key: 'BYEON_TAE_GAE', group: 3, closed: false, example: [1, 1, 1, 5, 5, 5, 8, 8, 8, 9, 9, 9] },
        { key: 'CHO_MAYU', group: 3, closed: false, example: [3, 3, 3, 7, 7, 7, 11, 11, 11, 12, 12, 12] },
        { key: 'MAYU', group: 3, closed: false, example: [3, 3, 3, 7, 7, 7, 11, 11, 11, ANY, ANY, ANY] },
        { key: 'DOUBLE_COMBINATION', group: 3, closed: false, example: [5, 5, 5, 6, 6, 6, 8, 8, 8, 10, 10, 10] },
        { key: 'IL_SAEK', group: 3, closed: false, example: [0, 0, 0, 2, 2, 2, 3, 3, 3, 12, 12, 12] },
        { key: 'COMBINATION', group: 3, closed: false, example: [4, 4, 4, 5, 5, 5, 6, 6, 6, ANY, ANY, ANY] },
        { key: 'SAEK_HANA_SSIK', group: 3, closed: false, example: [1, 1, 1, 4, 4, 4, 10, 10, 10, 12, 12, 12] },
        { key: 'JANG_GI', group: 3, closed: false, example: [1, 1, 1, 2, 2, 2, ANY, ANY, ANY, ANY, ANY, ANY] },
        { key: 'SAM_DO_RIP', group: 3, closed: false, example: [4, 4, 4, 8, 8, 8, 9, 9, 9, 12, 12, 12] },
        { key: 'JIN_MAYU', group: 4, closed: true, example: [3, 3, 3, 3, 7, 7, 7, 7, 11, 11, 11, 11] },
        { key: 'CROSS_COMBINATION', group: 4, closed: true, example: [4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6] },
        { key: 'MAGU_DDAERIGI', group: 4, closed: true, example: [2, 2, 2, 2, 6, 6, 6, 6, 10, 10, 10, 10] },
        { key: 'CHO_IL_SAEK', group: 4, closed: true, example: [0, 0, 0, 0, 2, 2, 2, 2, 3, 3, 3, 3] },
        { key: 'NAM_TANG', group: 4, closed: true, example: [0, 0, 0, 0, 4, 4, 4, 4, 8, 8, 8, 8] },
        { key: 'YEO_TANG', group: 4, closed: true, example: [1, 1, 1, 1, 5, 5, 5, 5, 9, 9, 9, 9] },
        { key: 'CHWI_HO_JEON', group: 4, closed: true, example: [0, 0, 0, 0, 1, 1, 1, 1, 8, 8, 8, 8] },
        { key: 'PO_MUL_JANG', group: 4, closed: true, example: [5, 5, 5, 5, 8, 8, 8, 8, 9, 9, 9, 9] },
        { key: 'JAYU_BAKAE_PYEONGDEUNG', group: 4, closed: true, example: [0, 0, 0, 0, 5, 5, 5, 5, 11, 11, 11, 11] },
        { key: 'PIL_SAL_GI', group: 4, closed: true, example: [8, 8, 8, 8, 10, 10, 10, 10, ANY, ANY, ANY, ANY] },
        { key: 'SA_CHEON_YO_RI', group: 4, closed: true, example: [1, 1, 1, 1, 8, 8, 8, 8, 11, 11, 11, 11] },
        { key: 'O_UI', group: 6, closed: false, example: [0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2] },
        { key: 'JU_HO', group: 6, closed: false, example: [0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4] },
        { key: 'SUN_IL_SAEK', group: 6, closed: false, example: [8, 8, 8, 9, 9, 9, 11, 11, 11, 11, 11, 11] },
        { key: 'YUK_BEOP_JEON_SEO', group: 6, closed: false, example: [3, 3, 3, 3, 3, 3, 6, 6, 6, 6, 6, 6] },
        { key: 'BI_O_UI', group: 8, closed: true, example: [5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6] },
        { key: 'PAL_BO_CHAE', group: 8, closed: true, example: [8, 8, 8, 8, 8, 8, 8, 8, ANY, ANY, ANY, ANY] },
        { key: 'IP_E_DAM', group: 9, closed: false, example: [4, 4, 4, 4, 4, 4, 4, 4, 4, ANY, ANY, ANY] }
    ];

    const zeros = () => new Array(KINDS).fill(0);
    const colorRange = (c) => [4 * c, 4 * c + 1, 4 * c + 2, 4 * c + 3];
    const allKinds = Array.from({ length: KINDS }, (_, k) => k);

    function capSum(c, kinds, cap, use) {
        let t = 0;
        for (const k of kinds) {
            const v = Math.min(c[k], cap);
            t += v;
            use[k] += v;
        }
        return t;
    }

    function weaponPartner(c, wcap, pcap, pthresh) {
        const vals = [];
        for (let i = 0; i < 3; i++) {
            const w = WEAPONS[i];
            const [a, b] = PARTNERS[i];
            const p = (c[a] < c[b] && c[a] < pthresh) ? b : a;
            vals.push({ v: Math.min(c[w], wcap) + Math.min(c[p], pcap), w, p });
        }
        return vals;
    }

    function bestIndex(vals) {
        let best = 0, idx = 0;
        vals.forEach((v, i) => { if (v > best) { best = v; idx = i; } });
        return idx;
    }

    function useWP(c, wp, wcap, pcap, use) {
        use[wp.w] += Math.min(c[wp.w], wcap);
        use[wp.p] += Math.min(c[wp.p], pcap);
    }

    function fillGroups(d, order, n, big, use) {
        let total = 0, groups = 0;
        for (const k of order) {
            while (d[k] >= big && groups < n) {
                d[k] -= big;
                total += big;
                groups++;
                if (use) use[k] += big;
            }
        }
        for (let want = big - 1; want > 0; want--) {
            for (const k of order) {
                if (groups >= n) break;
                if (d[k] === want) {
                    total += want;
                    groups++;
                    if (use) use[k] += want;
                }
            }
        }
        return total;
    }

    const triplesFill = (d, order, n, use) => fillGroups(d, order, n, 3, use);

    function extraGroup(d, use) {
        let best = 0, bi = -1;
        for (let k = 0; k < KINDS; k++) {
            if (d[k] > 2) { use[k] += 3; return 3; }
            if (best < d[k]) { best = d[k]; bi = k; }
        }
        if (bi < 0) return 0;
        use[bi] += d[bi];
        return d[bi];
    }

    function withExtra(D, kinds, use) {
        const d = D.slice();
        let total = 0;
        for (const k of kinds) {
            const v = Math.min(d[k], 3);
            total += v;
            use[k] += v;
            d[k] -= v;
        }
        total += extraGroup(d, use);
        return total;
    }

    function topKind(d) {
        let best = 0, bi = 0;
        for (let k = 0; k < KINDS; k++) if (d[k] > best) { best = d[k]; bi = k; }
        return bi;
    }

    function closedOnly(C, D, melds, use, body) {
        if (melds) return 0;
        return body(C, use);
    }

    const closedCap = (kinds, cap) => (C, D, melds, use) =>
        closedOnly(C, D, melds, use, (c, u) => capSum(c, kinds, cap, u));
    const openCap = (kinds, cap) => (C, D, melds, use) => capSum(D, kinds, cap, use);

    function pairsSingles(C, kinds, use) {
        let pairs = 0, singles = 0;
        for (const k of kinds) {
            if (C[k] > 1) { pairs++; use[k] += 2; }
            else if (C[k] === 1) { singles++; use[k] += 1; }
        }
        if (pairs === 6) return 12;
        if (pairs === 5 && singles) return 11;
        return 2 * pairs + singles;
    }

    const MATCHERS = [
        (C, D, melds, use) => closedOnly(C, D, melds, use, (c, u) => pairsSingles(c, [0, 1, 4, 5, 8, 9], u)),

        (C, D, melds, use) => closedOnly(C, D, melds, use, (c, u) => {
            const kinds = [];
            for (let i = 0; i < 3; i++) {
                const [a, b] = PARTNERS[i];
                kinds.push(WEAPONS[i], (c[a] < c[b] && c[a] < 2) ? b : a);
            }
            return pairsSingles(c, kinds, u);
        }),

        (C, D, melds, use, out) => {
            const s = COLORS.map((_, c) => colorRange(c).reduce((t, k) => t + Math.min(D[k], 3), 0));
            const b = bestIndex(s);
            out.meta = { color: COLORS[b] };
            return capSum(D, colorRange(b), 3, use);
        },

        openCap([1, 5, 8, 9], 3),
        openCap([3, 7, 11, 12], 3),

        (C, D, melds, use) => withExtra(D, [3, 7, 11], use),

        (C, D, melds, use) => {
            const vals = weaponPartner(D, 3, 3, 3);
            const b = bestIndex(vals.map(x => x.v));
            let second = 0, si = -1;
            vals.forEach((x, i) => { if (i !== b && second < x.v) { second = x.v; si = i; } });
            useWP(D, vals[b], 3, 3, use);
            if (si >= 0) useWP(D, vals[si], 3, 3, use);
            return vals[b].v + second;
        },

        (C, D, melds, use, out) => {
            const purple = Math.min(D[12], 3);
            let best = -1, bc = 0, bu = null;
            for (let c = 0; c < 3; c++) {
                const u = zeros();
                const t = triplesFill(D.slice(), colorRange(c), 3, u);
                if (t > best) { best = t; bc = c; bu = u; }
            }
            for (let k = 0; k < KINDS; k++) use[k] += bu[k];
            use[12] += purple;
            out.meta = { color: COLORS[bc] };
            return purple + best;
        },

        (C, D, melds, use) => {
            const s = COLORS.map((_, c) => [4 * c, 4 * c + 1, 4 * c + 2].reduce((t, k) => t + Math.min(D[k], 3), 0));
            const b = bestIndex(s);
            return withExtra(D, [4 * b, 4 * b + 1, 4 * b + 2], use);
        },

        (C, D, melds, use) => {
            let t = Math.min(D[12], 3);
            use[12] += t;
            for (let c = 0; c < 3; c++) {
                let best = 0, bi = -1;
                for (const k of colorRange(c)) {
                    if (best < D[k] && best < 3) { best = D[k]; bi = k; }
                }
                if (bi >= 0) { const v = Math.min(D[bi], 3); t += v; use[bi] += v; }
            }
            return t;
        },

        (C, D, melds, use, out) => {
            const d = D.slice();
            const vals = weaponPartner(d, 3, 3, 3);
            const b = bestIndex(vals.map(x => x.v));
            useWP(d, vals[b], 3, 3, use);
            let t = vals[b].v;
            for (const k of [vals[b].w, vals[b].p]) d[k] = d[k] < 3 ? 0 : d[k] - 3;
            t += triplesFill(d, allKinds, 2, use);
            out.meta = { char: KIND_IDS[vals[b].p] };
            return t;
        },

        (C, D, melds, use) => triplesFill(D.slice(), allKinds, 4, use),

        closedCap([3, 7, 11], 4),

        (C, D, melds, use, out) => closedOnly(C, D, melds, use, (c, u) => {
            const s = COLORS.map((_, col) => [4 * col, 4 * col + 1, 4 * col + 2].reduce((t, k) => t + Math.min(c[k], 4), 0));
            const b = bestIndex(s);
            return capSum(c, [4 * b, 4 * b + 1, 4 * b + 2], 4, u);
        }),

        closedCap([2, 6, 10], 4),

        (C, D, melds, use, out) => closedOnly(C, D, melds, use, (c, u) => {
            let best = -1, bc = 0, bu = null;
            for (let col = 0; col < 3; col++) {
                const uu = zeros();
                const t = fillGroups(c.slice(), colorRange(col), 3, 4, uu);
                if (t > best) { best = t; bc = col; bu = uu; }
            }
            for (let k = 0; k < KINDS; k++) u[k] += bu[k];
            out.meta = { color: COLORS[bc] };
            return best;
        }),

        closedCap([0, 4, 8], 4),
        closedCap([1, 5, 9], 4),
        closedCap([0, 1, 8], 4),
        closedCap([5, 8, 9], 4),

        (C, D, melds, use) => closedOnly(C, D, melds, use, (c, u) => {
            const g = [];
            for (let col = 0; col < 3; col++) {
                let top = 0, tk = 4 * col;
                for (const k of colorRange(col)) {
                    if (c[k] > 3) { top = 4; tk = k; break; }
                    if (top < c[k]) { top = c[k]; tk = k; }
                }
                g.push({ v: top, k: tk });
            }
            g.push({ v: Math.min(c[12], 4), k: 12 });
            g.sort((a, b) => b.v - a.v);
            let t = 0;
            for (const x of g.slice(0, 3)) { t += x.v; u[x.k] += x.v; }
            return t;
        }),

        (C, D, melds, use, out) => closedOnly(C, D, melds, use, (c, u) => {
            const vals = weaponPartner(c, 4, 4, 4);
            const b = bestIndex(vals.map(x => x.v));
            useWP(c, vals[b], 4, 4, u);
            const d = c.slice();
            for (const k of [vals[b].w, vals[b].p]) d[k] = d[k] < 4 ? 0 : d[k] - 4;
            let t = vals[b].v;
            for (const want of [4, 3, 2, 1]) {
                const hit = allKinds.find(k => want === 4 ? d[k] > 3 : d[k] === want);
                if (hit !== undefined) { t += want; u[hit] += want; break; }
            }
            out.meta = { char: KIND_IDS[vals[b].p] };
            return t;
        }),

        (C, D, melds, use) => closedOnly(C, D, melds, use, (c, u) => fillGroups(c.slice(), allKinds, 3, 4, u)),

        (C, D, melds, use) => {
            const vals = weaponPartner(D, 6, 6, 6);
            const b = bestIndex(vals.map(x => x.v));
            useWP(D, vals[b], 6, 6, use);
            return vals[b].v;
        },

        openCap([0, 4], 6),

        (C, D, melds, use, out) => {
            let best = -1, bc = 0, bu = null;
            for (let c = 0; c < 3; c++) {
                const d = D.slice();
                const u = zeros();
                const order = colorRange(c);
                let top = order[0];
                for (const k of order) if (d[k] > d[top]) top = k;
                const first = Math.min(d[top], 6);
                u[top] += first;
                d[top] = d[top] < 6 ? 0 : d[top] - 6;
                const t = first + triplesFill(d, order, 2, u);
                if (t > best) { best = t; bc = c; bu = u; }
            }
            for (let k = 0; k < KINDS; k++) use[k] += bu[k];
            out.meta = { color: COLORS[bc] };
            return best;
        },

        (C, D, melds, use) => {
            const d = D.slice();
            const k = topKind(d);
            let t = Math.min(d[k], 6);
            use[k] += t;
            d[k] = 0;
            const k2 = topKind(d);
            const v = Math.min(d[k2], 6);
            use[k2] += v;
            return t + v;
        },

        (C, D, melds, use) => closedOnly(C, D, melds, use, (c, u) => {
            const vals = weaponPartner(c, 4, 8, 8);
            const b = bestIndex(vals.map(x => x.v));
            useWP(c, vals[b], 4, 8, u);
            return vals[b].v;
        }),

        (C, D, melds, use) => closedOnly(C, D, melds, use, (c, u) => {
            const d = c.slice();
            const k = topKind(d);
            const t = Math.min(d[k], 8);
            u[k] += t;
            d[k] = 0;
            const k2 = topKind(d);
            const v = Math.min(d[k2], 4);
            u[k2] += v;
            return t + v;
        }),

        (C, D, melds, use) => {
            const d = D.slice();
            const k = topKind(d);
            const t = d[k];
            use[k] += t;
            d[k] = 0;
            const k2 = topKind(d);
            const v = Math.min(d[k2], 3);
            use[k2] += v;
            return t + v;
        }
    ];

    function evaluateCounts(C, meldKinds) {
        const D = C.slice();
        for (const m of meldKinds) D[m] += 3;
        const melds = meldKinds.length > 0;
        return MATCHERS.map((f, i) => {
            const use = zeros();
            const out = {};
            const matched = f(C, D, melds, use, out);
            const missing = Math.max(0, 12 - matched);
            return { index: i, key: YAKU[i].key, closed: YAKU[i].closed, missing, use, meta: out.meta || null };
        });
    }

    const kindOf = (tile) => KIND_IDS.indexOf(tile.type);

    function countsOf(handTiles, openSets) {
        const C = zeros();
        for (const t of handTiles) { const k = kindOf(t); if (k >= 0) C[k]++; }
        const meldKinds = (openSets || []).map(s => kindOf(s.tiles[0])).filter(k => k >= 0);
        return { C, meldKinds };
    }

    function evaluate(handTiles, openSets) {
        const { C, meldKinds } = countsOf(handTiles, openSets);
        return evaluateCounts(C, meldKinds);
    }

    function markSlots(result, handTiles, openSets) {
        const left = result.use.slice();
        const open = (openSets || []).map(s => {
            const k = kindOf(s.tiles[0]);
            if (!result.closed && k >= 0 && left[k] >= 3) { left[k] -= 3; return true; }
            return false;
        });
        const hand = handTiles.map(t => {
            const k = kindOf(t);
            if (k >= 0 && left[k] > 0) { left[k]--; return true; }
            return false;
        });
        return { hand, open };
    }

    function helpfulKinds(handTiles, openSets, index) {
        const { C, meldKinds } = countsOf(handTiles, openSets);
        const base = evaluateCounts(C, meldKinds)[index].missing;
        const out = [];
        for (let k = 0; k < KINDS; k++) {
            if (C[k] + (meldKinds.includes(k) ? 3 : 0) >= PaiData.TILE_COUNT_PER_TYPE) continue;
            C[k]++;
            const m = evaluateCounts(C, meldKinds)[index].missing;
            C[k]--;
            if (m < base) out.push(KIND_IDS[k]);
        }
        return out;
    }

    function exampleTiles(index) {
        return YAKU[index].example.map(k => k === ANY ? null : KIND_IDS[k]);
    }

    return { YAKU, KIND_IDS, ANY, evaluate, evaluateCounts, markSlots, helpfulKinds, exampleTiles };
})();
