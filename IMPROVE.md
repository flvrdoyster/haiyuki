# 패유기 개선 사항 리스트

남은 개선 과제만 정리. 완료되어 제외된 항목은 git 히스토리 참조.

## 1. AI 난이도 + 캐릭터 성격 (드로우 운/개성) — 측정/튜닝 잔여
- **완료(난이도):** 실질 2티어 — `DIFFICULTY_BANDS` easy=normal `[0.75,0.95]`, hard `[1.0,1.0]`(easy 차이는 플레이어 드로우 어시스트뿐). 진행도 선형 보간. 실수는 **softmax 온도 모델**(`aiLogic.decideDiscard`, `MISTAKE_TEMP`)로 점수 가중 — skill=1.0이면 무실수. 측정(시뮬): normal 초반 ~4.5%(텐파이 깸 1.8%) → 막판 ~0.6%, hard 0%. `skill`=역량/일관성, `aiProfile`=스타일로 직교 분리.
- **완료(평가 로직):** 버림 결정이 **실제 yaku 테이블 기반**(드로우 어시스트와 동급 지능). `aiLogic.scoreDiscards`가 후보별로 — 텐파이는 `getRiichiScore`(도달 가능 최고 역 + 대기 폭), 비텐파이는 `acceptanceInfo`(ukeire + 도달 가능 최고 역) — 로 평가. 기존 `calculateHandPotential`(세트 합산)은 플레이버 베이스·펑 손패 폴백으로만. 가중치 상수(`TENPAI_TIER`/`ACCEPT_W`/… in aiLogic).
- **완료(성격):** `aiProfile` 6축(value/speed/colorBias/greed/defense/luck). `luck`은 매 단일 드로우마다 확률만큼 "다음 N장 중 최선패"(`DRAW_ASSIST.peek` 20). **음수 luck 폐기** — CPU에 플레이어보다 나쁜 패를 억지로 주면 CPU가 약해져 난이도↓라, 페톰을 베이스(0.25)보다 낮은 0으로 둬 상대적 불운만 표현. 화린·눈썹개 0.75. 캐릭터 값은 `characterData.js` 주석(공식 매뉴얼 페르소나 기반). 평가 리라이트로 희석됐던 스타일 축은 **명시 항으로 복원** — colorBias(우세색 모이면 비우세 패 버림 `COLOR_W`)·greed(도라 버림 감점 `DORA_KEEP_W`)·defense(안전패 `DEFENSE_BASE + def×W`, 전 캐릭 상향)·value(비텐파이 도달 최고역 `VALUE_BUILD_W`). speed는 펑(`shouldPon`)·낮은 value로 표현.
- **완료(스킬 타이밍):** CPU 매턴 스킬은 `SkillRegistry.aiScore` → 임계 0.6 → `skillUseChance`(=0.3+0.7×skill). HELL_PILE(선제 드로우 저주를 방어 버킷서 빼 능동 사용)·CRITICAL(`_cpuBestYaku`로 큰 손일 때만) 재점수화. 승리/리액티브/셋업 스킬은 이벤트 경로.
- **완료(행동 지문 측정):** `tests/_ai_fingerprint.spec.ts`(Playwright, P1=index0 고정 중립 베이스라인 — `performAutoTurn`이 p1.aiProfile 없이 항상 `decideDiscard(hand, 0.7, null, ctx)`라 P1은 성격 무관 — vs CPU 캐릭터별 20매치 자동 플레이, 캐릭당 57~128라운드) — `[Pon]`/`[Round] WIN`/`NAGARI` 콘솔 로그 파싱 + 리치 턴/승리 손패(도라 개수·색 순도) 폴링으로 집계. **6축 전부 확인됨:** 리치 타이밍(화린·눈썹개 7.6~7.7턴 최속 vs 페톰 12턴 최지 — luck 정합), 펑률(스마슈 35.7%·페톰 30.5% 상위 vs 아타호 6.7% 최저 — speed 정합), 평균 도라 수(린샹 5.61개로 압도적 1위, 나머지 2.0~2.9 — greed 정합), 승리 손패 색 순도(아타호 0.78 최고 vs 스마슈 0.63 최저 — colorBias 정합), 디일인률(페톰·아타호·스마슈 12~13% vs 유리·눈썹개·화린 3~6% — defense 정합, 8매치 소표본 때의 역전은 노이즈였음).
- **잔여:** ① **스킬 aiScore 버킷이 거침**(공격/방어 공용) — 개별 스킬 타이밍 더 정교화 여지. ② 균형 미튜닝(수치 자체가 적절한지는 별개 — 축 분리 자체는 검증 완료).

