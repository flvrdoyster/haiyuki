# Debug / Cheat Sheet

Run these in the browser console (F12). Every cheat is a **bare function**, all
defined in `js/core/debug.js`. Just type the function name and call it.

## On-screen Debug Overlay (`?debug`)

Add `?debug` to the URL → a fixed strip at the top mirrors every `console.*` log
**and uncaught errors** (for debugging on a phone where devtools isn't available).
Close it with the ✕ button. Without `?debug` the overlay does nothing.

```
http://localhost:3000/haiyuki_web/?debug
```

The game emits structured event logs you can watch there (or in devtools):
`[Draw]` · `[Discard]` · `[Pon]` · `[Exchange]` · `[Skill]` · `[Round]` (win/nagari:
yaku · damage) · `[Damage]` (HP) · `[Match]` (winner · HP).

## State Snapshot (read-only)

`window.__haiyuki__` is a deeply-frozen snapshot of the current game state
(`state`, `p1`/`cpu` hp/mp/hand/tenpai, `actions`, `board`, `winningYaku`). It never
mutates the game — used by the Playwright tests.

```javascript
window.__haiyuki__
window.__haiyuki__.p1.isTenpai
window.__haiyuki__.actions.canRon
```

## Cheats

All are bare functions — call from the console anytime unless noted.

### Save data
```javascript
unlockMayu()   // unlock the hidden boss (Mayu) as a selectable character + reload
resetSave()    // wipe all progress + reload
```

### Scene navigation
```javascript
toCredits()           // 스탭롤(크레딧) 보기 — 엔딩 구분 없이 공통
toCharSelect()
toBattle(0, 1)        // (playerIndex, cpuIndex) — default Ataho vs Rinxiang
```

### Hidden boss (Mayu) intrusion
```javascript
challengerTest()    // arm the FULL sequence, then pick any non-Mayu character:
                    //   char-select confirm → ending dialogue → "HERE COMES A NEW
                    //   CHALLENGER" flash → masked monologue → ??? masked battle.
                    //   Forces the condition regardless of clear/unlock (save untouched).
```

### Auto-test (Prerequisite: in `BattleScene`)
```javascript
autoTest()    // AI vs AI at 10× speed
autoLose()    // auto-play with P1 HP = 1 (quick Game Over)
stopAuto()
```

### Battle (Prerequisite: in `BattleScene`, during your turn)
```javascript
lastChance()  // inject Petum's skills + Tenpai hand + Turn 20, then discard 'Punch'
              //   → Nagari → Last Chance prompt
win()         // set hand to IP_E_DAM ("입에 담을 수도 없는 엄청난 기술"), then declare TSUMO
```
