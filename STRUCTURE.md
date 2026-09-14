# 코드 구조

- `index.html`의 `<script>` 순서가 곧 의존성. `core/timers.js`는 `battleEngine.js` 앞(파싱 시점 호출), `views/battleLayout.js`·`fxSystem.js`·`bitmapFont.js`·`uiDraw.js`는 각 사용자 앞, `core/game.js`는 마지막.
- ESM 전환 불가 — 테스트가 `(0, eval)('Game')`로 스크립트 스코프 전역을 98곳에서 잡는다.
- `BattleEngine`의 상태 필드를 옮기지 말 것 — 테스트가 `e.p1`/`e.deck`/`e.currentState` 등을 199곳에서 직접 읽는다. 함수 이동은 안전.
- `autoPlay.js`의 `decideDiscard(hand, 0.7, null, ctx)` — `tests/_ai_fingerprint`가 이 값을 중립 베이스라인으로 쓴다.
- `battleSequencer`가 `engine.scene.fx.list`를 직접 읽는다.
- 매니페스트(`assets.js` `toLoad`)에 없는 id로 `playSound`를 부르면 조용히 무음. 테스트 헬퍼 `getMissingSfx()`로 잡는다.

## 테스트 (`tests/`, gitignore)

- 회귀 스위트 = `battle` `battle-extended` `flow` `input` `scene-input` `visual` `mouse` (112개, ~4분).
- `_` 접두사 5개는 단언 없는 측정 도구. `_ai_fingerprint`는 한 시간 걸린다.
- `visual.spec.ts`는 `maxDiffPixels: 0`(0.001 비율로는 215px 변화를 놓친 적 있음). 베이스라인은 로컬 전용 — 리팩토링 직전에 생성. 전투 배경 `engine.bgPath`는 랜덤이라 고정 필수.
- `retries: 1` — 재시도 통과는 `flaky`로 표시된다. 간헐 실패는 소스를 stash해도 재현되므로 두 번 연속 실패만 진짜.
- 키/마우스는 down → 70ms → up으로 눌러야 프레임에 잡힌다.
