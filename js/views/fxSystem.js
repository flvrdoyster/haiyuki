// 전투 FX(팝업·슬라이드·바운스 스프라이트) 파티클 시스템.
//
// battleScene 안에 spawnFX/updateFX 로 박혀 있던 ~140줄을 옮겼다. 씬은 입력 라우팅과
// 이벤트 펌프가 본업인데 이징 곡선과 바운스 수학까지 품고 있었다.
//
// 리스트는 여전히 씬이 소유한다(BattleScene.activeFX). battleSequencer 가
// engine.scene.activeFX 를 직접 읽어 "FX 재생 중인가"를 판단하기 때문에 그 이름을
// 유지해야 하고, 그래서 여기는 상태를 갖지 않고 리스트를 인자로 받는다.
//
//   spawn(list, type, x, y, options)  — slideFrom(LEFT/RIGHT/TOP/BOTTOM), anim(ZOOM_IN/BOUNCE_UP/SLIDE), blocking
//   update(list, dt)                  — 페이드인/아웃, 슬라이드 이징, 바운스; 수명 다하면 제거
//   isBlocking(list)                  — blocking FX 가 하나라도 살아 있으면 true(입력·이벤트 처리 보류)
// 그리기는 BattleRenderer.drawFX 가 담당.
const FXSystem = {
    spawn: function (list, type, x, y, options = {}) {
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

            list.push({
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

    update: function (list, dt = 1.0) {
        for (let i = list.length - 1; i >= 0; i--) {
            const fx = list[i];
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
                list.splice(i, 1);
            }
        }
    },

    isBlocking: function (list) {
        return list.some(fx => fx.blocking);
    }
};
