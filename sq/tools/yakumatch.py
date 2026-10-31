import sys
import os

KINDS = 13
WEAPONS = (2, 6, 10)
PARTNERS = ((0, 1), (4, 5), (8, 9))


def cap_sum(c, kinds, cap):
    return sum(min(c[k], cap) for k in kinds)


def weapon_partner(c, wcap, pcap, pthresh):
    vals = []
    for i in range(3):
        w = WEAPONS[i]
        a, b = PARTNERS[i]
        p = b if c[a] < c[b] and c[a] < pthresh else a
        vals.append((min(c[w], wcap) + min(c[p], pcap), w, p))
    return vals


def best_index(vals):
    best, idx = 0, 0
    for i, v in enumerate(vals):
        if v > best:
            best, idx = v, i
    return idx


def y0(C, D, melds):
    if melds:
        return False, 12
    pairs = sum(1 for k in (0, 1, 4, 5, 8, 9) if C[k] > 1)
    singles = sum(1 for k in (0, 1, 4, 5, 8, 9) if C[k] == 1)
    if pairs == 6:
        return True, 0
    if pairs == 5 and singles == 1:
        return False, 1
    return False, 12 - 2 * pairs - singles


def y1(C, D, melds):
    if melds:
        return False, 12
    pairs = singles = 0
    for i in range(3):
        a, b = PARTNERS[i]
        p = b if C[a] < C[b] and C[a] < 2 else a
        for k in (WEAPONS[i], p):
            if C[k] > 1:
                pairs += 1
            if C[k] == 1:
                singles += 1
    if pairs == 6:
        return True, 0
    if pairs == 5 and singles:
        return False, 1
    return False, 12 - 2 * pairs - singles


def y2(C, D, melds):
    s = [sum(min(D[4 * c + j], 3) for j in range(4)) for c in range(3)]
    t = max(s)
    return t == 12, 12 - t


def extra_group(d):
    best, bi = 0, 0xff
    for k in range(KINDS):
        if d[k] > 2:
            return 3
        if best < d[k]:
            best, bi = d[k], k
    return d[bi] if bi != 0xff else 0


def with_extra(D, kinds):
    d = list(D)
    total = 0
    for k in kinds:
        if d[k] < 3:
            total += d[k]
            d[k] = 0
        else:
            total += 3
            d[k] -= 3
    total += extra_group(d)
    return total == 12, 12 - total


def y5(C, D, melds):
    return with_extra(D, (3, 7, 11))


def y6(C, D, melds):
    vals = weapon_partner(D, 3, 3, 3)
    v = [x[0] for x in vals]
    b = best_index(v)
    second = 0
    for i in range(3):
        if i != b and second < v[i]:
            second = v[i]
    t = v[b] + second
    return t == 12, 12 - t


def fill_groups(d, order, n, big):
    total = 0
    groups = 0
    for k in order:
        while d[k] >= big and groups < n:
            d[k] -= big
            total += big
            groups += 1
    for want in range(big - 1, 0, -1):
        for k in order:
            if groups >= n:
                break
            if d[k] == want:
                total += want
                groups += 1
    return total, groups


def triples_fill(d, order, n):
    total = 0
    groups = 0
    for k in order:
        while d[k] >= 3 and groups < n:
            d[k] -= 3
            total += 3
            groups += 1
    for want in (2, 1):
        for k in order:
            if groups >= n:
                break
            if d[k] == want:
                total += want
                groups += 1
    return total, groups


def y7(C, D, melds):
    purple = min(D[12], 3)
    sums = []
    for c in range(3):
        d = list(D)
        sums.append(triples_fill(d, range(4 * c, 4 * c + 4), 3)[0])
    t = purple + max(sums)
    return t == 12, 12 - t


def y8(C, D, melds):
    s = [sum(min(D[4 * c + j], 3) for j in range(3)) for c in range(3)]
    b = best_index(s)
    return with_extra(D, range(4 * b, 4 * b + 3))


def y9(C, D, melds):
    t = min(D[12], 3)
    for c in range(3):
        best, bi = 0, 0xff
        for j in range(4):
            if best < D[4 * c + j] and best < 3:
                best, bi = D[4 * c + j], 4 * c + j
        if bi != 0xff:
            t += min(D[bi], 3)
    return t == 12, 12 - t


def y10(C, D, melds):
    d = list(D)
    vals = weapon_partner(d, 3, 3, 3)
    b = best_index([x[0] for x in vals])
    t = vals[b][0]
    for k in (vals[b][1], vals[b][2]):
        d[k] = 0 if d[k] < 3 else d[k] - 3
    t += triples_fill(d, range(KINDS), 2)[0]
    return t == 12, 12 - t


def y11(C, D, melds):
    d = list(D)
    t = triples_fill(d, range(KINDS), 4)[0]
    return t == 12, 12 - t


def y13(C, D, melds):
    if melds:
        return False, 12
    s = [sum(min(C[4 * c + j], 4) for j in range(3)) for c in range(3)]
    t = max(s)
    return t == 12, 12 - t


def y15(C, D, melds):
    if melds:
        return False, 12
    best = 0
    for c in range(3):
        d = list(C)
        best = max(best, fill_groups(d, range(4 * c, 4 * c + 4), 3, 4)[0])
    return best == 12, 12 - best


