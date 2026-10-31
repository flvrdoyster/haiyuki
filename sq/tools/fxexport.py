"""usamain.sq 선언·나가리 연출을 fxtrace로 실행해 조각별 틱 좌표를 docs/js/data/fxTimelines.js로 내보낸다.

경로 항목 [틱, x, y]는 원본 셀의 좌상단 화면 좌표이고 다음 항목까지 유지된다.
웹 조각은 웹 글자 이미지의 src 사각형(조각이 둘이면 가운데 열에서 가른 반쪽)이며, off는 셀 좌상단에서 그 조각을
그릴 중심까지의 거리다. off x는 웹 조각의 글자 bbox 중심이 원본 셀 안 글자 bbox 중심에 오도록 정한다.
off y도 같지만, 조각이 둘이면 한 이미지의 반쪽들이므로 원본 두 글자 bbox 합집합의 세로 중심에 웹 이미지 전체 글자 bbox의
세로 중심을 맞춘 값 하나로 통일한다. 두 조각 연출은 JOIN_TICK에 두 글자의 안쪽 가장자리가 맞붙도록 두 조각을 같은 거리만큼 반대 방향으로 옮긴다.
JOIN_RAMP_FROM에 있는 연출은 그 이동을 off 대신 경로 x에 넣되, 시작 틱 0에서 JOIN_TICK 전체까지 틱에 비례해 늘린다.

python3 fxexport.py docs/js/data/fxTimelines.js
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fxtrace
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GRAPH = os.path.join(HERE, '..', '..', 'extracted', 'assets', 'graph', 'jp') + '/'
WEB = os.path.join(HERE, '..', '..', 'docs', 'assets', 'fx') + '/'
PAT = re.compile(r'surf(\d+):(\d+)\(.*?\) at \(([-\d.]+),([-\d.]+)\) z=(\d+)')

# (이름, 엔트리, 틱 수, 플래그, 원본 셀 크기, 원본 png, 웹 png, 홀드 [시작, 끝], 흔들림 [[틱, 진폭, 틱수]])
SPECS = [
    ('riichi', 105, 120, {}, (512, 176), 'reach.png', 'riichi.png', None, []),
    ('riichi_r', 105, 120, {218: 1}, (512, 176), 'reach.png', 'riichi.png', None, []),
    ('pon', 110, 120, {}, (176, 186), 'pon.png', 'pon.png', None, []),
    ('ron', 125, 260, {}, (160, 176), 'ron.png', 'ron.png', [68, 190], []),
    ('tsumo', 132, 220, {}, (160, 176), 'tumo.png', 'tsumo.png', [32, 154], []),
    ('nagari', 90, 320, {}, (192, 186), 'draw.png', 'nagari.png', [56, 176], [[4, 4, 8], [45, 4, 8]]),
]
JOIN_TICK = {'pon': 2, 'ron': 68, 'tsumo': 32, 'nagari': 45}
JOIN_RAMP_FROM = {'tsumo': 2}
LABEL_SURF = 35
LABEL_CELL = (358, 108)
LABEL_SRC_X = {'fx/noten': 0, 'fx/tenpai': 176}


def orig_bbox(png, box):
    c = Image.open(GRAPH + png).convert('RGB').crop(box)
    bg = c.getpixel((0, 0))
    px = c.load()
    xs, ys = [], []
    for y in range(c.height):
        for x in range(c.width):
            if px[x, y] != bg:
                xs.append(x)
                ys.append(y)
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def web_bbox(png, box):
    return Image.open(WEB + png).convert('RGBA').crop(box).getchannel('A').getbbox()


def center(bb):
    return (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2


def offset(obb, src, wbb):
    ox, oy = center(obb)
    wx, wy = center(wbb)
    return [ox - wx + src[2] / 2, oy - wy + src[3] / 2]


def glyph_x(pc, t):
    x = [e for e in pc['path'] if e[0] <= t][-1][1]
    left = x + pc['off'][0] - pc['src'][2] / 2
    return left + pc['wbb'][0], left + pc['wbb'][2]


def join(pieces, t, ramp_from=None):
    a, b = sorted(pieces, key=lambda pc: sum(glyph_x(pc, t)))
    shift = (glyph_x(b, t)[0] - glyph_x(a, t)[1]) / 2
    for pc, d in ((a, shift), (b, -shift)):
        if ramp_from is None:
            pc['off'][0] += d
        else:
            pc['path'] = [[fr, x + d * min(1.0, max(0.0, (fr - ramp_from) / (t - ramp_from))), y] for fr, x, y in pc['path']]


def trace(ent, n, flags):
    f = {1: 1, 3: 1}
    f.update(flags)
    vm = fxtrace.VM(flags=f)
    vm.start(3, ent)
    vm.run_frames(n)
    tasks = {}
    end = 0
    for fr, tid, k, m in vm.log:
        if k == 'show':
            mm = PAT.match(m)
            if mm:
                tasks.setdefault(tid, []).append((fr, int(mm.group(1)), int(mm.group(2)), float(mm.group(3)), float(mm.group(4))))
        elif k == 'list' and 'show' in m:
            end = max(end, fr)
    return tasks, end


def export(spec):
    name, ent, n, flags, cell, png, web_png, hold, shakes = spec
    tasks, end = trace(ent, n, flags)
    pieces = []
    labels = []
    for tid in sorted(tasks):
        ev = tasks[tid]
        if ev[0][1] == LABEL_SURF:
            fr, _, idx, x, y = ev[0]
            off = {}
            for asset, sx in LABEL_SRC_X.items():
                obb = orig_bbox('tenpai.png', (sx, 0, sx + LABEL_CELL[0], LABEL_CELL[1]))
                img = Image.open(WEB + asset[3:] + '.png')
                src = (0, 0, img.width, img.height)
                off[asset] = offset(obb, src, web_bbox(asset[3:] + '.png', src))
            labels.append({'tick': fr, 'slot': 'top' if idx == 0 else 'bottom', 'pos': [x, y], 'off': off})
            continue
        pieces.append({'idx': ev[0][2], 'path': [[fr, x, y] for fr, _, _, x, y in ev]})

    w, h = Image.open(WEB + web_png).size
    sw = w // len(pieces)
    out_pieces = []
    for k, pc in enumerate(pieces):
        src = (k * sw, 0, sw, h)
        obb = orig_bbox(png, (cell[0] * pc['idx'], 0, cell[0] * (pc['idx'] + 1), cell[1]))
        wbb = web_bbox(web_png, (src[0], 0, src[0] + sw, h))
        out_pieces.append({'src': list(src), 'off': offset(obb, src, wbb), 'path': pc['path'], 'wbb': wbb, 'obb': obb})
    if len(out_pieces) > 1:
        oy0 = min(pc['obb'][1] for pc in out_pieces)
        oy1 = max(pc['obb'][3] for pc in out_pieces)
        wbb = web_bbox(web_png, (0, 0, w, h))
        for pc in out_pieces:
            pc['off'][1] = (oy0 + oy1) / 2 - (wbb[1] + wbb[3]) / 2 + h / 2
    for pc in out_pieces:
        del pc['obb']
    if name in JOIN_TICK:
        join(out_pieces, JOIN_TICK[name], JOIN_RAMP_FROM.get(name))
    for pc in out_pieces:
        del pc['wbb']

    out = {
        'end': end if not labels else labels[-1]['tick'] + 60,
        'pieces': out_pieces,
    }
    if hold:
        out['hold'] = hold
    if shakes:
        out['shakes'] = shakes
    if labels:
        out['labels'] = labels
    return name, out


def main(dest):
    data = {}
    for spec in SPECS:
        name, tl = export(spec)
        data[name] = tl
        print(name, 'end', tl['end'], 'off', [pc['off'] for pc in tl['pieces']])
    body = json.dumps(data, separators=(',', ':'))
    with open(dest, 'w') as f:
        f.write('const FXTimelines = ' + body + ';\n')


if __name__ == '__main__':
    main(sys.argv[1])
