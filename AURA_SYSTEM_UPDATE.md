# Aura System Update

## Overview
The aura mechanism has been updated to use a debuff-based system instead of directly modifying stats. This provides better consistency, trackability, and flexibility.

## Changes Made

### 1. **ChessObject Class** (`apps/backend/src/game/class/chess.ts`)

#### Removed:
- `getAuraEffectsForChess()` - No longer needed as auras now apply debuffs

#### Modified:
- `getEffectiveStat()` - Removed direct aura stat modification; now only reads from debuffs
- `processDebuffs()` - Now skips aura debuffs (IDs starting with "aura_") to prevent duration reduction

#### Added:
- `createAuraDebuff(aura, casterPlayerId)` - Creates a debuff from an aura definition
- `applyAuraDebuffs()` - Applies aura debuffs to all units in range
- `cleanupExpiredAuraDebuffs()` - Removes aura debuffs when units move out of range

### 2. **GameLogic Class** (`apps/backend/src/game/game.logic.ts`)

#### Added:
- `applyAuraDebuffs(game)` - Applies all active auras as debuffs, called during `postProcessGame()`

#### Modified:
- `postProcessGame()` - Now calls `applyAuraDebuffs()` after clearing dead chess and before starting next round

### 3. **Aura Test** (`apps/backend/src/game/test/aura-test.ts`)

#### Updated:
- Test now calls `applyAuraDebuffs()` before checking effective stats
- Added debuff information to test output

### 4. **Frontend GamePage** (`apps/frontend/src/pages/GamePage.tsx`)

#### Modified:
- Debuff display now checks for `duration === -1` and shows "Duration: Active (Aura)" instead of showing a turn count

## How It Works

### Before (Direct Stat Modification):
1. Champion with aura exists on the board
2. When getting effective stats, the system checks all pieces with auras
3. Aura effects are calculated and applied on-the-fly
4. Stats are modified directly during calculation

### After (Debuff-Based System):
1. Champion with aura exists on the board
2. During `postProcessGame()`, the system applies aura debuffs to all units in range
3. Aura debuffs have infinite duration (-1) and are NOT reduced by `processDebuffs()`
4. When a unit moves out of range, the aura debuff is removed by `cleanupExpiredAuraDebuffs()`
5. Stats are modified by debuffs (auras now use the same system as other status effects)
6. Aura debuffs are identified by their ID prefix `"aura_"` and are managed separately

## Benefits

1. **Consistency**: Auras use the same system as other status effects (Ashe's Frost Shot, Teemo's Toxic Shot, etc.)
2. **Visibility**: Aura effects are visible as debuffs in the game state
3. **Debugging**: Easier to track which auras are affecting which units
4. **Performance**: Stat calculation is simpler (only reads debuffs, no range checking)
5. **Flexibility**: Auras can now be easily extended with additional properties (damage over time, healing, etc.)

## Example: Janna's Aura

### Aura Definition (champion.ts):
```typescript
aura: {
  id: "janna_tailwind",
  name: "Tailwind",
  description: "Grants +1 Move Speed to adjacent allied chess pieces",
  range: 1,
  effects: [{ stat: "speed", modifier: 1, type: "add", target: "allies" }],
  active: true,
  requiresAlive: true,
  duration: "permanent",
}
```

### Resulting Debuff:
```typescript
{
  id: "aura_janna_tailwind",
  name: "Tailwind",
  description: "Grants +1 Move Speed to adjacent allied chess pieces",
  duration: -1,  // Infinite - not reduced by processDebuffs()
  maxDuration: -1,
  effects: [{ stat: "speed", modifier: 1, type: "add" }],
  unique: true,
  appliedAt: Date.now(),
  casterPlayerId: "janna_owner_id"
}
```

## Testing

To test the aura system:
```bash
cd apps/backend
npm run build
node -e "require('./dist/game/test/aura-test').testAuraSystem()"
```

## Migration Notes

- Existing aura definitions in `champion.ts` work without changes
- Frontend displays aura debuffs the same as other debuffs
- Aura debuffs are automatically cleaned up when:
  - The aura source dies (if `requiresAlive: true`)
  - The target moves out of range
  - The aura is deactivated

## Important Implementation Details

### Why Aura Debuffs Skip `processDebuffs()`

Aura debuffs are special because:
1. They should persist as long as the unit is in range
2. Their duration should NOT be reduced each turn
3. They are managed by `cleanupExpiredAuraDebuffs()` instead

To achieve this, the `processDebuffs()` method now checks if a debuff ID starts with `"aura_"` and skips it:

```typescript
processDebuffs(chess: ChessObject): void {
  for (let i = chess.chess.debuffs.length - 1; i >= 0; i--) {
    const debuff = chess.chess.debuffs[i];

    // Skip aura debuffs - they are managed by cleanupExpiredAuraDebuffs()
    if (debuff.id.startsWith("aura_")) {
      continue;
    }

    // ... rest of the debuff processing logic
  }
}
```

This ensures that:
- Regular debuffs (Frost Shot, Toxic Shot, etc.) have their duration reduced each turn
- Aura debuffs remain active as long as the unit is in range
- When a unit moves out of range, `cleanupExpiredAuraDebuffs()` removes the aura debuff

## Future Improvements

1. Add visual indicators to distinguish aura debuffs from regular debuffs in the UI
2. Add aura stacking rules (e.g., multiple speed auras)
3. Add aura priority system (e.g., stronger auras override weaker ones)
4. Add aura categories (buff vs debuff) for better organization

