// 패유기 버전 (단일 소스). 릴리스 시 이 VERSION 값만 변경한다.
// 공유 footer.js가 비동기로 그리는 #footer .footer-credits 끝에 ' · vX.Y.Z'를 잇는다.
// 버전 구분자는 desktop-only가 아님 — 모바일에선 다른 크레딧이 숨겨져 버전만 남는데,
// footer.css가 모바일에서 푸터 줄을 inline으로 흘려 저작권과 같은 줄에 붙이므로
// 이 ' · '가 저작권/버전 구분자 역할을 한다.
// (에뮬레이터 페이지(gensei-pc98 docs/version.js)와 동일 패턴.)
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

    // footer.js가 비동기로 푸터를 그리므로 잠깐 재시도한다.
    var tries = 0;
    var timer = setInterval(function () {
        if (inject() || ++tries > 40) clearInterval(timer);
    }, 100);
})();
