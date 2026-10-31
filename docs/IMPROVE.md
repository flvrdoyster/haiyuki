# 패유기 개선 사항 리스트

남은 개선 과제만 정리. 완료되어 제외된 항목은 git 히스토리 참조.

## 1. AI 난이도 + 캐릭터 성격 — 튜닝 잔여
6축(`aiProfile`) 분리와 행동 지문 측정은 완료(`tests/_ai_fingerprint.spec.ts`, 결과 `tests/fingerprint-results.json`).
- 스킬 `aiScore` 버킷이 공격/방어 공용이라 거침 — 개별 스킬 타이밍 정교화 여지.
- 수치 밸런스 미튜닝(축 분리는 검증됐고, 값이 적절한지는 별개).

## 2. FX 스타일 디테일업 (원본 게임 정합)
- **목표:** 전투 FX(스킬/타격/리치 등)를 원본 게임에 더 가깝게 다듬기.
- **현재:** `BattleEngine.playFX('fx/...')` + `SkillFlows`에서 슬래시/힐/리치 등 FX 재생. 스프라이트·타이밍·스케일이 원본과 일부 차이.
- **참고:** 구체적 차이는 원본 캡처 확보 후 정리. 위치 후보 — `js/views/battleRenderer.js`(FX 드로우), `js/logic/skillRegistry.js`(SkillFlows), `assets/fx/*`.

## 3. 별도 튜토리얼 추가 검토
- **목표:** 규칙(패·역·스킬·조작)을 가르치는 별도 튜토리얼 도입 여부 검토.
- **참고:** 도입 시 진입점(타이틀 메뉴?)·범위(인터랙티브 vs 정적 안내) 결정 필요. 우선 "검토" 단계.

## 4. 코드 구조 리팩토링 — 잔여
구조/제약은 STRUCTURE.md 참조. 완료분은 git 히스토리.
- `battleEngine.js`(~1700줄)의 `updateBattleMusic`/`showPopup`/`setExpression`을 이벤트 발행으로 — 발화 타이밍이 한 프레임 밀릴 수 있어 순수 이동이 아님. 착수 시 사운드 스파이(`getSfxIds`)로 발화 순서를 전후 비교할 것.
- `checkActionButton`/`checkExchangeButton`의 rect를 온디맨드 계산으로 바꿔 그리기 의존을 끊을지 검토. 바꾸면 `mouse.spec.ts`의 "그리기 전 false" 단언 갱신.
- ESM 전환은 테스트 하네스 재작성을 동반하므로 보류.

## 5. 테스트 안전망 — 잔여
- EndingScene/CreditsScene/EncounterScene 확인키는 실제 키 입력 테스트 없음(씬을 `update()` 직접 호출로만 구동).
- FX 이징·수명을 직접 단언하는 테스트 없음. 전투 테스트가 스폰과 `isBlocking` 게이팅을 간접적으로 지날 뿐.
- 전체 스위트 간헐 실패의 기전 미확정(`retries: 1`로 실용 대응). 조사한다면 30분 타임박스.
