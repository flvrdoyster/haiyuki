// COMPILE 스플래시 타이밍: 팝인 → 꿀렁(수직 스쿼시-바운스) → 날아감(우측 이탈) → 암전.
// ref.mp4 bbox 추적(프레임 1~41, top/bottom 개별 확인)으로 재분석:
//   - t<0.23s: 완전 암전(로고 없음)
//   - t=0.267s: 로고가 **알파 페이드 없이 즉시 팝인** — 이때 이미 최종 높이(28px)보다
//     훨씬 큰 38px(위로 넘치는 형태)로 나타남 — top=216(최종 194보다 아래), bottom=254
//   - t=0.267~0.667s: bottom 엣지가 급격히 위로 말려 올라가며(254→208) 최종 높이보다도
//     더 압축된 최소 높이(15px)까지 짜부라짐 — 이게 "꿀렁"(아랫쪽이 들어올려지듯 줄어듦)
//   - t=0.667~1.1s: 압축이 풀리며 bottom이 다시 아래로 펴져(208→222) 최종 높이(28px)로 안착
//   - top 엣지는 처음부터 거의 고정(216→193으로 한 번 정착 후 안 움직임) → 스케일 기준점은 상단
// 즉 앞서 만들었던 "플리커 페이드인"은 오분석 — 실제로는 상단 고정 수직 스케일 바운스.
// 꿀렁이 끝나면 곧바로(정지 구간 없이) 우측 날아감으로 이어짐. 60fps 환산 프레임 단위.
const LoadingConfig = {
    COMPILE: {
        path: 'ui/logo_compile.png',
        y: 193,
        popDelay: 16,   // 완전 암전 구간(팝인 전, ref 실측 0.267s)
        wobbleDur: 50,  // 팝인 직후 수직 스쿼시-바운스(꿀렁) — 상단 고정, 하단이 압축→복원
        outDur: 34,     // 우측 드리프트 + 시어 찢김으로 화면 밖 이탈
        gapDur: 70,
    }
};

