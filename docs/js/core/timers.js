// 로직 틱(dt) 기반 타임아웃 — window.setTimeout 대신 게임 루프의 dt로 진행한다.
const TickTimers = {
    create: function () {
        return {
            pending: [],

            add: function (callback, delayTicks) {
                this.pending.push({ callback: callback, timer: 0, duration: delayTicks });
            },

            // 콜백이 새 타이머를 걸 수 있으므로 뒤에서부터 훑는다.
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
            }
        };
    }
};
