# Item Purchase Fix & UI Improvement

## Issues Fixed

### 1. Item Purchase Not Working ❌ → ✅
**Problem**: Clicking item buttons in the chess detail section did nothing.

**Root Cause**: The buy-item functionality was using a REST API endpoint, but the game state updates are handled via WebSocket. The REST endpoint didn't broadcast updates to connected clients.

**Solution**:
- Added WebSocket handler `@SubscribeMessage("buy-item")` in `game.gateway.ts`
- Added `buyItem()` function to `useWebSocket.ts` hook
- Updated `useGame.ts` to export the WebSocket `buyItem` function
- Updated `GamePage.tsx` to use WebSocket instead of REST API
- Game state now updates in real-time for all connected players

### 2. Item Shop UI Redesign 📦 → 🎨
**Problem**: Shop displayed full item descriptions, taking up too much space and looking cluttered.

**Solution**: Completely redesigned to TFT-style icon grid with tooltips

## Changes Made

### Backend (`apps/backend/src/game/game.gateway.ts`)
Added WebSocket handler for buying items:
```typescript
@SubscribeMessage("buy-item")
async handleBuyItem(
  @MessageBody() data: { gameId: string; itemId: string; championId: string },
  @ConnectedSocket() client: Socket
)
```
- Authenticates user via socket mapping
- Calls `gameService.buyItem()`
- Broadcasts updated game state to all players in room
- Sends error messages back to client on failure

### Frontend Hook (`apps/frontend/src/hooks/useWebSocket.ts`)
Added `buyItem` function:
```typescript
const buyItem = (itemId: string, championId: string) => {
  socketRef.current.emit("buy-item", { gameId, itemId, championId });
};
```
- Emits WebSocket event instead of HTTP request
- Returns the function in hook's return object

### Game Hook (`apps/frontend/src/hooks/useGame.ts`)
- Destructured `buyItem: wsBuyItem` from `useWebSocket()`
- Exported `buyItem: wsBuyItem` in return object

### UI (`apps/frontend/src/pages/GamePage.tsx`)

#### Updated Handler
```typescript
const handleBuyItem = useCallback((itemId: string, championId: string) => {
  if (!gameId || !isMyTurn || !buyItemWS) return;
  buyItemWS(itemId, championId);
}, [gameId, isMyTurn, buyItemWS]);
```
- Simplified to call WebSocket function directly
- Removed Redux dispatch and error handling (handled by WebSocket)

#### New Icon-Based Shop UI
**Before**: Text-heavy cards with names, descriptions, and costs
**After**: Icon grid (6 columns) with hover tooltips

**Features**:
- **Icon Display**: 
  - Square icons with 1:1 aspect ratio
  - Gradient background
  - Gold border on hover
  - Cost badge in bottom-right corner
  - Fallback text (first 2 letters) if image not found

- **Visual States**:
  - Disabled: 40% opacity + grayscale filter
  - Hover: Scales to 105%, lifts up, glowing shadow
  - Cost badge: Black background with gold border

- **Tooltips**:
  - Appear on hover above the icon
  - Show item name (gold), description, and cost
  - Dark background with gold border
  - Smooth fade-in animation
  - z-index: 1000 to appear above everything

- **Responsive**:
  - 6 columns on normal screens
  - Adapts to available space
  - Icons scale proportionally

#### Styling Details
```css
.shop-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.shop-item-icon {
  width: 100%;
  aspect-ratio: 1;
  background: gradient;
  border: 2px solid var(--border);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.shop-item-tooltip {
  position: absolute;
  bottom: 100%;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
}

.shop-item-container:hover .shop-item-tooltip {
  opacity: 1;
  visibility: visible;
}
```

## How It Works Now

### Item Purchase Flow

1. **Player clicks item icon**
   ```
   User clicks → handleBuyItem() → buyItemWS()
   ```

2. **WebSocket emits event**
   ```
   Frontend: socket.emit("buy-item", { gameId, itemId, championId })
   ```

