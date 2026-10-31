import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import sqdis
from sqdis import u16, u32, decode, entries, OPS

GAME = '/Users/oyster/Library/CloudStorage/OneDrive-개인/Documents/interest/gense/GAME/haiyuki_win_kr/seq/'
FILES = {0: 'startup.sq', 1: 'graph.sq', 2: 'sound.sq', 3: 'usamain.sq', 4: 'usasub.sq', 5: 'jp/usayaku.sq',
         6: 'jp/serifu1.sq', 21: 'tlogo.sq', 22: 'tchrsel.sq', 23: 'jp/Mess.sq'}
SLOTNAME = {0: 'startup', 1: 'graph', 2: 'sound', 3: 'usamain', 4: 'usasub', 5: 'usayaku', 6: 'serifu1',
            21: 'tlogo', 22: 'tchrsel', 23: 'Mess'}
COLORS = {0: 'black', 1: 'black', 2: 'white', 3: 'red', 4: 'green', 5: 'yellow', 6: 'blue', 7: 'magenta'}
V_FLAGS, V_SORT, V_LIST, V_X, V_Y, V_Z, V_IMG, V_GFX, V_SX, V_SY = 0, 5, 6, 7, 8, 9, 10, 11, 12, 13
V_WAIT, V_RES, V_RET, V_PC, V_SLOT, V_LCNT, V_LTGT, V_DEPTH = 29, 30, 31, 32, 33, 34, 35, 36
V_APC, V_AWAIT, V_ALCNT, V_ALTGT = 45, 46, 47, 48
PBASE = 0x40000000


def s32(v):
    v &= 0xffffffff
    return v - (1 << 32) if v & 0x80000000 else v


class Slot:
    def __init__(self, n):
        self.d = open(GAME + FILES[n], 'rb').read()
        self.offs, self.ends = entries(self.d)
        self.cache = {}

    def ins(self, e):
        if e not in self.cache:
            a, b = self.offs[e], self.ends[e]
            out = {}
            o = a
            while o < b:
                try:
                    r = decode(self.d, o, b)
                except sqdis.Bad:
                    break
                out[o] = r
                o += r[-1]
            self.cache[e] = out
        return self.cache[e]


class Task:
    def __init__(self, tid, lst, tag):
        self.id = tid
        self.v = [0] * 0x80
        self.v[V_LIST] = lst
        self.obj = {}
        self.stack = []
        self.regs = {}
        self.alive = True
        self.queue = []
        self.tag = tag
        self.last = None
        self.born = 0


