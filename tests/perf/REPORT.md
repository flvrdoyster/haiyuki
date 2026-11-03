# haiyuki_web 성능 측정 보고서

측정일 2026-10-31. 측정 코드는 `tests/perf/*.spec.ts` 에만 있다. 원자료는 `tests/perf/results/*.json`(현재 코드), `results/pre-a24228f/`(옛 코드의 트레이스·호출 측정), 트레이스는 `tests/perf/trace.json`(현재 코드, Chrome DevTools Performance 탭에서 열린다).

1~5절은 커밋 `a24228f`(역 판정 개수 벡터 메모 + AI 탐색 배열 복사 제거) **이전** 코드의 측정이다. 그 뒤의 재측정은 0절에 있다.

다시 돌리기(`tests/playwright.config.ts` 가 `perf/**` 를 제외하므로 전용 설정을 쓴다):

```bash
cd haiyuki_web/tests && lsof -ti:3000 | xargs kill; npx playwright test -c perf/playwright.config.ts --project=chromium
```

일부만: `npx playwright test -c perf/playwright.config.ts battle trace hotspots`. 연속 대국 수는 `PERF_MATCHES=10`(기본 3).

파일: `load.spec.ts`(로딩, 3조건) · `battle.spec.ts`(전투 프레임 60초 ×2모드, 연속 대국 힙·메모 크기) · `transitions.spec.ts`(장면 전환) · `trace.spec.ts`(20초 트레이스 + CPU 프로파일) · `hotspots.spec.ts`(함수 래핑 호출 시간). 전체 약 20분, `transitions` 가 7분 가량으로 가장 길다.

## 0. `a24228f` 이후 재측정 (현재 코드)

다시 잰 것은 전투 프레임·트레이스·호출 측정·연속 대국 힙이다. 로딩(1절)은 자원 로딩 코드가 바뀌지 않아 다시 재지 않았고, 장면 전환(3절)도 다시 재지 않았다.

| 지표 (real 모드 60초) | 이전 | 이후 |
|---|---|---|
| p50 / p95 / p99 | 11.0 / 27.2 / 40.7 ms | 12.6 / 26.1 / 26.2 ms |
| 최대 프레임 | 99.2 ms | **42.8 ms** |
| 33ms 초과 프레임 | 59 | **1** |
| 롱태스크(≥50ms) | 61개, 합 3,946ms | **0개** |
| 20초 프로파일 중 idle | 88% | 94.5% |
| 20초 트레이스 `FunctionCall` 합 | 1,846 ms | 379 ms |
| 30초 `checkYaku` 계열 호출 | `checkYaku` 516,529회 | `_evalCounts` 83,385회, 그중 실제 계산(`_evalAnalysis`) 29,121회 |

- autoTest 모드(update×10)도 p95 125.3 → 26.1ms, 롱태스크 409 → 0개, 최대 260.1 → 47.6ms.
- 함수 래핑 측정(부풀린 값)으로 CPU 한 차례(`cpuDraw`)의 최대는 274 → 40.8ms, `decideDiscard` 평균은 168 → 16.6ms.
- 현재 프로파일 상위 self-time 은 `drawImage` 64ms, GC 16ms, `measureText` 14ms, `battleScene.js:214` `update` 14ms, `clearRect` 12ms, `battleRenderer.js:303` `drawBuffIndicators` 12ms 순이다. 모두 20초 중 0.3% 이하라 **전투 중 JS 병목은 더는 없다.**
- 연속 대국 힙(autoTest, 10판, 대국 끝마다 강제 GC): 5.9 → 7.2 → 11.2 → 12.3 → 12.2 → 11.2 → 7.6 → 8.1 → 10.7 → 12.4 → 10.9 MB. 같은 시점의 `YakuLogic._memo` 크기가 6,796 → 94,633 → … → 2,319 → … 로 상한(`MEMO_MAX` 10만)까지 찼다가 비워지는 것과 함께 움직인다. **메모 크기만큼 오르내리는 것이고 누수는 아니다.** 메모가 가득 찼을 때 약 6MB.
- 메모를 비운 직후 차례는 적중이 없어 다시 계산한다. 그 차례가 얼마나 느린지는 따로 재지 않았다. 10판 동안 50ms 넘는 프레임이 0개라 문제로 드러나지는 않았다.

