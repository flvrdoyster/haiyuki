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

            // options.timeline: FXTimelines 키. options.labels: {top, bottom} 라벨 에셋 id.
            spawnTimeline: function (img, options) {
                const tl = FXTimelines[options.timeline];
                if (!tl) return;

                const pieces = tl.pieces.map(p => ({
                    img: img, sx: p.src[0], sy: p.src[1], sw: p.src[2], sh: p.src[3],
                    path: p.path, dx: p.off[0], dy: p.off[1],
                    x: 0, y: 0, visible: false
                }));

                const labels = [];
                if (tl.labels && options.labels) {
                    for (const lb of tl.labels) {
                        const id = options.labels[lb.slot];
                        const limg = Assets.get(id);
                        const off = lb.off[id];
                        if (limg && off) labels.push({ img: limg, tick: lb.tick, x: lb.pos[0] + off[0], y: lb.pos[1] + off[1], visible: false });
                    }
                }

                const popupConf = options.popupType && BattleConfig.POPUP.TYPES[options.popupType];
                this.list.push({
                    type: options.timeline, timeline: tl,
                    shakeSound: popupConf ? popupConf.shakeSound : null,
                    pieces: pieces, labels: labels,
                    t: 0, holdLeft: 0, holdDone: !tl.hold, nextShake: 0,
                    blocking: options.blocking || false,
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

            MAX_LERP_GAP: 4,
            sampleSmooth: function (path, t) {
                let i = -1;
                for (let k = 0; k < path.length; k++) {
                    if (path[k][0] <= t) i = k; else break;
                }
                if (i < 0) return null;
                const a = path[i], b = path[i + 1];
                if (!b || b[0] - a[0] > this.MAX_LERP_GAP) return [a[1], a[2]];
                const u = (t - a[0]) / (b[0] - a[0]);
                return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
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
                        if (fx.shakeSound) Assets.playSound(fx.shakeSound);
                    }
                }

                for (const pc of fx.pieces) {
                    const p = this.sampleSmooth(pc.path, fx.t);
                    pc.visible = !!p;
                    if (p) { pc.x = p[0] + pc.dx; pc.y = p[1] + pc.dy; }
                }
                for (const lb of fx.labels) lb.visible = fx.t >= lb.tick;
            },

            isBlocking: function () {
                return this.list.some(fx => fx.blocking);
            }
        };
    }
};
