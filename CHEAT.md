# 디버그 / 치트

브라우저 콘솔(F12)에서 실행. 전부 `js/core/debug.js`에 정의된 전역 함수 — 이름만 치면 된다.

## 화면 위 디버그 오버레이 (`?debug`)

URL에 `?debug`를 붙이면 상단 띠에 모든 `console.*` 로그와 잡히지 않은 에러가 표시된다(devtools를 못 여는 폰용). ✕로 닫는다. `?debug` 없으면 아무 동작 안 함.

```
http://localhost:3000/haiyuki_web/?debug
```

게임이 찍는 구조화 로그: `[Draw]` · `[Discard]` · `[Pon]` · `[Exchange]` · `[Skill]` · `[Round]`(승리/나가리: 역 · 데미지) · `[Damage]`(HP) · `[Match]`(승자 · HP).

## 상태 스냅샷 (읽기 전용)

`window.__haiyuki__`는 현재 게임 상태(`state`, `p1`/`cpu`의 hp/mp/hand/tenpai, `actions`, `board`, `winningYaku`)의 깊은 동결 스냅샷. 게임을 바꾸지 않는다 — Playwright 테스트가 쓴다.

```javascript
window.__haiyuki__
window.__haiyuki__.p1.isTenpai
window.__haiyuki__.actions.canRon
```

## 치트

### 세이브
```javascript
unlockMayu()   // 히든 보스(마유)를 선택 가능하게 해금 + 새로고침
resetSave()    // 진행 전부 초기화 + 새로고침
```

### 씬 이동
```javascript
toCredits()           // 스탭롤(크레딧) — 엔딩 구분 없이 공통
toCharSelect()
toBattle(0, 1)        // (playerIndex, cpuIndex) — 기본 아타호 vs 린샹
```

### 히든 보스(마유) 난입
```javascript
challengerTest()    // 전체 시퀀스 준비 → 마유 아닌 캐릭터 아무나 선택:
                    //   캐릭터 선택 확정 → 엔딩 대화 → "HERE COMES A NEW CHALLENGER"
                    //   → 가면 모놀로그 → ??? 가면 보스전.
                    //   클리어/해금 여부와 무관하게 강제(세이브는 안 건드림).
```

### 자동 테스트 (`BattleScene` 안에서)
```javascript
autoTest()    // AI vs AI, 10배속
autoLose()    // P1 HP 1로 자동 플레이(빠른 게임오버)
stopAuto()
```

### 전투 (`BattleScene` 안, 내 턴에)
```javascript
lastChance()  // 페톰 스킬 + 텐파이 손패 + 20턴 주입 후 'Punch' 버림
              //   → 나가리 → 라스트 찬스 프롬프트
win()         // 손패를 IP_E_DAM("입에 담을 수도 없는 엄청난 기술")으로 → 쯔모 선언
```