const LoadingScene = {
    isLoaded: false,
    compileDone: false,
    compileTimer: 0,
    delayTimer: 0,

    init: function () {
        this.isLoaded = false;
        this.compileDone = false;
        this.compileTimer = 0;
        this.delayTimer = 0;
        this._compileAudioStarted = false;

        // 로딩 대기 화면 자체가 COMPILE 스플래시 — 별도 아이콘/프롬프트 없이 씬 시작과
        // 동시에 재생. 오디오는 제스처 전이면 브라우저가 막을 수 있지만, Assets.load()가
        // 이미 걸어둔 전역 unlock/resume 핸들러가 첫 입력 시 currentMusic을 자동 재시도한다
        // (기존 TitleScene의 bgm_title도 같은 방식으로 동작).
        Assets.load(() => {
            this.isLoaded = true;
        });
    },

    update: function (dt) {
        dt = dt || 1.0;

        const mode = new URLSearchParams(window.location.search).get('mode');
        if (mode === 'story' || mode === 'watch' || Game.isAutoTest) {
            if (!this.isLoaded) return;
            this.delayTimer += dt;
            if (this.delayTimer > 30) {
                if (mode === 'story' || mode === 'watch') {
                    Game.changeScene(CharacterSelectScene, { mode: 'WATCH' });
                } else {
                    Game.changeScene(TitleScene);
                }
            }
            return;
        }

        if (this.compileDone) {
            // 스플래시는 끝났지만 그 시점에 로딩이 안 끝나 있었던 경우 — 검정 화면으로 기다리다 완료되면 넘어감
            if (this.isLoaded) Game.changeScene(TitleScene);
            return;
        }

        if (!this._compileAudioStarted) {
            const jingle = Assets.getAudio('audio/bgm_compile');
            if (jingle) {
                this._compileAudioStarted = true;
                Assets.playMusic('audio/bgm_compile', false);
            }
            // 아직 로드 중이어도 시각 연출은 아래에서 계속 진행(오디오만 뒤늦게 합류)
        }

        // 에셋 로딩(이미지 디코드·SFX decodeAudioData)이 스플래시와 동시에 돌아 메인
        // 스레드가 수백 ms씩 멈출 수 있음 — Game.loop의 dt는 최대 15까지 점프하므로
        // 그대로 더하면 꿀렁·날아감 구간이 렌더 프레임 사이로 통째로 건너뛰어진다.
        // 스플래시 타이머만 프레임당 2로 제한해 히치가 나도 연출이 반드시 그려지게 한다.
        this.compileTimer += Math.min(dt, 2);
        const C = LoadingConfig.COMPILE;
        const total = C.popDelay + C.wobbleDur + C.outDur + C.gapDur;
        if (this.compileTimer >= total) {
            this.compileDone = true;
            if (this.isLoaded) Game.changeScene(TitleScene);
            // 아직 로딩 중이면 위의 compileDone 분기가 다음 프레임부터 isLoaded를 재확인
        }
    },

    draw: function (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);
        if (!this.compileDone) this._drawCompile(ctx);
    },

    _drawCompile: function (ctx) {
        const C = LoadingConfig.COMPILE;
        const img = Assets.get(C.path);
        if (!img) return;

        const t = this.compileTimer;
        const dx = (640 - img.width) / 2;

        if (t < C.popDelay) {
            return; // 완전 암전 — 아직 팝인 전
        } else if (t < C.popDelay + C.wobbleDur) {
            // 꿀렁: 알파 페이드 없이 즉시 팝인, top/height 둘 다 독립적으로 움직임(bbox 실측 기반).
            // 팝인 순간 이미 최종 크기보다 아래로 넘친 상태(top+22, height×1.36)로 나타나서
            // top은 p=0~0.4 사이에 빠르게 제자리로 올라와 고정되고, height는 p=0~0.48 사이에
            // 최소(×0.54)까지 짜부라졌다가 p=1까지 다시 풀리며 정상 크기로 안착.
            const p = (t - C.popDelay) / C.wobbleDur; // 0..1
            const easeOutQuad = (q) => 1 - (1 - q) * (1 - q);

            const topQ = Math.min(1, p / 0.4);
            const topOffset = 22 * (1 - easeOutQuad(topQ));

            let scaleY;
            if (p < 0.48) {
                const q = p / 0.48;
                const e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2; // easeInOutQuad
                scaleY = 1.36 + (0.54 - 1.36) * e;
            } else {
                const q = (p - 0.48) / 0.52;
                scaleY = 0.54 + (1.0 - 0.54) * easeOutQuad(q);
            }
            ctx.save();
            ctx.translate(dx, C.y + topOffset);
            ctx.scale(1, scaleY);
            ctx.drawImage(img, 0, 0);
            ctx.restore();
        } else if (t < C.popDelay + C.wobbleDur + C.outDur) {
            // 날아감: 시어(위쪽일수록 덜 밀림)로 슬랜트되며 우측 드리프트로 화면 밖 이탈.
            // 매끈한 평면 시어만으로는 원본 특유의 "찢어지는" 스캔라인 질감이 안 나와서,
            // 스캔라인별 고정 의사난수 지터(tearAmp, p에 따라 커짐)를 시어 위에 얹음.
            const p = (t - C.popDelay - C.wobbleDur) / C.outDur; // 0..1
            const drift = 480 * p;       // 전체적으로 우측 이동
            const shear = 6 * p;         // 아래로 갈수록(= y가 클수록) 더 밀리는 기울기
            const tearAmp = 26 * p;      // 갈수록 커지는 스캔라인별 찢김 폭
            const alpha = Math.max(0, 1 - p * 1.15);
            ctx.save();
            ctx.globalAlpha = alpha;
            const step = 2;
            for (let sy = 0; sy < img.height; sy += step) {
                const sh = Math.min(step, img.height - sy);
                const h = Math.sin(sy * 12.9898) * 43758.5453;
                const jitter = ((h - Math.floor(h)) - 0.5) * tearAmp;
                const x = dx + drift + shear * sy + jitter;
                ctx.drawImage(img, 0, sy, img.width, sh, x, C.y + sy, img.width, sh);
            }
            ctx.restore();
        }
        // gap 구간은 이미 채운 검정 배경 그대로 — 아무것도 그리지 않음
    }
};
