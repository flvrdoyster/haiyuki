// 터치용 가상 패드. window keydown/keyup(e.code)에 합성 이벤트를 발사한다.
// 확인 버튼은 KeyZ — Enter는 플레이어 턴 타패를 무시하므로 KeyZ로 통일.
(function () {
    'use strict';

    var KEY_MAP = {
        ArrowUp: { code: 'ArrowUp', keyCode: 38 },
        ArrowDown: { code: 'ArrowDown', keyCode: 40 },
        ArrowLeft: { code: 'ArrowLeft', keyCode: 37 },
        ArrowRight: { code: 'ArrowRight', keyCode: 39 },
        KeyZ: { code: 'KeyZ', keyCode: 90 },     // 확인 / 선택 / 타패
        Escape: { code: 'Escape', keyCode: 27 }  // 메뉴
    };

    function dispatchKey(name, type) {
        var p = KEY_MAP[name];
        if (!p) return;
        // canvas에서 bubble → window까지 도달하도록 canvas를 발사 기점으로 쓴다.
        var target = document.getElementById('game-canvas') || document;
        target.dispatchEvent(new KeyboardEvent(type, {
            key: p.code, code: p.code, keyCode: p.keyCode, which: p.keyCode,
            bubbles: true, cancelable: true
        }));
    }

    function shouldShow() {
        if (new URLSearchParams(location.search).has('gamepad')) return true;
        return ('ontouchstart' in window) && window.innerWidth <= 768;
    }

    function init() {
        var pad = document.getElementById('virtual-gamepad');
        if (!pad) return;

        pad.querySelectorAll('button').forEach(function (b) { b.setAttribute('tabindex', '-1'); });

        // 동시 입력 없음(대각선·코드 미지원) — 게임이 단방향 탐색만 사용하므로.
        var activeKey = null;
        function release() {
            if (!activeKey) return;
            var btn = pad.querySelector('[data-key="' + activeKey + '"]');
            if (btn) btn.classList.remove('active');
            dispatchKey(activeKey, 'keyup');
            activeKey = null;
        }
        function press(key) {
            if (activeKey === key) return;
            if (activeKey) release();
            activeKey = key;
            var btn = pad.querySelector('[data-key="' + key + '"]');
            if (btn) btn.classList.add('active');
            dispatchKey(key, 'keydown');
        }

        pad.addEventListener('touchstart', function (e) {
            var btn = e.target.closest('[data-key]');
            if (!btn) return;
            e.preventDefault();
            press(btn.dataset.key);
        }, { passive: false });
        pad.addEventListener('touchend', function (e) { e.preventDefault(); release(); }, { passive: false });
        pad.addEventListener('touchcancel', function (e) { e.preventDefault(); release(); }, { passive: false });

        pad.addEventListener('mousedown', function (e) {
            var btn = e.target.closest('[data-key]');
            if (!btn) return;
            e.preventDefault();
            press(btn.dataset.key);
        });
        window.addEventListener('mouseup', release);

        if (shouldShow()) document.body.classList.add('gamepad-on');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
