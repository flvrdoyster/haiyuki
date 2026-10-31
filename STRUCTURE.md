# 코드 구조

- `index.html`의 `<script>` 순서가 곧 의존성. `core/timers.js`는 `battleEngine.js` 앞(파싱 시점 호출), `views/battleLayout.js`·`fxSystem.js`·`bitmapFont.js`·`uiDraw.js`는 각 사용자 앞, `core/game.js`는 마지막.
- ESM 전환 불가 — 테스트가 `(0, eval)('Game')`로 스크립트 스코프 전역을 98곳에서 잡는다.
- `BattleEngine`의 상태 필드를 옮기지 말 것 — 테스트가 `e.p1`/`e.deck`/`e.currentState` 등을 199곳에서 직접 읽는다. 함수 이동은 안전.
- `autoPlay.js`의 `decideDiscard(hand, 0.7, null, ctx)` — `tests/_ai_fingerprint`가 이 값을 중립 베이스라인으로 쓴다.
- `battleSequencer`가 `engine.scene.fx.list`를 직접 읽는다.
- 매니페스트(`assets.js` `toLoad`)에 없는 id로 `playSound`를 부르면 조용히 무음. 테스트 헬퍼 `getMissingSfx()`로 잡는다.
- 역 판정(`yakuLogic.js`)은 손패를 13종류 개수 벡터(`countsOf`, `PaiData.TYPES` 순서)로 바꿔 `_evalCounts`에서 메모한다(키 = 13진수×2 + 오픈 여부, 상한 `MEMO_MAX`면 비움). 오픈 손패는 `CLOSED_ONLY` 역을 건너뛰므로 `checkYaku`·`checkTenpai`에 `open`(= `engine.isOpen(player)`)을 넘겨야 하고, 전체 손패는 `getFullHand`로 만든다. 패 색은 종류에 묶여 있다는 전제이고, 종류와 색이 어긋난 패가 들어오면 `countsOf`가 null을 돌려 `checkYaku`만 옛 경로(`analyzeHand`)로 간다. AI(`aiLogic.js`)의 수용 패·리치 점수 탐색은 배열 복사 없이 이 벡터를 증감하며 돈다 — 한 CPU 차례에 `checkYaku` 1.5만 회가 거의 전부 메모 적중으로 바뀌어 롱태스크가 사라졌다(`tests/perf/REPORT.md`).

## 전투 연출

- 선언(리치·펑·론·쯔모)·나가리 연출은 원본 `usamain.sq`의 틱 좌표를 그대로 쓴다. `js/data/fxTimelines.js`는 생성 파일 — `haiyuki-re/sq/tools/fxexport.py`가 스크립트 VM 시뮬레이터(`fxtrace.py`)로 뽑는다. 손으로 고치지 말 것. 항목은 원본 조각(셀) 중심의 화면 좌표이고 다음 항목까지 유지(2틱 단위 스텝 이동이 원본 그대로).
- 원본은 두 글자를 조각 2개로 움직이지만 웹 글자는 「론」「펑」이 한 글자라 `POPUP.TYPES[].split` 열에서 세로로 반 갈라 두 조각으로 쓴다. 조각은 `anchor`(기준 틱에서 원본 글자 영역 중심)에 웹 글자를 맞춰 놓고 원본 조각의 기준 틱 대비 이동량을 더한다. 론·쯔모 기준 틱은 나란히 멈춘 순간, 펑은 낙하 시작(한 글자로 떨어졌다 튕기며 갈라진다).
- 론·쯔모·나가리의 `hold`는 원본 `waitkey`(확인키 또는 120틱). `BattleScene.update`가 블로킹 중 확인키로 `fx.skipHold()`를 부르고, `Game.isAutoTest`면 바로 건너뛴다.
- 선언 중 `POPUP.WASH`(흰색 60%)를 화면 전체에 덮는다 — 원본이 판·UI를 숨기고 흰색 60% 섞은 스냅샷을 보이는 것의 대응.
- 피해 흔들림(`SHAKE`)은 피해량 3단계, 세로 사각파 `+A,0,-A,0` 감쇠 없음, 밀린 줄이 반대편으로 돌아오는 순환 스크롤(`Game._applyShake`가 오프스크린에 복사해 두 번 그린다). 나가리 조각 착지 때는 타임라인의 `shakes`로 ±4px 8틱.
- 결과 창은 `RESULT.unfoldPerTick`으로 세로 중심에서 펼쳐진 뒤 내용을 그린다(원본 역 패널 8px/틱 양방향). 라운드 전환 페이드는 `ROUND_FADE` 40/40틱.
- 효과음은 아직 웹 것 그대로(원본 SFX 9·13·승리 징글 미반영). 스킬 연출·패 이동·손패 공개는 원본 쪽이 미해결이라 웹 그대로.

## 가상 게임패드·상단바

- `core/gamepad.js`와 `haiyuki.css`의 게임패드 부분은 gensei-pc98·suiko-web-v2 것을 바탕으로 한다(모양·토글 버튼·`gamepad_activate` 이벤트). 바꿀 땐 그쪽과 함께 맞춘다.
- 패유기만 다른 점: 확인 버튼은 `KeyZ`를 보낸다(Enter를 보내도 `input.js`가 Z로 정규화해서 동작은 같다). 마우스로도 눌린다(`input.spec`이 `page.click`으로 누른다). 켜짐 표시는 `body.gamepad-on`. 패드는 캔버스 위에 뜨지 않고 `padding-bottom: 180px`로 자리를 비운다.
- D-pad 버튼의 `padding: 6px 14px` — 에뮬레이터 페이지는 전역 `button` 패딩을 상속해서 아이콘이 그 크기로 보인다. 패유기엔 전역 규칙이 없어 D-pad에만 같은 값을 준다.
- `.btn-touch-only` 숨김은 `.toolbar-icon-btn.btn-touch-only`로 쓴다. `.toolbar-icon-btn`이 뒤에서 `display: flex`를 줘서, 같은 명시도면 숨김이 진다.
- `#toolbar-row`는 3열 그리드(왼쪽 음소거, 가운데 게임 옵션, 오른쪽 게임패드·전체 화면)이고 폭을 캔버스 640px에 맞춰 양끝 아이콘이 캔버스 가장자리와 맞는다.

## 테스트 (`tests/`, gitignore)

- 회귀 스위트 = `battle` `battle-extended` `flow` `input` `scene-input` `visual` `mouse` (112개, ~4분).
- `_` 접두사 5개는 단언 없는 측정 도구. `_ai_fingerprint`는 한 시간 걸린다.
- `visual.spec.ts`는 `maxDiffPixels: 0`(0.001 비율로는 215px 변화를 놓친 적 있음). 베이스라인은 로컬 전용 — 리팩토링 직전에 생성. 전투 배경 `engine.bgPath`는 랜덤이라 고정 필수.
- `retries: 1` — 재시도 통과는 `flaky`로 표시된다. 간헐 실패는 소스를 stash해도 재현되므로 두 번 연속 실패만 진짜.
- 키/마우스는 down → 70ms → up으로 눌러야 프레임에 잡힌다.
