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

## 4. flaky 테스트 — `battle-extended.spec.ts` "CPU 드로우에는 어시스트가 적용되지 않는다"
- **증상:** `battle-extended.spec.ts:959`가 확률적으로 실패(12회 반복 시 2~4회). `expect(drawnType).toBe('wand')`인데 `'ataho'`가 나옴.
- **원인:** 단언이 낡았다. 이 테스트는 **난이도 기반 플레이어 드로우 어시스트**가 CPU엔 적용되지 않음을 확인하려는 것인데, 이후 1번 항목에서 CPU에 **`aiProfile.luck` 기반 드로우 어시스트**가 따로 추가됐다. 테스트가 쓰는 `cpuIndex: 1`은 린샹(`luck: 0.25`)이라 드로우의 25%가 `DRAW_ASSIST.peek`로 top 대신 유리한 패를 집는다 — 관측 실패율과 일치. 즉 **제품 버그가 아니라 테스트가 두 종류의 어시스트를 구분하지 못하는 것**.
- **수정 방향:** 셋업에서 `e.cpu.aiProfile.luck = 0`으로 두거나 luck=0인 페톰(`cpuIndex`)을 쓰면 "난이도 어시스트는 CPU에 적용 안 됨"이라는 원래 의도만 결정적으로 검증할 수 있다. luck 어시스트 자체는 별도 테스트로 분리.