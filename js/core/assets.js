const Assets = {
    images: {},
    audio: {},          // BGM: { [id]: HTMLAudioElement }
    sfxBuffers: {},     // SFX: { [id]: AudioBuffer }
    currentMusic: null,
    muted: false,

    audioContext: null,
    _audioUnlocked: false,
    _sfxGainNode: null,
    _resumeWired: false,

    _getAudioContext: function () {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // iOS는 화면 잠금/앱 전환 시 컨텍스트를 suspended/interrupted로 만들고 자동 복귀하지 않음 — 화면이 보일 때 재개.
            this.audioContext.onstatechange = () => {
                const st = this.audioContext.state;
                const visible = (typeof document === 'undefined') || document.visibilityState === 'visible';
                if (visible && (st === 'suspended' || st === 'interrupted')) {
                    this.audioContext.resume().catch(() => { });
                }
            };
        }
        return this.audioContext;
    },

    _getSfxGain: function () {
        if (!this._sfxGainNode) {
            const ctx = this._getAudioContext();
            this._sfxGainNode = ctx.createGain();
            this._sfxGainNode.gain.value = 0.5;
            this._sfxGainNode.connect(ctx.destination);
        }
        return this._sfxGainNode;
    },

    _unlockAudio: function () {
        if (this._audioUnlocked) return;
        this._audioUnlocked = true;
        const ctx = this._getAudioContext();
        if (ctx.state !== 'running') ctx.resume();
        // iOS: 사용자 제스처 안에서 play()를 호출해야 나중에 프로그래밍으로 재생 가능.
        // 모든 BGM 요소를 muted 상태로 play→pause하여 잠금 해제만 수행. 실제 음성은 playMusic()에서만 출력.
        Object.values(this.audio).forEach(el => {
            if (el === this.currentMusic) return;
            el.muted = true;
            const p = el.play();
            // play()는 비동기로 해결되므로, 그 사이에 playMusic()이 이 요소를 BGM으로 지정했을 수 있음 — 현재 재생 중인 트랙을 pause하지 않도록 보호.
            if (p && p.then) {
                p.then(() => { if (el !== this.currentMusic) { el.pause(); el.currentTime = 0; } }).catch(() => { });
            } else if (el !== this.currentMusic) {
                try { el.pause(); } catch (_) { }
            }
        });
    },

    // iOS: 백그라운드 복귀 시 AudioContext와 BGM 요소가 일시정지 상태로 남음 — 둘 다 재개.
    _resumeAudioOnReturn: function () {
        if (!this._audioUnlocked) return;
        const ctx = this.audioContext;
        if (ctx && ctx.state !== 'running') ctx.resume().catch(() => { });
        const bgm = this.currentMusic;
        if (bgm && !this.muted && bgm.paused) bgm.play().catch(() => { });
    },

    // 백그라운드 복귀 핸들러를 한 번만 등록(멱등).
    _wireResumeHandlers: function () {
        if (this._resumeWired) return;
        this._resumeWired = true;
        const resume = () => this._resumeAudioOnReturn();
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') resume();
        });
        window.addEventListener('focus', resume);
        window.addEventListener('pageshow', resume); // bfcache 복원 (iOS Safari)
        // 사용자 제스처에도 연결 — iOS가 자동재생을 거부한 BGM을 다음 탭/키에서 복구하기 위해 once 없이 유지.
        window.addEventListener('pointerdown', resume, { passive: true });
        window.addEventListener('touchstart', resume, { passive: true });
        window.addEventListener('keydown', resume);
    },

    toLoad: [
        'ui/title.png',
        'ui/pushok.png',
        'ui/logo_compile.png',
        'ui/logo_compile_1998.png',

        // 타이틀 로고 — 레이어드 조합
        'title/BACK.png',
        'title/LINE_NARUTO.png',
        'title/LOGO_REST.png',
        'title/LOGO_PAI_TOP.png',
        'title/LOGO_PAI_BOTTOM.png', // 빨간색, 스트레치 리빌용
        'title/PAI.png',

        // 오디오
        { id: 'audio/draw', src: 'assets/audio/draw.mp3', type: 'audio' },
        { id: 'audio/discard', src: 'assets/audio/discard.mp3', type: 'audio' },
        { id: 'audio/bgm_title', src: 'assets/audio/bgm_title.mp3', type: 'audio' },
        { id: 'audio/bgm_chrsel', src: 'assets/audio/bgm_chrsel.mp3', type: 'audio' },
        { id: 'audio/bgm_trail', src: 'assets/audio/bgm_trail.mp3', type: 'audio' },
        { id: 'audio/bgm_basic', src: 'assets/audio/bgm_basic.mp3', type: 'audio' },
        { id: 'audio/bgm_tension', src: 'assets/audio/bgm_tension.mp3', type: 'audio' },
        { id: 'audio/bgm_showdown', src: 'assets/audio/bgm_showdown.mp3', type: 'audio' },
        { id: 'audio/bgm_win', src: 'assets/audio/victory.mp3', type: 'audio' },
        { id: 'audio/bgm_lose', src: 'assets/audio/lose.mp3', type: 'audio' },
        { id: 'audio/lose', src: 'assets/audio/lose.mp3', type: 'audio' },
        { id: 'audio/bgm_inn', src: 'assets/audio/bgm_inn.mp3', type: 'audio' },
        { id: 'audio/recovery', src: 'assets/audio/recovery.mp3', type: 'audio' },
        { id: 'audio/barrier', src: 'assets/audio/barrier.mp3', type: 'audio' },
        { id: 'audio/buff', src: 'assets/audio/buff.mp3', type: 'audio' },
        { id: 'audio/bgm_ending', src: 'assets/audio/bgm_ending.mp3', type: 'audio' },
        { id: 'audio/pon', src: 'assets/audio/pon.mp3', type: 'audio' },
        { id: 'audio/riichi', src: 'assets/audio/riichi.mp3', type: 'audio' },
        { id: 'audio/fanfare', src: 'assets/audio/fanfare.mp3', type: 'audio' },
        { id: 'audio/gong', src: 'assets/audio/gong.mp3', type: 'audio' },
        { id: 'audio/victory', src: 'assets/audio/victory.mp3', type: 'audio' },
        { id: 'audio/hit-1', src: 'assets/audio/hit-1.mp3', type: 'audio' },
        { id: 'audio/hit-2', src: 'assets/audio/hit-2.mp3', type: 'audio' },
        { id: 'audio/hit-3', src: 'assets/audio/hit-3.mp3', type: 'audio' },
        { id: 'audio/impact-1', src: 'assets/audio/hit-1.mp3', type: 'audio' },
        { id: 'audio/impact-2', src: 'assets/audio/hit-2.mp3', type: 'audio' },
        { id: 'audio/impact-3', src: 'assets/audio/hit-3.mp3', type: 'audio' },
        { id: 'audio/hit-4', src: 'assets/audio/hit-4.mp3', type: 'audio' },
        { id: 'audio/slash', src: 'assets/audio/hit-4.mp3', type: 'audio' },
        { id: 'audio/wrong', src: 'assets/audio/wrong.mp3', type: 'audio' },
        { id: 'audio/roar', src: 'assets/audio/roar.mp3', type: 'audio' },
        { id: 'audio/quake', src: 'assets/audio/quake.mp3', type: 'audio' },
        { id: 'audio/skill_activate', src: 'assets/audio/whoosh.mp3', type: 'audio' },

        { id: 'audio/deal', src: 'assets/audio/draw.mp3', type: 'audio' }, // draw.mp3 별칭
        { id: 'audio/flip', src: 'assets/audio/flip.mp3', type: 'audio' },
        { id: 'audio/tick', src: 'assets/audio/tick.mp3', type: 'audio' },

        'bg/CHRBAK.png',
        'bg/MAYUBAK.png', // 마유 난입 모놀로그 배경
        'bg/OVERBAK.png',
        'bg/STAFFBAK.png', // 스탭롤 배경 (幻世牌遊記 워터마크)
        'bg/GAMEBG.png',

        { id: 'fx/pon', src: 'assets/fx/pon.png', type: 'image' },
        { id: 'fx/ron', src: 'assets/fx/ron.png', type: 'image' },
        { id: 'fx/riichi', src: 'assets/fx/riichi.png', type: 'image' },
        { id: 'fx/tsumo', src: 'assets/fx/tsumo.png', type: 'image' },
        { id: 'fx/nagari', src: 'assets/fx/nagari.png', type: 'image' },
        { id: 'fx/tenpai', src: 'assets/fx/tenpai.png', type: 'image' },
        { id: 'fx/noten', src: 'assets/fx/noten.png', type: 'image' },

        'bg/00.png', 'bg/01.png', 'bg/02.png', 'bg/03.png',
        'bg/04.png', 'bg/05.png', 'bg/06.png', 'bg/07.png',
        'bg/08.png', 'bg/09.png', 'bg/10.png', 'bg/11.png',

        'ui/vs.png',
        'ui/long_bubble.png',
        'ui/long_bubble_tail.png',
        'ui/short_bubble.png',
        'ui/battle_menu.png',
        'face/select_cursor.png',

        'face/select_ATA.png', 'face/select_RIN.png', 'face/select_FARI.png',
        'face/select_SMSH.png', 'face/select_PET.png', 'face/select_YURI.png',
        'face/select_MAYU.png',

        'ui/frame/corner-lefttop.png', 'ui/frame/corner-righttop.png',
        'ui/frame/corner-leftbottom.png', 'ui/frame/corner-rightbottom.png',
        'ui/frame/line-top.png', 'ui/frame/line-bottom.png',
        'ui/frame/line-left.png', 'ui/frame/line-right.png',

        'ui/number_big.png',

        // 대화 포트레이트
        'face/ATA_base.png',
        'face/ATA_blink-1.png', 'face/ATA_blink-2.png',
        'face/ATA_shocked.png', 'face/ATA_smile.png',

        'face/RIN_base.png',
        'face/RIN_blink-1.png', 'face/RIN_blink-2.png',
        'face/RIN_shocked.png', 'face/RIN_smile.png',
        'face/RIN_talk-1.png', 'face/RIN_talk-2.png',

        'face/FARI_base.png',
        'face/FARI_blink-1.png', 'face/FARI_blink-2.png',
        'face/FARI_shocked.png', 'face/FARI_smile.png',
        'face/FARI_talk-1.png', 'face/FARI_talk-2.png',

        'face/SMSH.png', 'face/SMSH_base.png', 'face/SMSH_idle.png',
        'face/SMSH_blink-1.png', 'face/SMSH_blink-2.png',
        'face/SMSH_shocked.png', 'face/SMSH_smile.png',
        'face/SMSH_talk-1.png', 'face/SMSH_talk-2.png',

        'face/PET_base.png',
        // 'face/PET_blink-1.png', 'face/PET_blink-2.png', // PET 블링크 프레임 없음
        'face/PET_shocked.png', 'face/PET_smile.png',
        'face/PET_talk-1.png', 'face/PET_talk-2.png',

        'face/YURI_base.png',
        'face/YURI_blink-1.png', 'face/YURI_blink-2.png',
        'face/YURI_shocked.png', 'face/YURI_smile.png',
        'face/YURI_talk-1.png', 'face/YURI_talk-2.png',

        'face/MAYU_base.png',
        'face/MAYU_blink-1.png', 'face/MAYU_blink-2.png',
        'face/MAYU_shocked.png', 'face/MAYU_smile.png',
        'face/MAYU_unknown.png', 'face/MAYU_unknown_smile.png',

        'tiles/pai_ata.png', 'tiles/pai_rin.png', 'tiles/pai_smsh.png',
        'tiles/pai_pet.png', 'tiles/pai_fari.png', 'tiles/pai_yuri.png',
        'tiles/pai_punch.png', 'tiles/pai_wand.png', 'tiles/pai_sword.png',
        'tiles/pai_red.png', 'tiles/pai_blue.png', 'tiles/pai_yellow.png', 'tiles/pai_purple.png',

        'tiles/back-top.png', 'tiles/back-bottom.png', 'tiles/pai_back.png',
        'tiles/side-top.png', 'tiles/side-top-back.png', 'tiles/side-bottom.png',
        'tiles/pai_uradora.png', // 우라도라

        'ui/number.png',
        'ui/number_yellow.png',
        'ui/turn.png',
        'ui/round.png',
        'ui/dora.png',
        'ui/riichi.png',
        'ui/bar_blue.png',
        'ui/bar_yellow.png',
        'ui/alphabet.png',
        'ui/pointer.png',

        'ending/ending_ATA.png', 'ending/ending_FARI.png', 'ending/ending_MAYU.png',
        'ending/ending_RIN.png', 'ending/ending_SMSH.png', 'ending/ending_YURI.png',
        'ending/theend.png',
        'ending/staff.png' // 스탭롤 이미지 폰트 아틀라스 (16×8, 셀 40×64)
    ],
    loadedCount: 0,

    load: function (onComplete) {
        if (window.location.protocol === 'file:') {
            console.warn('[Assets] file:// 환경에서는 SFX(XHR + Web Audio) 로드가 차단되어 효과음이 재생되지 않습니다. 로컬 서버(npx serve 등)로 열어주세요.');
        }

        if (this.toLoad.length === 0) {
            onComplete();
            return;
        }

        const unlock = () => this._unlockAudio();
        window.addEventListener('touchstart', unlock, { once: true, passive: true });
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });

        this._wireResumeHandlers();

        // 각 항목은 성공/실패 어느 쪽이든 정확히 한 번 settled. 이중 settled를 방지하여
        // 카운트가 total을 초과해 onComplete를 건너뛰는 버그를 막음.
        const total = this.toLoad.length;
        this.loadedCount = 0;
        let settled = 0;
        let completed = false;
        const finishOne = () => {
            settled++;
            this.loadedCount = settled;
            if (!completed && settled >= total) { completed = true; onComplete(); }
        };

        this.toLoad.forEach(item => {
            let itemSettled = false;
            const done = () => { if (itemSettled) return; itemSettled = true; finishOne(); };

            let src = '';
            let id = '';
            let type = 'image';

            if (typeof item === 'string') {
                src = `assets/${item}`;
                id = item;
            } else {
                src = item.src;
                id = item.id;
                if (item.type) type = item.type;
            }

            if (type === 'audio') {
                if (id.includes('bgm')) {
                    // BGM: HTMLAudioElement(스트리밍)
                    const audio = new Audio();
                    audio.addEventListener('canplaythrough', () => {
                        if (!this.audio[id]) {
                            this.audio[id] = audio;
                            done();
                        }
                    }, { once: true });
                    audio.addEventListener('error', () => {
                        console.error(`Failed to load BGM: ${src}`);
                        done();
                    });
                    audio.src = src;
                    audio.load();
                } else {
                    // SFX: Web Audio API — 한 번 디코딩 후 지연 없이 재생
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', src, true);
                    xhr.responseType = 'arraybuffer';
                    xhr.onload = () => {
                        if (xhr.status === 200 || xhr.status === 0) {
                            this._getAudioContext().decodeAudioData(
                                xhr.response,
                                (audioBuffer) => { this.sfxBuffers[id] = audioBuffer; done(); },
                                (e) => { console.error(`Failed to decode SFX: ${src}`, e); done(); }
                            );
                        } else {
                            console.error(`Failed to fetch SFX (${xhr.status}): ${src}`);
                            done();
                        }
                    };
                    xhr.onerror = () => { console.error(`Network error for SFX: ${src}`); done(); };
                    xhr.send();
                }
            } else {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    this.images[id] = img;
                    done();
                };
                img.onerror = () => {
                    console.error(`Failed to load: ${src}`);
                    done();
                };
            }
        });
    },

    get: function (id) {
        return this.images[id];
    },

    getAudio: function (id) {
        return this.audio[id];
    },

    currentBgmId: null,
    currentBgmLoop: false,

    playSound: function (id) {
        if (this.muted) return;
        const buffer = this.sfxBuffers[id];
        if (!buffer) {
            console.warn(`SFX not found: ${id}`);
            return;
        }
        const ctx = this._getAudioContext();
        const play = () => {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(this._getSfxGain());
            source.start(0);
        };
        if (ctx.state === 'running') {
            play();
        } else {
            ctx.resume().then(play);
        }
    },

    playMusic: function (id, loop = true) {
        // 동일 트랙이 재생 중이면 no-op — LoadingScene에서 시작한 BGM을 다음 장면이 재시작하지 않게 함.
        if (this.currentBgmId === id && !this.muted &&
            this.currentMusic && !this.currentMusic.paused) {
            this.currentBgmLoop = loop;
            return;
        }
        this.stopMusic();
        this.currentBgmId = id;
        this.currentBgmLoop = loop;

        if (this.muted) return;

        const audio = this.audio[id];
        if (!audio) {
            console.warn(`BGM not found: ${id}`);
            return;
        }

        audio.pause();
        audio.currentTime = 0;
        audio.loop = loop;
        audio.volume = 0.5;
        audio.muted = false; // _unlockAudio에서 muted된 상태 해제
        this.currentMusic = audio;

        // 즉시 재생 시도하고 컨텍스트 재개를 병렬로 수행. iOS가 거부하면 _wireResumeHandlers의 제스처 핸들러가 재시도.
        const ctx = this._getAudioContext();
        if (ctx.state !== 'running') ctx.resume().catch(() => { });
        const retry = () => {
            if (this.currentBgmId === id && this.currentMusic === audio && audio.paused) {
                ctx.resume().then(() => audio.play().catch(() => { })).catch(() => { });
            }
        };
        const p = audio.play();
        if (p && p.catch) p.catch(retry);
    },

    toggleMute: function () {
        return this.setMute(!this.muted);
    },

    setMute: function (muted) {
        this.muted = muted;

        if (this.muted) {
            if (this.currentMusic) {
                this.currentMusic.pause();
                this.currentMusic.currentTime = 0;
                this.currentMusic = null;
            }
            if (this._sfxGainNode) this._sfxGainNode.gain.value = 0;
        } else {
            if (this._sfxGainNode) this._sfxGainNode.gain.value = 0.5;
            if (this.currentBgmId) {
                this.playMusic(this.currentBgmId, this.currentBgmLoop);
            }
        }
        return this.muted;
    },

    stopMusic: function () {
        this.currentBgmId = null;
        this.currentBgmLoop = false;

        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    },

    stopAll: function () {
        this.stopMusic();
        // SFX BufferSourceNode는 fire-and-forget이라 참조 없음
    },

    drawFrame: function (ctx, filename, x, y, frameIndex, frameWidth, frameHeight) {
        const img = this.get(filename);
        if (!img) return;

        if (!frameWidth || !frameHeight) {
            ctx.drawImage(img, x, y);
            return;
        }

        const sx = frameIndex * frameWidth;
        const sy = 0; // 수평 스트립 가정

        if (sx >= img.width) return;

        ctx.drawImage(img, sx, sy, frameWidth, frameHeight, x, y, frameWidth, frameHeight);
    },

    drawAlphabet: function (ctx, text, x, y, options = {}) {
        const img = this.get('ui/alphabet.png');
        if (!img) return;

        let color = options.color || 'orange';
        if (typeof options === 'string') color = options;

        const scale = options.scale || 1.0;
        const frameWidth = 32;
        const frameHeight = 32;

        const baseSpacing = options.spacing !== undefined ? options.spacing : 32;
        const spacing = baseSpacing * scale;

        // 공백 폭 기본값: 글자 폭의 절반(16)
        const baseSpaceWidth = options.spaceWidth !== undefined ? options.spaceWidth : 16;
        const spaceWidth = baseSpaceWidth * scale;
        const align = options.align || 'left';

        const destW = frameWidth * scale;
        const destH = frameHeight * scale;

        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ?.,!";

        let totalWidth = 0;
        text = text.toUpperCase();

        // 글자별 어드밴스(소스는 32px 그리드). A-Z는 spacing 기본값 사용.
        const charWidths = {
            '.': 12,
            ',': 12,
            '!': 12,
            '?': 32
        };

        const getAdvance = (char) => {
            if (char === ' ') return spaceWidth;
            if (charWidths[char] !== undefined) return charWidths[char] * scale;
            return spacing;
        };

        for (let i = 0; i < text.length; i++) {
            totalWidth += getAdvance(text[i]);
        }

        let currentX = x;
        if (align === 'center') currentX -= totalWidth / 2;
        else if (align === 'right') currentX -= totalWidth;

        // 아틀라스 row: 0=orange, 1=yellow
        const row = (color === 'yellow') ? 1 : 0;
        const sy = row * frameHeight;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const advance = getAdvance(char);

            if (char === ' ') {
                currentX += advance;
                continue;
            }

            const index = chars.indexOf(char);
            if (index !== -1) {
                const sx = index * frameWidth;
                ctx.drawImage(img, sx, sy, frameWidth, frameHeight, currentX, y, destW, destH);
            }

            currentX += advance;
        }
    },

    // ending/staff.png: 크레딧 전용 이미지 폰트. 16열×8행, 셀 40×64. 한자·가나·라틴·한국어 포함.
    STAFF_FONT_ROWS: [
        '幻世牌遊記STAFプランナーログ',
        'マデザイサウド&エフェクトEX.',
        'ュ南千晶さかや☆えびふらい八斎藤',
        '桜河内揚羽ごん太のぞみどりゅう3',
        '24不凡MO仁井谷ぶたっセニョル',
        '北CPIL198ィレタスペシャ',
        '환세패유기플래너디자이프로그머사',
        '운드펙트스페셜땡렉터듀서팬맛굴'
    ],
    _staffFontMap: null,

    _buildStaffFontMap: function () {
        const map = {};
        this.STAFF_FONT_ROWS.forEach((rowStr, row) => {
            Array.from(rowStr).forEach((ch, col) => {
                if (map[ch] === undefined) map[ch] = { col: col, row: row };
            });
        });
        // 공백 = 아틀라스 맨 오른쪽 끝 빈 셀
        map[' '] = { col: 15, row: 7 };
        this._staffFontMap = map;
        return map;
    },

    drawStaffGlyph: function (ctx, ch, x, y, scale) {
        const img = this.get('ending/staff.png');
        if (!img) return;
        const map = this._staffFontMap || this._buildStaffFontMap();
        const cell = map[ch];
        if (!cell) return;
        const W = 40, H = 64;
        ctx.drawImage(img, cell.col * W, cell.row * H, W, H, x, y, W * scale, H * scale);
    },

    drawNumberBig: function (ctx, number, x, y, options = {}) {
        const imgId = options.imgId || 'ui/number_big.png';
        const img = this.get(imgId);
        if (!img) return;

        // 0–9, 10등분
        const frameWidth = img.width / 10;
        const frameHeight = img.height;
        const spacing = options.spacing || 2;
        const align = options.align || 'center';
        const scale = options.scale || 1.0;

        if (number === undefined || number === null) number = 0;
        const str = number.toString();

        const dw = frameWidth * scale;
        const dh = frameHeight * scale;
        const scaledSpacing = spacing * scale;

        let totalW = (str.length * dw) + ((str.length - 1) * scaledSpacing);

        let startX = x;
        if (align === 'center') {
            startX = x - totalW / 2;
        } else if (align === 'right') {
            startX = x - totalW;
        }

        let currentX = startX;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const val = parseInt(char);

            if (!isNaN(val)) {
                const sx = val * frameWidth;
                ctx.drawImage(img, sx, 0, frameWidth, frameHeight, currentX, y, dw, dh);
            }

            currentX += dw + scaledSpacing;
        }
    },

    drawUIFrame: function (ctx, x, y, w, h) {
        const tl = this.get('ui/frame/corner-lefttop.png');
        const tr = this.get('ui/frame/corner-righttop.png');
        const bl = this.get('ui/frame/corner-leftbottom.png');
        const br = this.get('ui/frame/corner-rightbottom.png');

        const top = this.get('ui/frame/line-top.png');
        const bottom = this.get('ui/frame/line-bottom.png');
        const left = this.get('ui/frame/line-left.png');
        const right = this.get('ui/frame/line-right.png');

        if (!tl || !tr || !bl || !br || !top || !bottom || !left || !right) {
            return;
        }

        ctx.drawImage(tl, x, y);
        ctx.drawImage(tr, x + w - tr.width, y);
        ctx.drawImage(bl, x, y + h - bl.height);
        ctx.drawImage(br, x + w - br.width, y + h - br.height);

        const innerX = x + tl.width;
        const innerW = w - tl.width - tr.width;
        if (innerW > 0) {
            this.drawTiled(ctx, top, innerX, y, innerW, top.height, 'horizontal');
            this.drawTiled(ctx, bottom, innerX, y + h - bottom.height, innerW, bottom.height, 'horizontal');
        }

        const innerY = y + tl.height;
        const innerH = h - tl.height - bl.height;

        if (innerH > 0) {
            this.drawTiled(ctx, left, x, innerY, left.width, innerH, 'vertical');
            this.drawTiled(ctx, right, x + w - right.width, innerY, right.width, innerH, 'vertical');
        }
    },

    getPattern: function (ctx, img, repetition = 'repeat') {
        if (!img._patterns) img._patterns = {};
        if (!img._patterns[repetition]) {
            img._patterns[repetition] = ctx.createPattern(img, repetition);
        }
        return img._patterns[repetition];
    },

    drawTiled: function (ctx, img, x, y, fillW, fillH, direction) {
        ctx.save();
        ctx.translate(x, y);
        // fillRect가 영역을 제한하므로 'repeat'으로 충분
        const ptrn = this.getPattern(ctx, img, 'repeat');
        ctx.fillStyle = ptrn;
        ctx.fillRect(0, 0, fillW, fillH);
        ctx.restore();
    },
    drawWindow: function (ctx, x, y, w, h) {
        ctx.save();
        this.drawUIFrame(ctx, x, y, w, h);

        const border = 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x + border, y + border, w - (border * 2), h - (border * 2));
        ctx.restore();
    },

    drawButton: function (ctx, x, y, w, h, label, isSelected, options = {}) {
        ctx.save();

        if (!options.noBorder) {
            this.drawUIFrame(ctx, x, y, w, h);

            // 프레임 에셋 미로드 시 폴백 테두리
            if (!this.get('ui/frame/corner-lefttop.png')) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
                ctx.strokeRect(x, y, w, h);
            }
        }

        if (isSelected) {
            ctx.fillStyle = options.cursorColor || 'rgba(255, 105, 180, 0.5)';
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        }

        ctx.fillStyle = isSelected ? 'rgba(255, 255, 0, 1)' : 'rgba(255, 255, 255, 1)';
        const fontName = (typeof FONTS !== 'undefined') ? FONTS.bold : 'sans-serif';
        ctx.font = options.font || `bold 16px ${fontName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2);

        ctx.restore();
    }
};
