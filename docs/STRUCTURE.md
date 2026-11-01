# 코드 구조

- `index.html`의 `<script>` 순서가 곧 의존성. `core/timers.js`는 `battleEngine.js` 앞(파싱 시점 호출), `views/battleLayout.js`·`fxSystem.js`·`bitmapFont.js`·`uiDraw.js`는 각 사용자 앞, `core/game.js`는 마지막.
- ESM 전환 불가 — 테스트가 `(0, eval)('Game')`로 스크립트 스코프 전역을 98곳에서 잡는다.
- `BattleEngine`의 상태 필드를 옮기지 말 것 — 테스트가 `e.p1`/`e.deck`/`e.currentState` 등을 199곳에서 직접 읽는다. 함수 이동은 안전.
- `autoPlay.js`의 `decideDiscard(hand, 0.7, null, ctx)` — `tests/_ai_fingerprint`가 이 값을 중립 베이스라인으로 쓴다.
- `battleSequencer`가 `engine.scene.fx.list`를 직접 읽는다.
- 매니페스트(`assets.js` `toLoad`)에 없는 id로 `playSound`를 부르면 조용히 무음. 테스트 헬퍼 `getMissingSfx()`로 잡는다.
- `Assets.load`는 `window.onload` 뒤 `Game.init`에서 시작하므로, 페이지 `load` 이벤트를 늦추는 것은 모두 게임 자원 요청을 늦춘다. 그래서 역 일람 iframe은 `data-src`만 두고 처음 열 때 `src`를 채운다(`game.js` 역 일람 버튼, `battleMenuSystem.js` HELP 둘 다).
- BGM은 `Assets.bootBgm`(로딩 징글·타이틀)만 `canplaythrough`까지 기다리고, 나머지는 요소만 등록해 뒤에서 받는다. 덜 받은 BGM을 `playMusic`해도 버퍼가 차면 재생이 시작된다. 로딩·타이틀 장면이 새 BGM을 쓰게 되면 `bootBgm`에 넣는다.
- 폰트는 KODDI 공식 배포 웹폰트(`KoddiUDOnGothic-Regular/Bold.woff2`)를 `docs/fonts/`에 그대로 두고 `haiyuki.css`의 `@font-face`로 쓴다. `index.html`은 공용 `atah.io/fonts.css`를 링크하지 않고 이 두 파일만 `preload`한다. `Game.init`은 폰트 로드(최대 3초)를 기다리므로 폰트 용량이 곧 시작 지연이다.
- 자원 한 개가 실패하면 `Assets.maxAttempts`(4)번까지 `retryDelayMs`씩 늘려 가며 다시 받는다. 끝내 실패하면 `Assets.failed`에 id를 모으고, `Assets.load(onComplete, onError)`는 `onComplete` 대신 `onError(failed)`만 부른다. `LoadingScene`은 이때 오류 문구를 그리고 타이틀로 가지 않으며, 아무 키나 누르면 새로 고친다. 지연 등록되는 BGM(`bootBgm` 밖)은 요소만 만들고 끝나므로 재시도 대상이 아니다.
- 역 판정(`yakuLogic.js`)은 손패를 13종류 개수 벡터(`countsOf`, `PaiData.TYPES` 순서)로 바꿔 `_evalCounts`에서 메모한다(키 = 13진수×2 + 오픈 여부, 상한 `MEMO_MAX`면 비움). 오픈 손패는 `CLOSED_ONLY` 역을 건너뛰므로 `checkYaku`·`checkTenpai`에 `open`(= `engine.isOpen(player)`)을 넘겨야 하고, 전체 손패는 `getFullHand`로 만든다. 패 색은 종류에 묶여 있다는 전제이고, 종류와 색이 어긋난 패가 들어오면 `countsOf`가 null을 돌려 `checkYaku`만 옛 경로(`analyzeHand`)로 간다. AI(`aiLogic.js`)의 수용 패·리치 점수 탐색은 배열 복사 없이 이 벡터를 증감하며 돈다 — 한 CPU 차례에 `checkYaku` 1.5만 회가 거의 전부 메모 적중으로 바뀌어 롱태스크가 사라졌다(`tests/perf/REPORT.md`).

## CPU 스킬

