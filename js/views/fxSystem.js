// 전투 FX(팝업·슬라이드·바운스 스프라이트). 그리기는 BattleRenderer.drawFX.
const FXSystem = {
    create: function () {
        return {
            list: [],

            spawn: function (type, x, y, options = {}) {
                const img = Assets.get(type);
                if (img) {
                    const life = options.life || 45;
                    const scale = options.scale || 1.0;
                    const slideFrom = options.slideFrom;
                    const anim = options.anim;
                    const blocking = options.blocking || false;

                    let startX = x;
                    let endX = x;
                    let startY = y;
                    let endY = y;

                    if (slideFrom === 'LEFT') {
                        startX = -img.width * scale;
                        endX = x;
                    } else if (slideFrom === 'RIGHT') {
                        startX = 640 + img.width * scale;
                        endX = x;
                    } else if (slideFrom === 'TOP') {
                        startY = -img.height * scale;
                        endY = y;
                    } else if (slideFrom === 'BOTTOM') {
                        startY = 480 + img.height * scale;
                        endY = y;
                    }

                    this.list.push({
                        type: type, img: img,
                        x: startX, y: startY,
                        startX: startX, startY: startY,
                        endX: endX, endY: endY,
                        timer: 0, life: life, maxLife: life,
                        scale: scale, alpha: 0,
                        baseScale: scale,
                        anim: anim,
                        slideFrom: slideFrom,
                        blocking: blocking
                    });
                }
            },

            update: function (dt = 1.0) {
                for (let i = this.list.length - 1; i >= 0; i--) {
                    const fx = this.list[i];
                    fx.life -= dt;
                    fx.timer += dt;

                    const fadeInDur = BattleConfig.FX.fadeInDuration;
                    if (fx.maxLife - fx.life <= fadeInDur) {
                        fx.alpha = (fx.maxLife - fx.life) / fadeInDur;
                    }

                    if (fx.slideFrom) {
                        const slideDur = BattleConfig.FX.slideDuration;
                        const p = Math.min(1, (fx.maxLife - fx.life) / slideDur);
                        // EaseOutCubic: UI 슬라이드에 Quad보다 부드러움
                        const ease = 1 - Math.pow(1 - p, 3);
                        fx.x = fx.startX + (fx.endX - fx.startX) * ease;
                        fx.y = fx.startY + (fx.endY - fx.startY) * ease;
                    } else if (fx.anim === 'ZOOM_IN') {
                        const popDur = BattleConfig.FX.zoomPopDuration;
                        const age = fx.maxLife - fx.life;
                        const overshoot = BattleConfig.FX.zoomOvershoot;

                        if (age < popDur) {
                            let p = age / popDur;
                            p = p - 1;
                            const scaleP = p * p * ((overshoot + 1) * p + overshoot) + 1;
                            fx.scale = fx.baseScale * scaleP;
                        } else {
                            fx.scale = fx.baseScale;
                        }
                    } else if (fx.anim === 'BOUNCE_UP') {
                        const age = fx.maxLife - fx.life;
                        const dropDur = BattleConfig.FX.bounceDropDuration;
                        const bounceDur = BattleConfig.FX.bounceUpDuration;
                        const startOffX = BattleConfig.FX.bounceStartOffsetX;
                        const startOffY = BattleConfig.FX.bounceStartOffsetY;
                        const floorOffY = BattleConfig.FX.bounceFloorOffsetY;
                        const impactOffX = BattleConfig.FX.bounceImpactOffsetX;

                        if (age < dropDur) {
                            const p = age / dropDur;
                            const easeIn = p * p;

                            fx.x = (fx.endX + startOffX) + (impactOffX - startOffX) * p;
                            fx.y = (fx.endY + startOffY) + (floorOffY - startOffY) * easeIn;

                            fx.alpha = Math.min(1, age / 4);

                            if (p > 0.9) fx.scaleY = fx.baseScale * 0.8;
                            else fx.scaleY = fx.baseScale;

                        } else {
                            const bounceAge = age - dropDur;
                            let p = Math.min(1, bounceAge / bounceDur);

                            const easeOut = p * (2 - p);

                            fx.x = (fx.endX + impactOffX) + (0 - impactOffX) * easeOut;
                            fx.y = (fx.endY + floorOffY) + (0 - floorOffY) * easeOut;

                            fx.scaleY = fx.baseScale;
                            fx.alpha = 1.0;
                        }
                        if (age >= dropDur + bounceDur) {
                            fx.x = fx.endX;
                            fx.y = fx.endY;
                        }
                    } else if (fx.anim === 'SLIDE') {
                        const slideDur = BattleConfig.FX.slideDuration + 4;
                        const age = fx.maxLife - fx.life;

                        if (age <= slideDur) {
                            const p = age / slideDur;
                            const ease = 1 - Math.pow(1 - p, 4);
                            fx.x = fx.startX + (fx.endX - fx.startX) * ease;
                            fx.y = fx.startY + (fx.endY - fx.startY) * ease;
                        } else {
                            fx.x = fx.endX;
                            fx.y = fx.endY;
                        }
                    }

                    const fadeOutDur = BattleConfig.FX.fadeOutDuration;
                    if (fx.life < fadeOutDur) {
                        fx.alpha = fx.life / fadeOutDur;
                    } else {
                        if (fx.maxLife - fx.life > fadeInDur) fx.alpha = 1.0;
                    }

                    if (fx.life <= 0) {
                        this.list.splice(i, 1);
                    }
                }
            },

            isBlocking: function () {
                return this.list.some(fx => fx.blocking);
            }
        };
    }
};
