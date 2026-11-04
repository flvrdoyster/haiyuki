const OnlineStageScene = {
    init: function () {
    },

    update: function () {
    },

    draw: function (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, 640, 480);
        const bg = Assets.get('bg/STAFFBAK.png');
        if (bg) ctx.drawImage(bg, 0, 0, 640, 480);
    }
};

const OnlineLobby = {
    TOASTS: {
        joined: '상대가 들어왔습니다',
        picking: '상대가 캐릭터를 고르는 중',
        rematch: '상대가 다시 대전을 원합니다',
        takeover: '상대가 나가서 CPU가 이어받습니다',
        left: '상대가 나갔습니다',
        disconnect: '연결이 끊어졌습니다',
        full: '방이 가득 찼습니다',
        desync: '동기가 어긋났습니다',
        copiedCode: '코드를 복사했습니다',
        copiedLink: '바로 입장 링크를 복사했습니다'
    },
    STATUS_MS: 3500,
    ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ?.,!',
    GLYPH: { I: { w: 24, off: 4 } },
    LABEL: { win: '승', lose: '패', draw: '무승부' },
    SKILLS_LABEL: { on: '비기 켜짐', off: '비기 꺼짐' },
    LABEL_CLASS: { win: 'w', lose: 'l', draw: 'd' },

    match: null,
    skills: true,
    view: 'start',
    ready: false,

    isPage: function () {
        return document.body.classList.contains('online-page');
    },

    el: function (id) {
        return document.getElementById(id);
    },

    begin: function () {
        const params = new URLSearchParams(window.location.search);
        const num = (k) => params.get(k) != null && params.get(k) !== '' ? Number(params.get(k)) : null;
        this.char = num('char');
        this.seed = num('seed');
        BattleConfig.RULES.SKILLS_ENABLED = true;
        Assets.stopMusic();
        Game.changeScene(OnlineStageScene);
        this.bind();
        this.ready = true;
        const preview = params.get('preview');
        if (preview != null) {
            this.preview = true;
            this.showPreview(preview);
            return;
        }
        const room = OnlineMatch.normalizeCode(params.get('room'));
        if (room.length === OnlineMatch.CODE_LENGTH) this.joinRoom(room);
        else this.show('start');
    },

    bind: function () {
        if (this.bound) return;
        this.bound = true;
        const panel = this.el('online-panel');
        panel.addEventListener('input', (e) => {
            if (e.target.id !== 'online-join-input') return;
            e.target.value = OnlineMatch.normalizeCode(e.target.value);
        });
        panel.addEventListener('keydown', (e) => {
            if (e.target.id !== 'online-join-input' || e.key !== 'Enter') return;
            e.preventDefault();
            this.joinRoom(e.target.value);
        });
        panel.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn || this.preview) return;
            const act = {
                'online-skills-toggle': () => this.toggleSkills(btn),
                'online-create': () => this.createRoom(),
                'online-join': () => this.joinRoom(this.el('online-join-input').value),
                'online-copy-code': () => this.copyText(this.match.code, this.TOASTS.copiedCode),
                'online-copy-link': () => this.copyText(this.inviteLink(this.match.code), this.TOASTS.copiedLink),
                'online-cancel': () => this.leave(),
                'online-rematch': () => { if (this.match) this.match.requestRematch(); },
                'online-leave': () => this.leave()
            }[btn.id];
            if (act) act();
        });
        window.addEventListener('pagehide', () => {
            if (OnlineMatch.current) OnlineMatch.current.close();
        });
    },

    toggleSkills: function (btn) {
        this.skills = !this.skills;
        btn.classList.toggle('off', !this.skills);
        btn.setAttribute('aria-label', this.skills ? this.SKILLS_LABEL.on : this.SKILLS_LABEL.off);
    },

    inviteLink: function (code) {
        return window.location.href.split(/[?#]/)[0] + '?room=' + code;
    },

    attach: function (match) {
        this.match = match;
        this.seenTakeover = null;
        this.seenRematch = false;
        match.onChange = (m) => this.onChange(m);
    },

    createRoom: function () {
        this.attach(OnlineMatch.create({
            host: true,
            skills: this.skills,
            code: OnlineMatch.makeCode(),
            char: this.char,
            seed: this.seed
        }));
        this.show('wait');
    },

    joinRoom: function (code) {
        code = OnlineMatch.normalizeCode(code);
        if (code.length !== OnlineMatch.CODE_LENGTH) {
            const field = this.el('online-join-input');
            if (field) field.focus();
            return;
        }
        this.attach(OnlineMatch.create({ host: false, code: code, char: this.char }));
        this.show('wait');
    },

    copyText: function (text, done) {
        const fallback = () => {
            const area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
            document.body.appendChild(area);
            area.select();
            let ok = false;
            try {
                ok = document.execCommand('copy');
            } catch (e) {
                ok = false;
            }
            area.remove();
            if (ok) this.status(done);
        };
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            fallback();
            return;
        }
        navigator.clipboard.writeText(text).then(() => this.status(done), fallback);
    },

    status: function (text) {
        const el = this.el('online-status');
        if (!el || !text) return;
        el.textContent = text;
        el.classList.add('show');
        clearTimeout(this._statusTimer);
        this._statusTimer = setTimeout(() => el.classList.remove('show'), this.STATUS_MS);
    },

    show: function (view) {
        this.view = view;
        this.sync(true);
    },

    refresh: function () {
        this.sync(false);
    },

    stateOf: function () {
        const m = this.match;
        const st = { view: this.view };
        if (this.view === 'wait' && m) {
            st.code = m.code;
            st.role = m.host ? 'host' : 'guest';
            st.skills = m.skills;
        } else if (this.view === 'ended' && m) {
            const sum = m.summary || {};
            st.result = sum.winner === 'P1' ? 'win' : 'lose';
            st.rounds = (sum.rounds || []).map((r) => ({
                round: r.round,
                result: r.winner === 'P1' ? 'win' : r.winner === 'CPU' ? 'lose' : 'draw',
                yaku: r.yaku,
                bonuses: (r.bonuses || []).map((b) => b.name),
                tenpai: r.tenpai,
                damage: r.damage
            }));
            st.canRematch = !m.takenOver;
            st.rematch = m.rematchMine ? 'waiting' : 'idle';
        }
        return st;
    },

    sync: function (force) {
        this.render(this.stateOf(), force);
    },

    esc: function (text) {
        return String(text == null ? '' : text).replace(/[&<>"']/g, (c) => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    },

    glyphs: function (word, row) {
        return [...word].map((c) => {
            if (c === ' ') return '<span class="glyph space"></span>';
            const g = this.GLYPH[c] || {};
            const vars = [
                `--i:${this.ALPHABET.indexOf(c)}`,
                g.w ? `--w:${g.w}` : '',
                g.off ? `--off:${g.off}` : '',
                `--row:${row}`
            ].filter(Boolean).join(';');
            return `<span class="glyph" style="${vars}"></span>`;
        }).join('');
    },

    historyRows: function (rounds) {
        const tenpai = (t) => (t ? '텐파이' : '노텐');
        return rounds.map((r) => {
            let detail;
            if (r.result === 'draw' && r.tenpai) {
                detail = `<span class="fixed">${tenpai(r.tenpai[0])} / ${tenpai(r.tenpai[1])}</span>`;
            } else {
                const tags = (r.bonuses || []).map((name) => {
                    const dora = /^도라.*x(\d+)/.exec(name);
                    return dora ? `도라 ${dora[1]}` : name.replace(' 보너스', '');
                });
                detail = `<span class="yaku">${this.esc(r.yaku)}</span>` + tags.map((t) => `<span class="fixed"> · ${this.esc(t)}</span>`).join('');
            }
            const dmg = r.damage ? '-' + r.damage : '';
            return `<li><span class="r">R${r.round}</span>` +
                `<span class="${this.LABEL_CLASS[r.result]}">${this.LABEL[r.result]}</span>` +
                `<span class="detail">${detail}</span><span class="dmg">${dmg}</span></li>`;
        }).join('');
    },


    markup: function (st) {
        const title = `<h1 class="heading" aria-label="VS MODE">${this.glyphs('VS MODE', 1)}</h1>`;
        if (st.view === 'start') {
            return `${title}
                <div class="hrow online-skills-row">
                    <span class="online-skills-label">비기</span>
                    <button id="online-skills-toggle" class="online-skills-toggle${this.skills ? '' : ' off'}" type="button" aria-label="${this.skills ? this.SKILLS_LABEL.on : this.SKILLS_LABEL.off}"></button>
                </div>
                <button id="online-create" class="online-btn" type="button">방 만들기</button>
                <hr class="divider">
                <div class="hrow">
                    <input id="online-join-input" type="text" maxlength="${OnlineMatch.CODE_LENGTH}" placeholder="방 코드" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="방 코드">
                    <button id="online-join" class="online-btn" type="button">참가</button>
                </div>`;
        }
        if (st.view === 'wait') {
            const copy = st.role === 'host'
                ? `<div class="hrow">
                    <button id="online-copy-code" class="online-btn" type="button">코드 복사</button>
                    <button id="online-copy-link" class="online-btn" type="button">바로 입장 링크 복사</button>
                </div>`
                : '';
            return `${title}
                <div id="online-room-code">${this.esc(st.code)}</div>
                ${st.skills == null ? '' : `<p id="online-skills" class="note skills">${st.skills ? this.SKILLS_LABEL.on : this.SKILLS_LABEL.off}</p>`}
                ${copy}
                <p class="note wait">상대를 기다리는 중</p>
                <button id="online-cancel" class="online-btn online-sub" type="button">취소</button>`;
        }
        if (st.view === 'ended') {
            const won = st.result === 'win';
            let rematch;
            if (!st.canRematch) rematch = '<p class="note">상대가 나갔습니다</p>';
            else if (st.rematch === 'waiting') rematch = '<p id="online-rematch-wait" class="note wait">상대를 기다리는 중</p>';
            else rematch = '<button id="online-rematch" class="online-btn" type="button">다시 대전</button>';
            return `<div id="online-result" class="result" aria-label="${won ? 'WIN' : 'LOSE'}">${this.glyphs(won ? 'WIN' : 'LOSE', 0)}</div>
                <ul id="online-history" class="online-history">${this.historyRows(st.rounds || [])}</ul>
                ${rematch}
                <button id="online-leave" class="online-btn online-sub" type="button">나가기</button>`;
        }
        return '';
    },

    render: function (st, force) {
        const panel = this.el('online-panel');
        if (!panel) return;
        const key = JSON.stringify(st);
        if (!force && key === this.renderedKey) return;
        this.renderedKey = key;
        this.state = st;
        if (st.view === 'hidden') {
            if (panel.contains(document.activeElement)) document.activeElement.blur();
            panel.hidden = true;
            panel.innerHTML = '';
            return;
        }
        panel.dataset.view = st.view;
        panel.innerHTML = `<div class="window">${this.markup(st)}</div>`;
        panel.hidden = false;
        const list = this.el('online-history');
        if (list) list.scrollTop = list.scrollHeight;
    },

    previewStates: function () {
        const rounds = [
            { round: 1, result: 'win', yaku: '삼도립', bonuses: ['치호 보너스'], damage: 2400 },
            { round: 2, result: 'draw', tenpai: [true, false], damage: 1000 },
            { round: 3, result: 'lose', yaku: '적일색', damage: 3600 },
            { round: 4, result: 'win', yaku: '취호전', bonuses: ['도라 보너스 x3'], damage: 7200 }
        ];
        const flip = (rs) => rs.map((r) => ({ ...r, result: r.result === 'win' ? 'lose' : r.result === 'lose' ? 'win' : 'draw' }));
        const long = Array.from({ length: 12 }, (_, i) => ({ ...rounds[i % 4], round: i + 1 }));
        const worst = [
            { round: 1, result: 'lose', yaku: '입에 담을 수도 없는 엄청난 기술', bonuses: ['해저 보너스', '도라 보너스 x3'], damage: 14400 },
            { round: 2, result: 'win', yaku: '입에 담을 수도 없는 엄청난 기술', damage: 9600 },
            { round: 3, result: 'draw', tenpai: [true, true], damage: 0 }
        ];
        const code = 'ABCDE';
        return {
            'start': { view: 'start' },
            'start-failed': { view: 'start', toast: this.TOASTS.disconnect },
            'wait-host': { view: 'wait', role: 'host', code: code, skills: true },
            'wait-guest': { view: 'wait', role: 'guest', code: code, skills: false },
            'ended-win': { view: 'ended', result: 'win', rounds: rounds, canRematch: true, rematch: 'idle' },
            'ended-waiting': { view: 'ended', result: 'win', rounds: rounds, canRematch: true, rematch: 'waiting' },
            'ended-peer-rematch': { view: 'ended', result: 'lose', rounds: flip(rounds), canRematch: true, rematch: 'idle', toast: this.TOASTS.rematch },
            'ended-takeover': { view: 'ended', result: 'lose', rounds: flip(long), canRematch: false },
            'ended-long': { view: 'ended', result: 'lose', rounds: worst, canRematch: true, rematch: 'idle' }
        };
    },

    showPreview: function (name) {
        const st = this.previewStates()[name];
        if (!st) return;
        this.view = st.view;
        this.render(st, true);
        if (st.toast) this.status(st.toast);
    },

    onChange: function (m) {
        if (m !== this.match) return;
        if (m.takenOver && this.seenTakeover !== m.takenOver) {
            this.seenTakeover = m.takenOver;
            this.status(this.TOASTS.takeover);
        }
        if (this.view === 'wait' && m.failed) {
            this.fail(m);
        } else if (this.view === 'wait' && m.connected) {
            this.status(this.TOASTS.joined);
            this.startSelect();
        } else if (this.view === 'ended') {
            if (m.failed) {
                this.fail(m);
            } else if (!m.ended) {
                this.startSelect();
            } else {
                if (m.rematchPeer && !m.rematchMine && !this.seenRematch) this.status(this.TOASTS.rematch);
                this.seenRematch = m.rematchPeer;
                this.refresh();
            }
        }
    },

    startSelect: function () {
        this.seenRematch = false;
        this.show('hidden');
        Assets.stopMusic();
        Game.changeScene(CharacterSelectScene, { mode: 'ONLINE', match: this.match });
    },

    returnFromMatch: function (match) {
        Game.changeScene(OnlineStageScene);
        this.attach(match);
        if (match.failed) this.fail(match);
        else this.show('ended');
    },

    fail: function (match) {
        const text = this.TOASTS[match.failed] || '';
        this.dispose();
        this.show('start');
        this.status(text);
    },

    dispose: function () {
        if (this.match) {
            this.match.close();
            this.match = null;
        }
    },

    leave: function () {
        this.dispose();
        Game.changeScene(OnlineStageScene);
        this.show('start');
    }
};

window.OnlineLobby = OnlineLobby;
