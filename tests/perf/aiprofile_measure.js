const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const SHARDS = 10;

const ROOT = path.join(__dirname, '..', '..', 'docs');
const ctx = vm.createContext({ console, Math });
const load = (rel, name) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8') + `\n;globalThis.${name} = ${name};`, ctx, { filename: rel });
load('js/data/paiData.js', 'PaiData');
load('js/logic/yakuLogic.js', 'YakuLogic');
load('js/logic/aiLogic.js', 'AILogic');
load('js/data/characterData.js', 'CharacterData');
const { PaiData, AILogic, CharacterData, YakuLogic } = ctx;

// 프로필과 무관한 비싼 호출만 메모화(소스는 그대로, 컨텍스트 안 객체의 함수만 감싼다)
if (process.env.OVR) Object.assign(AILogic, JSON.parse(process.env.OVR));
const memo = (obj, name, keyOf) => {
    const f = obj[name], cache = new Map();
    obj[name] = function (...a) { const k = keyOf(...a); let v = cache.get(k); if (v === undefined) { v = f.apply(this, a); cache.set(k, v); } return v; };
};
memo(YakuLogic, 'riichiScoreCounts', c => c.join(','));
memo(AILogic, 'acceptanceInfoCounts', (c, h) => { const o = []; for (const t of h) { const k = PaiData.INDEX[t.type]; if (o.indexOf(k) < 0) o.push(k); } return c.join(',') + '|' + o.join(','); });


let seed = 20261031;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const fullDeck = [];
PaiData.TYPES.forEach(t => { for (let i = 0; i < PaiData.TILE_COUNT_PER_TYPE; i++) fullDeck.push({ type: t.id, color: t.color }); });
const N = +(process.env.N || 5000);
const randomHand = () => shuffle(fullDeck.slice()).slice(0, 12);
const yakuHand = () => {
    const colors = ['red', 'blue', 'yellow'];
    const color = colors[Math.floor(rnd() * 3)];
    const deck = shuffle(fullDeck.slice());
    const pool = deck.filter(t => t.color === color), rest = deck.filter(t => t.color !== color);
    const k = 7 + Math.floor(rnd() * 5);
    return shuffle(pool.slice(0, k).concat(rest.slice(0, 12 - k)));
};
const hands = [];
for (let i = 0; i < N; i++) hands.push({ kind: 'random', hand: randomHand() });
for (let i = 0; i < N; i++) hands.push({ kind: 'yaku', hand: yakuHand() });

const tile = id => ({ type: id, color: PaiData.BY_ID[id].color });
const makeCtx = (cond, hand) => {
    const inTypes = [...new Set(hand.map(t => t.type))];
    if (cond === 1) return { discards: [], opponentRiichi: false, doras: [] };
    const outTypes = PaiData.TYPES.map(t => t.id).filter(id => !inTypes.includes(id));
    if (cond === 2) {
        const doras = [tile(inTypes[Math.floor(rnd() * inTypes.length)])];
        if (outTypes.length) doras.push(tile(outTypes[Math.floor(rnd() * outTypes.length)]));
        return { discards: [], opponentRiichi: false, doras };
    }
    const d = shuffle(inTypes.slice()).slice(0, 3).map(tile);
    return { discards: d, opponentRiichi: true, doras: [] };
};
const conds = [1, 2, 3];
const condNames = { 1: '① 기본', 2: '② 도라 2종', 3: '③ 리치+겐부츠 3종' };
const cases = [];
hands.forEach((h, hi) => { for (const c of conds) cases.push({ hi, kind: h.kind, cond: c, hand: h.hand, context: makeCtx(c, h.hand) }); });

const DEF = AILogic.DEFAULT_PROFILE;
const AXES = ['value', 'speed', 'defense', 'colorBias', 'greed'];
const pick = sc => { let b = 0; for (const c of sc) if (c.score > sc[b].score) b = c.index; return b; };
const median = a => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const chars = CharacterData.filter(c => c.aiProfile);
const jobs = [{ id: 'base', profile: DEF }];
chars.forEach(c => {
    jobs.push({ id: 'full|' + c.id, profile: c.aiProfile });
    AXES.forEach(ax => { if (c.aiProfile[ax] !== DEF[ax]) jobs.push({ id: ax + '|' + c.id, profile: Object.assign({}, DEF, { [ax]: c.aiProfile[ax] }) }); });
});