## 2. FX 스타일 디테일업 (원본 게임 정합)
- **목표:** 전투 FX(스킬/타격/리치 등)를 원본 게임에 더 가깝게 다듬기.
- **현재:** `BattleEngine.playFX('fx/...')` + `SkillFlows`에서 슬래시/힐/리치 등 FX 재생. 스프라이트·타이밍·스케일이 원본과 일부 차이.
- **참고:** 구체적 차이는 원본 캡처 확보 후 정리. 위치 후보 — `js/views/battleRenderer.js`(FX 드로우), `js/logic/skillRegistry.js`(SkillFlows), `assets/fx/*`.

## 3. 별도 튜토리얼 추가 검토
- **목표:** 규칙(패·역·스킬·조작)을 가르치는 별도 튜토리얼 도입 여부 검토.
- **참고:** 도입 시 진입점(타이틀 메뉴?)·범위(인터랙티브 vs 정적 안내) 결정 필요. 우선 "검토" 단계.

## 4. 코드 구조 리팩토링 (성능 아님 — 유지보수성)
- **목표:** 런타임 성능이 아니라 구조/가독성. 특별히 무거운 구간은 없음.
- **규모:** `js/` 28파일 10,620줄. 상위 2개가 28% — `battleEngine.js` 1816줄, `battleRenderer.js` 1175줄.
- **하드 제약 — ESM 전환 금지:** 테스트가 `(0, eval)('Game')` 형태로 전역을 잡는 곳이 **98건**. 최상위 `const`가 스크립트 스코프 전역이라는 데 의존하므로, `type="module"`로 바꾸면 98건이 전부 죽는다. 모듈화는 테스트 전면 재작성을 동반 — 현 단계에서 하지 않는다. `index.html`의 script 태그 28개는 **순서가 곧 의존성**이고 어디에도 검증되지 않는다(잘못 끼우면 런타임에서야 터짐).
- **상태 필드는 옮기지 말 것:** 테스트의 `BattleEngine` 내부 직접 접근이 **199건**(`e.p1`/`e.deck`/`e.currentState`/`e.stateTimer`…). 함수를 옮기는 건 안전하지만 상태 필드를 옮기면 동작이 멀쩡해도 테스트가 대량으로 깨진다.
- **안전망 현황(실측):** 아래 5번에서 보강 완료. 남은 공백은 5번 "잔여" 참조.
- **권장 순서(커버리지 실측 기준으로 재정렬):**
  1. ~~**`battleEngine.js`에서 "엔진이 아닌 것" 분리**~~ — **완료(1/2)**: `performAutoTurn` → `logic/autoPlay.js`(`AutoPlay.performTurn(engine)`), 자체 타이머 → `core/timers.js`(`TickTimers.create()` → `engine.timers.add/update/clear`). 죽은 필드 `timeouts: []`도 제거. 1816 → 1715줄. 본문은 정규화 대조로 **바이트 동일** 확인, 회귀 106개 전원 통과(비주얼 픽셀까지 동일). **잔여:** `updateBattleMusic`/`showPopup`/`setExpression`을 이벤트 발행으로 돌리는 건 순수 이동이 아니라 동작 변경이라 아직 안 함.
  2. ~~**입력 관용구 통합**~~ — **완료(범위 축소)**: `Input.isConfirmKey()`(=`Z||SPACE`) 추가 후 19곳 전부 치환. **마우스와 `|| Game.isAutoTest`는 일부러 헬퍼에 넣지 않았다** — 전수조사 결과 그 둘의 차이는 실수가 아니라 의도였다. 마우스는 곳마다 조건이 달라(드로우 버튼은 `onButton` 히트테스트, 캐릭터 선택은 호버 칸 필요, 확인 다이얼로그는 마우스 미지원) 헬퍼에 섞으면 "아무 데나 클릭해도 확정"이 된다. `isAutoTest`가 붙은 4곳(타이틀 2·인카운터·엔딩)은 정확히 **오토플레이가 통과해야 하는 대기 화면**이다. 커서 이동 헬퍼는 **만들지 않았다** — 5곳의 의미가 제각각(2지 토글 / 3항 순환 / 숨김 슬롯 포함 행 이동 / 손패 인덱스)이라 옵션으로 뭉치면 오히려 가려진다.
  3. ~~**`encounterScene.js` 말풍선 중복 제거**~~ — **완료(범위 축소)**: `draw`와 `drawChallengerMonologue`의 복붙을 `drawDialogueBubble(ctx, text, tail)` 하나로 합쳤다. 박스 스케일·위치·줄바꿈·baseline 보정(`lh*0.7`)이 전부 같았고 **꼬리 위치만** 달라서(말하는 쪽 좌/우 반전 vs 가운데 고정) 그것만 인자로 남겼다. 413 → 397줄, 비주얼 두 경로 **픽셀 동일**. **이름 스트로크 렌더링 공용화는 하지 않았다** — 3곳에서 실제로 겹치는 건 `strokeText`+`fillText` 두 줄뿐이고 설정은 각자 다른 config에서 오며, `encounterScene`은 두 호출 사이에 `fillStyle`을 바꿔 화자를 강조한다. 헬퍼로 빼면 옵션만 늘고 이득이 없다.
  4. ~~**`battleRenderer.js` 히트테스트 분리 + `battleScene.js` FX 추출**~~ — **완료(경계를 의존성대로 그음)**:
     - `views/battleLayout.js`(`BattleLayout`, 140줄) — 레이아웃 계산(`getVisualMetrics`/`getPlayerHandPosition`/`_menuMetrics`)과 그것만 쓰는 **순수** 히트테스트(`getHandTileAt`/`getMenuItemAt`). 좌표의 단일 출처. 렌더러 1175 → 1048줄. 6개 멤버 **바이트 동일**.
     - **`checkActionButton`/`checkExchangeButton`은 렌더러에 남겼다.** 이 둘은 draw가 `measureText`로 계산해 캐시한 rect(`_actionRect`/`_exchangeBtnRect`)를 읽어서, 한 프레임도 안 그리면 항상 false다. 그리기에 묶인 걸 `BattleLayout`으로 끌어오면 의존이 감춰지므로 draw 옆에 두는 게 정직하다. `mouse.spec.ts`가 이 "그리기 전 false" 동작을 명시적으로 단언하니, 나중에 rect를 온디맨드 계산으로 바꾸면 그 단언을 갱신할 것.
     - `views/fxSystem.js`(`FXSystem`, 157줄) — `spawn(list,…)`/`update(list,dt)`/`isBlocking(list)`. **리스트는 여전히 씬이 소유**(`BattleScene.activeFX`) — `battleSequencer.js:245`가 `engine.scene.activeFX`를 직접 읽기 때문에 이름을 못 바꾼다. 그래서 상태 없는 함수 모음. 씬 650 → 511줄. 2개 함수 **바이트 동일**. `battleEngine.js`의 `this.activeFX = []`는 아무도 안 읽는 죽은 필드라 제거.
     - FX를 **직접** 단언하는 테스트는 없다. 전투 테스트 71개가 리치·펑 이벤트에서 FX 스폰과 `isBlocking` 게이팅을 지나므로 깨지면 자동 플레이가 멈추지만, 이징 곡선 자체는 바이트 대조로만 보장된다.
  5. ~~**`assets.js` 렌더 유틸 260줄 → `views/`**~~ — **완료**: `views/bitmapFont.js`(`BitmapFont` — drawAlphabet/drawStaffGlyph/drawNumberBig, 161줄)와 `views/uiWidgets.js`(`UIWidgets` — drawFrame/getPattern/drawTiled/drawUIFrame/drawWindow/drawButton, 121줄)로 분리. `assets.js` 720 → 458줄, 매니페스트+로딩+오디오만 남음. 호출부는 파일 9개에 **32곳**(조사 때 "9곳"은 파일 수였음). 11개 멤버 전부 `this.get`→`Assets.get` 정규화 후 **바이트 동일** 확인, 비주얼 4장 픽셀 동일. `index.html`은 `uiHelpers.js`(첫 사용자) 앞에 등록.

