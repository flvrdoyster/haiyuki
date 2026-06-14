// On-screen virtual gamepad for touch devices.
// Dispatches synthetic KeyboardEvents that the game's Input (window keydown/keyup,
// keyed by e.code) already understands — no game-logic changes needed.
//
// Mapping: D-pad → arrows; 확인 → KeyZ (works for confirm/select AND tile discard,
// unlike Enter which the player-turn discard ignores); 메뉴 → Escape (menu toggle).
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
        // The game listens on window; bubbling from the canvas reaches it.
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

        // One key held at a time (no diagonals/chords) — matches the game's
        // single-direction navigation.
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

        // Mouse support (desktop, e.g. ?gamepad for testing)
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
