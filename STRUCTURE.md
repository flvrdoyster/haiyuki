# 코드 구조

모듈 경계와 그 이유, 그리고 코드만 봐서는 알 수 없는 제약. 백로그는 IMPROVE.md, 치트는 CHEAT.md.

## 로딩

빌드 없음, 모듈 시스템 없음. `index.html`의 `<script>` 순서가 곧 의존성이다. 검증하는 도구가 없으므로 잘못 끼우면 런타임에서야 터진다.

- `core/timers.js`는 `logic/battleEngine.js`보다 앞 — 엔진이 **파싱 시점에** `TickTimers.create()`를 부른다.
- `views/bitmapFont.js`, `views/uiDraw.js`는 첫 사용자인 `views/uiHelpers.js`보다 앞.
- `views/battleLayout.js`, `views/fxSystem.js`는 `views/battleRenderer.js`보다 앞.
- `core/game.js`는 마지막 — 여기서 부팅한다.

**ESM 전환 불가.** 테스트가 `(0, eval)('Game')` 형태로 스크립트 스코프 전역을 잡는 곳이 98건이다. `type="module"`로 바꾸면 전부 죽는다.

## 모듈 지도

| 폴더 | 역할 |
|---|---|
| `core/` | 루프·씬 전환·세이브(`game.js`), 입력(`input.js`), 에셋 로딩+오디오(`assets.js`), 틱 타이머(`timers.js`) |
| `data/` | 캐릭터·대사·전투 상수·패 정의. 코드 없음 |
| `logic/` | 마작 규칙(`battleEngine`, `yakuLogic`), AI(`aiLogic`, `autoPlay`), 스킬, 시퀀서, 메뉴 상태 |
| `views/` | 캔버스 그리기와 좌표 계산. 게임 상태를 바꾸지 않는다 |
| `scenes/` | 화면 단위. 입력 라우팅 + 이벤트 펌프 + 그리기 위임 |

### views/ 안의 분담

- `battleLayout.js` — **전투 좌표의 단일 출처.** 손패·펑 세트 위치, 메뉴 크기, 그리고 그것만으로 계산되는 히트테스트(`getHandTileAt`, `getMenuItemAt`). 순수 함수. 렌더러(그리기)와 `battleScene`(클릭 판정)이 둘 다 이걸 본다.
- `battleRenderer.js` — 그리기. `checkActionButton`/`checkExchangeButton`은 **여기 남겨뒀다**: draw가 `measureText`로 계산해 캐시한 rect(`_actionRect`, `_exchangeBtnRect`)를 읽으므로 그리기에 묶여 있고, 한 프레임도 안 그리면 항상 false다. `BattleLayout`으로 끌어오면 그 의존이 감춰진다. `tests/mouse.spec.ts`가 "그리기 전 false"를 단언하므로, rect를 온디맨드 계산으로 바꾸면 그 단언을 갱신할 것.
- `fxSystem.js` — FX 파티클(스폰·이징·수명). `battleScene.fx = FXSystem.create()`로 소유. `battleSequencer`가 `engine.scene.fx.list`를 읽어 "FX 재생 중인가"를 판단한다.
- `uiDraw.js` — 스프라이트 프레임·타일 패턴·9-slice·창·버튼. `bitmapFont.js` — 이미지 폰트 3종. 둘 다 이미지는 `Assets.get()`으로 받는다.

### logic/ 안의 분담

- `autoPlay.js` — `Game.isAutoTest`일 때 P1을 두는 AI. **P1은 aiProfile 없이 skill 0.7 고정.** `tests/_ai_fingerprint`가 이 값을 중립 베이스라인으로 놓고 CPU 캐릭터별 행동 지문을 잰다. 바꾸면 측정치가 전부 흔들린다.
- `battleEngine.js`는 여전히 크다(~1700줄). 남은 비엔진 코드는 `updateBattleMusic`/`showPopup`/`setExpression`인데, 이벤트 발행으로 돌리면 발화 타이밍이 한 프레임 밀릴 수 있어 순수 이동이 아니다.

## 입력

`Input.isConfirmKey()` = Z 또는 Space(Enter는 `init`에서 KeyZ로 정규화). **마우스와 `Game.isAutoTest`는 일부러 안 넣었다.** 마우스는 곳마다 조건이 다르고(드로우 버튼은 히트테스트, 캐릭터 선택은 호버 칸, 확인 다이얼로그는 마우스 미지원), `isAutoTest`는 오토플레이가 통과해야 하는 대기 화면(타이틀·인카운터·엔딩)에만 붙는다. 헬퍼에 섞으면 "아무 데나 클릭해도 확정"이 된다.

커서 이동 헬퍼는 없다. 5곳의 의미가 제각각(2지 토글 / 3항 순환 / 숨김 슬롯 포함 행 이동 / 손패 인덱스)이라 뭉치면 오히려 가려진다.

## 오디오

SFX는 WebAudio(`sfxBuffers` + `BufferSourceNode`), BGM은 HTMLAudio. 매니페스트(`assets.js` `toLoad`)에 없는 id로 `playSound`를 부르면 `console.warn`만 찍고 조용히 무음이다 — 눈으로는 안 잡힌다. `tests/helpers.ts`의 오디오 스파이가 `missing` 플래그로 이걸 기록한다.

화면이 가려진 동안의 SFX는 버린다. 쌓아뒀다가 복귀 시 한꺼번에 터지는 것을 막기 위해서다. BGM은 반대로 이어져야 하므로 `playMusic`의 resume/retry 경로는 유지.

## 테스트 (`tests/`, gitignore 대상)

- **회귀 스위트는 7개 파일 112개**: `battle` `battle-extended` `flow` `input` `scene-input` `visual` `mouse`. 약 4분.
- **`_` 접두사 5개는 단언이 0건인 측정·캡처 도구**다. 회귀로 세지 말 것. `_ai_fingerprint`는 한 시간 가까이 걸린다.
- **엔진 상태 필드를 옮기지 말 것.** 테스트가 `e.p1`/`e.deck`/`e.currentState`/`e.stateTimer` 등을 직접 읽는 곳이 199건. 함수를 옮기는 건 안전하지만 필드를 옮기면 동작이 멀쩡해도 대량으로 깨진다.
- **비주얼 베이스라인**(`visual.spec.ts`)은 `maxDiffPixels: 0`. 0.001 비율(307px)로 뒀을 때 이름 스트로크 4→6(215px)을 놓친 적이 있다. 베이스라인은 로컬 전용이라 "리팩토링 직전 생성 → 리팩토링 → 재실행 비교"로 쓴다. 전투 배경은 랜덤(`engine.bgPath`)이라 반드시 고정.
- **`retries: 1`.** 전체 스위트에 재현 안 되는 간헐 실패가 있다(매번 다른 테스트, 단독 실행 시 통과, 소스를 stash해도 재현). 재시도 통과는 `flaky`로 따로 표시되므로 두 번 연속 실패만 진짜다.
- 실제 키/마우스 입력은 down → 70ms → up으로 눌러야 `isJustPressed`/`isMouseJustPressed`가 프레임에 잡힌다. 게임 좌표→페이지 좌표는 `Input.mapToCanvas`의 역변환.
