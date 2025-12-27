# LOL Chess Game Engine Migration Guide

This document outlines the migration plan to extract a pure, framework-agnostic game engine from the current NestJS-coupled implementation. Follow each phase sequentially.

---

## Table of Contents

1. [Current Architecture Overview](#current-architecture-overview)
2. [Target Architecture](#target-architecture)
3. [Phase 1: Extract Pure Types](#phase-1-extract-pure-types)
4. [Phase 2: Make Game Logic Pure](#phase-2-make-game-logic-pure)
5. [Phase 3: Add Seeded RNG](#phase-3-add-seeded-rng)
6. [Phase 4: Create Engine Package](#phase-4-create-engine-package)
7. [Phase 5: Add Simulation & Replay](#phase-5-add-simulation--replay)
8. [Challenges & Solutions](#challenges--solutions)
9. [Testing Strategy](#testing-strategy)

---

## Current Architecture Overview

The game logic is located in `apps/backend/src/game/` with the following structure:

```
apps/backend/src/game/
├── game.schema.ts       # Mongoose schemas + TypeScript types (COUPLED)
├── game.logic.ts        # Core game processing (has side effects)
├── game.service.ts      # NestJS service (database, caching)
├── game.gateway.ts      # WebSocket gateway
├── game.controller.ts   # REST API endpoints
├── class/
│   ├── chess.ts         # Base ChessObject class
│   ├── chessFactory.ts  # Factory for champion instantiation
│   ├── aatrox.ts        # Champion implementations
│   ├── ahri.ts
│   ├── yasuo.ts
│   └── ... (20+ champions)
├── data/
│   ├── champion.ts      # Champion definitions
│   └── items.ts         # Item definitions
└── test/
    └── aura-test.ts     # Example test file
```

### Current Issues

1. **Framework Coupling**: Types use Mongoose decorators (`@Prop`, `@Schema`)
2. **Side Effects**: `console.log`, direct state mutations
3. **Circular Dependencies**: `chess.ts` ↔ `game.logic.ts` ↔ `chessFactory.ts`
4. **Non-deterministic**: Uses `Math.random()` for critical strikes, shop shuffling
5. **State Mutation**: Direct object mutation instead of immutable updates

---

## Target Architecture

```
packages/
└── game-engine/
    ├── src/
    │   ├── index.ts                 # Public API exports
    │   ├── core/
    │   │   ├── GameEngine.ts        # Main entry point
    │   │   ├── GameState.ts         # Pure state management
    │   │   ├── EventProcessor.ts    # Process events without side effects
    │   │   └── ActionValidator.ts   # Validate actions before execution
    │   ├── entities/
    │   │   ├── ChessObject.ts       # Base chess class (pure)
    │   │   ├── ChessFactory.ts      # Factory pattern
    │   │   └── champions/           # All champion classes
    │   │       ├── index.ts
    │   │       ├── Aatrox.ts
    │   │       ├── Yasuo.ts
    │   │       └── ...
    │   ├── data/
    │   │   ├── champions.ts         # Static champion data
    │   │   └── items.ts             # Static item data
    │   ├── types/
    │   │   ├── index.ts             # All type exports
    │   │   ├── Game.ts              # Game state types
    │   │   ├── Chess.ts             # Chess piece types
    │   │   ├── Events.ts            # Event/action types
    │   │   └── ...
    │   └── utils/
    │       ├── SeededRandom.ts      # Deterministic RNG
    │       └── helpers.ts           # Pure utility functions
    ├── package.json
    ├── tsconfig.json
    └── README.md

apps/backend/src/game/
├── game.schema.ts       # Mongoose schemas ONLY (imports types from engine)
├── game.service.ts      # Thin wrapper around engine
├── game.gateway.ts      # WebSocket (calls engine)
└── game.controller.ts   # REST API (calls engine)
```

---

## Phase 1: Extract Pure Types

**Goal**: Separate pure TypeScript interfaces from Mongoose schemas.

### Step 1.1: Create Types Directory

Create `apps/backend/src/game/types/` directory with pure interfaces:

```typescript
// apps/backend/src/game/types/index.ts
export * from './Square';
export * from './AttackRange';
export * from './ChessStats';
export * from './Debuff';
export * from './Aura';
export * from './Item';
export * from './Skill';
export * from './Chess';
export * from './Player';
export * from './Game';
export * from './Events';
```

### Step 1.2: Extract Each Type

**Example - Square type:**

```typescript
// apps/backend/src/game/types/Square.ts
export interface Square {
  x: number;
  y: number;
}
```

**Example - Chess type (without decorators):**

```typescript
// apps/backend/src/game/types/Chess.ts
import { Square } from './Square';
import { ChessStats } from './ChessStats';
import { Skill } from './Skill';
import { Item } from './Item';
import { Debuff } from './Debuff';
import { Aura } from './Aura';
import { Shield } from './Shield';
import { AttackProjectile } from './AttackProjectile';

export interface Chess {
  id: string;
  name: string;
  position: Square;
  startingPosition?: Square;
  cannotMoveBackward: boolean;
  canOnlyMoveVertically: boolean;
  hasMovedBefore: boolean;
  cannotAttack: boolean;
  ownerId: string;
  blue: boolean;
  stats: ChessStats;
  skill?: Skill;
  items: Item[];
  debuffs: Debuff[];
  auras: Aura[];
  shields: Shield[];
  attackProjectile?: AttackProjectile;
  deadAtRound?: number;
}
```

### Step 1.3: Update game.schema.ts

Make `game.schema.ts` import types and only define Mongoose schemas:

```typescript
// apps/backend/src/game/game.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";

// Import pure types
import {
  Chess as ChessType,
  Game as GameType,
  Square as SquareType,
  // ... other imports
} from "./types";

// Re-export types for backward compatibility
export type { ChessType as Chess, GameType as Game, SquareType as Square };

// Mongoose Document types
export type GameDocument = GameType & Document;

// Mongoose Schemas (keep decorators here)
@Schema()
export class GameSchema implements GameType {
  @Prop({ required: true })
  name: string;
  // ... rest of schema
}

export const GameMongooseSchema = SchemaFactory.createForClass(GameSchema);
```

### Step 1.4: Update Imports Across Codebase

Search and replace imports to use new types:

```typescript
// Before
import { Chess, Game, Square } from "../game.schema";

// After
import { Chess, Game, Square } from "../types";
```

### Files to Modify

- [x] `apps/backend/src/game/game.schema.ts` - Extract types, keep schemas
- [x] `apps/backend/src/game/class/chess.ts` - Update imports
- [x] `apps/backend/src/game/class/chessFactory.ts` - Update imports
- [x] `apps/backend/src/game/game.logic.ts` - Update imports
- [x] `apps/backend/src/game/game.service.ts` - Update imports
- [x] All champion files in `apps/backend/src/game/class/`
- [x] `apps/backend/src/game/data/champion.ts` - Update imports
- [x] `apps/backend/src/game/data/items.ts` - Update imports

### Validation Checklist

- [x] All types are in `types/` directory
- [x] `game.schema.ts` only contains Mongoose-specific code
- [x] No `@Prop` or `@Schema` decorators in types
- [x] Project builds without errors: `npm run build --workspace=apps/backend`
- [x] All existing tests pass

---

## Phase 2: Make Game Logic Pure

**Goal**: Remove side effects from `game.logic.ts` and `chess.ts`.

### Step 2.1: Remove Console Logs

Replace all `console.log` calls with an event callback system:

```typescript
// Before (game.logic.ts line ~1127)
console.log(`Drake spawned at position (${drakePosition.x},${drakePosition.y})`);

// After - Define callback interface
export interface GameEngineCallbacks {
  onMonsterSpawned?: (monster: Chess, position: Square) => void;
  onPieceKilled?: (killer: Chess, victim: Chess, goldAwarded: number) => void;
  onGoldAwarded?: (playerId: string, amount: number, reason: string) => void;
  onItemCombined?: (champion: Chess, newItem: Item) => void;
  onDebuffApplied?: (target: Chess, debuff: Debuff, source: Chess) => void;
  onDamageDealt?: (source: Chess, target: Chess, damage: number, type: string) => void;
}

// Use callbacks instead
private static spawnDrake(game: Game, callbacks?: GameEngineCallbacks): void {
  // ... spawn logic
  game.board.push(drake);
  callbacks?.onMonsterSpawned?.(drake, drakePosition);
}
```

### Step 2.2: Make State Updates Immutable (Optional but Recommended)

For now, we keep mutation but ensure the pattern is consistent:

```typescript
// Current pattern (keep for now)
this.chess.position = position;

// Future pattern (Phase 5)
return { ...this.chess, position };
```

### Step 2.3: Extract Helper Functions

Move pure utility functions to a separate file:

```typescript
// apps/backend/src/game/utils/helpers.ts
import { Square } from "../types";

export function getAdjacentSquares(square: Square): Square[] {
  return [
    { x: square.x - 1, y: square.y - 1 },
    { x: square.x - 1, y: square.y },
    { x: square.x - 1, y: square.y + 1 },
    { x: square.x, y: square.y - 1 },
    { x: square.x, y: square.y + 1 },
    { x: square.x + 1, y: square.y - 1 },
    { x: square.x + 1, y: square.y },
    { x: square.x + 1, y: square.y + 1 },
  ].filter(
    (s) =>
      (s.x >= 0 && s.x <= 7 && s.y >= 0 && s.y <= 7) ||
      (s.x === -1 && s.y === 4) ||
      (s.x === 8 && s.y === 3)
  );
}

export function calculateDistance(from: Square, to: Square): number {
  const deltaX = Math.abs(from.x - to.x);
  const deltaY = Math.abs(from.y - to.y);
  return Math.max(deltaX, deltaY); // Chebyshev distance
}

export function isValidBoardPosition(x: number, y: number): boolean {
  const isMainBoard = x >= 0 && x <= 7 && y >= 0 && y <= 7;
  const isBlueBase = x === -1 && y === 4;
  const isRedBase = x === 8 && y === 3;
  return isMainBoard || isBlueBase || isRedBase;
}
```

### Step 2.4: Remove Circular Dependencies

Current circular dependency chain:
```
chess.ts → GameLogic (for getAdjacentSquares)
game.logic.ts → ChessFactory
chessFactory.ts → all champion classes
champion classes → ChessObject (chess.ts)
```

**Solution**: Pass dependencies as parameters or use helper functions:

```typescript
// Before (chess.ts)
import { GameLogic } from "../game.logic";
// ...
GameLogic.getAdjacentSquares(this.chess.position).forEach(...)

// After (chess.ts)
import { getAdjacentSquares } from "../utils/helpers";
// ...
getAdjacentSquares(this.chess.position).forEach(...)
```

### Files to Modify

- [x] Create `apps/backend/src/game/utils/helpers.ts`
- [x] Create `apps/backend/src/game/types/callbacks.ts` for engine callbacks
- [x] `apps/backend/src/game/game.logic.ts` - Use helpers, export for compatibility
- [x] `apps/backend/src/game/class/chess.ts` - Use helpers instead of GameLogic
- [x] All champion files updated to use helpers

### Validation Checklist

- [x] No `console.log` in core game logic files (game.logic.ts is clean)
- [x] Circular dependencies significantly reduced
- [x] All helper functions are pure (no side effects)
- [x] Project builds: `npm run build --workspace=apps/backend`
- [x] All tests pass

---

## Phase 3: Add Seeded RNG

**Goal**: Make all random operations deterministic for testing and replays.

### Step 3.1: Create SeededRandom Class

```typescript
// apps/backend/src/game/utils/SeededRandom.ts
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Returns a random number between 0 (inclusive) and 1 (exclusive)
   * Uses a simple LCG (Linear Congruential Generator)
   */
  next(): number {
    // Constants from Numerical Recipes
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  /**
   * Returns a random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Returns true with the given probability (0-100)
   */
  chance(probability: number): boolean {
    return this.next() * 100 < probability;
  }

  /**
   * Shuffles an array in place using Fisher-Yates
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Get the current seed (useful for saving game state)
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Set the seed (useful for loading game state)
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }
}
```

### Step 3.2: Add RNG to Game State

```typescript
// apps/backend/src/game/types/Game.ts
export interface Game {
  // ... existing fields
  rngSeed: number;      // Initial seed for this game
  rngState: number;     // Current RNG state (for save/load)
}
```

### Step 3.3: Update Random Operations

**Critical Strike (chess.ts):**

```typescript
// Before
protected isCriticalStrike(forceCritical: boolean = false): boolean {
  const criticalChance = this.criticalChance / 100;
  const randomChance = Math.random();
  return forceCritical || randomChance < criticalChance;
}

// After
protected isCriticalStrike(forceCritical: boolean = false, rng: SeededRandom): boolean {
  if (forceCritical) return true;
  return rng.chance(this.criticalChance);
}
```

**Shop Shuffle (game.logic.ts):**

```typescript
// Before
private static shuffleShopItems(game: Game): void {
  const shuffled = [...basicItems];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  game.shopItems = shuffled.slice(0, SHOP_ITEMS_COUNT).map((item) => item.id);
}

// After
private static shuffleShopItems(game: Game, rng: SeededRandom): void {
  const shuffled = rng.shuffle([...basicItems]);
  game.shopItems = shuffled.slice(0, SHOP_ITEMS_COUNT).map((item) => item.id);
}
```

**Viktor's Starting Module (game.logic.ts):**

```typescript
// Before
result.skill.payload = {
  currentModuleIndex: Math.floor(Math.random() * getViktorModulesCount()),
  // ...
};

// After
result.skill.payload = {
  currentModuleIndex: rng.nextInt(0, getViktorModulesCount()),
  // ...
};
```

### Step 3.4: Thread RNG Through the System

Update `processGame` to use and update RNG state:

```typescript
public static processGame(game: Game, event: EventPayload): Game {
  // Initialize RNG from game state
  const rng = new SeededRandom(game.rngState || game.rngSeed || Date.now());
  
  // ... process game logic with rng parameter
  
  // Save RNG state back to game
  game.rngState = rng.getSeed();
  
  return game;
}
```

### Files to Modify

- [ ] Create `apps/backend/src/game/utils/SeededRandom.ts`
- [ ] Update `apps/backend/src/game/types/Game.ts` - Add rngSeed, rngState
- [ ] Update `apps/backend/src/game/game.logic.ts` - Use SeededRandom
- [ ] Update `apps/backend/src/game/class/chess.ts` - Pass RNG to critical strike
- [ ] Update all champion classes that use randomness

### Locations Using Math.random()

Search for `Math.random()` in the game folder and replace:

```bash
grep -rn "Math.random" apps/backend/src/game/
```

### Validation Checklist

- [ ] No `Math.random()` calls in game logic
- [ ] Games with same seed produce same results
- [ ] RNG state is saved/loaded correctly
- [ ] Project builds and tests pass

---

## Phase 4: Create Engine Package

**Goal**: Extract game engine into a standalone package.

### Step 4.1: Create Package Structure

```bash
mkdir -p packages/game-engine/src/{core,entities/champions,data,types,utils}
```

### Step 4.2: Initialize Package

```json
// packages/game-engine/package.json
{
  "name": "@lolchess/game-engine",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  }
}
```

```json
// packages/game-engine/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 4.3: Create Main Engine Interface

```typescript
// packages/game-engine/src/core/GameEngine.ts
import { Game, GameEvent, EventPayload, Square, Chess } from "../types";
import { GameLogic } from "./GameLogic";
import { SeededRandom } from "../utils/SeededRandom";
import { GameEngineCallbacks } from "../types/callbacks";

export interface GameConfig {
  seed?: number;
  blueChampions?: string[];
  redChampions?: string[];
  startingGold?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class GameEngine {
  private callbacks?: GameEngineCallbacks;

  constructor(callbacks?: GameEngineCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Create a new game with initial state
   */
  createGame(config: GameConfig): Game {
    const seed = config.seed ?? Date.now();
    const rng = new SeededRandom(seed);
    
    const game = GameLogic.initGame(
      this.createEmptyGame(seed),
      config.blueChampions,
      config.redChampions,
      rng
    );
    
    game.rngState = rng.getSeed();
    return game;
  }

  /**
   * Process a game action and return the new state
   * This is a pure function - takes state, returns new state
   */
  processAction(game: Game, event: EventPayload): Game {
    const newState = structuredClone(game);
    return GameLogic.processGame(newState, event, this.callbacks);
  }

  /**
   * Validate an action before executing it
   */
  validateAction(game: Game, event: EventPayload): ValidationResult {
    try {
      // Create a clone to test the action
      const testState = structuredClone(game);
      GameLogic.processGame(testState, event);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get all valid moves for a piece
   */
  getValidMoves(game: Game, pieceId: string): Square[] {
    return GameLogic.getValidMoves(game, pieceId);
  }

  /**
   * Get all valid attacks for a piece
   */
  getValidAttacks(game: Game, pieceId: string): Square[] {
    return GameLogic.getValidAttacks(game, pieceId);
  }

  /**
   * Get all valid skill targets for a piece
   */
  getValidSkillTargets(game: Game, pieceId: string): Square[] {
    return GameLogic.getValidSkillTargets(game, pieceId);
  }

  /**
   * Check if the game is over
   */
  isGameOver(game: Game): boolean {
    return game.status === "finished";
  }

  /**
   * Get the winner of the game (null if draw or not finished)
   */
  getWinner(game: Game): string | null {
    return game.winner ?? null;
  }

  private createEmptyGame(seed: number): Game {
    return {
      name: "Game",
      status: "waiting",
      phase: "gameplay",
      players: [],
      maxPlayers: 2,
      currentRound: 1,
      board: [],
      rngSeed: seed,
      rngState: seed,
      shopItems: [],
      shopRefreshRound: 0,
      hasBoughtItemThisTurn: false,
      hasPerformedActionThisTurn: false,
      gameSettings: {
        roundTime: 60,
        startingGold: 0,
      },
    } as Game;
  }
}
```

### Step 4.4: Create Public API

```typescript
// packages/game-engine/src/index.ts
// Core
export { GameEngine, GameConfig, ValidationResult } from "./core/GameEngine";
export { GameLogic } from "./core/GameLogic";

// Types
export * from "./types";

// Utils
export { SeededRandom } from "./utils/SeededRandom";
export * from "./utils/helpers";

// Data
export { champions, ChampionData } from "./data/champions";
export { items, getItemById, findCombinedItem } from "./data/items";
```

### Step 4.5: Update Backend to Use Engine

```typescript
// apps/backend/src/game/game.service.ts
import { GameEngine } from "@lolchess/game-engine";

@Injectable()
export class GameService {
  private engine: GameEngine;

  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    private readonly redisCache: RedisGameCacheService
  ) {
    this.engine = new GameEngine({
      onPieceKilled: (killer, victim, gold) => {
        this.logger.log(`${killer.name} killed ${victim.name} for ${gold} gold`);
      },
      onMonsterSpawned: (monster) => {
        this.logger.log(`${monster.name} spawned`);
      },
    });
  }

  async processGameEvent(gameId: string, event: EventPayload) {
    const game = await this.getGameState(gameId);
    const newState = this.engine.processAction(game, event);
    await this.saveGameState(gameId, newState);
    return newState;
  }
}
```

### Step 4.6: Update Root package.json

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### Files to Create

- [ ] `packages/game-engine/package.json`
- [ ] `packages/game-engine/tsconfig.json`
- [ ] `packages/game-engine/src/index.ts`
- [ ] `packages/game-engine/src/core/GameEngine.ts`
- [ ] `packages/game-engine/src/core/GameLogic.ts` (migrate from game.logic.ts)
- [ ] Move types, utils, entities, data from backend to engine

### Validation Checklist

- [ ] Engine package builds: `npm run build --workspace=packages/game-engine`
- [ ] Backend uses engine package
- [ ] All existing functionality works
- [ ] Integration tests pass

---

## Phase 5: Add Simulation & Replay

**Goal**: Enable AI simulation and game replay functionality.

### Step 5.1: Create Simulation Interface

```typescript
// packages/game-engine/src/core/GameSimulator.ts
import { Game, EventPayload } from "../types";
import { GameEngine } from "./GameEngine";

export interface SimulationResult {
  finalState: Game;
  moveHistory: EventPayload[];
  winner: string | null;
  totalRounds: number;
}

export class GameSimulator {
  private engine: GameEngine;

  constructor() {
    this.engine = new GameEngine();
  }

  /**
   * Simulate a full game with given move sequences
   */
  simulate(initialState: Game, moves: EventPayload[]): SimulationResult {
    let state = structuredClone(initialState);
    const moveHistory: EventPayload[] = [];

    for (const move of moves) {
      const validation = this.engine.validateAction(state, move);
      if (!validation.valid) {
        break;
      }
      state = this.engine.processAction(state, move);
      moveHistory.push(move);

      if (this.engine.isGameOver(state)) {
        break;
      }
    }

    return {
      finalState: state,
      moveHistory,
      winner: this.engine.getWinner(state),
      totalRounds: state.currentRound,
    };
  }

  /**
   * Get all possible moves from current state
   */
  getPossibleMoves(game: Game): EventPayload[] {
    const currentPlayerId = this.getCurrentPlayerId(game);
    const playerPieces = game.board.filter(
      (p) => p.ownerId === currentPlayerId && p.stats.hp > 0
    );

    const moves: EventPayload[] = [];

    for (const piece of playerPieces) {
      // Add move actions
      const validMoves = this.engine.getValidMoves(game, piece.id);
      for (const target of validMoves) {
        moves.push({
          playerId: currentPlayerId,
          event: "move_chess" as any,
          casterPosition: piece.position,
          targetPosition: target,
        });
      }

      // Add attack actions
      const validAttacks = this.engine.getValidAttacks(game, piece.id);
      for (const target of validAttacks) {
        moves.push({
          playerId: currentPlayerId,
          event: "attack_chess" as any,
          casterPosition: piece.position,
          targetPosition: target,
        });
      }

      // Add skill actions
      const validSkillTargets = this.engine.getValidSkillTargets(game, piece.id);
      for (const target of validSkillTargets) {
        moves.push({
          playerId: currentPlayerId,
          event: "skill" as any,
          casterPosition: piece.position,
          targetPosition: target,
        });
      }
    }

    return moves;
  }

  private getCurrentPlayerId(game: Game): string {
    const isBlueTurn = game.currentRound % 2 !== 0;
    return isBlueTurn ? game.bluePlayer! : game.redPlayer!;
  }
}
```

### Step 5.2: Create Replay System

```typescript
// packages/game-engine/src/core/GameReplay.ts
import { Game, EventPayload } from "../types";
import { GameEngine } from "./GameEngine";

export interface ReplayData {
  initialSeed: number;
  blueChampions: string[];
  redChampions: string[];
  moves: EventPayload[];
  metadata?: {
    bluePlayer: string;
    redPlayer: string;
    timestamp: number;
    winner?: string;
  };
}

export class GameReplay {
  private engine: GameEngine;
  private replayData: ReplayData;
  private currentMoveIndex: number = 0;
  private currentState: Game;

  constructor(replayData: ReplayData) {
    this.engine = new GameEngine();
    this.replayData = replayData;
    this.currentState = this.engine.createGame({
      seed: replayData.initialSeed,
      blueChampions: replayData.blueChampions,
      redChampions: replayData.redChampions,
    });
  }

  /**
   * Step forward one move
   */
  stepForward(): Game | null {
    if (this.currentMoveIndex >= this.replayData.moves.length) {
      return null;
    }

    const move = this.replayData.moves[this.currentMoveIndex];
    this.currentState = this.engine.processAction(this.currentState, move);
    this.currentMoveIndex++;

    return this.currentState;
  }

  /**
   * Step backward one move (requires replay from start)
   */
  stepBackward(): Game | null {
    if (this.currentMoveIndex <= 0) {
      return null;
    }

    // Replay from beginning to previous move
    this.currentMoveIndex--;
    return this.goToMove(this.currentMoveIndex);
  }

  /**
   * Go to specific move index
   */
  goToMove(index: number): Game {
    // Reset to initial state
    this.currentState = this.engine.createGame({
      seed: this.replayData.initialSeed,
      blueChampions: this.replayData.blueChampions,
      redChampions: this.replayData.redChampions,
    });
    this.currentMoveIndex = 0;

    // Replay up to desired move
    while (this.currentMoveIndex < index && this.currentMoveIndex < this.replayData.moves.length) {
      const move = this.replayData.moves[this.currentMoveIndex];
      this.currentState = this.engine.processAction(this.currentState, move);
      this.currentMoveIndex++;
    }

    return this.currentState;
  }

  /**
   * Get current game state
   */
  getCurrentState(): Game {
    return this.currentState;
  }

  /**
   * Get current move index
   */
  getCurrentMoveIndex(): number {
    return this.currentMoveIndex;
  }

  /**
   * Get total number of moves
   */
  getTotalMoves(): number {
    return this.replayData.moves.length;
  }

  /**
   * Export replay data for saving
   */
  static createReplayData(
    game: Game,
    moves: EventPayload[],
    metadata?: ReplayData["metadata"]
  ): ReplayData {
    return {
      initialSeed: game.rngSeed,
      blueChampions: [], // TODO: Extract from initial state
      redChampions: [],
      moves,
      metadata,
    };
  }
}
```

### Step 5.3: Add Move History to Game State

```typescript
// packages/game-engine/src/types/Game.ts
export interface Game {
  // ... existing fields
  moveHistory?: EventPayload[];  // Track all moves for replay
}
```

### Files to Create

- [ ] `packages/game-engine/src/core/GameSimulator.ts`
- [ ] `packages/game-engine/src/core/GameReplay.ts`
- [ ] Update `packages/game-engine/src/index.ts` to export new classes

### Validation Checklist

- [ ] Simulation produces deterministic results with same seed
- [ ] Replay accurately reproduces game states
- [ ] Step forward/backward works correctly
- [ ] AI can enumerate all possible moves

---

## Challenges & Solutions

### Challenge 1: Circular Dependencies

**Problem**: `chess.ts` imports `GameLogic`, `GameLogic` imports `ChessFactory`, champions import `ChessObject`.

**Solution**: 
1. Extract pure helper functions to `utils/helpers.ts`
2. Pass dependencies as parameters instead of importing
3. Use interfaces for loose coupling

```typescript
// Before
import { GameLogic } from "../game.logic";
GameLogic.getAdjacentSquares(position);

// After
import { getAdjacentSquares } from "../utils/helpers";
getAdjacentSquares(position);
```

### Challenge 2: State Mutation

**Problem**: Direct mutation makes it hard to track changes and implement undo.

**Solution** (Future): Use immutable update patterns with libraries like Immer:

```typescript
import produce from "immer";

const newState = produce(game, draft => {
  draft.board.find(p => p.id === pieceId).position = newPosition;
});
```

### Challenge 3: RNG Threading

**Problem**: RNG needs to be passed through many function calls.

**Solution**: Store RNG in game state and pass through context:

```typescript
interface GameContext {
  rng: SeededRandom;
  callbacks?: GameEngineCallbacks;
}

function processAction(game: Game, event: EventPayload, ctx: GameContext): Game {
  // ctx.rng available throughout
}
```

### Challenge 4: Champion-Specific Logic

**Problem**: Each champion has unique abilities that need access to game state.

**Solution**: Keep the factory pattern but ensure ChessObject methods are pure:

```typescript
class Yasuo extends ChessObject {
  protected skill(position: Square, ctx: GameContext): void {
    // Access ctx.rng for randomness
    // Return new state instead of mutating
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// packages/game-engine/__tests__/GameEngine.test.ts
describe("GameEngine", () => {
  it("should create deterministic games with same seed", () => {
    const engine = new GameEngine();
    const game1 = engine.createGame({ seed: 12345 });
    const game2 = engine.createGame({ seed: 12345 });
    
    expect(game1.shopItems).toEqual(game2.shopItems);
  });

  it("should validate invalid moves", () => {
    const engine = new GameEngine();
    const game = engine.createGame({ seed: 12345 });
    
    const result = engine.validateAction(game, {
      playerId: "invalid",
      event: "move_chess",
      casterPosition: { x: 0, y: 0 },
      targetPosition: { x: 9, y: 9 }, // Out of bounds
    });
    
    expect(result.valid).toBe(false);
  });
});
```

### Integration Tests

```typescript
// packages/game-engine/__tests__/Simulation.test.ts
describe("GameSimulator", () => {
  it("should simulate full games", () => {
    const simulator = new GameSimulator();
    const engine = new GameEngine();
    const game = engine.createGame({ seed: 12345 });
    
    // Get random valid moves
    const moves = simulator.getPossibleMoves(game);
    
    expect(moves.length).toBeGreaterThan(0);
  });
});
```

### Replay Tests

```typescript
describe("GameReplay", () => {
  it("should reproduce same game state", () => {
    const engine = new GameEngine();
    const game = engine.createGame({ seed: 12345 });
    
    // Record moves
    const moves = [/* recorded moves */];
    
    const replayData = GameReplay.createReplayData(game, moves);
    const replay = new GameReplay(replayData);
    
    // Replay should match original
    for (let i = 0; i < moves.length; i++) {
      replay.stepForward();
    }
    
    expect(replay.getCurrentState()).toMatchSnapshot();
  });
});
```

---

## Progress Tracking

| Phase | Status | Owner | Notes |
|-------|--------|-------|-------|
| Phase 1: Extract Types | ✅ Completed | | All pure types extracted to types/ directory |
| Phase 2: Pure Logic | ✅ Completed | | Helper functions extracted, circular deps reduced |
| Phase 3: Seeded RNG | ⬜ Not Started | | |
| Phase 4: Engine Package | ⬜ Not Started | | |
| Phase 5: Simulation | ⬜ Not Started | | |

---

## Quick Reference: Files to Migrate

### From `apps/backend/src/game/` to `packages/game-engine/src/`

| Source | Destination | Notes |
|--------|-------------|-------|
| `game.schema.ts` (types only) | `types/` | Extract interfaces |
| `game.logic.ts` | `core/GameLogic.ts` | Remove side effects |
| `class/chess.ts` | `entities/ChessObject.ts` | Pure methods |
| `class/chessFactory.ts` | `entities/ChessFactory.ts` | No changes needed |
| `class/*.ts` (champions) | `entities/champions/` | Update imports |
| `data/champion.ts` | `data/champions.ts` | No changes |
| `data/items.ts` | `data/items.ts` | No changes |

---

## Glossary

- **Pure Function**: A function that always returns the same output for the same input and has no side effects
- **Side Effect**: Any operation that modifies state outside the function (logging, database writes, etc.)
- **Immutable**: Data that cannot be changed after creation; updates return new objects
- **Seeded RNG**: Random number generator that produces deterministic sequences from a seed
- **Factory Pattern**: Creational pattern that uses factory methods to create objects

---

*Last Updated: December 27, 2024*

## Phase 1 Implementation Notes (December 27, 2024)

Phase 1 has been successfully completed with the following changes:

### Created Files
- `apps/backend/src/game/types/` directory with 15 pure TypeScript interface files:
  - `Square.ts`, `AttackRange.ts`, `ChessStats.ts`
  - `Debuff.ts`, `Aura.ts`, `Item.ts`, `Skill.ts`, `Shield.ts`
  - `AttackProjectile.ts`, `Chess.ts`, `Player.ts`
  - `BanPickState.ts`, `Game.ts`, `Events.ts`
  - `index.ts` (barrel export)

### Modified Files
- `game.schema.ts` - Now imports types and only contains Mongoose schemas
- All 29+ champion files updated to import from `types/`
- `game.logic.ts`, `game.service.ts`, `chess.ts` updated
- `data/champion.ts`, `data/items.ts` updated
- `game.module.ts`, `redis.module.ts`, `game-persistence.processor.ts` updated

### Key Changes
1. Separated pure TypeScript interfaces from Mongoose decorators
2. Created backward-compatible re-exports in `game.schema.ts`
3. Introduced `GAME_MODEL_NAME` constant for NestJS model injection
4. All imports now use `../types` instead of `../game.schema`

### Validation
- ✅ Backend builds successfully with `npm run build --workspace=apps/backend`
- ✅ No linter errors
- ✅ All types properly exported and importable
- ✅ Backward compatibility maintained

**Next Steps**: Proceed to Phase 2 - Make Game Logic Pure

## Phase 2 Implementation Notes (December 28, 2024)

Phase 2 has been successfully completed with the following changes:

### Created Files
- `apps/backend/src/game/utils/helpers.ts` - Pure utility functions:
  - `getAdjacentSquares(square)` - Get all 8-directional adjacent squares
  - `calculateDistance(from, to)` - Chebyshev distance calculation
  - `isValidBoardPosition(x, y)` - Check if position is on valid board
  - `getChessAtPosition(game, isBlue, square)` - Get chess piece at position
  - `getAnyChessAtPosition(game, square)` - Get any piece regardless of team
  - `isPathClear(game, from, to)` - Check if path is clear for moves
  - `getAdjacentEnemies(game, position, isBlue)` - Get adjacent enemy pieces
  - `getAdjacentAllies(game, position, isBlue)` - Get adjacent ally pieces
  - `getPiecesInLine(game, from, direction, maxRange)` - Get pieces in a line

- `apps/backend/src/game/types/callbacks.ts` - Game engine callback interface:
  - `GameEngineCallbacks` - Interface for all game events
  - `GameContext` - Context object for engine operations

### Modified Files
- `game.logic.ts` - Uses helpers, maintains backward compatibility with deprecated methods
- `chess.ts` - Uses helpers instead of GameLogic for `getAdjacentSquares` and `getChess`
- 20+ champion files updated to import from `utils/helpers` instead of `GameLogic`:
  - ahri.ts, azir.ts, blitzcrank.ts, casterminion.ts, drmundo.ts
  - ezreal.ts, garen.ts, janna.ts, khazix.ts, meleeminion.ts
  - nasus.ts, poro.ts, sandsoldier.ts, sion.ts, soraka.ts
  - tristana.ts, twistedfate.ts, viktor.ts, yasuo.ts, zed.ts

### Remaining GameLogic Imports (Acceptable)
- `azir.ts` - Uses `GameLogic["getPieceBaseStats"]` (factory method)
- `game.service.ts` - NestJS service wrapper
- `test/aura-test.ts` - Test file
- `chess.ts` - One require for `awardMonsterKillReward` (kill rewards)

### Key Changes
1. Extracted pure helper functions without side effects
2. Created callback interface for future event-driven architecture
3. Significantly reduced circular dependencies
4. All helper functions are framework-agnostic

### Validation
- ✅ Backend builds successfully with `npm run build --workspace=apps/backend`
- ✅ No linter errors
- ✅ All imports properly updated
- ✅ Backward compatibility maintained via deprecated methods in GameLogic

**Next Steps**: Proceed to Phase 3 - Add Seeded RNG