class VM:
    def __init__(self, glob=None, flags=None, press=(), natives=None, sysval=None, native_res=None):
        self.slots = {n: Slot(n) for n in FILES}
        self.glob = dict(glob or {})
        self.flags = dict(flags or {})
        self.press = set(press)
        self.tasks = []
        self.nid = 0
        self.frame = 0
        self.log = []
        self.surf = {}
        self.names = {}
        self.native_res = native_res or {}
        self.sysval = sysval or {}
        self.mem = {}
        self.fade = None
        self.cur = None
        self.audio = {}
        self.steps = 0
        self.lflag = {}

    def ev(self, kind, msg, t=None):
        self.log.append((self.frame, t.id if t else None, kind, msg))

    def addr(self, slot, ent):
        return ((slot + 1) << 24) | self.slots[slot].offs[ent]

    def ptr(self, t):
        return PBASE + t.id * 0x400

    def wmem(self, a, val):
        if PBASE <= a < PBASE + 0x400 * 100000:
            t = self.get((a - PBASE) // 0x400)
            if t:
                idx = ((a - PBASE) % 0x400) // 4
                if idx < len(t.v):
                    t.v[idx] = val
            return
        self.mem[a] = val

    def rd32(self, a):
        if PBASE <= a < PBASE + 0x400 * 100000:
            t = self.get((a - PBASE) // 0x400)
            idx = ((a - PBASE) % 0x400) // 4
            return t.v[idx] if t and idx < len(t.v) else 0
        s = (a >> 24) - 1
        o = a & 0xffffff
        if s not in self.slots:
            return 0
        d = self.slots[s].d
        return u32(d, o) if o + 4 <= len(d) else 0

    def spawn_at(self, slot, ent, lst, parent=None):
        self.nid += 1
        t = Task(self.nid, lst, '%s:%d' % (SLOTNAME[slot], ent))
        t.born = self.frame
        t.v[V_PC] = self.slots[slot].offs[ent]
        t.v[V_SLOT] = slot
        t.v[0x11] = 0x2800000
        t.v[0x14] = 0x2800000
        t.v[V_IMG] = -1
        t.v[0x17] = -1
        t.v[0x18] = -1
        if parent:
            t.v[V_RES] = self.ptr(parent)
            parent.v[V_RES] = self.ptr(t)
        self.tasks.append(t)
        return t

    def get(self, i):
        for t in self.tasks:
            if t.id == i:
                return t

    def ld(self, t, s, x):
        if s == 0x11:
            return int(x == 0)
        if s == 0x12:
            return s32(t.v[x]) if x < len(t.v) else 0
        if s == 0x16:
            return t.obj.get(x, 0)
        if s == 0x17:
            return self.addr(t.v[V_SLOT], x)
        if s == 0x18:
            return self.glob.get(x, 0)
        if s == 0x19:
            return int(bool(self.flags.get(x, 0)))
        if s == 0x1d:
            return self.sysval.get(x, 0)
        if s == 0x20:
            return s32(x)
        return 0

    def bin(self, s, a, b):
        if s == 2:
            return s32(a * b)
        if s == 3:
            return s32(int(a / b)) if b else 0
        if s == 4:
            return s32(a + b)
        if s == 5:
            return s32(a - b)
        if s == 6:
            return s32(a << (b & 31))
        if s == 7:
            return a >> (b & 31)
        if s == 8:
            return int(a < b)
        if s == 9:
            return int(a <= b)
        if s == 10:
            return int(a > b)
        if s == 11:
            return int(a >= b)
        if s == 12:
            return int(a == b)
        if s == 13:
            return int(a != b)
        if s == 14:
            return s32(a & b)
        if s == 15:
            return s32(a ^ b)
        if s == 16:
            return s32(a | b)
        if s == 0x1e:
            return s32(self.rd32(a + b * 4))
        if s == 0x1f:
            return self.addr(a, b)
        return 0

    def st(self, t, s, x, val):
        if s == 0x12:
            t.v[x] = val
        elif s == 0x16:
            t.obj[x] = val
        elif s == 0x18:
            self.glob[x] = val
        elif s == 0x19:
            self.flags[x] = int(bool(val))
        elif s == 0x1e:
            self.mem[x] = val

    def jump(self, t, slot, ent):
        t.v[V_SLOT] = slot
        t.v[V_PC] = self.slots[slot].offs[ent]

    def run(self, t, anim=False):
        self.cur = t
        n = 0
        while t.alive:
            n += 1
            self.steps += 1
            if n > 20000:
                self.ev('RUNAWAY', 'pc=%06x' % t.v[V_PC], t)
                t.alive = False
                return
            sl = self.slots[t.v[V_SLOT]]
            d = sl.d
            o = t.v[V_PC]
            c = d[o]
            ln = None
            for e in range(len(sl.offs)):
                if sl.offs[e] <= o < sl.ends[e]:
                    ln = sl.ins(e).get(o)
                    break
            if ln is None:
                self.ev('BADPC', '%s %06x' % (SLOTNAME[t.v[V_SLOT]], o), t)
                t.alive = False
                return
            r = self.step(t, d, o, ln)
            if r == 'yield':
                return

    def step(self, t, d, o, ln):
        v = t.v
        if ln[0] == 'base':
            c, n = ln[1], ln[2]
            sub = d[o + 1]
            dst = u16(d, o + 2)
            reg = t.regs
            if c == 0:
                reg[dst] = {0x1b: 0, 0x1c: 0, 0x1a: 0}.get(sub, 0)
            elif c == 1:
                reg[dst] = self.ld(t, sub, u32(d, o + 4))
            elif c == 2:
                reg[dst] = self.ld(t, sub, reg.get(u16(d, o + 4), 0))
            elif c in (3, 4, 5, 6):
                a, b = {3: (reg.get(u16(d, o + 4), 0), s32(u32(d, o + 8))),
                        4: (s32(u32(d, o + 4)), s32(u32(d, o + 8))),
                        5: (s32(u32(d, o + 4)), reg.get(u16(d, o + 8), 0)),
                        6: (reg.get(u16(d, o + 4), 0), reg.get(u16(d, o + 6), 0))}[c]
                reg[dst] = self.bin(sub, a, b)
            elif c == 7:
                self.st(t, sub, u32(d, o + 4), reg.get(dst, 0))
            elif c == 8:
                self.st(t, sub, reg.get(u16(d, o + 4), 0), reg.get(dst, 0))
            else:
                base, idx = {9: (reg.get(u16(d, o + 4), 0), u32(d, o + 8)), 10: (u32(d, o + 4), u32(d, o + 8)),
                             11: (u32(d, o + 4), reg.get(u16(d, o + 8), 0)),
                             12: (reg.get(u16(d, o + 4), 0), reg.get(u16(d, o + 6), 0))}[c]
                self.wmem(base + idx * 4, reg.get(dst, 0))
            t.v[V_PC] += n
            return None
        key, n = ln[1], ln[2]
        c, i = key
        pc_next = o + n
        v[V_PC] = pc_next
        w2, w4, w6, w8, w10 = [u16(d, o + k) if o + k + 2 <= len(d) else 0 for k in (2, 4, 6, 8, 10)]
        b2 = d[o + 2] if n > 2 else 0
        b3 = d[o + 3] if n > 3 else 0
        slot = v[V_SLOT]
        if c == 0x10:
            return self.op10(t, d, o, i, n, pc_next, w2, w4, w6, b2, b3, slot)
        if c == 0x11:
            return self.op11(t, d, o, i, n, w2, w4, w6, w8, w10, b2, b3, slot)
        if c == 0x12:
            return self.op12(t, d, o, i, n, w2, w4, b2, b3, slot)
        self.native(t, d, o, key, n)
        return None

    def txt(self, slot, e):
        sl = self.slots[slot]
        return sl.d[sl.offs[e]:sl.ends[e]].split(b'\0')[0].decode('cp932', 'replace')

    def native(self, t, d, o, key, n):
        raw = d[o:o + n].hex(' ')
        sub = d[o + 2]
        if key == (0x20, 0x19) and sub == 0:
            if self.flags.get(0xda):
                t.v[54], t.v[55] = 0x2800000, -0x180000
            else:
                t.v[54], t.v[55] = s32(0xfe000000), 0x180000
        if key == (0x20, 0x15) and sub == 2:
            self.wmem(t.v[51] + 0x20, (0x19 - t.v[V_RES]) * 0x80000)
        rf = self.native_res.get(key)
        if rf is not None:
            t.v[V_RES] = rf(self, t) if callable(rf) else rf
        self.ev('native', '%02x%02x [%s] res=%s' % (key[0], key[1], raw, t.v[V_RES]), t)

    def op10(self, t, d, o, i, n, pc_next, w2, w4, w6, b2, b3, slot):
        v = t.v
        if i == 0x00:
            self.ev('kill', '', t)
            t.alive = False
            return 'yield'
        if i == 0x01:
            self.ev('quit', '', t)
            t.alive = False
            return 'yield'
        if i == 0x04:
            v[V_RES] = self.frame * 16
        elif i == 0x05:
            ch = self.spawn_at(w2, w4, d[o + 6], t)
            self.ev('spawn', '#%d %s list=%d' % (ch.id, ch.tag, d[o + 6]), t)
            self.run(ch)
            self.cur = t
        elif i in (0x08, 0x31):
            self.ev('load_sq', 'slot%d %s' % (w2, self.txt(slot, w4)), t)
        elif i == 0x0a:
            if (b2 == 0 and False):
                pass
        elif i == 0x0b:
            return 'yield'
        elif i == 0x3e:
            v[V_PC] = o
            return 'yield'
        elif i == 0x10:
            mode, lst = b2, b3
            if mode == 0:
                for x in self.tasks:
                    if x is not t and x.v[V_LIST] == lst and x.alive:
                        x.alive = False
                        self.log.append((self.frame, x.id, 'killed', 'by list clear'))
            elif mode == 1:
                self.lflag.setdefault(lst, 0)
                self.lflag[lst] |= 0x40000000
            elif mode == 2:
                self.lflag[lst] = self.lflag.get(lst, 0) & ~0x40000000
            elif mode == 3:
                self.lflag[lst] = self.lflag.get(lst, 0) | 0x10000000
            elif mode == 4:
                self.lflag[lst] = self.lflag.get(lst, 0) & ~0x10000000
            self.ev('list', 'mode %d (%s) list %d' % (mode, {0: 'kill-all', 1: 'pause', 2: 'resume', 3: 'hide', 4: 'show'}.get(mode, '?'), lst), t)
        elif i == 0x0c:
            if v[V_WAIT] == 0:
                v[V_WAIT] = w2
                v[V_PC] = o
                return 'yield'
            v[V_WAIT] -= 1
            if v[V_WAIT] == 0:
                return None
            v[V_PC] = o
            return 'yield'
        elif i == 0x0d:
            k = d[o + 3]
            val = {1: d[o + 4], 2: w4, 4: u32(d, o + 4)}.get(k)
            if val is not None:
                v[b2] = s32(val) if k == 4 else val
        elif i == 0x0e:
            k = d[o + 3]
            val = {1: d[o + 4], 2: w4, 4: u32(d, o + 4)}.get(k)
            if val is not None:
                t.obj[b2] = val
        elif i == 0x0f:
            self.glob[w2] = s32(u32(d, o + 4))
        elif i == 0x11:
            self.jump(t, slot, w2)
        elif i in (0x12, 0x1f, 0x18):
            if i == 0x12 or v[V_RES] != 0 and i == 0x1f or i == 0x18:
                if i == 0x18:
                    ent = self.table16(slot, w2, v[V_RES])
                else:
                    ent = w2
                if i == 0x1f and v[V_RES] == 0:
                    return None
                t.stack.append((slot, pc_next))
                self.jump(t, slot, ent)
        elif i in (0x13, 0x1e):
            if i == 0x13 or v[V_RES] != 0:
                self.jump(t, w2, w4)
        elif i in (0x14, 0x20):
            if i == 0x14 or v[V_RES] != 0:
                t.stack.append((slot, pc_next))
                self.jump(t, w2, w4)
        elif i == 0x15:
            if not t.stack:
                if t.queue:
                    nxt = t.queue.pop(0)
                    self.ev('call', 'slot%d E%d res=%s' % (nxt[0], nxt[1], nxt[2].get(V_RES) if len(nxt) > 2 else None), t)
                    if len(nxt) > 2:
                        for k, val in nxt[2].items():
                            t.v[k] = val
                    self.jump(t, nxt[0], nxt[1])
                    return None
                self.ev('end', 'ret with empty stack', t)
                t.alive = False
                return 'yield'
            s2, p2 = t.stack.pop()
            v[V_SLOT] = s2
            v[V_PC] = p2
        elif i == 0x16:
            tgt = self.slots[slot].offs[w2]
            if v[V_LTGT] != tgt:
                v[V_LTGT] = tgt
                v[V_LCNT] = u32(d, o + 4)
                v[V_PC] = o
                return None
            v[V_LCNT] -= 1
            if v[V_LCNT] > 0:
                v[V_PC] = tgt
            else:
                v[V_LTGT] = 0
        elif i == 0x17:
            self.jump(t, slot, self.table16(slot, w2, v[V_RES]))
        elif i == 0x19 or i == 0x1a:
            x = self.table32(slot, w2, v[V_RES])
            if i == 0x1a:
                t.stack.append((slot, pc_next))
            self.jump(t, x >> 16, x & 0xffff)
        elif i == 0x1b:
            v[V_RES] = w4
        elif i == 0x1c:
            self.jump(t, slot, v[V_RES])
        elif i == 0x1d:
            if v[V_RES] != 0:
                self.jump(t, slot, w2)
        elif i == 0x2a:
            if self.flags.get(w2):
                self.jump(t, slot, w4)
        elif i == 0x2b:
            if not self.flags.get(w2):
                self.jump(t, slot, w4)
        elif i == 0x2c:
            if self.flags.get(w2):
                v[V_PC] = o
                return 'yield'
        elif i == 0x2d:
            if not self.flags.get(w2):
                v[V_PC] = o
                return 'yield'
        elif i == 0x2e:
            self.flags[w2] = 1
        elif i == 0x2f:
            self.flags[w2] = 0
        elif i == 0x30:
            self.flags[w2] = self.flags.get(w4, 0)
        elif i == 0x3f:
            v[V_RES] = self.ptr(t)
        elif i == 0x40:
            if v[V_WAIT] == 0 and b2 is not None:
                if self.frame in self.press:
                    return None
                limit = u16(d, o + 8)
                if limit == 0:
                    v[V_PC] = o
                    return 'yield'
                v[V_WAIT] = limit
                v[V_PC] = o
                return 'yield'
            if self.frame in self.press:
                v[V_WAIT] = 0
                return None
            v[V_WAIT] -= 1
            if v[V_WAIT] == 0:
                return None
            v[V_PC] = o
            return 'yield'
        else:
            self.ev('op10_%02x' % i, d[o:o + n].hex(' '), t)
        return None

    def table16(self, slot, ent, idx):
        sl = self.slots[slot]
        return u16(sl.d, sl.offs[ent] + 2 * idx)

    def table32(self, slot, ent, idx):
        sl = self.slots[slot]
        return u32(sl.d, sl.offs[ent] + 4 * idx)

    def op11(self, t, d, o, i, n, w2, w4, w6, w8, w10, b2, b3, slot):
        v = t.v
        if i == 0x00:
            v[V_APC] = self.addr(slot, w2) & 0xffffff
            v[0] |= 0x10000000
            v[V_AWAIT] = 0
            t.anim_slot = slot
            self.ev('anim_start', 'E%d' % w2, t)
        elif i == 0x01:
            v[V_AWAIT] = w2
            v[V_IMG] = s32(u32(d, o + 4))
            return 'yield'
        elif i in (0x02, 0x03, 0x04, 0x05, 0x1f, 0x20, 0x21, 0x22):
            nm = self.txt(slot, w6)
            lang = i >= 0x1f
            grid = i in (0x03, 0x05, 0x20, 0x22)
            self.surf[w4] = nm
            self.ev('gfx_load', 'surf%d=%s%s %s pal=%d' % (w4, nm, ' (lang)' if lang else '',
                                                           'cell %dx%d' % (w8, w10) if grid else 'frames=graph.E%d' % w8 if False else ('cell %dx%d' % (w8, w10) if grid else 'table E%d' % w8), b2), t)
        elif i in (0x06, 0x07, 0x08, 0x09):
            grid = i in (0x07, 0x09)
            self.surf[w2] = '(blank %dx%d)' % (w4, w6)
            self.ev('surf_new', 'surf%d %dx%d %s' % (w2, w4, w6, 'cell %dx%d' % (w8, w10) if grid else 'table E%d' % w8), t)
        elif i == 0x0a:
            self.ev('surf_free', 'surf%d' % w2, t)
        elif i == 0x0b:
            self.ev('surf_fill', 'surf%d color=%d' % (w2, b3 if False else d[o + 4]), t)
        elif i == 0x0f:
            self.ev('colorkey', 'surf%d key=%d' % (w4, b2), t)
        elif i == 0x11:
            self.ev('fade_step', 'color=%s steps=%d dir=%d' % (COLORS.get(b2, b2), b3, d[o + 4]), t)
            if self.fade is None:
                self.fade = [0, b3]
                self.ev('fade_begin', '', t)
            self.fade[0] += 1
            if self.fade[0] == self.fade[1]:
                self.fade = None
                return None
            v[V_PC] = o
            return 'yield'
        elif i == 0x12:
            self.fade = [0, b3]
            self.ev('fade_begin', 'color=%s steps=%d' % (COLORS.get(b2, b2), b3), t)
        elif i == 0x13:
            self.fade = None
            self.ev('fade_end', 'palette restored', t)
        elif i == 0x14:
            self.ev('pal_set', 'index %d rgb=%s' % (b2, d[o + 5:o + 8].hex()), t)
        elif i == 0x15:
            self.ev('pal_table', 'index %d count %d E%d' % (b2, b3, w4), t)
        elif i == 0x16:
            self.ev('pal_apply', '', t)
        elif i == 0x1e:
            self.ev('skipcap', str(w2), t)
        elif i == 0x23:
            self.ev('hitrect', '%d %d %d %d' % (w4, w6, w8, w10), t)
        elif i == 0x2e:
            if b2 == 0:
                return 'yield'
        elif i == 0x2f:
            self.ev('dirty', '%d %d %d %d' % (w4, w6, w8, w10), t)
        elif i == 0x10:
            pass
        else:
            self.ev('op11_%02x' % i, d[o:o + n].hex(' '), t)
        return None

    def op12(self, t, d, o, i, n, w2, w4, b2, b3, slot):
        v = t.v
        if i == 0x00:
            self.ev('wav_create', 'bank%d no=%d' % (w2, v[V_RES]), t)
            t.wav = (w2, v[V_RES])
        elif i == 0x03:
            self.ev('wav_play', 'bank%d no=%d' % getattr(t, 'wav', (-1, -1)), t)
        elif i == 0x02:
            self.ev('wav_stop', '', t)
        elif i == 0x01:
            self.ev('wav_free', '', t)
        elif i == 0x04:
            self.ev('wav_volume', str(v[V_RES]), t)
        elif i == 0x20:
            self.ev('mid_play', 'slot%d' % w2, t)
        elif i == 0x21:
            self.ev('mid_stop', '', t)
        elif i == 0x26:
            self.ev('mid_volume', str(v[V_RES]), t)
        else:
            self.ev('op12_%02x' % i, d[o:o + n].hex(' '), t)
        return None

    def tick(self):
        order = sorted(self.tasks, key=lambda x: (x.v[V_LIST],))
        order = sorted(order, key=lambda x: x.v[V_SORT])
        for t in order:
            if not t.alive:
                continue
            if t.v[0] & 0x40000000 or self.lflag.get(t.v[V_LIST], 0) & 0x40000000:
                continue
            self.run(t)
            if t.alive and t.v[0] & 0x10000000:
                if t.v[V_AWAIT] == 0:
                    self.anim_step(t)
                else:
                    t.v[V_AWAIT] -= 1
        self.tasks = [t for t in self.tasks if t.alive]
        self.snapshot()
        self.frame += 1

    def anim_step(self, t):
        v = t.v
        save = (v[V_PC], v[V_LCNT], v[V_LTGT])
        v[V_PC] = v[V_APC]
        v[V_LCNT], v[V_LTGT] = v[V_ALCNT], v[V_ALTGT]
        self.run(t)
        v[V_APC] = v[V_PC]
        v[V_ALCNT], v[V_ALTGT] = v[V_LCNT], v[V_LTGT]
        if t.alive:
            v[V_PC], v[V_LCNT], v[V_LTGT] = save

    def snapshot(self):
        for t in self.tasks:
            cur = None
            if t.alive and t.v[0] & 0x20000000 and not self.lflag.get(t.v[V_LIST], 0) & 0x10000000:
                cur = (t.v[V_IMG], t.v[V_X], t.v[V_Y], t.v[V_Z], t.v[V_GFX], t.v[V_SX], t.v[V_SY])
            if cur != t.last:
                if cur is None:
                    self.log.append((self.frame, t.id, 'hide', ''))
                else:
                    img = cur[0] & 0xffffffff
                    self.log.append((self.frame, t.id, 'show',
                                     'surf%d:%d(%s) at (%.1f,%.1f) z=%d gfx=%#x%s' % (
                                         img >> 16, img & 0xffff, self.surf.get(img >> 16, '?'),
                                         cur[1] / 65536, cur[2] / 65536, cur[3], cur[4],
                                         ' scale=%.2f,%.2f' % (cur[5] / 65536, cur[6] / 65536) if cur[4] & 0x40000 else '')))
                t.last = cur

    def start(self, slot, ent, lst=5, queue=()):
        t = self.spawn_at(slot, ent, lst)
        t.queue = list(queue)
        self.run(t)
        self.snapshot()
        self.frame += 1
        return t

    def run_frames(self, n):
        for _ in range(n):
            if not self.tasks:
                break
            self.tick()


def compact(vm, hide=('surf_free', 'surf_new', 'colorkey', 'op10_10')):
    runs = {}
    out = []

    def flush(tid):
        r = runs.pop(tid, None)
        if not r:
            return
        if r['n'] == 1:
            out.append((r['f0'], 'T%d' % tid, 'show', '%s at (%g,%g) z=%d' % (r['img'], r['x0'], r['y0'], r['z'])))
        else:
            out.append((r['f0'], 'T%d' % tid, 'move', 'f%d-f%d %s (%g,%g)->(%g,%g) z=%d every %df, %d steps' % (
                r['f0'], r['fl'], r['img'], r['x0'], r['y0'], r['xl'], r['yl'], r['z'], r['d'][2], r['n'] - 1)))

    pat = re.compile(r'(surf\d+:\d+\(.*?\)) at \(([-\d.]+),([-\d.]+)\) z=(\d+)')
    for f, tid, k, m in vm.log:
        if k == 'show':
            mm = pat.match(m)
            img, x, y, z = mm.group(1), float(mm.group(2)), float(mm.group(3)), int(mm.group(4))
            r = runs.get(tid)
            if r and r['img'] == img and r['z'] == z:
                d = (x - r['xl'], y - r['yl'], f - r['fl'])
                if r['n'] == 1 or d == r['d']:
                    r['d'] = d
                    r['xl'], r['yl'], r['fl'] = x, y, f
                    r['n'] += 1
                    continue
            flush(tid)
            runs[tid] = {'f0': f, 'fl': f, 'x0': x, 'y0': y, 'xl': x, 'yl': y, 'img': img, 'z': z, 'n': 1, 'd': None}
        else:
            if k in ('hide', 'kill', 'killed'):
                flush(tid)
            if k in hide:
                continue
            out.append((f, 'T%d' % tid if tid else '-', k, m))
    for tid in list(runs):
        flush(tid)
    out.sort(key=lambda r: r[0])
    return out


def dump(vm, upto=None):
    for f, tid, k, m in vm.log:
        if upto is not None and f > upto:
            break
        tg = ''
        if tid:
            t = vm.get(tid)
            tg = '#%d' % tid
        print('f%-4d %-5s %-10s %s' % (f, tg, k, m))


if __name__ == '__main__':
    slot, ent, n = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
    vm = VM()
    vm.start(slot, ent)
    vm.run_frames(n)
    dump(vm)