if (!isMainThread) {
    const mine = cases.filter(k => k.hi % SHARDS === workerData.shard);
    const picks = {};
    for (const j of jobs) picks[j.id] = mine.map(k => { const s = AILogic.scoreDiscards(k.hand, j.profile, k.context); const i = pick(s); return [i, s[i].score]; });
    const baseSc = mine.map(k => AILogic.scoreDiscards(k.hand, DEF, k.context));
    const res = {};
    for (const j of jobs) {
        const out = res[j.id] = {};
        mine.forEach((k, n) => {
            const key = k.kind + '|' + k.cond;
            const o = out[key] || (out[key] = { n: 0, diff: 0, gaps: [] });
            o.n++;
            const [i] = picks[j.id][n], bi = picks.base[n][0];
            if (k.hand[i].type !== k.hand[bi].type) {
                o.diff++;
                const s = AILogic.scoreDiscards(k.hand, j.profile, k.context);
                o.gaps.push(s[i].score - s[bi].score);
            }
        });
    }
    parentPort.postMessage(res);
    return;
}

(async () => {
const parts = await Promise.all(Array.from({ length: SHARDS }, (_, shard) => new Promise((ok, bad) => {
    const w = new Worker(__filename, { workerData: { shard } });
    w.on('message', ok); w.on('error', bad);
})));
const merge = id => {
    const out = {};
    for (const p of parts) for (const [k, v] of Object.entries(p[id])) {
        const o = out[k] || (out[k] = { n: 0, diff: 0, gaps: [] });
        o.n += v.n; o.diff += v.diff; o.gaps = o.gaps.concat(v.gaps);
    }
    return out;
};
const agg = (res, kinds, cond) => {
    let n = 0, d = 0, g = [];
    for (const kd of kinds) { const o = res[kd + '|' + cond]; n += o.n; d += o.diff; g = g.concat(o.gaps); }
    return { rate: d / n, med: median(g) };
};
const pct = r => (r * 100).toFixed(1) + '%';
const fmt = a => `${pct(a.rate)}${isNaN(a.med) ? '' : ` (${a.med.toFixed(1)})`}`;

const lines = [];
const kindsSets = [['random'], ['yaku'], ['random', 'yaku']];
const kindNames = ['무작위', '역 근접', '합계'];

const charRes = chars.map(c => ({ c, r: merge('full|' + c.id) }));
const full = [];
full.push('## 1. 캐릭터 전체 프로필 vs 기본값 (선택 패 종류가 다른 비율, 괄호는 불일치 시 해당 프로필 점수 기준 점수 차 중앙값)\n');
full.push('| 캐릭터 | 손패 | ' + conds.map(c => condNames[c]).join(' | ') + ' |');
full.push('|---|---|' + conds.map(() => '---').join('|') + '|');
for (const { c, r } of charRes) kindsSets.forEach((ks, ki) =>
    full.push(`| ${c.name}(${c.aiProfile.type}) | ${kindNames[ki]} | ` + conds.map(cd => fmt(agg(r, ks, cd))).join(' | ') + ' |'));

const zero = {};
for (const kd of ['random', 'yaku']) for (const cd of conds) zero[kd + '|' + cd] = { n: cases.filter(k => k.kind === kd && k.cond === cd).length, diff: 0, gaps: [] };
const axisRes = chars.map(c => ({ c, axes: AXES.map(ax => ({ ax, r: c.aiProfile[ax] === DEF[ax] ? zero : merge(ax + '|' + c.id) })) }));
full.push('\n## 2. 축별 단독 기여 (합계 손패, 조건 ①/②/③ 순서, 해당 축만 기본값→캐릭터값)\n');
full.push('| 캐릭터 | ' + AXES.join(' | ') + ' |');
full.push('|---|' + AXES.map(() => '---').join('|') + '|');
for (const { c, axes } of axisRes) full.push(`| ${c.name} | ` + axes.map(({ r }) => conds.map(cd => pct(agg(r, kindsSets[2], cd).rate)).join(' / ')).join(' | ') + ' |');

full.push('\n## 3. 축별 평균 (캐릭터 7명 평균, 합계 손패)\n');
full.push('| 축 | ' + conds.map(c => condNames[c]).join(' | ') + ' | 전체 |');
full.push('|---|' + conds.map(() => '---').join('|') + '|---|');
const axisAvg = {};
AXES.forEach((ax, ai) => {
    const per = conds.map(cd => axisRes.reduce((s, x) => s + agg(x.axes[ai].r, kindsSets[2], cd).rate, 0) / axisRes.length);
    axisAvg[ax] = per.reduce((a, b) => a + b, 0) / 3;
    full.push(`| ${ax} | ${per.map(pct).join(' | ')} | ${pct(axisAvg[ax])} |`);
});
console.log(full.join('\n'));
console.log('\n축 순위:', Object.entries(axisAvg).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + pct(v)).join(' > '));

})();
