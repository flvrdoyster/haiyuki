// 패유기 버전 (단일 소스). 릴리스 시 이 VERSION 값만 변경한다.
// 공유 footer.js가 비동기로 그리는 #footer .footer-credits 끝에 ' · vX.Y.Z'를 잇는다.
// 구분자는 desktop-only — 모바일에선 다른 크레딧이 숨겨져 separator가 붕 뜨므로.
// (에뮬레이터 페이지(gensei-pc98 docs/version.js)와 동일 패턴.)
(function () {
    'use strict';

    var VERSION = 'v2.0.0';

    function inject() {
        if (document.querySelector('.site-version')) return true;
        var credits = document.querySelector('#footer .footer-credits');
        if (!credits) return false;

        var sep = document.createElement('span');
        sep.className = 'footer-sep desktop-only';
        sep.textContent = ' · ';

        var v = document.createElement('span');
        v.className = 'site-version';
        v.textContent = VERSION;

        credits.appendChild(sep);
        credits.appendChild(v);
        return true;
    }

    // footer.js가 비동기로 푸터를 그리므로 잠깐 재시도한다.
    var tries = 0;
    var timer = setInterval(function () {
        if (inject() || ++tries > 40) clearInterval(timer);
    }, 100);
})();