### 로딩 수정 후 (커밋 전 작업 트리)

고친 것: ① 역 일람 iframe 을 `data-src` 로 두고 처음 열 때 `src` 를 채운다(`index.html`, `game.js` 역 일람 버튼, `battleMenuSystem.js` HELP). ② `Assets.bootBgm`(`bgm_compile`·`bgm_title`)만 `canplaythrough` 를 기다리고 나머지 BGM 9개는 요소만 등록해 뒤에서 받는다(`assets.js`).

| 조건 | 수정 전 `onComplete` | 수정 후 `onComplete` | 수정 후 + 폰트 차단(상한) |
|---|---|---|---|
| 로컬 | 670~1,130 | **130~370** | 390 |
| 10Mbps·40ms | 16,270~16,350 | **4,230** | 3,260 |
| 4Mbps·100ms | 40,550~40,600 | **10,570** | 8,000 |

- 수정 후 `load` 이벤트는 10Mbps 0.5초, 4Mbps 1.3초. 요청 실패는 0건(2회씩).
- 남은 시간은 대부분 이미지 141개(2.1MB)와, 같이 받는 폰트·BGM 의 대역폭 나눔이다. 폰트를 줄여서 더 얻을 수 있는 몫은 10Mbps 에서 최대 약 1초, 4Mbps 에서 최대 약 2.6초다(차단 측정 기준 상한).
- 뒤에서 받는 BGM 이 덜 받은 채(`readyState` 1) `playMusic` 되어도, 4Mbps·폰트 차단 조건에서 `play()` 약 0.3초 뒤 재생이 시작됐다(`_yaku_check.spec.ts` 두 번째 테스트). 같은 스펙의 첫 테스트는 iframe 이 로딩 중 요청되지 않고 버튼을 누르면 로드되는지, BGM 요소 11개가 모두 등록되는지 확인한다.
- 기존 회귀 스펙은 `perf/regress.config.ts`(포트 3100)로 돌린다. 다른 세션의 측정이 3000번 서버를 쓰는 중이면 그 서버를 죽이지 않기 위해서다: `npx playwright test -c perf/regress.config.ts battle.spec.ts battle-extended.spec.ts flow.spec.ts input.spec.ts mouse.spec.ts scene-input.spec.ts visual.spec.ts`.

## 측정 환경과 한계

- 헤드리스 Chromium(Playwright 번들), macOS, 개발 서버 `serve`(HTTP/1.1, 로컬 루프백). 한 번에 하나씩 돌렸다.
- **헤드리스 Chromium은 GPU 합성·vsync가 실기기와 다르다.** rAF 간격 p50이 11ms 인 것(60Hz면 16.7ms)이 그 증거이며, 프레임 수·절대 ms를 실기기 값으로 읽으면 안 된다. 다만 JS 실행 시간(롱태스크, 함수 시간)은 이 기계의 CPU 기준으로 의미가 있고, 모바일 CPU에서는 몇 배 느릴 수 있다(재지 않음, 추측).
- 네트워크 제한은 CDP `Network.emulateNetworkConditions` + 캐시 비활성. 폰트(jsdelivr)·iframe(atah.io)은 실제 인터넷을 거쳐 같은 제한에 걸린다.
- 전투 프레임은 두 모드로 쟀다.
  - **real**: `Game.isAutoTest=false`. 실제 플레이와 같은 속도·페이드. P1 차례는 페이지 안 80ms 타이머가 `AutoPlay.performTurn` 으로 대신 둔다(이 호출은 사람이 둘 때는 없는 하네스 비용이다).
  - **autoTest**: `Game.isAutoTest=true`. `Game.loop` 가 프레임당 `update` 를 **10번** 돌리고(`js/core/game.js:325`) 페이드가 없다. 지시서의 `startBattle`+`installAutoDriver` 방식이지만 실제 플레이의 프레임 비용을 대표하지 않는다.

