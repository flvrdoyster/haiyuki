# haiyuki_web 분리 계획

`ataho/haiyuki_web`을 이 폴더(`haiyuki-re/`)를 뿌리로 하는 별도 저장소 `haiyuki`(`haiyuki.atah.io`)로 옮긴다. gensei-pc98(`pc98.atah.io`)·suiko-web-v2(`suiko.atah.io`)와 같은 방식: 게임은 `docs/`에서 GitHub Pages로 서빙, `docs/CNAME`에 서브도메인.

끝난 상태:
- `haiyuki.atah.io/`에서 게임이 돌고, 역 일람 패널·푸터·버전 표시가 정상.
- `atah.io/haiyuki_web/`은 새 주소로 넘기는 안내 페이지만 남고, ataho 안의 링크는 모두 새 주소를 가리킨다.
- 새 저장소에 `haiyuki_web`의 전체 커밋 이력이 있다(복사가 아니라 `git subtree split`).

## 0. 시작 전 확인

- [캐릭터성 세션]이 `ataho/haiyuki_web/js/data/characterData.js` 등을 고치며 측정 중이면 끝날 때까지 기다린다. 끝나면 그 세션의 미커밋 변경을 `git -C ataho diff haiyuki_web > /tmp/chr.patch`로 받아 두고, 새 저장소에서 `git apply -p2 --directory=docs`로 올린다(경로가 `haiyuki_web/…` → `docs/…`). 그 세션에는 이후 `haiyuki-re/docs/`에서 작업하라고 알린다.
- `ataho`의 작업 트리는 `haiyuki_web/IMPROVE.md` 5줄 수정만 남아 있어야 한다(그 외가 있으면 멈추고 묻는다). 이 5줄은 새 저장소로 같이 간다.
- `ataho/main`은 `origin/main`보다 8 커밋 앞, 1 커밋 뒤다(뒤는 대시보드 크론 커밋 `317869a`). 오늘 커밋 8개 중 `922d853`(네이버 순위 스크립트·SEO.md)만 ataho 것이고 나머지 7개는 전부 `haiyuki_web/`만 건드린다 — `git log --stat 40dbe6c^..HEAD`로 다시 확인.
- 로컬 서버: `:3000`에 아무것도 떠 있지 않아야 한다(`lsof -ti:3000`). `:8000`은 사용자가 보는 용도라 둔다.

## 1. 새 저장소 만들기 (haiyuki-re/)

```bash
cd /Users/oyster/GitHub/ataho
git subtree split -P haiyuki_web -b haiyuki-split      # haiyuki_web/ 이력만 가진 브랜치(루트에 파일)

cd /Users/oyster/GitHub/haiyuki-re
git init -b main
git pull ../ataho haiyuki-split                        # 이력 그대로 들어옴, 파일은 루트에
git mv $(git ls-files | grep -v '^docs/') docs/ 2>/dev/null || true
```
`git mv`는 루트의 모든 추적 파일을 `docs/` 아래로. `sq/`, `assets/`, `README.md`, `.gitignore`, `SPLIT.md`는 아직 추적 전이라 움직이지 않는다. 이동 뒤 `git status`로 `docs/index.html`, `docs/js/…`, `docs/assets/…`, `docs/haiyuki.css`, `docs/CHEAT.md`, `docs/IMPROVE.md`, `docs/RULEBOOK.md`, `docs/STRUCTURE.md`, `docs/thumbnail.png`가 맞는지 본다.

커밋 1 "haiyuki_web을 docs/로" (이동만).
커밋 2 "역분석 자료·README·.gitignore 추가" — `sq/`, `assets/`, `README.md`, `.gitignore`, `SPLIT.md`. `.gitignore`에 `docs/tests/` 추가(ataho `.gitignore`의 `haiyuki_web/tests/`에 해당). `extracted/`는 이미 ignore.