- CPU의 라운드 시작 패 교환(스마슈 `EXCHANGE_TILE`·눈썹개 `PAINT_TILE`)은 원본 규칙(`sq/RULES.md` 6.4·6.5)을 따른다. `SkillFlows.executeCpuTileExchange`가 손패를 무작위 순서로 훑으며 현재 MP 전부를 예산으로 장당 비용(6/4)씩 빼고, 보존 종류(스마슈: 린샹·화린·스마슈·유리, 눈썹개: 눈썹개 4종)가 아닌 패를 교환한다. 장수 상한은 없다. 스마슈는 사용 여부도 칸마다 독립 70%로 굴린다.
- 캐릭터 필드 `skillOffset`(기본 0)은 `BattleEngine`이 `cpuSkill`(0..1 클램프)에 더한다 — 버림패 실수와 스킬 발동 확률에만 걸린다(스마슈 −0.10, 유리 +0.25 → 항상 1.0). 캐릭터 설정의 일부라 대칭 모드에서도 양쪽에 같이 적용된다.
- CPU 스마슈의 `EXCHANGE_RON`은 `SkillFlows.pickRonExchangeTile`이 원본(`sq/RULES.md` 6.3)처럼 되가져온 패를 뺀 손패에서 종류 수 1인 칸 → 2인 칸 → 3 초과 칸 → 아무 칸 순으로 하나를 무작위로 골라 다음 차례에 버린다(`cpu.exchangeDiscard`, 그 차례는 리치·AI 버림 판단을 건너뜀). 안전패 평가는 쓰지 않으므로 다시 론당할 수 있다.
- 대칭 모드(`Game.symmetric` + `Game.isAutoTest`, 엔진 `symmetric`)는 PvP 밸런스 측정용이다: P1도 CPU와 같은 AI가 움직인다. `AutoPlay.performSymmetricTurn`(비기 `checkActiveSkills('P1')`·쯔모·리치 `shouldRiichi`·`decideDiscard`), 대기 중 펑(`tryP1AiPon`), 라운드 시작 교환(`executeCpuTileExchange(engine, id, 'P1')`), 론 반응(`shouldAiReact`, 론 교환 뒤 `p1.exchangeDiscard`), 승리 때 도라 폭진, 나가리 라스트 찬스(양쪽, 룰렛 자동 정지)를 CPU 쪽과 같은 규칙으로 쓴다. 양쪽 `cpuSkill` = `SYMMETRIC_SKILL`(0.85)에 각자 `skillOffset`을 더한 값, `luck`·드로우 어시스트는 0. `aiProfile`(펑·방어 성향)은 캐릭터 것을 그대로 쓴다. 사람이 조작하는 P1 경로와 일반 CPU 대전 동작은 바뀌지 않는다.

## 전투 연출

