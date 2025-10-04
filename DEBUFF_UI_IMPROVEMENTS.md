# Debuff UI Improvements

## Overview
The debuff/status effect UI has been completely redesigned to be more beautiful, informative, and consistent with the game's theme. The new design matches the skill card layout and includes champion skill icons.

## Changes Made

### 1. **Backend Schema Update** (`apps/backend/src/game/game.schema.ts`)

#### Added:
- `casterName?: string` - Optional field to store the champion name of the debuff caster

### 2. **Backend Debuff Creation** (Multiple champion classes)

#### Updated Files:
- `apps/backend/src/game/class/chess.ts` - `createAuraDebuff()`
- `apps/backend/src/game/class/ashe.ts` - `createFrostShotDebuff()`
- `apps/backend/src/game/class/teemo.ts` - `createToxicShotDebuff()`
- `apps/backend/src/game/class/viktor.ts` - `createEmpoweredAttackDebuff()`
- `apps/backend/src/game/class/janna.ts` - `createSpeedBoostDebuff()`

All debuff creation methods now include:
```typescript
casterName: this.chess.name
```

### 3. **Game Service Update** (`apps/backend/src/game/game.service.ts`)

Added `casterName` to the debuff data sent to the frontend.

### 4. **Frontend UI Redesign** (`apps/frontend/src/pages/GamePage.tsx`)

#### New Debuff Card Features:

1. **Icon Display**
   - Shows the caster champion's skill icon (e.g., `/icons/ashe_skill.webp`)
   - Fallback icons for when caster is unknown: ✨ (aura), ⬆ (buff), ⬇ (debuff)
   - Icon is 48x48px with rounded corners and border

2. **Header Layout**
   - Similar to skill cards with icon + info layout
   - Shows debuff name prominently
   - Displays source champion: "From: [Champion Name]"
   - Shows duration with emoji: 🌟 for auras, ⏱ for timed effects

3. **Color-Coded Types**
   - **Regular Debuffs**: Red gradient (`rgba(239, 68, 68)`)
   - **Aura Effects**: Gold gradient (`rgba(250, 204, 21)`)
   - **Buff Effects**: Green gradient (`rgba(34, 197, 94)`)

4. **Effect Tags**
   - Each stat modification shown as a small tag
   - Color-coded: Green for positive, Red for negative
   - Format: `STAT +/-VALUE`
   - Example: `SPEED -1`, `AD +15`

5. **Special Effects Display**
   - Damage per turn: `💥 8 magic dmg/turn`
   - Heal per turn: `💚 5 heal/turn`

6. **Hover Effects**
   - Smooth transitions
   - Border color intensifies
   - Slight lift animation (`translateY(-1px)`)
   - Glow shadow matching the debuff type color

#### CSS Classes:
```css
.debuff-card                // Base debuff card
.debuff-card.aura-debuff   // Gold styling for auras
.debuff-card.buff-debuff   // Green styling for buffs
.debuff-card-header        // Header with icon + info
.debuff-icon               // 48x48 icon container
.debuff-info               // Info section (name, source, duration)
.debuff-source             // "From: Champion" text
.debuff-effects            // Container for effect tags
.effect-tag                // Individual stat modification
.effect-tag.positive       // Green tag for positive effects
.effect-tag.negative       // Red tag for negative effects
```

## Visual Examples

### Debuff Card Layout:
```
┌─────────────────────────────────────┐
│  ┌────┐  Frost Shot                │
│  │🎯  │  FROM: ASHE                 │
│  │icon│  ⏱ 3 turns left             │
│  └────┘                             │
│  ────────────────────────────────── │
│  Slowed by Ashe's frost arrows...  │
│  ┌─────────┐                        │
│  │ SPEED -1│                        │
│  └─────────┘                        │
└─────────────────────────────────────┘
```

### Aura Card Layout:
```
┌─────────────────────────────────────┐
│  ┌────┐  Tailwind                  │ ← Gold border
│  │✨  │  FROM: JANNA                │
│  │icon│  🌟 Active (Aura)           │
│  └────┘                             │
│  ────────────────────────────────── │
│  Grants +1 Move Speed to adjacent  │
│  allied chess pieces                │
│  ┌─────────┐                        │
│  │ SPEED +1│ ← Green tag            │
│  └─────────┘                        │
└─────────────────────────────────────┘
```

## Benefits

1. **Visual Clarity**: Icons instantly show which champion applied the debuff
2. **Consistency**: Matches the skill card design pattern
3. **Information Dense**: Shows all relevant info (source, duration, effects) at a glance
4. **Color Coding**: Easy to distinguish between debuffs, buffs, and auras
5. **Responsive**: Smooth hover effects provide feedback
6. **Beautiful**: Modern design with gradients, shadows, and animations

## Technical Details

### Icon Naming Convention:
- Pattern: `/icons/{championname}_skill.webp`
- Example: `ashe_skill.webp`, `janna_skill.webp`, `teemo_skill.webp`
- Champion name is lowercase with spaces removed

### Fallback Handling:
If the skill icon doesn't exist, the UI gracefully falls back to emoji icons:
- ✨ for aura effects
- ⬆ for buffs (positive modifiers)
- ⬇ for debuffs (negative modifiers)

### Duration Display Logic:
```typescript
if (duration === -1) {
  "🌟 Active (Aura)"
} else {
  "⏱ {duration} turn{s} left"
}
```

### Status Color Logic:
```typescript
const isAura = debuff.duration === -1;
const isBuff = debuff.effects?.some(e => e.modifier > 0);
const debuffClass = isAura ? 'aura-debuff' : (isBuff ? 'buff-debuff' : '');
```

## Future Enhancements

1. Add animation when debuffs are applied/removed
2. Add tooltips with detailed stat breakdowns
3. Add debuff type icons (poison, slow, stun, etc.)
4. Add progress bars for duration visualization
5. Group similar debuffs (e.g., multiple Toxic Shot stacks)
6. Add debuff priority/importance indicators

## Testing

To test the new debuff UI:
1. Start a game with champions that have debuffs (Ashe, Teemo, Janna, Viktor)
2. Apply debuffs by attacking or using skills
3. Click on a champion with debuffs to view the detail panel
4. Verify icons, colors, and effects are displayed correctly
5. Test hover effects for smooth transitions
6. Verify fallback icons work when skill icon doesn't exist

## Notes

- The section title was changed from "Debuffs" to "Status Effects" to better reflect that it includes both positive and negative effects
- All builds complete successfully with no linter errors
- The design follows the existing CSS variable system for consistency