## 1. 로딩

`Assets.toLoad` 는 실제로 **178개**(이미지 141 · BGM 11 · SFX 26)였다. 요청 배경에 적힌 268개/194개와 다르다. 총 전송량은 로컬 기준 **12.6MB**, 그중 mp3 10.5MB(83%), png 2.1MB(17%).

시각은 페이지 이동 시작(`performance.now()`) 기준 ms. 같은 조건을 여러 번 돌렸고 편차는 ±300ms 이내(아래 실패 1회 제외).

| 조건 | `load` 이벤트 | `Assets.load` 시작 | 이미지 전부 | SFX 전부 | 타이틀 BGM 2개 | BGM 11개 전부 = `onComplete` |
|---|---|---|---|---|---|---|
| 로컬(무제한) | 760~930 | 750~920 | 830~1,110 | 790~1,110 | 950~1,130 | **670~1,130** |
| 10Mbps·40ms | 9,270 | 9,260 | 11,860~11,930 | 9,570 | 12,010 | **16,270~16,350** |
| 4Mbps·100ms | 23,100 | 23,100 | 29,650 | 23,870 | 29,950 | **40,550~40,600** |

- **`Assets.load` 는 `load` 이벤트 직후(약 5ms 뒤)에야 시작한다.** `window.onload`(`js/core/game.js:346`)에서 `Game.init` 이 불리고 그 안에서 `LoadingScene` → `Assets.load` 가 돈다. 이미지 141개는 모두 `load` 이벤트 뒤에 요청된다(툴바 CSS 이미지 `ui/on.png`·`ui/off.png` 만 먼저).
- "타이틀 BGM 2개" = `bgm_compile`·`bgm_title`(로딩·타이틀 장면이 쓰는 BGM, `loadingScene.js`·`titleScene.js`)이 `Assets.audio` 에 들어온 시각. 이미지가 끝난 직후다. 나머지 BGM 9개 때문에 `onComplete` 가 4.3초(10Mbps)/10.6초(4Mbps) 더 늦어진다(`js/core/assets.js:286`, `:262`).
- 처음 측정 때 `Assets.load` 호출 시각을 0.2~0.5초로 적었는데, `Assets.loadedCount` 가 처음부터 0으로 정의돼 있어(`assets.js:234`) 스크립트 평가 시각을 잘못 잡은 것이었다. 스펙은 `Game.currentScene` 이 생기는 시각으로 고쳤다.
- **4Mbps 기본 측정 2회 중 1회는 요청 117개가 0바이트로 실패했다**(요청 약 3.5초 뒤 오류). `onComplete` 는 26.7초에 불렸지만 이미지 35/141개, BGM 0/11개였다. 실패한 항목도 `done()` 으로 세기 때문에(`assets.js:292`, `:325`) 게임은 자원이 빠진 채 타이틀로 간다. 원인이 개발 서버·CDP 네트워크 에뮬레이션 쪽인지 브라우저 쪽인지는 **확인하지 않았다**. 이전 측정(같은 조건 5회)에서는 실패가 없었다.

폰트·iframe 요청을 막아 본 결과(Playwright `page.route` 로 중단, 각 1회, `PERF_BLOCK=fonts|iframe|fonts,iframe`):

| 조건 | 변형 | `load` 이벤트 | 이미지 전부 | 타이틀 BGM 2개 | `onComplete` |
|---|---|---|---|---|---|
| 10Mbps·40ms | 그대로 | 9,270 | 11,900 | 12,010 | 16,280 |
| | 폰트 차단 | 1,350 | 3,960 | 4,100 | 8,360 |
| | iframe 차단 | 520 | 4,140 | 4,260 | 9,580 |
| | 둘 다 차단 | 490 | 3,140 | 3,240 | 7,480 |
| 4Mbps·100ms | 그대로 | 23,100 | 29,650 | 29,950 | 40,550 |
| | 폰트 차단 | 3,220 | 9,770 | 10,050 | 20,650 |
| | iframe 차단 | 1,290 | 10,310 | 10,590 | 23,890 |
| | 둘 다 차단 | 1,170 | 7,740 | 8,000 | 18,600 |

