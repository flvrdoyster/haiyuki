// 단일 소스 버전. 릴리스 시 VERSION만 변경. footer.css 모바일 inline 흐름에서 ' · '가 저작권 구분자 역할.
(function () {
    'use strict';

    var VERSION = 'v2.1.2';

    function inject() {
        if (document.querySelector('.site-version')) return true;
        var credits = document.querySelector('#footer .footer-credits');
        if (!credits) return false;

        var sep = document.createElement('span');
        sep.className = 'footer-sep';
        sep.textContent = ' · ';

        var v = document.createElement('span');
        v.className = 'site-version';
        v.textContent = VERSION;

        credits.appendChild(sep);
        credits.appendChild(v);
        return true;
    }

    var tries = 0;
    var timer = setInterval(function () {
        if (inject() || ++tries > 40) clearInterval(timer);
    }, 100);
})();