로컬 전용 폴더 복사: `cp -R ataho/haiyuki_web/tests haiyuki-re/docs/tests` (gitignore, Playwright 회귀·perf 보고서. `tests/playwright.config.ts`의 `webServer`는 `npx serve ..`라 그대로 동작).

## 2. 게임 쪽 수정 (docs/)

커밋 3 "haiyuki.atah.io 주소로 맞춤":
- `docs/CNAME` 새로 만들기: 내용 `haiyuki.atah.io`.
- `docs/index.html`
  - `<link rel="canonical" href="https://atah.io/haiyuki_web/">` → `https://haiyuki.atah.io/`
  - `<meta property="og:url" content="https://atah.io/haiyuki_web/">` → `https://haiyuki.atah.io/`
  - ataho 루트를 가리키는 상대 경로 세 줄(이 셋뿐이다. `grep -rn '\.\./' docs/index.html docs/haiyuki.css docs/js`로 다시 확인):
    - 11줄 `<link rel="stylesheet" href="../fonts.css">` → `https://atah.io/fonts.css` (공용 @font-face. gensei-pc98은 자기 `style.css`에 복사해 두었는데, 여기선 링크로 충분하다.)
    - 45줄 `<link rel="stylesheet" href="../footer.css">` → `https://atah.io/footer.css`
    - 136줄 `<script src="../footer.js">` → `https://atah.io/footer.js` (gensei-pc98 `docs/index.html:63`과 같은 방식)
  - 역 일람 iframe `data-src="https://atah.io/haiyuki_manual/index.html#yaku"`는 그대로(해설서는 ataho에 남는다).
  - GTM `GTM-PR4S897C`는 그대로(같은 컨테이너).
- `docs/js/core/version.js`의 `VERSION` 한 단계 올린다.
- `docs/STRUCTURE.md`에서 `haiyuki-re/sq/tools/fxexport.py` 언급은 `../sq/tools/fxexport.py`로. `sq/tools/fxexport.py` 머리의 예시 출력 경로를 `docs/js/data/fxTimelines.js`로.
- `docs/CHEAT.md:10` `http://localhost:3000/haiyuki_web/?debug` → `http://localhost:3000/?debug` (`docs/`에서 serve).

확인: `cd docs && npx serve . -l 3000`으로 띄우고 Playwright 회귀(`cd docs/tests && npx playwright test battle.spec.ts battle-extended.spec.ts flow.spec.ts input.spec.ts scene-input.spec.ts mouse.spec.ts visual.spec.ts`)가 통과하는지. 끝나면 `:3000` 서버를 내린다.

## 3. GitHub·DNS

- GitHub에 `flvrdoyster/haiyuki` 저장소를 만들고 `git remote add origin …`, `git push -u origin main`. Pages 설정: branch `main`, folder `/docs`, custom domain `haiyuki.atah.io`, HTTPS 강제.
- DNS(사용자 직접): `haiyuki` CNAME → `flvrdoyster.github.io`. pc98·suiko와 같은 레코드.
- 전파 뒤 `https://haiyuki.atah.io/`에서 게임·역 일람·푸터·버전을 확인.

## 4. ataho 쪽 정리

오늘의 `haiyuki_web` 커밋 7개를 ataho 역사에서 뺀다(미푸시라 가능). 대화형 rebase는 못 쓰니:
```bash
cd /Users/oyster/GitHub/ataho
git branch backup-before-split            # 안전판
git reset --hard origin/main              # 317869a (대시보드 크론)로
git cherry-pick 922d853                   # 네이버 순위 스크립트·SEO.md만 되살림
```
이 시점에 `haiyuki_web/`은 어제 상태로 돌아온다(오늘 작업은 새 저장소에 있다).

