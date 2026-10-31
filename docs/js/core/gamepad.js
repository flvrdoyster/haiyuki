(function () {
    'use strict';

    var KEY_MAP = {
        ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
        ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
        ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
        ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
        KeyZ: { key: 'z', code: 'KeyZ', keyCode: 90 },
        Escape: { key: 'Escape', code: 'Escape', keyCode: 27 }
    };

    var canvas = null;
    var active = false;

    function dispatchKey(name, type) {
        var p = KEY_MAP[name];
        if (!p) return;
        var target = canvas || document;
        target.dispatchEvent(new KeyboardEvent(type, {
            key: p.key, code: p.code, keyCode: p.keyCode, which: p.keyCode,
            bubbles: true, cancelable: true
        }));
    }

    function activate() {
        if (active) return;
        active = true;
        document.body.classList.add('gamepad-on');
        (window.dataLayer = window.dataLayer || []).push({ event: 'gamepad_activate', game: 'haiyuki' });
    }

    function updateUrl() {
        var params = new URLSearchParams(location.search);
        params.delete('gamepad');
        var rest = params.toString().replace(/=(?=&|$)/g, '');
        history.replaceState(null, '', location.pathname + (rest ? '?gamepad&' + rest : '?gamepad') + location.hash);
    }

    function shouldAutoActivate() {
        if (new URLSearchParams(location.search).has('gamepad')) return true;
        return ('ontouchstart' in window) && window.innerWidth <= 680;
    }

    function init() {
        canvas = document.getElementById('game-canvas');

        var pad = document.getElementById('virtual-gamepad');
        if (!pad) return;

        pad.querySelectorAll('button').forEach(function (b) { b.setAttribute('tabindex', '-1'); });

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
            e.preventDefault();
            var btn = e.target.closest('[data-key]');
            if (!btn) return;
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

        if (shouldAutoActivate()) activate();

        var toggleBtn = document.getElementById('gamepad-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function () {
                activate();
                updateUrl();
                toggleBtn.blur();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
