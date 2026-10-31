import sys

def u32(d, p):
    return int.from_bytes(d[p:p + 4], 'little')

def is_arr(d, p):
    if p + 52 > len(d):
        return False
    v = [u32(d, p + 4 * i) for i in range(13)]
    return v[0] <= 100000 and all(x <= 255 for x in v[1:])

def find_arr(d, z):
    s = (z + 4) & ~3
    for q in (s, s + 4):
        if is_arr(d, q) and not any(d[z + 1:q]):
            return s, q
    return None

def parse(d):
    p = 0x18
    n = u32(d, 0x14)
    rows = []
    for k in range(n):
        strs = []
        while True:
            z = d.index(b'\0', p)
            strs.append(d[p:z].decode('cp932'))
            r = find_arr(d, z) if len(strs) > 1 else None
            if r:
                break
            p = (z + 4) & ~3 if len(strs) == 1 else z + 1
        s, q = r
        arr = [u32(d, i) for i in range(s, q + 52, 4)]
        p = q + 52
        rows.append((k, strs, arr))
    return rows, p

if __name__ == '__main__':
    d = open(sys.argv[1], 'rb').read()
    rows, p = parse(d)
    print('end', hex(p), 'size', hex(len(d)), file=sys.stderr)
    print('no\tname\tdesc\tu32')
    for k, s, arr in rows:
        print('%d\t%s\t%s\t%s' % (k, s[0], ' / '.join(s[1:]), ' '.join(map(str, arr))))