커밋 "haiyuki_web을 haiyuki.atah.io로 분리":
- `haiyuki_web/` 안 파일을 전부 지우고 `haiyuki_web/index.html` 하나만 남긴다: `<meta http-equiv="refresh" content="0; url=https://haiyuki.atah.io/">`, `<link rel="canonical" href="https://haiyuki.atah.io/">`, 본문에 새 주소 링크 한 줄. GitHub Pages는 301을 못 하므로 이 방식.
- 유입 링크를 새 주소로:
  - `index.html:77` `href="haiyuki_web/"` → `https://haiyuki.atah.io/`
  - `world/maps/cave/triggers.js:86` `"haiyuki_web/index.html"` → `"https://haiyuki.atah.io/"`
  - `haiyuki_manual/index.html:110,130,196` `https://atah.io/haiyuki_web` → `https://haiyuki.atah.io/`
  - `haiyuki_manual/yaku-tester.html:190-192` `../haiyuki_web/js/…` → `https://haiyuki.atah.io/js/…` (세 파일: `data/paiData.js`, `data/battleConfig.js`, `logic/yakuLogic.js`. 다른 출처 스크립트 태그는 CORS 무관). 189줄 주석의 `haiyuki_web`도 고친다.
  - `sitemap.xml:4` `https://atah.io/haiyuki_web/` 항목 삭제(새 저장소 `docs/sitemap.xml`에 `https://haiyuki.atah.io/` 하나짜리를 두고 나중에 서치콘솔에 제출).
  - `.gitignore:7` `haiyuki_web/tests/` 삭제.
  - `NOTES.md`에 `haiyuki_web` 언급 5곳: 경로 설명을 "별도 저장소 `haiyuki`(`haiyuki.atah.io`)"로 고친다. `haiyuki_manual/manual.css:201` 주석의 `haiyuki_web`은 "haiyuki 역 일람 패널"로.
  - `scripts/ga4_dashboard.py:69` `("/haiyuki_web", "환세패유기 (웹)")`는 지난 데이터 분류용이라 남기고, 새 호스트 `haiyuki.atah.io`가 pc98·suiko처럼 호스트별로 잡히는지(`split_hosts`, `GAME_NAMES`) 본다. `GAME_NAMES`에 `"haiyuki": "환세패유기"`를 넣어야 하면 넣는다. `dashboard/` 데이터 파일은 크론이 만드니 손대지 않는다.
- `SEO.md`에 "패유기 웹이 `haiyuki.atah.io`로 분리됨, `atah.io/haiyuki_web/`은 안내 페이지"를 한 줄 적는다(날짜·수치는 적지 않는다).

그 뒤 `git push origin main`(사용자가 평소 직접 푸시하므로 푸시 여부는 묻는다).

## 5. 뒤처리

- 메모리: `project_haiyuki_re_and_split.md`를 "분리 완료, 새 저장소 `~/GitHub/haiyuki-re` = `flvrdoyster/haiyuki`, 게임은 `docs/`"로 갱신. `reference_atah_site_map.md`의 `haiyuki_web/js/core/version.js` 경로를 `haiyuki-re/docs/js/core/version.js`로.
- SEO 링크 실험 기록(메모리 `project_seo_link_experiment.md`)에 분리 날짜를 적는다 — 패유기 링크가 내부→외부로 바뀐 날이라 이후 측정 해석에 필요.
- 서치콘솔: `haiyuki.atah.io`는 도메인 속성 `atah.io`에 포함되니 새 속성은 필요 없고 사이트맵만 제출(사용자).
- `backup-before-split` 브랜치와 `haiyuki-split` 브랜치는 새 저장소 푸시·ataho 푸시가 끝난 뒤 지운다.

## 하지 않는 것

- `haiyuki_manual/`은 ataho에 남긴다(해설서는 사이트 콘텐츠).
- 원본 추출본·Ghidra·덤프(`extracted/`)는 저장소에 넣지 않는다.
- 게임 코드 수정은 주소·푸터·버전뿐. 규칙·AI·효과음 작업은 분리 뒤 새 저장소에서.