def y20(C, D, melds):
    if melds:
        return False, 12
    g = []
    for c in range(3):
        top = 0
        for j in range(4):
            v = C[4 * c + j]
            if v > 3:
                top = 4
                break
            if top < v:
                top = v
        g.append(top)
    g.append(min(C[12], 4))
    g.sort(reverse=True)
    t = sum(g[:3])
    return t == 12, 12 - t


def y21(C, D, melds):
    if melds:
        return False, 12
    vals = weapon_partner(C, 4, 4, 4)
    b = best_index([x[0] for x in vals])
    d = list(C)
    for k in (vals[b][1], vals[b][2]):
        d[k] = 0 if d[k] < 4 else d[k] - 4
    t = vals[b][0]
    for want in (4, 3, 2, 1):
        hit = [k for k in range(KINDS) if (d[k] > 3 if want == 4 else d[k] == want)]
        if hit:
            t += want
            break
    return t == 12, 12 - t


def y22(C, D, melds):
    if melds:
        return False, 12
    d = list(C)
    t = fill_groups(d, range(KINDS), 3, 4)[0]
    return t == 12, 12 - t


def y23(C, D, melds):
    vals = weapon_partner(D, 6, 6, 6)
    t = vals[best_index([x[0] for x in vals])][0]
    return t == 12, 12 - t


def y24(C, D, melds):
    t = min(D[0], 6) + min(D[4], 6)
    return t == 12, 12 - t


def y25(C, D, melds):
    best = 0
    for c in range(3):
        d = list(D)
        order = range(4 * c, 4 * c + 4)
        top = max(order, key=lambda k: (d[k], -k))
        first = min(d[top], 6)
        d[top] = 0 if d[top] < 6 else d[top] - 6
        best = max(best, first + triples_fill(d, order, 2)[0])
    return best == 12, 12 - best


def top_kind(d):
    best, bi = 0, 0
    for k in range(KINDS):
        if d[k] > best:
            best, bi = d[k], k
    return bi


def y26(C, D, melds):
    d = list(D)
    k = top_kind(d)
    t = min(d[k], 6)
    d[k] = 0
    k2 = top_kind(d)
    t += min(d[k2], 6)
    return t == 12, 12 - t


def y27(C, D, melds):
    if melds:
        return False, 12
    vals = weapon_partner(D, 4, 8, 8)
    t = vals[best_index([x[0] for x in vals])][0]
    return t == 12, 12 - t


def y28(C, D, melds):
    if melds:
        return False, 12
    d = list(D)
    k = top_kind(d)
    t = min(d[k], 8)
    d[k] = 0
    k2 = top_kind(d)
    t += min(d[k2], 4)
    return t == 12, 12 - t


def y29(C, D, melds):
    d = list(D)
    k = top_kind(d)
    t = d[k]
    d[k] = 0
    k2 = top_kind(d)
    t += min(d[k2], 3)
    return t == 12, 12 - t


def closed(kinds, cap):
    def f(C, D, melds):
        if melds:
            return False, 12
        t = cap_sum(C, kinds, cap)
        return t == 12, 12 - t
    return f


def open_ok(kinds, cap):
    def f(C, D, melds):
        t = cap_sum(D, kinds, cap)
        return t == 12, 12 - t
    return f


MATCHERS = [
    y0, y1, y2,
    open_ok((1, 5, 8, 9), 3),
    open_ok((3, 7, 11, 12), 3),
    y5, y6, y7, y8, y9, y10, y11,
    closed((3, 7, 11), 4),
    y13,
    closed((2, 6, 10), 4),
    y15,
    closed((0, 4, 8), 4),
    closed((1, 5, 9), 4),
    closed((0, 1, 8), 4),
    closed((5, 8, 9), 4),
    y20, y21, y22, y23, y24, y25, y26, y27, y28, y29,
]


def count_tiles(tiles):
    c = [0] * KINDS
    for t in tiles:
        if t != 0xff:
            c[t] += 1
    return c


def evaluate(hand, melds=()):
    C = count_tiles(hand)
    D = list(C)
    for m in melds:
        D[m] += 3
    res = []
    for i, f in enumerate(MATCHERS):
        win, missing = f(C, D, len(melds))
        res.append((win, missing))
    return res


def load_yaku(path):
    rows = []
    with open(path, encoding='utf8') as fh:
        next(fh)
        for line in fh:
            p = line.rstrip('\n').split('\t')
            nums = [int(x) for x in p[3].split()]
            rows.append((int(p[0]), p[1], nums[-13], nums[-12:]))
    return rows


def pattern_hand(pat, used_other=()):
    hand = []
    runs = []
    i = 0
    while i < len(pat):
        if pat[i] == 255:
            j = i
            while j < len(pat) and pat[j] == 255:
                j += 1
            runs.append(j - i)
            i = j
        else:
            hand.append(pat[i])
            i += 1
    fixed_kinds = set(hand)
    spare = [k for k in range(KINDS) if k not in fixed_kinds]
    for n in runs:
        k = spare.pop(0)
        hand += [k] * n
    return hand


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    rows = load_yaku(os.path.join(here, '..', 'yaku.tsv'))
    bad = 0
    for no, name, score, pat in rows:
        hand = pattern_hand(pat)
        res = evaluate(hand)
        wins = [i for i, (w, m) in enumerate(res) if w]
        ok = no in wins
        bad += not ok
        print('%2d %s %s wins=%s' % (no, 'OK ' if ok else 'NG ', name, wins))
    print('NG', bad)


if __name__ == '__main__':
    main()