- **`load` 이벤트를 늦추는 것은 iframe 이다.** 숨겨진 역 일람 iframe(`index.html:84`, `https://atah.io/haiyuki_manual/index.html#yaku`)이 페이지 시작과 함께 로드되고, 그것이 끝나야 `load` 이벤트가 온다. iframe 만 막아도 10Mbps 에서 `load` 이벤트가 9.3초 → 0.5초가 된다.
- 폰트(`index.html:15-18` `preload`, woff 1.66MB+1.68MB)는 `load` 이벤트를 막지는 않지만 대역폭을 나눠 써서 iframe 과 게임 자원을 함께 늦춘다.
- 폰트를 실제로 뺄 수는 없으므로(캔버스 텍스트가 쓴다) "폰트 차단" 은 폰트 전송량을 줄였을 때의 상한선이다. woff2·글리프 서브셋으로 얼마나 줄어드는지는 **재지 않았다**.
- 로컬에서 타이틀 진입은 약 2.7초(COMPILE 스플래시 연출 포함, `transitions` 로그의 LoadingScene→TitleScene 2,741ms).
- 제한 조건에서 mp3 전송량이 3.0MB 로 찍히는 것(로컬은 10.5MB)은 BGM 이 스트리밍이라 `canplaythrough` 시점에 받은 부분만 리소스 타이밍에 잡히기 때문이다. 나머지는 완료 후에도 백그라운드로 계속 내려받는다(재지 않음).

종류별 합계(로컬):

| 종류 | 개수 | 바이트 |
|---|---|---|
| png | 144 | 2,123,466 |
| mp3 | 37 | 10,493,487 |

가장 큰 자원: `bgm_ending.mp3` 2.79MB, `bgm_tension.mp3` 1.99MB, `bgm_trail.mp3` 1.39MB, `bgm_basic.mp3` 1.33MB, `bgm_chrsel.mp3` 0.82MB, `bgm_showdown.mp3` 0.77MB, `bgm_title.mp3` 0.74MB. 개별 이미지는 모두 60KB 이하.

가장 오래 걸린 20개(로컬)는 전부 동시에 시작한 요청이라 소요 시간이 56~65ms 로 거의 같고 순서에 의미가 없다. 10Mbps 에서는 `bgm_showdown`(6.9s), `bgm_inn`, `lose`, `bgm_chrsel`, `victory`, `bgm_title`(각 6~7s)이 맨 위이고 이미지는 2.3~2.7s. 전체 목록은 `results/load-*.json` 의 `rows`.

관찰:

1. **게임 자원 요청이 iframe 로드가 끝날 때까지 시작하지 않는다.** 순서가 iframe → `load` 이벤트 → `Game.init` → `Assets.load` 로 묶여 있다. 10Mbps 에서 처음 9.3초 동안 게임 자원은 하나도 요청되지 않는다.
2. **폰트 2개가 대역폭을 나눠 쓴다.** 폰트를 막으면 같은 조건에서 `onComplete` 가 16.3초 → 8.4초(10Mbps), 40.6초 → 20.6초(4Mbps).
3. **BGM 대기가 로딩 완료를 늘린다.** 타이틀이 쓰는 BGM 2개는 이미지 직후 들어오는데, 나머지 9개 때문에 4.3초(10Mbps)/10.6초(4Mbps)를 더 기다린다.
4. 위 셋을 다 고친 경우의 근사치: iframe·폰트를 다 막은 측정의 "타이틀 BGM 2개" 시각이 10Mbps 3.2초, 4Mbps 8.0초다(지금은 16.3초, 40.6초). 실제 폰트는 남아야 하므로 실제 효과는 이보다 작다.
5. 로컬에서는 문제가 아니다. 전체가 1초 안쪽에 끝난다.
6. 실제 요청은 178개를 한꺼번에 날린다(`assets.js:265` `forEach`). 서버가 HTTP/2 가 아니면 브라우저가 도메인당 6개로 줄세우는데, 개발 서버는 HTTP/1.1 이라 실서버(HTTP/2 여부 미확인)와 다를 수 있다.

