// 로직 틱(dt) 기반 타임아웃.
//
// window.setTimeout이 아니라 게임 루프가 넘겨주는 dt로 진행한다. 느린 PC에서
// 프레임이 밀려도 "N프레임 뒤"라는 연출 타이밍이 조기 발동하지 않게 하려는 것이고,
// 탭이 백그라운드로 가 루프가 멈추면 같이 멈추는 것도 실제 타이머 대비 이점이다.
//
// BattleEngine이 갖고 있던 setTimeout/updateTimeouts/clearTimeouts를 그대로 옮겼다.
// 마작 규칙과 무관한 프레임워크성 코드라 엔진 밖에 둔다.
const TickTimers = {
    create: function () {
        return {
            pending: [],
            _idCounter: 0,

            // delayTicks 프레임 뒤에 callback을 한 번 실행한다.
            // 반환하는 id를 쓰는 곳은 아직 없다(취소 API가 없음) — 기존 계약만 유지.
            add: function (callback, delayTicks) {
                const timeout = {
                    callback: callback,
                    timer: 0,
                    duration: delayTicks,
                    id: ++this._idCounter
                };
                this.pending.push(timeout);
                return timeout.id;
            },

            // 콜백이 실행 중에 새 타이머를 걸 수 있으므로 뒤에서부터 훑는다.
            update: function (dt = 1.0) {
                for (let i = this.pending.length - 1; i >= 0; i--) {
                    const t = this.pending[i];
                    t.timer += dt;
                    if (t.timer >= t.duration) {
                        this.pending.splice(i, 1);
                        t.callback();
                    }
                }
            },

            clear: function () {
                this.pending = [];
                this._idCounter = 0;
            }
        };
    }
};