## 5. 테스트 안전망 — 보강 완료, 잔여 있음
- **보강한 것:**
  - `helpers.ts`에 **오디오 스파이**(`installAudioSpy`/`getSfxIds`/`clearAudioLog`) — 스위트 전체에 사운드 단언이 0건이었다. 스위트가 `setMute(true)`를 쓰므로 스파이는 원본을 감싸 **뮤트 여부와 무관하게** 호출을 기록한다.
  - `mouse.spec.ts` (신규, 6개) — 위 "잔여 공백" 항목 참조.
  - `scene-input.spec.ts` (신규, 12개) — 타이틀/캐릭터선택/컨티뉴의 **실제 키 입력** 확인키·커서·효과음 ID. 기존엔 실제 입력 스펙이 `input.spec.ts` 하나뿐이었고 전부 BattleScene이었다.
  - `visual.spec.ts` (신규, 4개) — 렌더링 픽셀 회귀. `Game.update`를 no-op으로 덮어 애니메이션을 정지시키고 씬 필드를 고정해 결정성 확보. **전투 배경은 `battleEngine` init에서 랜덤(`bgPath`)이라 반드시 고정**해야 한다.
  - `flow.spec.ts`에 "룰렛 없이 즉시 엔딩" 회귀 테스트.
  - `battle-extended.spec.ts`의 flaky 해소 — `e.cpuLuck = 0`으로 난이도 어시스트만 결정적으로 검증하고, luck 어시스트는 별도 테스트로 분리.