## 2. 전투 프레임 (60초)

| 지표 | real(실제 속도) | autoTest(update×10) |
|---|---|---|
| 프레임 수 | 4,608 | 1,864 |
| 평균 / p50 | 13.0 / 11.0 ms | 32.2 / 15.7 ms |
| p95 | **27.2 ms** | 125.3 ms |
| p99 | 40.7 ms | 148.4 ms |
| 최대 | **99.2 ms** | 260.1 ms |
| 33ms 초과 프레임 | 59 (1.3%) | 434 (23%) |
| 100ms 초과 | 0 | 183 |
| 롱태스크(≥50ms) 수 | **61**, 합 3,946ms | 409, 합 38,057ms |
| `drawImage` 프레임당(평균 / 최대) | 71.9 / 102 | 74.7 / 107 |
| `Assets.get` 프레임당(평균 / 최대) | 69.7 / 99 | 70.0 / 99 |
| 60초 중 끝난 대국 | 0 | 8(이 창에서 재시작) |

- real 모드 롱태스크 61개는 길이 49~112ms. 상태별로는 `STATE_CPU_TURN` 28개(평균 65ms, 최대 112ms), `STATE_FX_PLAYING` 33개(평균 64ms, 최대 87ms). 상태 라벨은 롱태스크가 끝난 뒤에 읽은 값이라 부정확하다. 개수가 CPU 차례(`cpuDraw` 17회/30초) 와 P1 오토플레이(`performTurn` 17회/30초)와 맞아떨어져, FX_PLAYING 쪽은 하네스의 P1 오토플레이로 추정한다(추측). 롱태스크 목록 전체는 `results/battle-real.json` 의 `longtasks`.
- 프레임 시간은 롱태스크와 겹친다: 33ms 초과 59개가 거의 전부 위 롱태스크 구간.
- autoTest 의 큰 수치는 update×10 의 결과이므로 게임이 느리다는 근거가 아니다.

힙(`Performance.getMetrics` `JSHeapUsedSize`, 5초마다):

- real: 7.5 → 12.5 → 12.2 → 9.8 → 13.8 → 14.5 → 8.8 → 10.1 → 12.7 → 18.2 → 13.3 → 8.4 → **7.9MB**. 톱니(스캐빈저 GC)이고 **우상향 없음**.
- autoTest: 7.7~37MB 톱니, 끝 28.9MB 지만 GC 직후 값이 아니라 판단 불가.
- 3판 연속(autoTest, 36초): 대국 끝 시점에 강제 GC 후 힙 = **6.3 → 6.1 → 6.3MB**(시작 5.3MB). 판 사이 누수 징후 없음. 시료가 3개뿐이라 수 MB 단위 이하의 누수는 못 잡는다.

## 3. 장면 전환 (real 모드, 400초 중 실제 진행)

경로: Loading → Title → CharacterSelect → Encounter → Battle → (패배) Continue → Battle. 타임스탬프는 측정 시작 기준 ms.

| 시각 | 장면 |
|---|---|
| 24 | LoadingScene |
| 2,741 | TitleScene |
| 8,487 | CharacterSelectScene |
| 33,854 | EncounterScene |
| 130,404 | BattleScene |
| 297,310 | ContinueScene |
| 301,865 | BattleScene |

- 전체 27,162 프레임: p50 14.1, p95 26.2, 최대 **85.3ms**, **100ms 초과 프레임 0개**. 롱태스크 중 100ms 이상은 2개: ① 페이지 시작 직후 LoadingScene(스크립트 파싱/초기화, 149ms, 시작 전 버퍼된 항목), ② 전투 중 `STATE_CPU_TURN`(131,922ms, 111ms; 위 CPU 차례 연산).
- 즉 장면 전환 순간(페이드 포함)에는 100ms 넘는 프레임이 나오지 않았다. 느린 구간은 전환이 아니라 전투 중 CPU 차례다.
- 이 경로는 사람이 Space 를 눌러 진행한 것과 같은 키 입력으로 돌렸다. 승리 후 CharacterSelect(NEXT_MATCH)·Ending 은 지나지 않았다(미측정).

