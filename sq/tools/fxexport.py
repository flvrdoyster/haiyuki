"""usamain.sq 선언·나가리 연출을 fxtrace로 실행해 조각별 틱 좌표를 haiyuki_web/js/data/fxTimelines.js로 내보낸다.

좌표는 원본 조각(셀)의 중심, 화면 픽셀. 각 경로 항목 [틱, cx, cy]는 다음 항목까지 유지된다.
anchor는 기준 틱(ref)에서 조각들을 합친 글자 영역의 중심이다. 웹은 자기 글자 조각을 이 중심에 맞춰 놓고
원본 조각의 기준 틱 대비 이동량을 그대로 더한다.

python3 fxexport.py /Users/oyster/GitHub/ataho/haiyuki_web/js/data/fxTimelines.js
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fxtrace
from PIL import Image

GRAPH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'extracted', 'assets', 'graph', 'jp') + '/'
PAT = re.compile(r'surf(\d+):(\d+)\(.*?\) at \(([-\d.]+),([-\d.]+)\) z=(\d+)')

# (이름, 엔트리, 틱 수, 플래그, 조각 셀 크기, 셀 원본 png, 기준 틱, 홀드 [시작, 끝], 흔들림 [[틱, 진폭, 틱수]])
SPECS = [
    ('riichi', 105, 120, {}, (512, 176), 'reach.png', 25, None, []),
    ('riichi_r', 105, 120, {218: 1}, (512, 176), 'reach.png', 25, None, []),
    ('pon', 110, 120, {}, (176, 186), 'pon.png', 2, None, []),
    ('ron', 125, 260, {}, (160, 176), 'ron.png', 68, [68, 190], []),
    ('tsumo', 132, 220, {}, (160, 176), 'tumo.png', 32, [32, 154], []),
    ('nagari', 90, 320, {}, (192, 186), 'draw.png', 45, [56, 176], [[4, 4, 8], [45, 4, 8]]),
]
LABEL_CELL = (358, 108)


def glyph_bbox(png, cell, idx):
    im = Image.open(GRAPH + png).convert('RGB')
    x0 = cell[0] * idx
    c = im.crop((x0, 0, x0 + cell[0], cell[1]))
    bg = c.getpixel((0, 0))
    px = c.load()
    xs, ys = [], []
    for y in range(c.height):
        for x in range(c.width):
            if px[x, y] != bg:
                xs.append(x)
                ys.append(y)
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


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
    name, ent, n, flags, cell, png, ref, hold, shakes = spec
    tasks, end = trace(ent, n, flags)
    pieces = []
    labels = []
    for tid in sorted(tasks):
        ev = tasks[tid]
        surf = ev[0][1]
        if name == 'nagari' and surf == 35:
            fr, _, idx, x, y = ev[0]
            labels.append({'tick': fr, 'slot': 'top' if idx == 0 else 'bottom',
                           'center': [x + LABEL_CELL[0] / 2, y + LABEL_CELL[1] / 2]})
            continue
        idx = ev[0][2]
        path = [[fr, x + cell[0] / 2, y + cell[1] / 2] for fr, _, _, x, y in ev]
        bb = glyph_bbox(png, cell, idx)
        pieces.append({'path': path, 'bbox': bb})

    def at(path, t):
        p = path[0]
        for e in path:
            if e[0] <= t:
                p = e
        return p

    xs0, ys0, xs1, ys1 = [], [], [], []
    for pc in pieces:
        _, cx, cy = at(pc['path'], ref)
        bx0, by0, bx1, by1 = pc['bbox']
        xs0.append(cx - cell[0] / 2 + bx0)
        ys0.append(cy - cell[1] / 2 + by0)
        xs1.append(cx - cell[0] / 2 + bx1)
        ys1.append(cy - cell[1] / 2 + by1)
    anchor = [(min(xs0) + max(xs1)) / 2, (min(ys0) + max(ys1)) / 2]
    out = {
        'end': end if name != 'nagari' else labels[-1]['tick'] + 60,
        'ref': ref,
        'anchor': anchor,
        'pieces': [{'path': pc['path']} for pc in pieces],
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
        print(name, 'end', tl['end'], 'anchor', tl['anchor'], 'pieces', len(tl['pieces']))
    body = json.dumps(data, separators=(',', ':'))
    with open(dest, 'w') as f:
        f.write('const FXTimelines = ' + body + ';\n')


if __name__ == '__main__':
    main(sys.argv[1])
