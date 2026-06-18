# 패유기 개선 사항 리스트

남은 개선 과제만 정리. 완료되어 제외된 항목은 git 히스토리 참조.

## 1. AI 난이도 + 캐릭터 성격 (드로우 운/개성) — 측정/튜닝 잔여
- **완료(난이도):** 실질 2티어 — `DIFFICULTY_BANDS` easy=normal `[0.75,0.95]`, hard `[1.0,1.0]`(easy 차이는 플레이어 드로우 어시스트뿐). 진행도 선형 보간. 실수는 **softmax 온도 모델**(`aiLogic.decideDiscard`, `MISTAKE_TEMP`)로 점수 가중 — skill=1.0이면 무실수. 측정(시뮬): normal 초반 ~4.5%(텐파이 깸 1.8%) → 막판 ~0.6%, hard 0%. `skill`=역량/일관성, `aiProfile`=스타일로 직교 분리.
- **완료(평가 로직):** 버림 결정이 **실제 yaku 테이블 기반**(드로우 어시스트와 동급 지능). `aiLogic.scoreDiscards`가 후보별로 — 텐파이는 `getRiichiScore`(도달 가능 최고 역 + 대기 폭), 비텐파이는 `acceptanceInfo`(ukeire + 도달 가능 최고 역) — 로 평가. 기존 `calculateHandPotential`(세트 합산)은 플레이버 베이스·펑 손패 폴백으로만. 가중치 상수(`TENPAI_TIER`/`ACCEPT_W`/… in aiLogic).
- **완료(성격):** `aiProfile` 6축(value/speed/colorBias/greed/defense/luck). `luck`은 매 단일 드로우마다 확률만큼 "다음 N장 중 최선패"(`DRAW_ASSIST.peek` 20). **음수 luck 폐기** — CPU에 플레이어보다 나쁜 패를 억지로 주면 CPU가 약해져 난이도↓라, 페톰을 베이스(0.25)보다 낮은 0으로 둬 상대적 불운만 표현. 화린·눈썹개 0.75. 캐릭터 값은 `characterData.js` 주석(공식 매뉴얼 페르소나 기반). 평가 리라이트로 희석됐던 스타일 축은 **명시 항으로 복원** — colorBias(우세색 모이면 비우세 패 버림 `COLOR_W`)·greed(도라 버림 감점 `DORA_KEEP_W`)·defense(안전패 `DEFENSE_BASE + def×W`, 전 캐릭 상향)·value(비텐파이 도달 최고역 `VALUE_BUILD_W`). speed는 펑(`shouldPon`)·낮은 value로 표현.
- **완료(스킬 타이밍):** CPU 매턴 스킬은 `SkillRegistry.aiScore` → 임계 0.6 → `skillUseChance`(=0.3+0.7×skill). HELL_PILE(선제 드로우 저주를 방어 버킷서 빼 능동 사용)·CRITICAL(`_cpuBestYaku`로 큰 손일 때만) 재점수화. 승리/리액티브/셋업 스킬은 이벤트 경로.
- **잔여:** ① **캐릭터 행동 지문 측정** — 펑률·평균 승리 역점수·리치 턴·디일인률 등을 시뮬로 뽑아 성격이 실제 갈리는지 검증(버림 실수율은 `scoreDiscards`로 측정 가능). ② **스킬 aiScore 버킷이 거침**(공격/방어 공용) — 개별 스킬 타이밍 더 정교화 여지. ③ 균형 미튜닝.

## 2. FX 스타일 디테일업 (원본 게임 정합)
- **목표:** 전투 FX(스킬/타격/리치 등)를 원본 게임에 더 가깝게 다듬기.
- **현재:** `BattleEngine.playFX('fx/...')` + `SkillFlows`에서 슬래시/힐/리치 등 FX 재생. 스프라이트·타이밍·스케일이 원본과 일부 차이.
- **참고:** 구체적 차이는 원본 캡처 확보 후 정리. 위치 후보 — `js/views/battleRenderer.js`(FX 드로우), `js/logic/skillRegistry.js`(SkillFlows), `assets/fx/*`.

## 3. 타이틀 화면 — COMPILE 상단 로고/징글 (잔여)
- **완료:** 인트로 시퀀스 원본 정합 구현됨 — BACK 물결 → 回 밴드 좌우 날아듦 → 크림 PAI 산포 → LOGO_REST 차오름 → 중앙 패(빨강 스트레치+차오름 → 은색 모자이크 수렴). 로딩 후 제스처 게이트(클릭/터치/키)로 오프닝 시작(iOS 오디오 언락). 커서 이동 효과음, 오프닝 스킵(최종 상태 스냅). 에셋 `assets/title/*`, `ui/pushok.png`, `ui/logo_compile_1998.png`.
- **잔여:** 원본은 인트로 내내 상단에 핑크 `COMPILE` 로고(`assets/ui/logo_compile.png`)를 띄우고 최종/메뉴 시 사라뜨림. 미구현(보류). 구현 시 ① 픽셀 조립 연출(스탭롤 방식) 또는 ② 단순 페이드인 중 택1. 함께 COMPILE 징글(`bgm_compile.mp3`) 짝 맞춤 가능.
- **참고:** `ref_title2.mp4`(letterbox 없음)가 분석에 가장 적합. 게임 영역은 `ref_title.mp4` 기준 x160–1120 필러박스.

## 4. 별도 튜토리얼 추가 검토
- **목표:** 규칙(패·역·스킬·조작)을 가르치는 별도 튜토리얼 도입 여부 검토.
- **참고:** 도입 시 진입점(타이틀 메뉴?)·범위(인터랙티브 vs 정적 안내) 결정 필요. 우선 "검토" 단계.