3. **Backend processes**
   ```
   GameGateway receives event
   → Validates user authentication
   → Calls GameService.buyItem()
   → Processes purchase (deduct gold, add item, combine if needed)
   → Returns updated game state
   ```

4. **Broadcast update**
   ```
   server.to(gameId).emit("game-state", { game: updatedGame })
   ```

5. **All clients receive update**
   ```
   Frontend: socket.on("game-state")
   → Update gameState
   → UI re-renders with new items and gold amount
   ```

### Tooltip Interaction

1. **Mouse hover on icon**
   ```
   CSS :hover triggers
   → Tooltip opacity: 0 → 1
   → Tooltip visibility: hidden → visible
   → Transform: translateY(-5px) → translateY(0)
   ```

2. **Tooltip displays**
   - Item name in gold
   - Description in white
   - Cost with coin icon

3. **Mouse leave**
   ```
   :hover state ends
   → Tooltip fades out smoothly
   ```

## Testing Recommendations

### 1. Test Item Purchase
- ✅ Select your champion
- ✅ Verify shop shows 11 item icons (including new stats items)
- ✅ Hover over icon to see tooltip
- ✅ Click icon to buy item (gold should deduct, item should appear)
- ✅ Verify game state updates in real-time

### 2. Test WebSocket Connection
- ✅ Two players in same game
- ✅ Player 1 buys item
- ✅ Player 2 sees Player 1's gold decrease
- ✅ Both players see updated game state

### 3. Test UI States
- ✅ **Sufficient gold**: Icon normal, clickable, tooltip shows
- ✅ **Insufficient gold**: Icon grayed out (40% opacity), disabled
- ✅ **3 items equipped**: All icons disabled
- ✅ **Not your turn**: All icons disabled
- ✅ **Opponent's champion**: Shop doesn't appear

### 4. Test Item Images
- ✅ Add item images to `/public/items/` folder
- ✅ Use exact filenames from items.ts (e.g., `BFSword.png`, `RecurveBow.png`)
- ✅ If image missing: Fallback to 2-letter text (e.g., "BF", "RB")

### 5. Test Tooltips
- ✅ Hover shows tooltip above icon
- ✅ Tooltip doesn't clip off screen (may need adjustments for edge items)
- ✅ Tooltip disappears on mouse leave
- ✅ Multiple tooltips don't stack/overlap

## File Structure for Item Images

```
apps/frontend/public/items/
├── BFSword.png
├── RecurveBow.png
├── NeedlesslyRod.png
├── TearOfTheGoddess.png
├── ChainVest.png
├── NegatronCloak.png
├── GiantBelt.png
├── SparringGloves.png
├── Pickaxe.png (NEW)
├── Cloak.png (NEW)
└── Gloves.png (NEW)
```

Image requirements:
- **Format**: PNG with transparency
- **Size**: 64x64 or 128x128 pixels
- **Style**: Match League of Legends item aesthetic
- **Fallback**: If missing, shows first 2 letters of item name

## Build Status
✅ **Backend builds successfully**  
✅ **Frontend builds successfully**  
✅ **No linter errors**  
✅ **WebSocket integration complete**  
✅ **UI redesigned with icons and tooltips**

## Files Modified

### Backend
- ✅ `apps/backend/src/game/game.gateway.ts` - Added buy-item WebSocket handler

### Frontend
- ✅ `apps/frontend/src/hooks/useWebSocket.ts` - Added buyItem function
- ✅ `apps/frontend/src/hooks/useGame.ts` - Export buyItem from WebSocket
- ✅ `apps/frontend/src/pages/GamePage.tsx` - Icon UI + WebSocket integration

## Ready for Testing

The item purchase system now works properly via WebSocket with real-time updates!

Start the servers and test:
```bash
npm run start:dev --workspace=apps/backend
npm run dev --workspace=apps/frontend
```

Try buying items and watch both players' screens update simultaneously! 🎮

