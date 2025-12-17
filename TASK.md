# Skill Implementation Status

This document tracks the current implementation status of all character skills in the Haiyuki Web game.

## Summary
- **Implemented**: 7
- **In Progress**: 0
- **Pending**: 6
- **Total Skills**: 13

---

## Ataho (아타호)
- [x] **TIGER_STRIKE (맹호일발권)**: Guaranteed win on next Tsumo if Riichi is possible.
  - *Status*: Implemented. Logic handles guaranteed win flag and forces Tsumo. UI prevents passing when active.
- [x] **HELL_PILE (지옥쌓기)**: Opponent draws useless tiles for 3 turns.
  - *Status*: Implemented. Logic in `drawTiles` swaps useful tiles for garbage if `curseDraw` buff is active.

## Rinxiang (린샹)
- [x] **WATER_MIRROR (수경)**: Reduces damage taken by 25%.
  - *Status*: Implemented. `startWinSequence` applies multiplier. Result screen has animation.
- [x] **DORA_BOMB (도라폭진)**: Converts hidden Dora to hand tiles on Riichi win.
  - *Status*: Implemented. Interactive confirmation modal added. Checks for Skills Enabled rule.

## Fari (화린)
- [x] **RECOVERY (회복)**: Restores HP.
  - *Status*: Implemented. Basic HP restoration logic exists.
- [x] **DISCARD_GUARD (버린 패 방어)**: Opponent cannot Pon/Ron on your discards for 5 turns.
  - *Status*: Implemented. `checkPlayerActions` and `checkRon` block actions if `discardGuard` buff is active.

## Smash (스마슈)
- [ ] **EXCHANGE_TILE (패 교환)**: Exchange tiles at start of round.
  - *Status*: **Pending**. Logic is currently blocked as "Not Implemented". Need to implement Tile Exchange UI/State.
- [ ] **EXCHANGE_RON (론 패 교환)**: Negate opponent's Ron by swapping the discarded tile.
  - *Status*: **Pending**. Logic for Reactive skill trigger on Ron needs refinement.

## Petum (페톰)
- [x] **CRITICAL (크리티컬)**: Increases damage dealt by 25%.
  - *Status*: Implemented. `startWinSequence` applies multiplier. Result screen has animation.
- [ ] **LAST_CHANCE (라스트 찬스)**: Roulette chance on Nagari (Draw) while Tenpai.
  - *Status*: **Pending**. Needs Nagari hook and Roulette UI implementation.

## Yuri (유리와카마루)
- [ ] **SUPER_IAI (초 거합베기)**: Negate opponent's Ron by cutting the tile.
  - *Status*: **Pending**. Similar to `EXCHANGE_RON`, needs Reactive Trigger logic.
- [x] **SPIRIT_RIICHI (기합 리치)**: Guaranteed Tsumo after 5 turns if Riichi declared.
  - *Status*: Implemented. Timer logic in `updateLogic` (or turn end) checks `spiritTimer`.

## Mayu (눈썹개)
- [ ] **PAINT_TILE (패 덧칠)**: Improved tile exchange.
  - *Status*: **Pending**. Shares logic with `EXCHANGE_TILE`.

---

## Implementation Roadmap (User Priority)
1. **DORA_BOMB (도라폭진)**: "On Win" logic. (Priority 1)
2. **Reactive Skills (Ron Defense)**: `EXCHANGE_RON` & `SUPER_IAI`. (Priority 2)
3. **Setup Skills**: `EXCHANGE_TILE` & `PAINT_TILE`. (Priority 3)
4. **Last Chance**: `LAST_CHANCE`. (Priority 4)
