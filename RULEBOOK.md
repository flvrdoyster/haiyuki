# Haiyuki Game Rules (Rulebook)

> [!IMPORTANT]
> **Priority Directive**: Haiyuki is based on Mahjong but follows its own distinct rules.
> **This document is the absolute source of truth.**
> If a rule is not strictly defined here, **DO NOT** invent or assume it based on standard Mahjong rules.
> Follow the logic defined below above all else.

This document serves as the single source of truth for the game's rules and logic. 
**ALL** future code changes must verify against this rulebook.

## 1. General Gameplay Flow
- **Turn Limit**: The game lasts for a maximum of **20 Turns** per round.
- **Round Limit**: The match ends when one side's HP reaches 0 or after a set number of rounds (e.g., 3 rounds).
- **Turn Phase**:
  1. **Draw Phase**: Active player draws 1 tile. (Total Hand: 12)
  2. **Action Phase**: Check for Self-Actions (Tsumo, Riichi).
  3. **Discard Phase**: Active player discards 1 tile. (Total Hand: 11)
  4. **Reaction Phase**: Opponent checks for reactions (Ron, Pon).

## 2. Hand Structure
- **Max Hand Size**: 11 tiles held, 12th tile is the drawn/winning tile.
- **Pon Mechanics**: A player (or CPU) must skip the Draw phase immediately after calling Pon. (Hand stays at 11 -> Discard -> 11).

## 3. Riichi Mechanics (Custom)
- **Condition**: 
  - Player must be **Menzen** (Closed Hand / No Open Sets).
  - Player must be **Tenpai** (Ready Hand: 1 tile away from winning).
  - Remaining turns must be sufficient (e.g., < 20 turns).
- **Effect**:
  - **BGM Changes**: Music intensifies.
  - **Locked Hand**: Hand composition generally cannot be changed.
  - **Cost**: Declaring Riichi costs **0 points** (No 1000 point deposit required).
- **Manual Discard (User Requirement)**:
  - **Declaration Turn**: When declaring Riichi, the player **CAN** manually choose which tile to discard.
  - **Subsequent Turns**: After Riichi is established, the game enters **Auto Mode** (Tsumogiri) where drawn tiles are automatically discarded unless a Tsumo win occurs.
  - **Constraint**: The chosen discard during declaration **MUST** maintain the Tenpai status.
  - **Validation**: If a chosen discard would break Tenpai, it is **blocked** (invalid).
  - **Visuals**: Invalid tiles are darkened/tinted to indicate they cannot be selected.

## 4. Winning Conditions
- **Yaku Required**: A valid Yaku (e.g., Combination, All Stars, Mayu, Sam-Yeon-Gyeok) is required to win.

### Tsumo (Self-Draw Win)
- Can be declared if the drawn tile completes the hand with a Yaku.
- **Auto-Action**: In Riichi state, if Tsumo is available, it is often auto-executed (or highly prioritized).

### Ron (Discard Win) - **CRITICAL CUSTOM RULE**
- **Constraint**: A player (or CPU) can **ONLY** declare Ron if they are in **Riichi** state.
  - *Implication*: You cannot Ron with a Damaten (Silent Tenpai) hand.
  - *Implication*: You cannot Ron if you have called Pon (since Open Hands cannot Riichi).
- **Exception**: This is a strict deviation from standard Mahjong rules, implemented for gameplay balance/design reasons.
- **No Furiten**: The "Furiten" rule (cannot Ron if you previously discarded the winning tile) **does not exist**. You can Ron on any valid tile if you are in Riichi, regardless of your discard history.

## 5. Called Actions (Naki)
### Pon
- **Condition**: Pair in hand matches opponent's discard.
- **Effect**:
  - Discard is taken.
  - Hand becomes **Open** (Menzen Lost).
  - **Riichi Disabled**: Since hand is open, Riichi is impossible.
  - **Ron Disabled**: Since Ron requires Riichi (per Custom Rule), calling Pon effectively removes the ability to win by Ron. You can only win by Tsumo.
- **Turn Flow**: After Pon, the player skips the Draw phase and must discard immediately.

### Unavailable Actions
- **Chi (치)**: Does not exist in this game ruleset.
- **Kan (깡)**: Does not exist in this game ruleset.

## 6. Draw Game (Nagari)
- Occurs if Turn Count reaches 20 without a winner.
- Hand verification (Tenpai/Noten) determines the result (or simple Draw).

## 7. AI Logic Note
- **Discard Priority**: AI prioritizes keeping Tenpai.
- **Riichi Priority**: AI will declare Riichi if conditions are met and profile allows.
- **Pon Logic**: AI will Pon if it has a pair and the profile/difficulty settings encourage it.

## 8. Scoring & Damage
- **Direct Damage**: The final score of a hand is applied directly as damage to the opponent's HP.
- **Open Hand Penalty**: If the winning hand is **Open** (not Menzen), the total score is reduced to **75%**.
- **Symmetry**: ALL rules (Scoring, Riichi conditions, Open Hand penalties, etc.) apply identically to both the **Player** and the **CPU**.

## 9. Bonuses
- **Dora**: +1 Bonus count per matching visible Dora tile.
- **Ura Dora**: +1 Bonus count per matching hidden Dora tile.
  - **Condition**: Only applies if the winner is in **Riichi** state.
  - **Constraint**: The Ura Dora tile **MUST** be different from the visible Dora tile type (Color + Type). If the same tile is rolled, it is re-rolled.
- **Special Bonuses (800 pts)**:
  - **Tenho**: Winning by Tsumo on the very first turn.
  - **Haitei**: Winning by Tsumo on the last turn (Turn 20).
  - **Houtei**: Winning by Ron on the last turn (Turn 20).