## 4. 트레이스 / CPU 프로파일 (real 모드 전투 20초)

`Tracing`(`trace.json`, 21MB)과 동시에 `Profiler`(샘플링 200µs)로 쟀다. 20.5초 중 `(idle)` 88%, `(program)` 2.8%. 스크립트 시간은 대부분 `yakuLogic.js`.

상위 self-time 10개 (idle·program 제외; 줄 번호는 프로파일 기준 1-base):

| # | 함수 | 위치 | self ms | 전체 대비 |
|---|---|---|---|---|
| 1 | (anonymous) | `js/logic/yakuLogic.js:140` (`analyzeHand` 의 `forEach` 콜백) | 262 | 1.3% |
| 2 | `checkCounts` | `js/logic/yakuLogic.js:154` | 173 | 0.8% |
| 3 | `analyzeHand` | `js/logic/yakuLogic.js:136` | 112 | 0.5% |
| 4 | `checkYaku` | `js/logic/yakuLogic.js:40` | 99 | 0.5% |
| 5 | `isSunIlSaek` | `js/logic/yakuLogic.js:219` | 86 | 0.4% |
| 6 | `isMayu` | `js/logic/yakuLogic.js:409` | 75 | 0.4% |
| 7 | `isChoMayu` | `js/logic/yakuLogic.js:418` | 70 | 0.3% |
| 8 | `isJinMayu` | `js/logic/yakuLogic.js:307` | 55 | 0.3% |
| 9 | `drawImage` (네이티브) | — | 54 | 0.3% |
| 10 | `checkTypeGroup` | `js/logic/yakuLogic.js:264` | 42 | 0.2% |

- 렌더링 쪽은 `drawImage` 54ms/20초(0.3%) 뿐이다. 이 헤드리스 환경에서 그리기는 병목이 아니다(GPU 합성 비용은 이 측정에 안 잡힐 수 있음).
- autoTest 20초에서도 같은 순위: `analyzeHand` 703ms, `checkYaku` 489ms, `isSunIlSaek` 283ms … (`results/trace-top-auto.json`).
- 트레이스 이벤트 합: real `FunctionCall` 1,846ms · `FireAnimationFrame` 970ms · `TimerFire` 888ms. GC(스캐빈저) 564회 합 33ms 로 무시할 수준.

## 5. 호출 단위 원인 (함수 래핑, real 30초, `results/hotspots.json`)

`YakuLogic`/`AILogic`/`Battle*` 등 객체의 모든 메서드에 `performance.now()` 래퍼를 씌워 쟀다. **래퍼 자체가 51만 번 호출되는 `checkYaku` 에 오버헤드를 더하므로 절대 ms 는 부풀려져 있다.** 순위와 호출 수만 신뢰한다.

| 함수 | 호출 수 | 평균 ms | 최대 ms |
|---|---|---|---|
| `AILogic.decideDiscard` | 34 | 168 (부풀림) | 271 |
| `AILogic.acceptanceInfo` | 408 | 13.9 | 27.6 |
| `YakuLogic.checkTenpai` | 39,050 | 0.15 | 1.4 |
| `YakuLogic.checkYaku` | **516,529** | 0.011 | 0.9 |
| `YakuLogic.checkCounts` | 4,644,783 | ~0 | 0.3 |
| `BattleEngine.cpuDraw` | 17 | 165 | 274 |
| `BattleRenderer.draw` | 1,725 | 0.10 | 20.2 |

- 30초 동안 `checkYaku` 51만 회. 한 번 호출마다 `analyzeHand` 로 `Set`/객체를 새로 만들고 역 판정 함수 약 20개를 돌린다(`yakuLogic.js:40`, `:136`).
- 그리기: `BattleRenderer.draw` 평균 0.10ms, 최대 20ms(첫 프레임의 정적 레이어 생성 `updateStaticLayers` 18ms 포함). 정적 캐시가 제대로 먹고 있다.

## 가장 큰 병목 3개 (근거 포함)