- 선언(리치·펑·론·쯔모)·나가리 연출은 원본 `usamain.sq`의 틱 좌표를 그대로 쓴다. `js/data/fxTimelines.js`는 생성 파일 — `../sq/tools/fxexport.py`가 스크립트 VM 시뮬레이터(`fxtrace.py`)로 뽑는다. 손으로 고치지 말 것. 경로 항목은 원본 셀 좌상단의 화면 좌표이고 다음 항목까지 유지(2틱 단위 스텝 이동이 원본 그대로). 조각마다 웹 이미지의 `src` 사각형과 셀 좌상단에서 그릴 중심까지의 `off`가 들어 있다.
- 원본은 두 글자를 조각 2개로 움직인다. 웹은 글자 모양과 상관없이 이미지를 가운데 열에서 세로로 반 갈라 두 조각으로 쓴다. `off`는 웹 조각 글자의 가로 중심을 원본 셀 안 글자 중심에 맞추고, 세로는 한 이미지의 반쪽이라 두 조각이 같은 값(원본 두 글자 영역의 세로 중심)을 쓴다. 원본은 정지 때 두 글자 사이가 벌어지지만 웹은 맞붙게 한다: `fxexport.py`의 `JOIN_TICK`(펑 낙하 시작, 론·쯔모 정지, 나가리 착지 뒤)에 두 조각을 같은 거리만큼 서로 반대로 옮기고, 쯔모는 첫 틱에 글자가 원본처럼 화면 밖에 있도록 이 이동을 입장 동안 틱에 비례해 늘린다(`JOIN_RAMP_FROM`).
- 글자 에셋(`assets/fx/*.png`)은 원본처럼 투명·검정·흰색 3색 인덱스 PNG다. 글자 높이는 원본 단어 높이와 ±7% 안이라 크기는 맞추지 않았다. 에셋을 바꾸면 `fxexport.py`를 다시 돌린다(글자 범위를 이미지에서 읽는다).
- 확인 페이지: `tests/fx-preview.html`(file://로 열기, 연출·흔들림을 소리와 함께 재생).
- 원본은 2틱 간격으로 좌표를 바꾸지만 웹은 다음 항목까지 `MAX_LERP_GAP`(4)틱 이하인 연속 이동 구간만 선형 보간해 고주사율 화면에서도 매끄럽게 움직인다. 그보다 긴 간격(정지·대기)은 보간하지 않는다.
- 론·쯔모·나가리의 `hold`는 원본 `waitkey`(확인키 또는 120틱). `BattleScene.update`가 블로킹 중 확인키로 `fx.skipHold()`를 부르고, `Game.isAutoTest`면 바로 건너뛴다.
- 원본은 선언 중 판·UI를 숨기고 조각마다 셀 크기의 흰색 60% 탈색판을 달고 움직인다. 웹은 넣지 않는다(사용자 결정).
- 피해 흔들림(`SHAKE`)은 피해량 3단계, 세로 사각파 `+A,0,-A,0` 감쇠 없음, 밀린 줄이 반대편으로 돌아오는 순환 스크롤(`Game._applyShake`가 오프스크린에 복사해 두 번 그린다). 진행은 그리기 횟수가 아니라 `dt`로 세서 120Hz 화면에서도 틱 길이가 같다. 나가리 조각 착지 때는 타임라인의 `shakes`로 ±4px 8틱.
- 결과 창은 `RESULT.unfoldPerTick`으로 세로 중심에서 펼쳐진 뒤 내용을 그린다(원본 역 패널 8px/틱 양방향). 라운드 전환 페이드는 `ROUND_FADE` 40/40틱.
- 효과음은 아직 웹 것 그대로(원본 SFX 9·13·승리 징글 미반영). 스킬 연출·패 이동·손패 공개는 원본 쪽이 미해결이라 웹 그대로.

## 페이지 스타일

- 색은 gensei-pc98 `docs/style.css`의 `:root` 토큰을 그대로 복사해 쓴다(역할과 쓰임은 gensei-pc98 `docs/NOTES.md` "색상 토큰"). 그쪽 토큰이 바뀌면 같이 바꾼다. 예외: 역 일람 iframe 칸(해설서가 밝은 페이지라 밝은 바탕)과 가상 게임패드(유리 재질 자체 값).
- 푸터 레이아웃·글자 크기는 공유 `https://atah.io/footer.css`, 색·그라디언트 윗선·여백은 gensei-pc98 `#footer`와 같게 `#main-wrapper #footer`(아이디 둘)로 덮는다. 공유 `footer.css`의 `opacity: 0.8`은 1로 되돌린다. 모바일에선 저작권과 버전을 한 줄로 둔다 — 에뮬레이터 크레딧이 없어 둘째 줄에 버전만 남기 때문.
- `theme-color`는 `--bg`와 같은 값이라 모바일 브라우저 상단이 페이지 바탕과 이어진다.

## 가상 게임패드·상단바

- `core/gamepad.js`와 `haiyuki.css`의 게임패드 부분은 gensei-pc98·suiko-web-v2 것을 바탕으로 한다(모양·토글 버튼·`gamepad_activate` 이벤트). 바꿀 땐 그쪽과 함께 맞춘다.
- 패유기만 다른 점: 확인 버튼은 `KeyZ`를 보낸다(Enter를 보내도 `input.js`가 Z로 정규화해서 동작은 같다). 마우스로도 눌린다(`input.spec`이 `page.click`으로 누른다). 켜짐 표시는 `body.gamepad-on`. 패드는 캔버스 위에 뜨지 않고 `padding-bottom: 180px`로 자리를 비운다.
- D-pad 버튼의 `padding: 6px 14px` — 에뮬레이터 페이지는 전역 `button` 패딩을 상속해서 아이콘이 그 크기로 보인다. 패유기엔 전역 규칙이 없어 D-pad에만 같은 값을 준다.
- `.btn-touch-only` 숨김은 `.toolbar-icon-btn.btn-touch-only`로 쓴다. `.toolbar-icon-btn`이 뒤에서 `display: flex`를 줘서, 같은 명시도면 숨김이 진다.
- `#toolbar-row`는 3열 그리드(왼쪽 음소거, 가운데 게임 옵션, 오른쪽 게임패드·전체 화면)이고 폭을 캔버스 640px에 맞춰 양끝 아이콘이 캔버스 가장자리와 맞는다.

## 일시정지

- 탭이 숨겨지면(`document.hidden`, 모바일 앱 전환 포함) 로딩 장면을 뺀 모든 장면에서 `Game.pause()`로 멈춘다: 로직 틱·효과음·BGM 정지, 입력 초기화. 돌아와도 자동 재개하지 않고 캔버스에 일시정지 아이콘(높이 48px, kaisin `src/input.ts`의 `ICONS.pause` 모양)만 띄운 채 Z/Space/탭·클릭으로 재개하며, 재개 첫 프레임 dt는 0이다. 로딩 중에는 멈추지 않는다. 자동 테스트는 제외.
- `blur`는 쓰지 않는다: 역 일람 iframe을 누르거나 다른 창을 보며 둘 때도 포커스가 빠져 데스크톱에서 과하게 멈춘다. 모바일 앱 전환은 `hidden`이 함께 온다.

## 테스트 (`tests/`, gitignore)

- 회귀 스위트 = `battle` `battle-extended` `flow` `input` `scene-input` `visual` `mouse` (112개, ~4분).
- `_` 접두사 5개는 단언 없는 측정 도구.
- `startBattle` 헬퍼는 기본으로 `SKILLS_ENABLED = false`로 전투를 시작한다(회귀 스펙 전제). 승률·행동 측정은 스킬이 켜져야 하므로 `_ai_fingerprint`는 `skills: true`로 시작한다.
- CPU 승률·행동 지문 측정은 `_ai_fingerprint.spec.ts`를 전용 설정 `measure.config.ts`로 돌린다(`npx playwright test --config measure.config.ts _ai_fingerprint`, 서버 포트 `PORT` 기본 3100 — 회귀용 :3000과 겹치지 않고 기존 서버를 재사용하지 않는다). 결과는 매치마다 `fingerprint-state.<커밋>.skills<0|1>.<난이도>.json`에 누적되고 같은 조건이면 이어받으므로 `MPC`(캐릭터당 추가 경기 수, 기본 10)로 짧게 끊어 여러 번 돌린다. `CHARS`로 캐릭터 지정, `SKILLS=0`·`DIFF=`로 조건 변경, `RESET=1`로 초기화. `fingerprint-results.json`은 누적 상태에서 매번 다시 만든다. 메인 체크아웃을 쓰지 말고 측정 워크트리(`../haiyuki-measure`, 브랜치 `measure`)에 `docs/tests/`를 복사해 돌린다 — 측정 중 소스가 바뀌면 결과가 섞인다.
- 대칭 총당 측정은 `_matchup.spec.ts`(`startBattle`의 `symmetric: true`)를 `measure.config.ts`로 돌린다. P1=a, CPU=b 순서쌍 49조합을 조합당 `MPC`경기씩, 상태는 `matchup-state.<커밋>[.s<k>].json`에 누적(`SHARD=k/n`으로 조합을 나눠 `PORT`를 달리 병렬 실행)하고 `matchup-results.json`으로 병합한다. 표는 `python3 perf/matchup_report.py`. P1이 선공이라 순서쌍을 모두 돌려 선후공을 상쇄한다.
- `visual.spec.ts`는 `maxDiffPixels: 0`(0.001 비율로는 215px 변화를 놓친 적 있음). 베이스라인은 로컬 전용 — 리팩토링 직전에 생성. 전투 배경 `engine.bgPath`는 랜덤이라 고정 필수.
- `retries: 1` — 재시도 통과는 `flaky`로 표시된다. 간헐 실패는 소스를 stash해도 재현되므로 두 번 연속 실패만 진짜.
- 키/마우스는 down → 70ms → up으로 눌러야 프레임에 잡힌다.
