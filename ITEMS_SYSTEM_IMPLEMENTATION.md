# Items System Implementation

## Overview
Implemented a comprehensive TFT-style items system where champions can equip up to 3 items. When 2 basic items are equipped, they automatically combine into a stronger combined item.

## Features Implemented

### 1. Backend Items Data (`apps/backend/src/game/data/items.ts`)
- **8 Basic Items** that can be purchased for 10 gold each:
  - B.F. Sword (+10 AD)
  - Recurve Bow (+5 AD)
  - Needlessly Large Rod (+10 AP)
  - Tear of the Goddess (+20 Max HP)
  - Chain Vest (+10 Physical Resistance)
  - Negatron Cloak (+10 Magic Resistance)
  - Giant's Belt (+30 Max HP)
  - Sparring Gloves (+3 AD, +3 AP)

- **40+ Combined Items** that are created automatically when 2 basic items match a recipe:
  - Example: B.F. Sword + B.F. Sword = Infinity Edge (+25 AD)
  - Example: B.F. Sword + Recurve Bow = Giant Slayer (+15 AD)
  - Example: Needlessly Large Rod + Needlessly Large Rod = Rabadon's Deathcap (+30 AP)
  - Many more combinations available

### 2. Backend Game Logic (`apps/backend/src/game/game.logic.ts`)
Enhanced with item management:
- **`processBuyItem()`**: Handles item purchases, validates gold and champion capacity
- **`checkAndCombineItems()`**: Automatically checks for and combines items when 2 basic items match
- **`applyItemStatsToChampion()`**: Applies item stat bonuses to champions
- **`convertItemEffectsToStats()`**: Converts item effect data to champion stats format

Item Combining Logic:
- When a champion has 2+ items, system checks all pairs for possible combinations
- If a recipe matches, the 2 basic items are removed and replaced with the combined item
- Unique items (e.g., Infinity Edge) can only be equipped once per champion
- System recursively checks for more combinations after each combine

### 3. Backend API (`apps/backend/src/game/game.controller.ts` & `game.service.ts`)
- **New Endpoint**: `POST /games/:gameId/buy-item`
  - Request body: `{ itemId: string, championId: string }`
  - Validates game state, player gold, and champion item capacity
  - Automatically combines items after purchase
  - Updates game state and broadcasts to clients via WebSocket

### 4. Frontend Items Data (`apps/frontend/src/data/items.ts`)
- Mirror of backend basic items for display in shop
- Item metadata includes name, description, cost, and effects

### 5. Frontend UI (`apps/frontend/src/pages/GamePage.tsx`)
Enhanced Chess Detail Panel with:
- **Items Section**: Shows equipped items (0/3) with styled cards
- **Item Shop Section**: 
  - Grid layout with all 8 basic items
  - Each item shows name, description, and cost
  - Click to purchase (disabled when champion has 3 items, insufficient gold, or not player's turn)
  - Only visible for champions owned by current player
  - Helpful tooltips explain why items can't be purchased

Styling Features:
- Consistent with existing game UI design
- Item cards with hover effects
- Gold coin icons for prices
- Visual feedback for disabled states
- Shopping cart icon for shop section
- Responsive grid layout

### 6. Redux Integration (`apps/frontend/src/store/gameSlice.ts`)
- **New Action**: `buyItem`
  - Async thunk that calls the backend API
  - Handles loading states and errors
  - Game state updates via WebSocket after successful purchase

## How It Works (User Flow)

1. **During Gameplay**: Player clicks on one of their champions
2. **Chess Detail Panel Opens**: Shows champion stats, abilities, and equipped items
3. **Item Shop Appears**: Shows 8 basic items available for purchase (10 gold each)
4. **Purchase Item**: Player clicks on an item to buy it
   - Gold is deducted
   - Item is added to champion
   - Stats are immediately updated
5. **Automatic Combining**: If 2 items match a recipe, they instantly combine
   - Example: Buy B.F. Sword → Buy another B.F. Sword → Auto-combines to Infinity Edge
   - Champion now has 1 combined item slot and 2 empty slots
6. **Build Strategy**: Players can create powerful item combinations by buying the right basic items

## Technical Details

### Item System Architecture
```
Backend:
- items.ts: Item definitions and recipes
- game.logic.ts: Item purchasing, combining, and stat application
- game.service.ts: API handler with game state management
- game.controller.ts: REST endpoint

Frontend:
- items.ts: Item shop data
- GamePage.tsx: UI for item shop and display
- gameSlice.ts: Redux action for purchasing
- WebSocket: Real-time game state updates
```

### Stat Application
Items add to base champion stats:
- AD (Attack Damage)
- AP (Ability Power)
- Max HP (Maximum Health)
- Physical Resistance
- Magic Resistance

When items are equipped, stats are recalculated and displayed with modifiers visible in the UI.

### Unique Items
Some powerful combined items have the "unique" flag:
- Can only have 1 copy per champion
- Prevents combining if champion already has that unique item
- Examples: Infinity Edge, Rabadon's Deathcap, Warmog's Armor

## Game Balance

### Economy
- Basic items cost 10 gold each
- Players earn 3 gold per turn
- Must strategize between buying items and saving gold
- Items provide significant stat boosts for the cost

### Strategy
- Items can turn the tide of battle with powerful stat bonuses
- Combined items are much stronger than 2 separate basic items
- Players must decide which champions to itemize
- 3-item limit per champion encourages strategic choices

## Future Enhancements (Potential)

1. **Item Icons**: Add visual icons for each item
2. **Item Tooltips**: Show combined item recipes in shop
3. **Item Selling**: Allow selling items back for partial refund
4. **Item Transfer**: Move items between champions
5. **Special Effects**: Add unique passive/active abilities to items
6. **Item Tiers**: Different item qualities (common, rare, epic, legendary)
7. **Consumable Items**: One-time use items with powerful effects

## Testing Recommendations

1. **Test Item Purchase**:
   - Select a champion
   - Verify shop appears only for owned champions
   - Buy an item and verify gold deduction
   - Check champion stats update correctly

2. **Test Item Combining**:
   - Buy 2 identical basic items (e.g., 2x B.F. Sword)
   - Verify they auto-combine into Infinity Edge
   - Check that champion has 1 combined item and 2 empty slots

3. **Test Item Limit**:
   - Buy 3 items for a champion
   - Verify shop items are disabled
   - Check tooltip explains "Champion has maximum items"

4. **Test Turn Restriction**:
   - Verify items can only be bought on your turn
   - Check opponent's champions don't show item shop

5. **Test Gold Restriction**:
   - Spend gold until below 10
   - Verify shop items are disabled
   - Check tooltip explains "Not enough gold"

## Build Status
✅ Backend builds successfully
✅ Frontend builds successfully
✅ No linter errors

## Files Modified/Created

### Backend
- ✅ Created: `apps/backend/src/game/data/items.ts`
- ✅ Modified: `apps/backend/src/game/game.logic.ts`
- ✅ Modified: `apps/backend/src/game/game.controller.ts`
- ✅ Modified: `apps/backend/src/game/game.service.ts`

### Frontend
- ✅ Created: `apps/frontend/src/data/items.ts`
- ✅ Modified: `apps/frontend/src/pages/GamePage.tsx`
- ✅ Modified: `apps/frontend/src/store/gameSlice.ts`

## Ready for Testing
The items system is now fully implemented and ready for testing. Start the servers manually:
- Backend: `npm run start:dev --workspace=apps/backend`
- Frontend: `npm run dev --workspace=apps/frontend`

Then play a game and try purchasing items for your champions!