`a24228f` 로 1·2번은 해소되었고, 3번은 iframe 지연 로드와 `bootBgm` 으로 대부분 해소되었다(0절). 남은 것은 폰트 전송량(woff 3.3MB)과 이미지 141개를 한꺼번에 받는 비용이다.

1. **AI 버림패 계산이 메인 스레드를 한 번에 50~110ms 막는다.**
   - 위치: `js/logic/aiLogic.js:21`(`decideDiscard`) → `:47`(`scoreDiscards`) → `:102`(`acceptanceInfo`), 호출처 `js/logic/battleEngine.js:972`(`cpuDraw`, `:881`).
   - 구조: 버릴 패 후보마다 `PaiData.TYPES` 전체를 하나씩 붙여 보고(`:104` 루프), 각각 `checkTenpai`(= 다시 모든 종류 × `checkYaku`)를 부른다. 즉 한 차례에 `checkYaku` 가 약 1.5만 회(51만/34).
   - 증거: 롱태스크 61개/60초(평균 65ms, 최대 112ms), 33ms 초과 프레임 59개가 이 구간. `cpuDraw` 호출 17회 중 17회가 16ms 초과.
   - 이 계산이 이 문제의 거의 전부이고, 시간이 지나도 줄지 않는 반복 비용(차례마다 발생)이다. 실기기(모바일)에서 몇 배인지는 미측정.
2. **`YakuLogic.checkYaku` 의 호출당 할당·중복 계산.**
   - 위치: `js/logic/yakuLogic.js:40`, `:136`(`analyzeHand`), `:154`(`checkCounts`), `is*` 판정 함수들.
   - 증거: 트레이스 상위 10개 중 9개가 이 파일. 호출마다 `analyzeHand` 가 객체·`Set` 을 새로 할당하고 같은 손패를 판정 함수 20여 개가 각각 다시 훑는다. 호출 수 51만/30초는 병목 1 의 결과이므로 둘은 같이 줄어드는 항목이다(캐시/조기 종료가 어디까지 효과 있는지는 **미측정**).
3. **로딩: iframe 이 게임 자원 요청 시작을 막고, 폰트가 대역폭을 나누고, BGM 11개를 전부 기다린다.**
   - 위치: `index.html:84`(숨겨진 역 일람 iframe), `index.html:15-18`(폰트 `preload`), `js/core/game.js:346`(`window.onload` 에서 `Game.init`), `js/core/assets.js:262`·`:286`(BGM 전부의 `canplaythrough` 대기).
   - 증거: 10Mbps 에서 iframe 을 막으면 `load` 이벤트가 9.3초 → 0.5초, 폰트를 막으면 `onComplete` 가 16.3초 → 8.4초. 타이틀 BGM 2개는 이미지 직후 들어오는데 나머지 9개 때문에 4.3초(4Mbps 10.6초) 더 기다린다.
   - 로컬(개발 서버)에서는 1초 미만이라 체감 문제가 아니다. 실서버 환경은 측정하지 않았다.

그 외 측정해 보니 **문제가 아니었던 것**: 힙 증가(없음), 렌더링 비용(`drawImage` 프레임당 약 72회지만 CPU 0.3%), 장면 전환 프레임(100ms 초과 없음), GC(스캐빈저 33ms/20초).

## 한계 / 미측정

- 실기기(특히 모바일 GPU·CPU)에서의 프레임. 헤드리스 합성은 실기기와 다르다.
- 실서버(HTTP/2, CDN, 캐시 헤더)에서의 로딩. 재방문(캐시 적중) 로딩.
- 승리 후 CharacterSelect(NEXT_MATCH)·Ending·Credits 장면의 프레임.
- 스킬 ON(`SKILLS_ENABLED`) 상태: `startBattle` 이 끄기 때문에 모든 측정은 스킬 OFF.
- 폰트를 woff2·서브셋으로 바꿨을 때의 전송량과 로딩 시간.
- 4Mbps 에서 요청 117개가 실패한 원인.
- `_memo` 를 비운 직후 CPU 차례의 비용.
