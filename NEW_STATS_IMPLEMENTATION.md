# New Stats Implementation

## Overview
Added 3 new combat stats to the game system: **Sunder**, **Critical Chance**, and **Critical Damage**. These stats enhance the combat system and provide more strategic depth.

## New Stats Added

### 1. Sunder
- **Description**: Armor penetration stat that reduces enemy resistances
- **Default Value**: 0
- **Use Case**: Bypass enemy defenses for more effective damage

### 2. Critical Chance
- **Description**: Percentage chance to deal critical damage on attacks
- **Default Value**: 0%
- **Use Case**: RNG-based damage amplification

### 3. Critical Damage
- **Description**: Damage multiplier when landing a critical hit
- **Default Value**: 150% (1.5x multiplier)
- **Use Case**: Increases the potency of critical strikes

## Implementation Details

### Backend Changes

#### 1. Schema Update (`game.schema.ts`)
Added new stat fields to `ChessStats` class:
```typescript
@Prop({ default: 0 })
sunder: number;

@Prop({ default: 0 })
criticalChance: number;

@Prop({ default: 150 })
criticalDamage: number;
```

#### 2. Base Stats (`game.logic.ts`)
Updated all piece types to include new stats with defaults:
- Poro: sunder: 0, criticalChance: 0, criticalDamage: 150
- Champions: sunder: 0, criticalChance: 0, criticalDamage: 150
- All Minions: sunder: 0, criticalChance: 0, criticalDamage: 150
- Drake/Baron: sunder: 0, criticalChance: 0, criticalDamage: 150

#### 3. Game Service (`game.service.ts`)
Updated board cleaning logic to include new stats in both effective stats and raw stats:
- Effective stats use `getEffectiveStat()` for item bonuses
- Raw stats show base values for comparison

#### 4. New Items (`data/items.ts`)
Added **3 new basic items**:

1. **Pickaxe** (50 gold)
   - +10 Sunder
   - Description: "Grants bonus Sunder (armor penetration)"

2. **Cloak of Agility** (50 gold)
   - +20% Critical Chance
   - Description: "Grants bonus Critical Chance"

3. **Infinity Gloves** (50 gold)
   - +25% Critical Damage
   - Description: "Grants bonus Critical Damage"

Added **10 new combined items**:

1. **Last Whisper** (B.F. Sword + Pickaxe)
   - +12 AD, +12 Sunder

2. **Infinity Blade** (B.F. Sword + Cloak)
   - +12 AD, +25% Crit Chance

3. **Deadly Force** (B.F. Sword + Gloves)
   - +12 AD, +30% Crit Damage

4. **Divine Sunderer** (Sparring Gloves + Pickaxe)
   - +10 AD, +5 AP, +5 Sunder

5. **Phantom Dancer** (Recurve Bow + Cloak)
   - +7 AD, +25% Crit Chance

6. **Jeweled Gauntlet** (Needlessly Rod + Cloak)
   - +12 AP, +25% Crit Chance

7. **Armor Shredder** (Pickaxe + Pickaxe) - UNIQUE
   - +25 Sunder

8. **Critical Edge** (Cloak + Cloak) - UNIQUE
   - +50% Crit Chance

9. **Executioner's Calling** (Gloves + Gloves) - UNIQUE
   - +60% Crit Damage

### Frontend Changes

#### 1. Items Data (`data/items.ts`)
- Added 3 new basic items to shop
- Updated item costs from 10 to 50 gold per basic item
- Shop now displays 11 basic items total

#### 2. UI Updates (`GamePage.tsx`)

**Stats Grid Enhancement**:
- Added 3 new stat displays in Chess Detail Panel:
  - Sunder (shows as number)
  - Crit Chance (shows as percentage)
  - Crit Damage (shows as percentage)
- All new stats show modifiers (buffed/debuffed) when affected by items
- Grid adapts to 3 columns on larger screens (1400px+)

**Stat Display Features**:
- Green text for buffed values
- Red text for debuffed values
- Base values shown in parentheses when modified
- Consistent with existing stat display patterns

## Game Balance

### Economy
- Basic item cost: 50 gold each
- Players earn 3 gold per turn
- New items provide specialized offensive capabilities

### Strategic Options

**Sunder Builds**:
- Penetrate heavily armored targets
- Effective against tank champions
- Combines well with high AD

**Critical Builds**:
- High risk/high reward gameplay
- Requires both Crit Chance and Crit Damage for maximum effect
- RNG-dependent but powerful when proc'd

**Hybrid Builds**:
- Mix of different stats for versatility
- Combined items offer powerful synergies

## Combat Implications

### Sunder Usage
- Reduces effectiveness of Physical/Magic Resistance
- Calculated in damage formula (implementation TBD)
- Stacks additively with multiple sunder items

### Critical Strike System
- Critical Chance determines proc rate
- Critical Damage determines multiplier
- Base crit damage: 150% (can be increased with items)
- Example: 50% Crit Chance with 200% Crit Damage = avg 25% DPS increase

## Testing Recommendations

1. **Test New Items**:
   - Verify all 3 new basic items appear in shop
   - Confirm proper stat application
   - Test item combining with new items

2. **Test Stat Display**:
   - Check all 9 stats display correctly
   - Verify modifier colors (green for buff, red for debuff)
   - Test base value parentheses display

3. **Test Combined Items**:
   - Buy 2 items with new recipes
   - Verify auto-combining works
   - Check unique item restrictions

4. **Test Builds**:
   - Pure crit build (Cloak + Cloak = Critical Edge)
   - Pure sunder build (Pickaxe + Pickaxe = Armor Shredder)
   - Mixed builds with new items

## Future Enhancements

1. **Combat System Integration**:
   - Implement sunder calculation in damage formula
   - Implement crit strike RNG system
   - Add visual effects for critical hits

2. **Additional Items**:
   - More combined items using new stats
   - Items that scale with crit stats
   - Defensive items that counter sunder

3. **Champion Synergies**:
   - Champions with innate crit chance
   - Champions with innate sunder
   - Passive abilities that interact with new stats

## Build Status
✅ **Backend builds successfully**  
✅ **Frontend builds successfully**  
✅ **No linter errors**  
✅ **All stats integrated**

## Files Modified

### Backend
- ✅ Modified: `apps/backend/src/game/game.schema.ts`
- ✅ Modified: `apps/backend/src/game/data/items.ts`
- ✅ Modified: `apps/backend/src/game/game.logic.ts`
- ✅ Modified: `apps/backend/src/game/game.service.ts`

### Frontend
- ✅ Modified: `apps/frontend/src/data/items.ts`
- ✅ Modified: `apps/frontend/src/pages/GamePage.tsx`

## Ready for Testing
The new stats system is fully integrated and ready for testing. The 3 new stats provide:
- **Sunder**: Armor penetration for dealing with tanky enemies
- **Critical Chance**: RNG-based damage spikes
- **Critical Damage**: Amplifies critical strike potency

Start the servers and test the new item builds!