- **허용오차 0이 필수:** 비주얼 테스트를 `maxDiffPixelRatio: 0.001`(=307px)로 뒀더니 이름 스트로크 4→6 변경(215px)을 **놓쳤다**. `maxDiffPixels: 0`으로 조여야 한다. 4회 반복 픽셀 완전 일치 확인됨.
- **베이스라인은 로컬 전용:** `tests/`가 `.gitignore` 대상이라 스냅샷이 커밋되지 않는다. 워크플로는 "리팩토링 **직전에** 베이스라인 생성 → 리팩토링 → 재실행 비교". 최초 실행은 베이스라인을 쓰면서 실패하는 게 정상(한 번 더 돌리면 통과).
- **잔여 공백:**
  - ~~캔버스 마우스 좌표 히트테스트 커버리지 0~~ → **`mouse.spec.ts`(6개) 추가.** 단위 3개(히트테스트가 레이아웃 함수와 같은 좌표를 보는지 — 각 패/메뉴 항목 중심, 여백, 바깥)와 E2E 3개(실제 `page.mouse`로 패 클릭→버림, 여백 클릭→무반응, 드로우 버튼→드로우). 게임 좌표→페이지 좌표 변환은 `Input.mapToCanvas`의 역변환. 마우스는 down→70ms→up으로 눌러야 `isMouseJustPressed`가 프레임에 잡힌다. 손패 히트 영역을 반 칸 밀어 변이 검증: 좌표 테스트 2개만 실패, 나머지 4개 통과.
  - **EndingScene/CreditsScene/EncounterScene의 확인키**는 아직 실제 입력 테스트 없음(씬을 `update()` 직접 호출로만 구동).
  - `_` 접두사 5개 스펙(`_ai_fingerprint`/`_aimistake`/`_creditcheck`/`_logocheck`/`_titlecheck`)은 **단언이 0건인 측정·캡처 도구**다. 회귀 테스트로 세지 말 것. 실제 회귀 스위트는 나머지 **7개** 파일(`battle` `battle-extended` `flow` `input` `scene-input` `visual` `mouse`, 112개, ~4분).
  - **전체 스위트에 간헐적 실패 있음 — 리팩토링과 무관함이 확인됨.** 매번 **다른 테스트**가 1개씩 실패하고(`battle.spec` HP 불변식, `battle-extended` 종류기반 역·보너스) 전부 **단독 실행으로는 통과**한다. **소스 변경을 전부 stash하고 원본 코드로 돌려도 동일하게 재현**되므로 리팩토링이 원인이 아니다. 실패는 항상 느린 실행에서 났다(5.5~7.1분 vs 정상 3.6~4.8분) — 타이밍 민감성으로 보이나 기전은 미확정. 기존 스펙만(`battle`+`battle-extended`, 71개) 돌리면 2회 연속 깨끗하므로, 신규 스펙이 더해질 때의 부하(페이지 16개 추가 부팅, 매번 전체 에셋 로드)와 관련 있을 가능성이 있다. **대응:** `playwright.config.ts`에 `retries: 1`을 넣었다 — 재시도로 통과한 건 Playwright가 `flaky`로 따로 표시하므로 숨기는 게 아니라 분류하는 것이고, 두 번 연속 실패만 진짜 실패로 뜬다. 기전 조사는 별건(30분 타임박스 권장).

