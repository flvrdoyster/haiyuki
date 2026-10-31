// 전투 FX. 선언·나가리 연출은 FXTimelines(원본 틱 좌표)를 조각 단위로 재생하고,
// 그 밖(스킬 연출 등)은 life·알파 페이드만 있는 단순 스프라이트. 그리기는 BattleRenderer.drawFX.
const FXSystem = {
    create: function () {
        return {
            list: [],

            spawn: function (type, x, y, options = {}) {
                const img = Assets.get(type);
                if (!img) return;
                if (options.timeline) {
                    this.spawnTimeline(img, options);
                    return;
                }
                const life = options.life || 45;
                this.list.push({
                    type: type, img: img,
                    x: x, y: y,
                    timer: 0, life: life, maxLife: life,
                    scale: options.scale || 1.0, alpha: 0,
                    blocking: options.blocking || false
                });
            },

            // options.timeline: FXTimelines 키. options.glyph: [left, right] 이미지 안 글자 가로 범위,
            // options.split: 조각 경계 열(없으면 한 조각). options.labels: {top, bottom} 라벨 에셋 id.
            spawnTimeline: function (img, options) {
                const tl = FXTimelines[options.timeline];
                if (!tl) return;
                const glyph = options.glyph || [0, img.width];
                const cuts = [glyph[0]];
                if (options.split != null && tl.pieces.length > 1) cuts.push(options.split);
                cuts.push(glyph[1]);
                const assembledCx = (glyph[0] + glyph[1]) / 2;
                const assembledCy = img.height / 2;

                const pieces = [];
                for (let k = 0; k < tl.pieces.length; k++) {
                    const sx = cuts[Math.min(k, cuts.length - 2)];
                    const ex = cuts[Math.min(k + 1, cuts.length - 1)];
                    const path = tl.pieces[k].path;
                    const ref = this.sample(path, tl.ref);
                    const restCx = tl.anchor[0] + ((sx + ex) / 2 - assembledCx);
                    const restCy = tl.anchor[1] + (img.height / 2 - assembledCy);
                    pieces.push({
                        img: img, sx: sx, sy: 0, sw: ex - sx, sh: img.height,
                        path: path,
                        dx: restCx - ref[1], dy: restCy - ref[2],
                        x: 0, y: 0, visible: false
                    });
                }

                const labels = [];
                if (tl.labels && options.labels) {
                    for (const lb of tl.labels) {
                        const limg = Assets.get(options.labels[lb.slot]);
                        if (limg) labels.push({ img: limg, tick: lb.tick, x: lb.center[0], y: lb.center[1], visible: false });
                    }
                }

                this.list.push({
                    type: options.timeline, timeline: tl,
                    pieces: pieces, labels: labels,
                    t: 0, holdLeft: 0, holdDone: !tl.hold, nextShake: 0,
                    wash: true, blocking: options.blocking || false,
                    skipRequested: false
                });
            },

            sample: function (path, t) {
                let p = null;
                for (let i = 0; i < path.length; i++) {
                    if (path[i][0] <= t) p = path[i]; else break;
                }
                return p;
            },

            skipHold: function () {
                for (const fx of this.list) {
                    if (fx.timeline) fx.skipRequested = true;
                }
            },

            update: function (dt = 1.0) {
                for (let i = this.list.length - 1; i >= 0; i--) {
                    const fx = this.list[i];
                    if (fx.timeline) {
                        this.updateTimeline(fx, dt);
                        if (fx.t >= fx.timeline.end) this.list.splice(i, 1);
                        continue;
                    }
                    fx.life -= dt;
                    fx.timer += dt;
                    const fadeInDur = BattleConfig.FX.fadeInDuration;
                    const fadeOutDur = BattleConfig.FX.fadeOutDuration;
                    if (fx.timer <= fadeInDur) fx.alpha = fx.timer / fadeInDur;
                    else if (fx.life < fadeOutDur) fx.alpha = fx.life / fadeOutDur;
                    else fx.alpha = 1.0;
                    if (fx.life <= 0) this.list.splice(i, 1);
                }
            },

            updateTimeline: function (fx, dt) {
                const tl = fx.timeline;
                if (!fx.holdDone && fx.t >= tl.hold[0]) {
                    const autoTest = (typeof Game !== 'undefined') && Game.isAutoTest;
                    fx.holdLeft += dt;
                    if (fx.skipRequested || autoTest || fx.holdLeft >= tl.hold[1] - tl.hold[0]) {
                        fx.holdDone = true;
                        fx.t = tl.hold[1];
                    }
                } else {
                    fx.t += dt;
                    if (!fx.holdDone && fx.t > tl.hold[0]) fx.t = tl.hold[0];
                }

                if (tl.shakes) {
                    while (fx.nextShake < tl.shakes.length && tl.shakes[fx.nextShake][0] <= fx.t) {
                        const s = tl.shakes[fx.nextShake++];
                        if (typeof Game !== 'undefined') Game.shake(s[1], s[2]);
                    }
                }

                for (const pc of fx.pieces) {
                    const p = this.sample(pc.path, fx.t);
                    pc.visible = !!p;
                    if (p) { pc.x = p[1] + pc.dx; pc.y = p[2] + pc.dy; }
                }
                for (const lb of fx.labels) lb.visible = fx.t >= lb.tick;
            },

            isBlocking: function () {
                return this.list.some(fx => fx.blocking);
            }
        };
    }
};
