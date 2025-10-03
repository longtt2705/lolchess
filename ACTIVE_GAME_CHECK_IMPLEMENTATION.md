# Active Game Check Implementation

## Overview
This document describes the implementation of a system that prevents users from finding matches when they're already in an active game, and provides a button to return to their current game.

## Features Implemented

### 1. Backend Changes

#### Game Controller (`apps/backend/src/game/game.controller.ts`)
- Added new endpoint `GET /games/active-game?userId=<userId>` to check if a user has an active game
- Returns game data with `hasActiveGame` flag

#### Game Service (`apps/backend/src/game/game.service.ts`)
- Added `getActiveGameForUser(userId: string)` method
- Queries for games where the user is a player (bluePlayer or redPlayer)
- Only considers games with status `ban_pick` or `in_progress`
- Returns the active game or null

#### Queue Gateway (`apps/backend/src/game/queue.gateway.ts`)
- Modified `joinQueue` handler to check for active games before allowing queue entry
- If user has an active game, emits `alreadyInGame` event with game data
- Prevents duplicate queue entries for users already in matches

### 2. Frontend Changes

#### Redux Store (`apps/frontend/src/store/gameSlice.ts`)
- Added `activeGame` field to GameState
- Created `fetchActiveGame` async thunk to fetch active game from backend
- Added `setActiveGame` reducer action
- Updated Game interface to include `ban_pick` status and `phase` field

#### Queue Hook (`apps/frontend/src/hooks/useQueue.ts`)
- Fetches active game on mount when user is authenticated
- Listens for `alreadyInGame` socket event
- Updates Redux store with active game data when received

#### Game Lobby Page (`apps/frontend/src/pages/GameLobbyPage.tsx`)
- Shows "Active Game Alert" card when user has an active game
- Displays prominent "Return to Game" button
- Disables "Find Match" button when user is already in a game
- Prevents queue joining if active game exists
- Navigates to correct page (ban-pick or game) based on game status

#### Home Page (`apps/frontend/src/pages/HomePage.tsx`)
- Displays active game banner at the top when user has an ongoing match
- Shows "Return to Game" button in banner
- Fetches active game status on mount
- Navigates to correct page based on game status/phase

## User Flow

### Scenario 1: User tries to find match while in game
1. User is in an active game (ban-pick or in-progress)
2. User navigates to lobby and clicks "Find Match"
3. Backend checks for active game in `joinQueue` handler
4. Backend emits `alreadyInGame` event to client
5. Frontend shows error toast and updates active game state
6. "Find Match" button is disabled, "Return to Game" alert is shown

### Scenario 2: User returns to site with active game
1. User logs in or refreshes page
2. Frontend fetches active game status via `fetchActiveGame`
3. If active game exists, it's stored in Redux
4. Home page and lobby show "Return to Game" options
5. User can click to navigate back to their game

### Scenario 3: User finishes game
1. Game status changes to "finished"
2. Game is no longer returned by `getActiveGameForUser`
3. User can now find new matches normally

## API Endpoints

### GET /games/active-game
**Query Parameters:**
- `userId` (string): The user's ID to check for active games

**Response:**
```json
{
  "game": {...},
  "hasActiveGame": true,
  "message": "Active game found"
}
```

## Socket Events

### Client → Server
- `joinQueue`: Attempts to join matchmaking queue (now checks for active game)

### Server → Client
- `alreadyInGame`: Emitted when user tries to queue but has an active game
  ```json
  {
    "game": {...},
    "message": "You are already in an active game..."
  }
  ```

## UI Components

### Active Game Alert (Lobby)
- Prominent card with blue gradient border
- Alert icon and message
- "Return to Game" button
- Replaces normal queue interface when active

### Active Game Banner (Home)
- Horizontal banner at top of page
- Alert icon, title, and description
- "Return to Game" button on right
- Only shown for authenticated users with active games

### Disabled Find Match Button
- Grayed out when active game exists
- Shows "Already in Game" text
- Cursor changes to "not-allowed"
- Shows error toast on click attempt

## Database Queries

The active game check uses MongoDB query:
```typescript
{
  $or: [
    { bluePlayer: userId },
    { redPlayer: userId }
  ],
  status: { $in: ["ban_pick", "in_progress"] }
}
```

This efficiently finds any active game where the user is a participant.

## Navigation Logic

When returning to game, the system navigates based on:
- If `status === 'ban_pick'` OR `phase === 'ban_phase'` OR `phase === 'pick_phase'`:
  → Navigate to `/ban-pick/:gameId`
- Otherwise:
  → Navigate to `/game/:gameId`

This ensures users always land on the correct page for their game state.

## Testing Checklist

- [ ] User with no active game can find matches normally
- [ ] User with active game cannot join queue
- [ ] Active game banner shows on home page
- [ ] Active game alert shows on lobby page
- [ ] "Return to Game" button navigates correctly to ban-pick page
- [ ] "Return to Game" button navigates correctly to game page
- [ ] Active game state clears when game finishes
- [ ] Multiple browser tabs show consistent active game state
- [ ] Error messages are clear and helpful
- [ ] Socket reconnection maintains active game state

## Future Enhancements

Possible improvements:
1. Add timeout to automatically remove stale active games
2. Add "Abandon Game" button with confirmation
3. Show game timer/duration in active game alerts
4. Add opponent name to active game notifications
5. Implement game spectator mode for finished games
6. Add push notifications for turn-based actions