## 6. 버그 — 등록되지 않은 사운드 ID 5개 (호출해도 무음)
- **증상:** `Assets.playSound()`가 불리지만 해당 id가 `assets.js`의 `toLoad` 매니페스트에 없어 `console.warn("SFX not found")`만 찍고 소리가 나지 않는다. 에셋 파일 자체도 없다.

  | ID | 호출처 | 영향 |
  |---|---|---|
  | `audio/select` | `continueScene.js:57` | 컨티뉴 화면 YES/NO 커서 이동이 무음 |
  | `audio/cursor` | `battleEngine.js` (2곳) | 패 교환 커서 이동이 무음 |
  | `audio/cancel` | `battleEngine.js` | MP 부족 등 거부 피드백이 무음 |
  | `audio/sword_draw` | `skillRegistry.js` | 해당 스킬 연출이 무음 |
  | `audio/system_enter` | `skillRegistry.js` | 해당 스킬 연출이 무음 |

- **확인 방법:** 정적 분석(코드의 playSound id ∩ 매니페스트 id) + 런타임 검증 둘 다. 등록된 커서 사운드는 **`audio/tick` 하나뿐**이고 `assets/audio/`에도 tick.mp3만 있다.
- **수정 완료 (5개 중 4개):**
  - `audio/select`, `audio/cursor`(2곳) → **`audio/tick`**. 전부 커서 이동이라 타이틀·캐릭터선택과 같은 소리로 통일.
  - `audio/cancel`(2곳) → **`audio/wrong`**. 이 코드베이스에서 거절 피드백은 이미 `audio/wrong`이다(리치 중 잘못된 패 클릭 2곳, 나가리 결과). "MP 부족!"도 같은 성격.
  - `audio/sword_draw` → **`audio/slash`**. 바로 윗줄이 `playFX('fx/slash_lr')`이고 `audio/slash`가 등록돼 있다.
- **`audio/system_enter`(룰렛 결과 확정)는 호출 자체를 제거**했다. 대응할 소리가 없고 원본에서 뭐였는지 확정이 어려워 소리 없이 두기로 결정(2026-09-14). 이로써 미등록 사운드 ID는 0개.
- **회귀 방지:** `tests/helpers.ts`의 오디오 스파이가 `missing` 플래그를 기록하고 `getMissingSfx()`로 조회한다. `scene-input.spec.ts`의 컨티뉴 테스트가 `getMissingSfx() === []`를 단언하므로 같은 실수가 재발하면 잡힌다.
