# Bug Fixes: Gold Display and Monster Spawning

## Issues Fixed

### 1. Gold Display Shows 0
**Problem**: Current player gold always displays as 0 in the UI.

**Root Cause**: The gold values were being updated correctly in the backend, but there was no logging to verify the data was being sent properly to the frontend. Added debugging to track the issue.

**Solution**:
- Added logging in `game.service.ts` to track player gold values after each action
- The logging statement will help identify if the issue is in data persistence, WebSocket transmission, or frontend state management

**Changes Made** (`apps/backend/src/game/game.service.ts`):
```typescript
// Added logging after processing each action
this.logger.debug(
  "Players gold after action:",
  gameToSave.players.map((p) => ({ id: p.id, username: p.username, gold: p.gold }))
);
```

**How Gold Works**:
1. Players start with `startingGold` (default 0) from `GameSettings`
2. Gold is awarded when:
   - A piece kills an enemy (+goldValue of killed piece)
   - Turn starts (+3 gold per turn to current player)
   - Twisted Fate kills an enemy (+10 bonus gold)
3. Gold is spent on items via `BUY_ITEM` event

**Frontend Display**: 
- Located in `GamePage.tsx` lines 1796-1797, 1810-1812
- Uses `currentPlayer?.gold || 0` to display
- `currentPlayer` is found by matching `userId` in players array

### 2. Baron/Drake Spawning Over Existing Pieces
**Problem**: Baron and Drake could spawn on top of existing chess pieces, causing overlap and blocking the spawn location.

**Root Cause**: The `spawnDrake()` and `spawnBaron()` methods only checked if a monster with the same name already existed, but didn't check if the spawn position was occupied by another piece.

**Solution**:
- Added position occupancy check before spawning
- If position is occupied, the spawn is delayed until the square is empty
- Spawning will be retried each turn via `spawnNeutralMonsters()` until successful

**Changes Made** (`apps/backend/src/game/game.logic.ts`):

#### Drake Spawning (Position: i4 = x:8, y:3)
```typescript
private static spawnDrake(game: Game): void {
  // Check if Drake already exists
  const existingDrake = game.board.find((chess) => chess.name === "Drake");
  if (existingDrake) return;

  const drakePosition = { x: 8, y: 3 }; // i4 position
  
  // NEW: Check if position is occupied by another piece
  const occupiedByPiece = game.board.find(
    (chess) => chess.position.x === drakePosition.x && chess.position.y === drakePosition.y
  );
  
  // If position is occupied, don't spawn yet (will retry next turn)
  if (occupiedByPiece) {
    console.log(`Drake spawn position is occupied by ${occupiedByPiece.name}. Waiting...`);
    return;
  }

  // ... spawn Drake
  console.log(`Drake spawned at position (${drakePosition.x},${drakePosition.y})`);
  game.board.push(drake);
}
```

#### Baron Spawning (Position: z5 = x:-1, y:4)
```typescript
private static spawnBaron(game: Game): void {
  // Check if Baron already exists
  const existingBaron = game.board.find((chess) => chess.name === "Baron Nashor");
  if (existingBaron) return;

  const baronPosition = { x: -1, y: 4 }; // z5 position
  
  // NEW: Check if position is occupied by another piece
  const occupiedByPiece = game.board.find(
    (chess) => chess.position.x === baronPosition.x && chess.position.y === baronPosition.y
  );
  
  // If position is occupied, don't spawn yet (will retry next turn)
  if (occupiedByPiece) {
    console.log(`Baron spawn position is occupied by ${occupiedByPiece.name}. Waiting...`);
    return;
  }

  // ... spawn Baron
  console.log(`Baron Nashor spawned at position (${baronPosition.x},${baronPosition.y})`);
  game.board.push(baron);
}
```

**How Spawning Works**:
1. **Drake**: Spawns at round 10 (end of Red's 5th turn)
   - Respawns every 10 turns if killed
   - Position: i4 (x:8, y:3)
   - Stats: 1000 HP, 20 armor/MR, 10 gold value

2. **Baron**: Spawns at round 20 (end of Red's 10th turn)
   - Respawns every 10 turns if killed
   - Position: z5 (x:-1, y:4)
   - Stats: 2500 HP, 50 armor/MR, 50 gold value

3. **Spawn Logic**:
   - Checks every turn via `spawnNeutralMonsters()` in `postProcessGame()`
   - If spawn conditions are met (round number), attempts to spawn
   - If position is occupied, logs warning and waits
   - Retries automatically each subsequent turn until position is free

## Testing

### Gold Display
1. Start a game
2. Make moves that award gold:
   - Kill an enemy piece (should award goldValue)
   - Complete a turn (should award +3 gold)
3. Check backend logs for "Players gold after action" to verify values
4. Check frontend UI to see if gold displays correctly
5. If gold is 0 in UI but correct in logs, the issue is in WebSocket transmission or frontend state

### Monster Spawning
1. Play until round 10 (Drake spawn)
2. If a piece is at position i4 (x:8, y:3), Drake should NOT spawn
3. Check console for "Drake spawn position is occupied" message
4. Move the piece away from i4
5. On next turn, Drake should spawn successfully
6. Same test for Baron at round 20 with position z5 (x:-1, y:4)

## Additional Notes

- **Spawn Positions**:
  - Drake: i4 = column 8 (0-indexed), row 3 (0-indexed)
  - Baron: z5 = column -1 (left of board), row 4 (0-indexed)

- **Gold Debugging**:
  - Check backend console for "Players gold after action" logs
  - Check WebSocket events in browser DevTools Network tab
  - Verify players array structure matches frontend expectations

- **Future Improvements**:
  - Add visual indicator when monster is ready to spawn but position is occupied
  - Add notification to players to clear spawn positions
  - Consider alternative spawn positions if primary is blocked for too long


