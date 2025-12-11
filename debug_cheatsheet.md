# Debug / Cheat Sheet

Run these commands in the browser console (F12).

## Save Data Management

### Unlock All Characters (Clear Save)
Unlocks 'mayu' and marks game as cleared.
```javascript
Game.saveData.unlocked.push('mayu');
Game.save();
location.reload();
```

### Reset Save Data
Wipes all progress.
```javascript
Game.saveData = { unlocked: [], clearedOpponents: [] };
Game.continueCount = 0;
Game.save();
location.reload();
```

## Scene Navigation

### Jump to Credits (Normal)
```javascript
Game.changeScene(CreditsScene, { endingType: 'NORMAL' });
```

### Jump to Credits (True)
```javascript
Game.changeScene(CreditsScene, { endingType: 'TRUE' });
```

### Jump to Character Select
```javascript
Game.changeScene(CharacterSelectScene);
```

### Jump to Battle (Test)
Starts a battle between P1 (Ataho) and CPU (Rinxiang).
```javascript
Game.changeScene(BattleScene, { playerIndex: 0, cpuIndex: 1 });
```

## Auto-Test Mode

### Start Auto-Play (Fast Forward)
Let the AI play against itself at 10x speed.
```javascript
Game.startAutoTest();
```

### Start Auto-Lose Test
Starts auto-play with P1 HP set to 1, facilitating a quick Game Over.
```javascript
Game.startAutoLoseTest();
```

### Stop Auto-Play
```javascript
Game.stopAutoTest();
```

## Character Select Debug

### Enable Manual CPU Select
Allows you to select the CPU opponent manually (P2 controls).
```javascript
CharacterSelectScene.isDebug = true;
```

### Skip Dialogue (Direct to Battle)
When enabled in Character Select, choosing characters skips the Encounter dialogue and goes straight to Battle.
```javascript
CharacterSelectScene.debugSkipDialogue = true;
```
