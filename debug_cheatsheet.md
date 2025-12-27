# Debug / Cheat Sheet

Run these commands in the browser console (F12).

## Save Data Management

### Unlock All Characters (Clear Save)
**Prerequisite**: Anytime.
Unlocks 'mayu' and marks game as cleared.
```javascript
Game.saveData.unlocked.push('mayu');
Game.save();
location.reload();
```

### Reset Save Data
**Prerequisite**: Anytime.
Wipes all progress.
```javascript
Game.saveData = { unlocked: [], clearedOpponents: [] };
Game.continueCount = 0;
Game.save();
location.reload();
```

## Scene Navigation

### Jump to Credits (Normal)
**Prerequisite**: Anytime.
```javascript
Game.changeScene(CreditsScene, { endingType: 'NORMAL' });
```

### Jump to Credits (True)
**Prerequisite**: Anytime.
```javascript
Game.changeScene(CreditsScene, { endingType: 'TRUE' });
```

### Jump to Character Select
**Prerequisite**: Anytime.
```javascript
Game.changeScene(CharacterSelectScene);
```

### Trigger Mayu Intrusion (Challenge)
**Prerequisite**: Anytime.
Triggers the "A NEW CHALLENGER" sequence with Mayu (눈썹개).
```javascript
Game.triggerMayu();
```

### Jump to Battle (Test)
**Prerequisite**: Anytime.
Starts a battle between P1 (Ataho) and CPU (Rinxiang).
```javascript
Game.changeScene(BattleScene, { playerIndex: 0, cpuIndex: 1 });
```

## Auto-Test Mode

### Start Auto-Play (Fast Forward)
**Prerequisite**: Must be in `BattleScene`.
Let the AI play against itself at 10x speed.
```javascript
Game.startAutoTest();
```

### Start Auto-Lose Test
**Prerequisite**: Must be in `BattleScene`.
Starts auto-play with P1 HP set to 1, facilitating a quick Game Over.
```javascript
Game.startAutoLoseTest();
```

### Stop Auto-Play
**Prerequisite**: Must be in `BattleScene`.
```javascript
Game.stopAutoTest();
```

## Character Select Debug

### Enable Manual CPU Select
**Prerequisite**: In `CharacterSelectScene`.
Allows you to select the CPU opponent manually (P2 controls).
```javascript
CharacterSelectScene.isDebug = true;
```

### Skip Dialogue (Direct to Battle)
**Prerequisite**: In `CharacterSelectScene`.
When enabled in Character Select, choosing characters skips the Encounter dialogue and goes straight to Battle.
```javascript
CharacterSelectScene.debugSkipDialogue = true;
```

## Battle Logic Debug

### Test Last Chance (Roulette)
**Prerequisite**: Must be in `BattleScene`.
Injects Petum's skills and MP to P1 (regardless of selected character), forces Turn 20, and sets a Tenpai hand.
1. Run command during player turn.
2. Discard the 'Punch' tile.
3. Nagari Trigger -> Last Chance Prompt.
```javascript
BattleEngine.testLastChance();
```

### Instant Tsumo Setup (Win Cheat)
**Prerequisite**: Must be in `BattleScene`.
Sets your hand to "입에 담을 수도 없는 엄청난 기술" (IP_E_DAM).
1. Run command during your turn.
2. Declare **TSUMO** immediately from the menu.
```javascript
debugWin();
```
