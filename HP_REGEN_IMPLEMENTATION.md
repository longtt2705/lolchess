# HP Regeneration (hpRegen) Stat Implementation

## Overview
This document describes the implementation of the new `hpRegen` stat for chess pieces, which allows pieces to regenerate HP at the start of each turn.

## Changes Made

### 1. Backend Changes

#### a. Schema Definition (`apps/backend/src/game/game.schema.ts`)
- Added `hpRegen` property to `ChessStats` class
- Default value: 0
- Type: number
- Description: HP regenerated per turn

#### b. Base Stats (`apps/backend/src/game/game.logic.ts`)
- Added `hpRegen: 0` to all piece base stats:
  - Poro
  - Champion
  - Siege Minion
  - Melee Minion
  - Caster Minion
  - Super Minion

#### c. Regeneration Logic (`apps/backend/src/game/class/chess.ts`)
- Implemented HP regeneration in the `preEnterTurn` method
- Regeneration happens at the start of each turn for the active player's pieces
- Uses the existing `heal()` method to apply regeneration
- Respects healing modifiers (wounded debuff, spirit visage item)
- Code location: Lines 430-434

```typescript
// Apply HP Regeneration
const hpRegen = this.getEffectiveStat(this.chess, "hpRegen");
if (hpRegen > 0) {
  this.heal(this, hpRegen);
}
```

#### d. Champion Data (`apps/backend/src/game/data/champion.ts`)
- Added `hpRegen: 2` to Rammus (as an example of a champion with passive healing)
- Other champions default to 0 (inheriting from base Champion stats)

### 2. Frontend Changes

#### a. Type Definitions (`apps/frontend/src/hooks/useGame.ts`)
- Added `hpRegen?: number` to both `stats` and `rawStats` interfaces in `ChessPiece`
- Marked as optional to maintain backward compatibility

#### b. Database Display (`apps/frontend/src/pages/DatabasePage.tsx`)
- Added `hpRegen` icon mapping (uses HP icon)
- Added conditional display of HP Regen stat in champion cards
- Only displays if `hpRegen > 0`
- Label: "HP/Turn"
- Position: Added to the stats grid

### 3. Documentation Changes

#### RULE.md
- Added HP Regen to the list of piece attributes
- Description: "The amount of HP regenerated at the start of each turn. Default is 0."

## How It Works

1. **Turn Start**: When a player's turn begins, all their pieces call `preEnterTurn()`
2. **Stat Check**: The effective `hpRegen` stat is calculated (including item bonuses, debuffs, etc.)
3. **Healing**: If `hpRegen > 0`, the piece heals for that amount
4. **Healing Modifiers**: The heal respects existing game mechanics:
   - Reduced by 50% if the piece has the "wounded" debuff
   - Increased by 30% if the piece has Spirit Visage item
   - Cannot exceed max HP

## Integration with Existing Systems

### Healing System
- Uses the existing `heal()` method in `ChessObject`
- Benefits from Spirit Visage item (+30% healing)
- Affected by Grievous Wounds/Wounded debuff (-50% healing)

### Stat System
- Uses `getEffectiveStat()` to calculate effective HP regen
- Can be modified by items, auras, and debuffs
- Integrates seamlessly with the existing stat calculation system

### Auras and Items
Items can now provide `hpRegen` bonus, for example:
```typescript
{
  stat: 'hpRegen',
  value: 3,
  type: 'add'
}
```

## Example Champions

### Rammus
- Base HP Regen: 2 per turn
- Synergizes with his defensive passive
- Passive description mentions "heals for 10% of his physical resistance each turn"

### Future Champions
Other champions that could benefit from `hpRegen`:
- Garen (already has conditional healing passive)
- Mundo (could have high HP regen)
- Soraka (support healer)
- Warmog's Armor item (could provide HP regen)

## Testing Notes

1. **Build Status**: ✅ Both backend and frontend build successfully
2. **Linter**: ✅ No linter errors
3. **Type Safety**: ✅ All TypeScript types properly updated

## Future Enhancements

1. **Items with HP Regen**: Consider adding items that provide HP regen bonus
2. **Conditional Regen**: Some champions could have HP regen that only activates under certain conditions
3. **Percentage-based Regen**: Could add `hpRegenPercent` for % max HP healing
4. **Combat vs Non-Combat**: Could differentiate between in-combat and out-of-combat regen

## Files Modified

1. `apps/backend/src/game/game.schema.ts`
2. `apps/backend/src/game/game.logic.ts`
3. `apps/backend/src/game/class/chess.ts`
4. `apps/backend/src/game/data/champion.ts`
5. `apps/frontend/src/hooks/useGame.ts`
6. `apps/frontend/src/pages/DatabasePage.tsx`
7. `RULE.md`

## Migration Notes

- **Backward Compatibility**: The stat is optional and defaults to 0, so existing games will continue to work
- **Database**: Existing pieces will default to 0 HP regen
- **No Breaking Changes**: All changes are additive

---

Implementation completed successfully on October 25, 2025.

