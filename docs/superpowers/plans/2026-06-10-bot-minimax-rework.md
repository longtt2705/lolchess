# Bot Minimax Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bot's 1-ply greedy search with iterative-deepening alpha-beta minimax, fix the evaluation bugs, and prove the new bot beats the old one via a self-play harness.

**Architecture:** A new `AlphaBetaSearch` class in `packages/bot-engine` uses the game engine (`processAction` on cloned state) as the rules oracle, searching board actions (move/attack/skill) for both players to a configurable depth with candidate pruning and a kill-only quiescence extension. Evaluation stays in `PositionEvaluator` but becomes symmetric (my-score minus their-score per component) with the known sign/multiplier bugs fixed. The old greedy search is kept as `LegacySearch` solely as the self-play benchmark opponent.

**Tech Stack:** TypeScript, npm workspaces, Jest + ts-jest (new config in `packages/bot-engine`), `@lolchess/game-engine` as the simulation backend.

**Spec:** `docs/superpowers/specs/2026-06-10-bot-minimax-rework-design.md`

---

## Critical context for the implementer

- **Run `fnm use v22` before any work.** Build order matters: `game-engine` → `bot-engine` → apps. Apps and packages consume each other's `dist/`, so rebuild after every engine change:
  ```bash
  npm run build --workspace=packages/game-engine
  npm run build --workspace=packages/bot-engine
  ```
- **Never start dev servers.** Build and test only.
- **Turn mechanics:** there is no `currentTurn` field. Blue moves on odd `game.currentRound`, red on even. `getCurrentPlayerId(game)` (exported from `@lolchess/game-engine`) tells you whose turn it is. A board action (move/attack/skill) ends the turn and increments `currentRound`; `BUY_ITEM` and `USE_SUMMONER_SPELL` do NOT end the turn.
- **`gameEngine.processAction(game, action)`** deep-clones via `structuredClone` and returns `{ game, success, error? }`. Failed actions return `success: false` with the original game. It never mutates the input.
- **Winner encoding:** `game.winner` is the string `"blue"` or `"red"` (see `PositionEvaluator.getTerminalScore`), `game.status === "finished"` means game over.
- **`GameEvent` enum values:** `MOVE_CHESS`, `ATTACK_CHESS`, `BUY_ITEM`, `SKILL`, `USE_SUMMONER_SPELL`. There is no castle event (castling is handled inside the engine).
- **Existing classes you will reuse unchanged:** `ActionGenerator.generateAll(game, playerId): EventPayload[]`, `MoveOrdering.orderActions(game, actions, playerId): ScoredAction[]` (returns `{action, score, isKiller, isCapture}` sorted desc).
- `console.log` calls inside `PositionEvaluator.evaluate` and `ThreatEvaluator.getBestThreat` run once per search node — they MUST be removed or the search will be unusably slow.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `packages/game-engine/src/types/Game.ts` | Modify | Add `disableCrit?: boolean` to `GameSettings` |
| `packages/game-engine/src/entities/ChessObject.ts` | Modify | Skip crit RNG rolls when `disableCrit` is set (2 sites) |
| `packages/bot-engine/package.json` | Modify | Jest config + devDeps, `selfplay` script |
| `packages/bot-engine/tsconfig.json` | Modify | Exclude `*.spec.ts` from build |
| `packages/bot-engine/src/evaluation/PositionEvaluator.ts` | Modify | Symmetric safety, remove 10x Poro panic + allied sign bug, remove hot-path log |
| `packages/bot-engine/src/evaluation/ThreatEvaluator.ts` | Modify | Diminishing threat sum, expected-damage crit pricing, remove log |
| `packages/bot-engine/src/evaluation/LoSEvaluator.ts` | Modify | Stop scoring empty squares like targets |
| `packages/bot-engine/src/search/AlphaBetaSearch.ts` | Create | The new search: iterative deepening, alpha-beta, candidate pruning, quiescence |
| `packages/bot-engine/src/search/BestMoveSearch.ts` | Modify | Demote to `LegacySearch` (benchmark only), remove logs |
| `packages/bot-engine/src/BotEngine.ts` | Modify | Wire in `AlphaBetaSearch`, working difficulty presets, spell sanity check |
| `packages/bot-engine/src/types/index.ts` | Modify | Add `engine` flag to `BotConfig` |
| `packages/bot-engine/src/index.ts` | Modify | Export new/renamed classes |
| `packages/bot-engine/src/selfplay/run.ts` | Create | Self-play harness CLI |
| `packages/bot-engine/src/evaluation/PositionEvaluator.spec.ts` | Test | Evaluation symmetry |
| `packages/bot-engine/src/search/AlphaBetaSearch.spec.ts` | Test | Tactical scenarios + determinism |

---

### Task 1: Crit-free simulation flag in game-engine

The search needs a deterministic tree. Crits are rolled with the seeded RNG inside `ChessObject`; a `disableCrit` game setting lets the bot search a crit-free world while the real game keeps crits.

**Files:**
- Modify: `packages/game-engine/src/types/Game.ts:6-9`
- Modify: `packages/game-engine/src/entities/ChessObject.ts` (~line 77 and ~line 1421)

- [ ] **Step 1: Add the setting to `GameSettings`**

In `packages/game-engine/src/types/Game.ts`, change:

```typescript
export interface GameSettings {
  roundTime: number;
  startingGold: number;
}
```

to:

```typescript
export interface GameSettings {
  roundTime: number;
  startingGold: number;
  /** When true, critical strikes never occur (used by bot search for determinism) */
  disableCrit?: boolean;
}
```

- [ ] **Step 2: Guard the main crit roll**

In `packages/game-engine/src/entities/ChessObject.ts`, find `isCriticalStrike` (~line 1421):

```typescript
  protected isCriticalStrike(forceCritical: boolean = false): boolean {
    if (forceCritical) return true;
    const rng = getGameRng();
    return rng.chance(this.criticalChance);
  }
```

Change to (keep `forceCritical` first — guaranteed crits from abilities are deterministic and must still work):

```typescript
  protected isCriticalStrike(forceCritical: boolean = false): boolean {
    if (forceCritical) return true;
    if (this.game.gameSettings?.disableCrit) return false;
    const rng = getGameRng();
    return rng.chance(this.criticalChance);
  }
```

(`ChessObject` has `public game: Game` — line 27 — so `this.game` is available.)

- [ ] **Step 3: Guard the Jeweled Gauntlet skill-crit roll**

In the same file, find `activeSkillDamage` (~line 68-83), which contains:

```typescript
    if (this.hasItem("jeweled_gauntlet")) {
      const rng = getGameRng();
      this.willCrit = rng.chance(this.criticalChance);
```

Change the condition to:

```typescript
    if (this.hasItem("jeweled_gauntlet") && !this.game.gameSettings?.disableCrit) {
      const rng = getGameRng();
      this.willCrit = rng.chance(this.criticalChance);
```

- [ ] **Step 4: Build game-engine and verify**

```bash
npm run build --workspace=packages/game-engine
```
Expected: clean build, no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/game-engine/src/types/Game.ts packages/game-engine/src/entities/ChessObject.ts
git commit -m "feat(game-engine): add disableCrit setting for deterministic bot search"
```

---

### Task 2: Jest setup for bot-engine

**Files:**
- Modify: `packages/bot-engine/package.json`
- Modify: `packages/bot-engine/tsconfig.json`

- [ ] **Step 1: Add jest devDependencies and config**

In `packages/bot-engine/package.json`, change `devDependencies` and `scripts`, and add a `jest` block (versions mirror `apps/backend`):

```json
{
  "name": "@lolchess/bot-engine",
  "version": "1.0.0",
  "description": "AI/Bot decision-making engine for LOL Chess",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "clean": "rm -rf dist",
    "test": "jest",
    "selfplay": "node dist/selfplay/run.js",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@lolchess/game-engine": "*"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.2"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "testEnvironment": "node",
    "testTimeout": 30000
  },
  "keywords": ["lolchess", "bot", "ai", "game-engine"],
  "license": "MIT"
}
```

- [ ] **Step 2: Exclude spec files from the build**

In `packages/bot-engine/tsconfig.json`, change:

```json
  "exclude": ["node_modules", "dist"]
```

to:

```json
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
```

- [ ] **Step 3: Install and sanity-check**

```bash
fnm use v22
npm install
npm run test --workspace=packages/bot-engine
```
Expected: jest runs and reports "No tests found" exit code 1 — that's fine (no spec files yet). If `@lolchess/game-engine` resolution fails in later test runs, the fix is building game-engine first (its `dist/` is the module entry).

- [ ] **Step 4: Commit**

```bash
git add packages/bot-engine/package.json packages/bot-engine/tsconfig.json package-lock.json
git commit -m "chore(bot-engine): add jest test infrastructure and selfplay script entry"
```

---

### Task 3: Evaluation symmetry + safety bug fixes (TDD)

The search evaluates every node from the root player's perspective, including opponent-to-move nodes, so the evaluation must be symmetric: `eval(game, A) === -eval(game, B)`. Today it is NOT, because `evaluateSafety` only looks at the evaluated player's own pieces, has a 10x Poro panic multiplier, and a sign error that makes threatened allies look *good*.

**Files:**
- Test: `packages/bot-engine/src/evaluation/PositionEvaluator.spec.ts` (create)
- Modify: `packages/bot-engine/src/evaluation/PositionEvaluator.ts:380-403` (and remove the `console.log` at ~line 77)

- [ ] **Step 1: Write the failing symmetry test**

Create `packages/bot-engine/src/evaluation/PositionEvaluator.spec.ts`:

```typescript
import { GameEngine } from "@lolchess/game-engine";
import { PositionEvaluator } from "./PositionEvaluator";

const CHAMPS = ["Garen", "Ahri", "Ashe", "Aatrox", "Janna"];
const BLUE = "blue-player";
const RED = "red-player";

function makeGame(seed: number) {
  const engine = new GameEngine();
  const game = engine.createGame({
    seed,
    bluePlayerId: BLUE,
    redPlayerId: RED,
    blueChampions: CHAMPS,
    redChampions: CHAMPS,
    startingGold: 100,
  });
  return { engine, game };
}

describe("PositionEvaluator symmetry", () => {
  it("evaluates the starting position as a zero-sum mirror", () => {
    const { engine, game } = makeGame(42);
    const evaluator = new PositionEvaluator(engine);

    const blueScore = evaluator.evaluate(game, BLUE);
    const redScore = evaluator.evaluate(game, RED);

    expect(blueScore).toBeCloseTo(-redScore, 3);
  });

  it("stays symmetric after some moves have been played", () => {
    const { engine, game } = makeGame(7);
    const evaluator = new PositionEvaluator(engine);

    // Play a few deterministic opening moves through the real engine so the
    // position is asymmetric in material/structure but evaluation must still mirror.
    // Move blue melee minion b2 -> b3 (x=1,y=1 -> x=1,y=2), then red g7 -> g6.
    let state = game;
    const moves = [
      { playerId: BLUE, casterPosition: { x: 1, y: 1 }, targetPosition: { x: 1, y: 2 } },
      { playerId: RED, casterPosition: { x: 6, y: 6 }, targetPosition: { x: 6, y: 5 } },
    ];
    for (const m of moves) {
      const result = engine.processAction(state, {
        playerId: m.playerId,
        event: "move_chess" as any,
        casterPosition: m.casterPosition,
        targetPosition: m.targetPosition,
      });
      expect(result.success).toBe(true);
      state = result.game;
    }

    expect(evaluator.evaluate(state, BLUE)).toBeCloseTo(
      -evaluator.evaluate(state, RED),
      3
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run build --workspace=packages/game-engine
npm run test --workspace=packages/bot-engine -- PositionEvaluator.spec
```
Expected: FAIL — the safety component is one-sided, so `blueScore !== -redScore`. (If it fails for a different reason — e.g. a board-coordinate mismatch in the move test — fix the test coordinates first: print `game.board.map(p => ({n: p.name, x: p.position.x, y: p.position.y, blue: p.blue}))` to find a real blue melee minion and use its actual coordinates.)

- [ ] **Step 3: Fix `evaluateSafety` (symmetric, linear, correct signs)**

In `packages/bot-engine/src/evaluation/PositionEvaluator.ts`, replace the whole `evaluateSafety` method (lines 380-403):

```typescript
  private evaluateSafety(
    game: Game,
    playerId: string,
    opponentId: string
  ): number {
    return (
      this.calculatePlayerSafety(game, playerId) -
      this.calculatePlayerSafety(game, opponentId)
    );
  }

  /**
   * Sum of per-piece safety (negative when pieces stand in enemy fire).
   * The Poro is weighted heavily but linearly — lethal sequences are the
   * search's job to find, not the evaluation's job to panic about.
   */
  private calculatePlayerSafety(game: Game, playerId: string): number {
    let safety = 0;
    const pieces = getPlayerPieces(game, playerId);
    for (const piece of pieces) {
      const pieceSafety = this.threatEvaluator.evaluatePositionSafety(
        game,
        piece,
        playerId
      );
      if (piece.name === "Poro") {
        safety += pieceSafety * 3;
      } else {
        safety += pieceSafety * 0.5;
      }
    }
    return safety;
  }
```

Note this removes BOTH bugs at once: the `poroSafety * 10` cliff and the `safety -= damageTargetPriorityFactor * ...` allied sign error (`evaluatePositionSafety` returns negative when threatened, so `+=` is the correct direction). The `ChessFactory` import stays (still used elsewhere in the file) — if TypeScript flags it unused after this edit, remove it from the import list.

- [ ] **Step 4: Remove the per-node console.log**

In the same file, delete this line inside `evaluate` (~line 77):

```typescript
    console.log(`[PositionEvaluator] Position breakdown: ${JSON.stringify(breakdown)}`);
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm run test --workspace=packages/bot-engine -- PositionEvaluator.spec
```
Expected: PASS. If symmetry still fails, isolate the asymmetric component: temporarily log the `breakdown` object for both players in the test — each field must mirror (`material_A === -material_B`, etc.). Each component is computed as a my-minus-their difference, so any non-mirroring component (most likely `passedPawn` or `neutralMonster` if their `evaluate(game, playerId, opponentId)` returns a one-sided score) gets the same treatment as safety: compute for both players inside `PositionEvaluator` and subtract.

- [ ] **Step 6: Commit**

```bash
git add packages/bot-engine/src/evaluation/PositionEvaluator.ts packages/bot-engine/src/evaluation/PositionEvaluator.spec.ts
git commit -m "fix(bot-engine): symmetric safety evaluation, remove Poro panic multiplier and allied-safety sign bug"
```

---

### Task 4: ThreatEvaluator + LoSEvaluator quality fixes

**Files:**
- Modify: `packages/bot-engine/src/evaluation/ThreatEvaluator.ts:151-176`
- Modify: `packages/bot-engine/src/evaluation/LoSEvaluator.ts:39-63`

- [ ] **Step 1: Diminishing threat sum (replaces top-3 cutoff)**

In `packages/bot-engine/src/evaluation/ThreatEvaluator.ts`, replace `evaluateThreatScore` (lines 151-156):

```typescript
  /**
   * Evaluate overall threat score for a player.
   * All threats count with geometrically diminishing weight, so three medium
   * threats outweigh one big one but a long tail can't dominate.
   */
  evaluateThreatScore(game: Game, playerId: string): number {
    const threats = this.getPlayerThreats(game, playerId);
    return threats.reduce(
      (acc, t, i) => acc + t.priority * Math.pow(0.6, i),
      0
    );
  }
```

- [ ] **Step 2: Price crits as expected damage**

In the same file, replace `calculateDamage` (lines 170-176). With `disableCrit` the simulator never crits, so the evaluation must price crit chance back in as expected value:

```typescript
  /**
   * Calculate expected damage between two pieces.
   * Search simulations run crit-free (gameSettings.disableCrit), so crit is
   * priced in here as expected value: AD * (1 + chance% * (critDmg% - 1)).
   */
  calculateDamage(attacker: Chess, target: Chess): number {
    // Create a temporary game-like context for ChessFactory
    const tempGame = { board: [attacker, target] } as Game;
    const attackerObject = ChessFactory.createChess(attacker, tempGame);
    const targetObject = ChessFactory.createChess(target, tempGame);
    const baseDamage = attackerObject.calculateDamageAttack(targetObject);
    const critChance = Math.min(attackerObject.criticalChance, 100) / 100;
    const critMultiplier = attackerObject.criticalDamage / 100;
    return baseDamage * (1 + critChance * (critMultiplier - 1));
  }
```

(`criticalChance` and `criticalDamage` are public getters on `ChessObject` — lines 922+.)

- [ ] **Step 3: Remove the console.log in `getBestThreat`**

Delete the `console.log` line at ~line 160 in the same file (inside `getBestThreat`). It runs in search hot paths.

- [ ] **Step 4: Fix LoSEvaluator to score targets, not empty board**

In `packages/bot-engine/src/evaluation/LoSEvaluator.ts`, replace `evaluateLoS` (lines 39-63):

```typescript
  evaluateLoS(game: Game, playerId: string): number {
    let score = 0;
    const baseScore = 10;
    const isBlue = game.bluePlayer === playerId;
    const pieces = getPlayerPieces(game, playerId);
    const uniqueAttackSquares = new Set<Square>();
    for (const piece of pieces) {
      const availableAttackSquares = ChessFactory.createChess(piece, game).getAvailableAttackSquares();
      for (const square of availableAttackSquares) {
        uniqueAttackSquares.add(square);
      }
    }

    for (const square of uniqueAttackSquares.values()) {
      if (square.x < 0 || square.x > 7 || square.y < 0 || square.y > 7) continue;

      const target = getPieceAtPosition(game, square);
      if (!target) {
        // Covering empty central squares has mild positional value; the rest is noise
        if ((square.y === 3 || square.y === 4) && square.x >= 2 && square.x <= 5) {
          score += baseScore * 0.5;
        }
        continue;
      }
      // Covering our own pieces is worth nothing
      if (target.blue === isBlue) continue;
      // Line of sight onto enemies (and neutral monsters) is what matters
      score += ChessFactory.createChess(target, game).damageTargetPriorityFactor * baseScore;
    }
    return score;
  }
```

- [ ] **Step 5: Add the economy component (gold + skill-ready premium)**

The spec's evaluation component 4: gold in bank (small weight) and ready skills are worth something. (Champion item value is already partially reflected in material, since `getMaterialValue` derives from `ChessObject` stats which include item effects; an explicit item-value term is deferred to Task 8 tuning if self-play shows the bot undervaluing itemized champions.)

In `packages/bot-engine/src/types/index.ts`, add to `EvaluationBreakdown`:

```typescript
  /** Gold-in-bank and skill-readiness advantage */
  economy?: number;
```

In `packages/bot-engine/src/evaluation/PositionEvaluator.ts`:

1. Add to the `WEIGHTS` object:

```typescript
    economy: 0.3,     // Gold lead and ready skills
```

2. Add two private methods (next to `evaluateSafety`):

```typescript
  /**
   * Economy: gold lead plus a small premium per ready (off-cooldown) skill.
   * Symmetric: my economy minus theirs.
   */
  private evaluateEconomy(
    game: Game,
    playerId: string,
    opponentId: string
  ): number {
    const me = game.players.find((p) => p.userId === playerId);
    const them = game.players.find((p) => p.userId === opponentId);
    const goldDiff = (me?.gold ?? 0) - (them?.gold ?? 0);
    const readyDiff =
      this.countReadySkills(game, playerId) -
      this.countReadySkills(game, opponentId);
    return goldDiff * 0.5 + readyDiff * 5;
  }

  private countReadySkills(game: Game, playerId: string): number {
    return getPlayerPieces(game, playerId).filter(
      (p) => p.skill && p.skill.currentCooldown === 0
    ).length;
  }
```

3. In `evaluate()`, compute and wire it in — add alongside the other components:

```typescript
    const economy = this.sanitizeNumber(this.evaluateEconomy(game, playerId, opponentId));
```

add `economy` to the `breakdown` object literal, and add this line to the weighted score sum:

```typescript
      economy * PositionEvaluator.WEIGHTS.economy +
```

4. Make the identical three additions in `evaluateWithBreakdown()` (it duplicates the same structure).

- [ ] **Step 6: Build, run existing tests**

```bash
npm run build --workspace=packages/bot-engine
npm run test --workspace=packages/bot-engine
```
Expected: build clean, symmetry tests still PASS (the economy component is a my-minus-their difference, so symmetry holds).

- [ ] **Step 7: Commit**

```bash
git add packages/bot-engine/src/evaluation/ThreatEvaluator.ts packages/bot-engine/src/evaluation/LoSEvaluator.ts packages/bot-engine/src/evaluation/PositionEvaluator.ts packages/bot-engine/src/types/index.ts
git commit -m "fix(bot-engine): diminishing threat sum, EV crit damage, meaningful LoS, economy component"
```

---

### Task 5: AlphaBetaSearch (the new search core)

**Files:**
- Create: `packages/bot-engine/src/search/AlphaBetaSearch.ts`
- Test: `packages/bot-engine/src/search/AlphaBetaSearch.spec.ts`
- Modify: `packages/bot-engine/src/search/BestMoveSearch.ts` (logs + rename export)

- [ ] **Step 1: Verify game-engine root exports**

```bash
grep -n "getCurrentPlayerId\|cloneGameState" packages/game-engine/src/index.ts packages/game-engine/src/core/index.ts
```
Expected: both names re-exported (they live in `core/GameEngine.ts` and are listed in `core/index.ts`). If either is missing from the package root export chain, add it to `packages/game-engine/src/core/index.ts`'s export list and rebuild game-engine.

- [ ] **Step 2: Write the tactical tests (failing — class doesn't exist yet)**

Create `packages/bot-engine/src/search/AlphaBetaSearch.spec.ts`:

```typescript
import {
  Chess,
  GameEngine,
  GameEvent,
  Game,
} from "@lolchess/game-engine";
import { PositionEvaluator } from "../evaluation/PositionEvaluator";
import { ActionGenerator } from "./ActionGenerator";
import { MoveOrdering } from "./MoveOrdering";
import { ThreatEvaluator } from "../evaluation/ThreatEvaluator";
import { MaterialEvaluator } from "../evaluation/MaterialEvaluator";
import { AlphaBetaSearch } from "./AlphaBetaSearch";

const CHAMPS = ["Garen", "Ahri", "Ashe", "Aatrox", "Janna"];
const BLUE = "blue-player";
const RED = "red-player";

function makeSearch() {
  const engine = new GameEngine();
  const evaluator = new PositionEvaluator(engine);
  const actionGenerator = new ActionGenerator(engine);
  const moveOrdering = new MoveOrdering(
    new ThreatEvaluator(engine, new MaterialEvaluator())
  );
  const search = new AlphaBetaSearch(engine, evaluator, actionGenerator, moveOrdering);
  return { engine, search };
}

function makeGame(engine: GameEngine, seed = 42): Game {
  return engine.createGame({
    seed,
    bluePlayerId: BLUE,
    redPlayerId: RED,
    blueChampions: CHAMPS,
    redChampions: CHAMPS,
    startingGold: 100,
  });
}

/** Remove every piece except the given ids and both Poros (dead pieces are ignored everywhere). */
function clearBoardExcept(game: Game, keepIds: string[]) {
  for (const p of game.board) {
    if (p.name === "Poro") continue;
    if (!keepIds.includes(p.id)) {
      p.stats.hp = 0;
    }
  }
}

function findPiece(game: Game, name: string, blue: boolean): Chess {
  const piece = game.board.find(
    (p) => p.name === name && p.blue === blue && p.stats.hp > 0
  );
  if (!piece) throw new Error(`piece not found: ${name} blue=${blue}`);
  return piece;
}

describe("AlphaBetaSearch", () => {
  it("takes a free kill", () => {
    const { engine, search } = makeSearch();
    const game = makeGame(engine);

    // Blue siege minion attacks along files/ranks up to range 8.
    const siege = findPiece(game, "Siege Minion", true);
    const victim = findPiece(game, "Caster Minion", false);
    clearBoardExcept(game, [siege.id, victim.id]);

    // Put the victim on the siege minion's file with a clear path, nearly dead.
    siege.position = { x: 3, y: 2 };
    victim.position = { x: 3, y: 6 };
    victim.stats.hp = 5;
    // Park the Poros far away in opposite corners.
    findPiece(game, "Poro", true).position = { x: 0, y: 0 };
    findPiece(game, "Poro", false).position = { x: 7, y: 7 };
    game.currentRound = 1; // blue to move

    const result = search.search(game, BLUE, { maxDepth: 2, timeLimit: 10000 });

    expect(result.bestAction).not.toBeNull();
    expect(result.bestAction!.event).toBe(GameEvent.ATTACK_CHESS);
    expect(result.bestAction!.targetPosition).toEqual({ x: 3, y: 6 });
  });

  it("kills the enemy Poro when it can (finds mate)", () => {
    const { engine, search } = makeSearch();
    const game = makeGame(engine);

    const siege = findPiece(game, "Siege Minion", true);
    clearBoardExcept(game, [siege.id]);

    const enemyPoro = findPiece(game, "Poro", false);
    enemyPoro.position = { x: 5, y: 6 };
    enemyPoro.stats.hp = 1;
    siege.position = { x: 5, y: 2 };
    findPiece(game, "Poro", true).position = { x: 0, y: 0 };
    game.currentRound = 1;

    const result = search.search(game, BLUE, { maxDepth: 2, timeLimit: 10000 });

    expect(result.bestAction).not.toBeNull();
    expect(result.bestAction!.event).toBe(GameEvent.ATTACK_CHESS);
    expect(result.bestAction!.targetPosition).toEqual({ x: 5, y: 6 });
    expect(result.score).toBeGreaterThan(50000); // mate-range score
  });

  it("is deterministic: same position, same chosen action", () => {
    const { engine, search } = makeSearch();
    const game = makeGame(engine, 99);

    const a = search.search(game, BLUE, { maxDepth: 2, timeLimit: 10000 });
    const b = search.search(game, BLUE, { maxDepth: 2, timeLimit: 10000 });

    expect(a.bestAction).toEqual(b.bestAction);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm run test --workspace=packages/bot-engine -- AlphaBetaSearch.spec
```
Expected: FAIL — `Cannot find module './AlphaBetaSearch'`.

- [ ] **Step 4: Implement AlphaBetaSearch**

Create `packages/bot-engine/src/search/AlphaBetaSearch.ts`:

```typescript
import {
  EventPayload,
  Game,
  GameEngine,
  GameEvent,
  cloneGameState,
  getCurrentPlayerId,
  getPieceAtPosition,
} from "@lolchess/game-engine";
import { PositionEvaluator } from "../evaluation/PositionEvaluator";
import { SearchResult } from "../types";
import { ActionGenerator } from "./ActionGenerator";
import { MoveOrdering } from "./MoveOrdering";

const MATE_SCORE = 100000;
const ROOT_CANDIDATES = 12;
const NODE_CANDIDATES = 8;
const MAX_QUIESCENCE_PLIES = 4;
const MAX_FORCING_ACTIONS = 6;

export interface AlphaBetaOptions {
  /** Maximum nominal search depth in plies (board actions) */
  maxDepth: number;
  /** Hard time budget in milliseconds; the last fully completed depth wins */
  timeLimit: number;
}

/** Thrown internally when the time budget expires; caught by iterative deepening. */
class SearchTimeout extends Error {}

/**
 * Iterative-deepening minimax with alpha-beta pruning.
 *
 * - Searches board actions only (move / attack / skill). Item buys and
 *   summoner spells are decided outside the tree by BotEngine.
 * - Uses gameEngine.processAction (deep clone) as the rules oracle, so every
 *   game mechanic is honored without reimplementation.
 * - Evaluates every node from the ROOT player's perspective; opponent nodes
 *   minimize. (Equivalent to negamax given the symmetric evaluator, with
 *   fewer sign-flip pitfalls.)
 * - The search world has crits disabled (gameSettings.disableCrit) so the
 *   tree is deterministic; ThreatEvaluator prices crit as expected damage.
 */
export class AlphaBetaSearch {
  private nodesSearched = 0;
  private startTime = 0;
  private timeLimit = 0;

  constructor(
    private gameEngine: GameEngine,
    private evaluator: PositionEvaluator,
    private actionGenerator: ActionGenerator,
    private moveOrdering: MoveOrdering
  ) {}

  search(game: Game, rootPlayerId: string, options: AlphaBetaOptions): SearchResult {
    this.nodesSearched = 0;
    this.startTime = Date.now();
    this.timeLimit = options.timeLimit;

    const root = cloneGameState(game);
    root.gameSettings = { ...root.gameSettings, disableCrit: true };

    const rootActions = this.candidateActions(root, rootPlayerId, ROOT_CANDIDATES);
    if (rootActions.length === 0) {
      return {
        bestAction: null,
        score: 0,
        nodesSearched: 0,
        depth: 0,
        timeMs: Date.now() - this.startTime,
      };
    }

    let bestAction: EventPayload | null = null;
    let bestScore = -Infinity;
    let completedDepth = 0;
    let previousBest: EventPayload | null = null;

    for (let depth = 1; depth <= options.maxDepth; depth++) {
      try {
        const ordered = this.putFirst(rootActions, previousBest);
        let iterBest: EventPayload | null = null;
        let iterScore = -Infinity;
        let alpha = -Infinity;

        for (const action of ordered) {
          const result = this.gameEngine.processAction(root, action);
          if (!result.success) continue;
          this.nodesSearched++;

          const score = this.alphaBeta(result.game, depth - 1, alpha, Infinity, rootPlayerId, 1);
          if (score > iterScore) {
            iterScore = score;
            iterBest = action;
          }
          alpha = Math.max(alpha, score);
        }

        if (iterBest) {
          bestAction = iterBest;
          bestScore = iterScore;
          completedDepth = depth;
          previousBest = iterBest;
        }

        // A forced win was found — no need to search deeper.
        if (bestScore > MATE_SCORE - 1000) break;
      } catch (e) {
        if (e instanceof SearchTimeout) break;
        throw e;
      }
    }

    return {
      bestAction,
      score: bestScore,
      nodesSearched: this.nodesSearched,
      depth: completedDepth,
      timeMs: Date.now() - this.startTime,
    };
  }

  private alphaBeta(
    game: Game,
    depth: number,
    alpha: number,
    beta: number,
    rootPlayerId: string,
    ply: number
  ): number {
    this.checkTime();

    const terminal = this.evaluator.getTerminalScore(game, rootPlayerId);
    if (terminal !== null) {
      // Prefer faster wins and slower losses.
      if (terminal > 0) return terminal - ply;
      if (terminal < 0) return terminal + ply;
      return 0;
    }

    if (depth === 0) {
      return this.quiescence(game, alpha, beta, rootPlayerId, ply, MAX_QUIESCENCE_PLIES);
    }

    const currentPlayer = getCurrentPlayerId(game);
    if (!currentPlayer) return this.evaluator.evaluate(game, rootPlayerId);
    const maximizing = currentPlayer === rootPlayerId;

    const actions = this.candidateActions(game, currentPlayer, NODE_CANDIDATES);
    if (actions.length === 0) {
      // No board action available: stalemate is a draw by the rules.
      return 0;
    }

    let best = maximizing ? -Infinity : Infinity;
    let anyApplied = false;

    for (const action of actions) {
      const result = this.gameEngine.processAction(game, action);
      if (!result.success) continue;
      anyApplied = true;
      this.nodesSearched++;

      const score = this.alphaBeta(result.game, depth - 1, alpha, beta, rootPlayerId, ply + 1);
      if (maximizing) {
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
      } else {
        best = Math.min(best, score);
        beta = Math.min(beta, score);
      }
      if (beta <= alpha) break;
    }

    if (!anyApplied) return this.evaluator.evaluate(game, rootPlayerId);
    return best;
  }

  /**
   * Combat extension: when nominal depth runs out, keep searching forcing
   * actions (kills and Poro attacks) so exchanges are never cut off mid-trade.
   */
  private quiescence(
    game: Game,
    alpha: number,
    beta: number,
    rootPlayerId: string,
    ply: number,
    remaining: number
  ): number {
    this.checkTime();

    const terminal = this.evaluator.getTerminalScore(game, rootPlayerId);
    if (terminal !== null) {
      if (terminal > 0) return terminal - ply;
      if (terminal < 0) return terminal + ply;
      return 0;
    }

    const standPat = this.evaluator.evaluate(game, rootPlayerId);
    if (remaining === 0) return standPat;

    const currentPlayer = getCurrentPlayerId(game);
    if (!currentPlayer) return standPat;
    const maximizing = currentPlayer === rootPlayerId;

    if (maximizing) {
      if (standPat >= beta) return standPat;
      alpha = Math.max(alpha, standPat);
    } else {
      if (standPat <= alpha) return standPat;
      beta = Math.min(beta, standPat);
    }

    const forcing = this.forcingActions(game, currentPlayer);
    if (forcing.length === 0) return standPat;

    let best = standPat;
    for (const action of forcing) {
      const result = this.gameEngine.processAction(game, action);
      if (!result.success) continue;
      this.nodesSearched++;

      const score = this.quiescence(result.game, alpha, beta, rootPlayerId, ply + 1, remaining - 1);
      if (maximizing) {
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
      } else {
        best = Math.min(best, score);
        beta = Math.min(beta, score);
      }
      if (beta <= alpha) break;
    }
    return best;
  }

  /**
   * Board actions only, heuristically ordered, top-N expanded.
   * Forcing actions (kills, Poro attacks) are never pruned away.
   */
  private candidateActions(game: Game, playerId: string, limit: number): EventPayload[] {
    const all = this.actionGenerator
      .generateAll(game, playerId)
      .filter(
        (a) =>
          a.event === GameEvent.MOVE_CHESS ||
          a.event === GameEvent.ATTACK_CHESS ||
          a.event === GameEvent.SKILL
      );

    const scored = this.moveOrdering.orderActions(game, all, playerId);
    const top = scored.slice(0, limit);
    for (const s of scored.slice(limit)) {
      if (s.isKiller || this.targetsPoro(game, s.action)) {
        top.push(s);
      }
    }
    return top.map((s) => s.action);
  }

  private forcingActions(game: Game, playerId: string): EventPayload[] {
    const combat = this.actionGenerator
      .generateAll(game, playerId)
      .filter(
        (a) => a.event === GameEvent.ATTACK_CHESS || a.event === GameEvent.SKILL
      );
    const scored = this.moveOrdering.orderActions(game, combat, playerId);
    return scored
      .filter((s) => s.isKiller || this.targetsPoro(game, s.action))
      .slice(0, MAX_FORCING_ACTIONS)
      .map((s) => s.action);
  }

  private targetsPoro(game: Game, action: EventPayload): boolean {
    if (!action.targetPosition) return false;
    const target = getPieceAtPosition(game, action.targetPosition);
    return !!target && target.name === "Poro";
  }

  private putFirst(actions: EventPayload[], first: EventPayload | null): EventPayload[] {
    if (!first) return actions;
    const rest = actions.filter((a) => a !== first);
    return rest.length === actions.length ? actions : [first, ...rest];
  }

  private checkTime(): void {
    if (Date.now() - this.startTime > this.timeLimit) {
      throw new SearchTimeout();
    }
  }
}
```

- [ ] **Step 5: Run the tests**

```bash
npm run test --workspace=packages/bot-engine -- AlphaBetaSearch.spec
```
Expected: PASS (all 3). Debug guide if not:
- Free-kill test picks a different attack → check that `getValidAttacks` actually reaches `{x:3,y:6}` from `{x:3,y:2}` (path must be clear of *living* pieces — `clearBoardExcept` zeroes HP, and `getPieceAtPosition` only returns living pieces, so dead bodies don't block).
- Mate test score too low → confirm `game.status` becomes `"finished"` when a Poro dies in simulation (the engine sets it inside `processGame`); `getTerminalScore` depends on `winner === "blue" | "red"`.
- Timeout/slowness → the per-node `console.log`s of Task 3/4 must be gone; also check no remaining log in `BestMoveSearch` fires (it shouldn't be called at all here).

- [ ] **Step 6: Demote the old search to LegacySearch and strip logs**

In `packages/bot-engine/src/search/BestMoveSearch.ts`:
1. Delete the `console.log` lines at ~line 48 (`Current score`) and ~line 286 (`Best threat`).
2. Replace the last line:

```typescript
// Export as Minimax for backward compatibility with BotEngine
export { BestMoveSearch as Minimax };
```

with:

```typescript
// Kept ONLY as the self-play benchmark opponent for the AlphaBetaSearch rework.
// Remove once the new search is validated (see docs/superpowers/specs/2026-06-10-bot-minimax-rework-design.md).
export { BestMoveSearch as LegacySearch };
```

- [ ] **Step 7: Build (expect BotEngine import error — fixed in Task 6)**

```bash
npm run build --workspace=packages/bot-engine
```
Expected: FAILS with `Minimax` import errors in `BotEngine.ts` / `index.ts`. That's the next task; commit the search by itself only if the build passes — otherwise do Task 6 first and commit together. (Preferred: proceed straight to Task 6, then one commit.)

---

### Task 6: BotEngine integration

**Files:**
- Modify: `packages/bot-engine/src/types/index.ts` (BotConfig)
- Modify: `packages/bot-engine/src/BotEngine.ts`
- Modify: `packages/bot-engine/src/index.ts`

- [ ] **Step 1: Extend BotConfig**

In `packages/bot-engine/src/types/index.ts`, replace the `BotConfig` interface:

```typescript
/**
 * Configuration for the bot engine
 */
export interface BotConfig {
  /** Difficulty level affects search depth and randomness */
  difficulty: BotDifficulty;
  /** Maximum search depth in plies (iterative deepening may stop earlier on time) */
  searchDepth: number;
  /** Maximum time for search in milliseconds */
  timeLimit?: number;
  /** Randomness factor (0-1), adds variance to prevent predictability */
  randomness?: number;
  /** Search engine: the alpha-beta rework (default) or the legacy greedy search (benchmark only) */
  engine?: "alphabeta" | "legacy";
}
```

- [ ] **Step 2: Rewire BotEngine**

In `packages/bot-engine/src/BotEngine.ts`:

1. Replace the import of `Minimax`:

```typescript
import { LegacySearch } from "./search/BestMoveSearch";
import { AlphaBetaSearch } from "./search/AlphaBetaSearch";
```

2. Replace the difficulty presets (depth is now real):

```typescript
const DEFAULT_CONFIGS: Record<BotDifficulty, Partial<BotConfig>> = {
  easy: { searchDepth: 1, randomness: 0.35, timeLimit: 1000 },
  medium: { searchDepth: 2, randomness: 0.15, timeLimit: 3000 },
  hard: { searchDepth: 3, randomness: 0.05, timeLimit: 8000 },
  expert: { searchDepth: 4, randomness: 0, timeLimit: 20000 },
};
```

3. Replace the `minimax` field and its construction:

```typescript
  private alphaBeta: AlphaBetaSearch;
  private legacySearch: LegacySearch;
```

and in the constructor (replace the `this.minimax = new Minimax(...)` block; note `moveOrdering` must be constructed BEFORE the search — reorder the lines):

```typescript
    this.moveOrdering = new MoveOrdering(this.threatEvaluator);
    this.alphaBeta = new AlphaBetaSearch(
      this.gameEngine,
      this.positionEvaluator,
      this.actionGenerator,
      this.moveOrdering
    );
    this.legacySearch = new LegacySearch(
      this.gameEngine,
      this.positionEvaluator,
      this.actionGenerator
    );
```

Also persist the engine choice in the config object (constructor):

```typescript
    this.config = {
      difficulty,
      searchDepth: config.searchDepth ?? defaults.searchDepth ?? 2,
      randomness: config.randomness ?? defaults.randomness ?? 0.15,
      timeLimit: config.timeLimit ?? defaults.timeLimit ?? 3000,
      engine: config.engine ?? "alphabeta",
    };
```

4. Replace `getAction` (the spell block gains a sanity check, the search call changes, and a fallback guarantees an action):

```typescript
  getAction(game: Game, botPlayerId: string): EventPayload | null {
    // Phase 0: free actions (don't end the turn)

    // Summoner spells — sanity-checked: only cast if it actually improves the position.
    if (!game.hasUsedSummonerSpellThisTurn) {
      const spellAction = this.summonerSpellStrategy.recommendSummonerSpell(
        game,
        botPlayerId
      );
      if (spellAction && this.spellImprovesPosition(game, botPlayerId, spellAction)) {
        return spellAction;
      }
    }

    // Item purchases
    const currentItemPrice = GameLogic.getCurrentItemPrice(game.players.find((p) => p.userId === botPlayerId)!);
    if (!game.hasBoughtItemThisTurn && this.itemStrategy.shouldBuyItem(game, botPlayerId, currentItemPrice)) {
      const itemRec = this.itemStrategy.recommendPurchase(game, botPlayerId);
      if (itemRec) {
        return {
          playerId: botPlayerId,
          event: GameEvent.BUY_ITEM,
          itemId: itemRec.itemId,
          targetChampionId: itemRec.championId,
        };
      }
    }

    // Phase 1: board action via search
    const searchResult =
      this.config.engine === "legacy"
        ? this.legacySearch.searchV2(game, botPlayerId, this.config.timeLimit)
        : this.alphaBeta.search(game, botPlayerId, {
            maxDepth: this.config.searchDepth,
            timeLimit: this.config.timeLimit ?? 3000,
          });

    let action = searchResult.bestAction;

    // Lower difficulties: occasionally play a random legal board action instead.
    const boardActions = this.actionGenerator
      .generateAll(game, botPlayerId)
      .filter(
        (a) =>
          a.event === GameEvent.MOVE_CHESS ||
          a.event === GameEvent.ATTACK_CHESS ||
          a.event === GameEvent.SKILL
      );
    if (
      action &&
      this.config.randomness &&
      this.config.randomness > 0 &&
      Math.random() < this.config.randomness &&
      boardActions.length > 0
    ) {
      action = this.pickRandom(boardActions);
    }

    // The backend must always get an action: fall back to any legal board action.
    if (!action && boardActions.length > 0) {
      action = boardActions[0];
    }

    return action;
  }

  /**
   * Sanity check for spell recommendations: simulate the spell and require the
   * evaluation to improve. Prevents wasting long-cooldown spells (Flash) on
   * positions the board search can handle anyway.
   */
  private spellImprovesPosition(
    game: Game,
    botPlayerId: string,
    spellAction: EventPayload
  ): boolean {
    const SPELL_MARGIN = 30;
    const sim = this.gameEngine.processAction(game, spellAction);
    if (!sim.success) return false;
    const before = this.positionEvaluator.evaluate(game, botPlayerId);
    const after = this.positionEvaluator.evaluate(sim.game, botPlayerId);
    return after >= before + SPELL_MARGIN;
  }
```

(The two `console.log`s previously in `getAction` are dropped deliberately.)

5. Fix the `search()` convenience method (was calling `searchV2`):

```typescript
  search(
    game: Game,
    playerId: string,
    depth?: number,
    timeLimit?: number
  ): SearchResult {
    return this.alphaBeta.search(game, playerId, {
      maxDepth: depth ?? this.config.searchDepth,
      timeLimit: timeLimit ?? this.config.timeLimit ?? 3000,
    });
  }
```

- [ ] **Step 3: Update package exports**

In `packages/bot-engine/src/index.ts`, replace:

```typescript
export { Minimax } from "./search/BestMoveSearch";
```

with:

```typescript
export { AlphaBetaSearch } from "./search/AlphaBetaSearch";
export { LegacySearch } from "./search/BestMoveSearch";
// Backward-compatible alias: "Minimax" now points at the real minimax.
export { AlphaBetaSearch as Minimax } from "./search/AlphaBetaSearch";
```

- [ ] **Step 4: Build everything in order, run all bot tests**

```bash
npm run build --workspace=packages/game-engine
npm run build --workspace=packages/bot-engine
npm run build --workspace=apps/backend
npm run test --workspace=packages/bot-engine
```
Expected: all builds clean (backend needs no source changes — same `BotEngine.getAction` signature), all tests PASS.

- [ ] **Step 5: Commit (Tasks 5 + 6 together)**

```bash
git add packages/bot-engine/src
git commit -m "feat(bot-engine): iterative-deepening alpha-beta search replaces greedy searchV2"
```

---

### Task 7: Self-play harness

**Files:**
- Create: `packages/bot-engine/src/selfplay/run.ts`

- [ ] **Step 1: Write the harness**

Create `packages/bot-engine/src/selfplay/run.ts`:

```typescript
/**
 * Self-play harness: new AlphaBeta bot vs legacy greedy bot.
 *
 * Usage (after building game-engine and bot-engine):
 *   npm run selfplay --workspace=packages/bot-engine            # default 10 games
 *   npm run selfplay --workspace=packages/bot-engine -- 30      # 30 games
 *
 * Acceptance gate from the spec: new bot wins >= 80% of decided games.
 */
import { GameEngine, Game, getCurrentPlayerId, GameEvent } from "@lolchess/game-engine";
import { BotEngine } from "../BotEngine";

const CHAMPS = ["Garen", "Ahri", "Ashe", "Aatrox", "Janna"];
const BLUE_ID = "blue-bot";
const RED_ID = "red-bot";
const MAX_ROUNDS = 400; // 200 turns each, then declared a draw
const MAX_ACTIONS_PER_TURN = 6; // free actions safety valve

type Outcome = "new" | "legacy" | "draw" | "error";

interface GameRecord {
  seed: number;
  newIsBlue: boolean;
  outcome: Outcome;
  rounds: number;
  avgNewMoveMs: number;
}

function playGame(seed: number, newIsBlue: boolean, timeLimit: number): GameRecord {
  const engine = new GameEngine();
  const newBot = new BotEngine({ difficulty: "expert", timeLimit });
  const legacyBot = new BotEngine({ difficulty: "expert", timeLimit, engine: "legacy" });

  let game: Game = engine.createGame({
    seed,
    bluePlayerId: BLUE_ID,
    redPlayerId: RED_ID,
    blueChampions: CHAMPS,
    redChampions: CHAMPS,
    startingGold: 100,
  });

  const bots: Record<string, BotEngine> = {
    [BLUE_ID]: newIsBlue ? newBot : legacyBot,
    [RED_ID]: newIsBlue ? legacyBot : newBot,
  };
  const newBotId = newIsBlue ? BLUE_ID : RED_ID;

  const newMoveTimes: number[] = [];
  let actionsThisRound = 0;
  let lastRound = game.currentRound;

  while (!engine.isGameOver(game) && game.currentRound <= MAX_ROUNDS) {
    const pid = getCurrentPlayerId(game);
    if (!pid) break;

    if (game.currentRound !== lastRound) {
      lastRound = game.currentRound;
      actionsThisRound = 0;
    }
    actionsThisRound++;

    let action;
    const t0 = Date.now();
    try {
      action = bots[pid].getAction(game, pid);
    } catch (e) {
      console.error(`  [seed ${seed}] bot ${pid} threw:`, e);
      return record(seed, newIsBlue, "error", game, newMoveTimes);
    }
    if (pid === newBotId) newMoveTimes.push(Date.now() - t0);

    // Safety valve: if a bot loops on free actions, force a board action.
    if (actionsThisRound > MAX_ACTIONS_PER_TURN || !action) {
      const fallback = bots[pid]
        .getAllActions(game, pid)
        .find(
          (a) =>
            a.event === GameEvent.MOVE_CHESS ||
            a.event === GameEvent.ATTACK_CHESS ||
            a.event === GameEvent.SKILL
        );
      if (!fallback) {
        // No board action at all: stalemate -> draw
        return record(seed, newIsBlue, "draw", game, newMoveTimes);
      }
      action = fallback;
    }

    const result = engine.processAction(game, action);
    if (!result.success) {
      console.error(`  [seed ${seed}] illegal action by ${pid}: ${result.error}`);
      return record(seed, newIsBlue, "error", game, newMoveTimes);
    }
    game = result.game;
  }

  if (!engine.isGameOver(game)) {
    return record(seed, newIsBlue, "draw", game, newMoveTimes);
  }

  const winner = engine.getWinner(game); // "blue" | "red" | null
  if (winner === null || winner === undefined) {
    return record(seed, newIsBlue, "draw", game, newMoveTimes);
  }
  const newWon = (winner === "blue") === newIsBlue;
  return record(seed, newIsBlue, newWon ? "new" : "legacy", game, newMoveTimes);
}

function record(
  seed: number,
  newIsBlue: boolean,
  outcome: Outcome,
  game: Game,
  newMoveTimes: number[]
): GameRecord {
  const avg =
    newMoveTimes.length > 0
      ? newMoveTimes.reduce((a, b) => a + b, 0) / newMoveTimes.length
      : 0;
  return {
    seed,
    newIsBlue,
    outcome,
    rounds: game.currentRound,
    avgNewMoveMs: Math.round(avg),
  };
}

function main() {
  const numGames = parseInt(process.argv[2] ?? "10", 10);
  const timeLimit = parseInt(process.argv[3] ?? "3000", 10);
  const records: GameRecord[] = [];

  console.log(`Self-play: ${numGames} games, ${timeLimit}ms/move, new(alphabeta) vs legacy(greedy)\n`);

  for (let i = 0; i < numGames; i++) {
    const seed = 1000 + i;
    const newIsBlue = i % 2 === 0; // alternate colors
    const t0 = Date.now();
    const rec = playGame(seed, newIsBlue, timeLimit);
    records.push(rec);
    console.log(
      `game ${i + 1}/${numGames} seed=${seed} new=${newIsBlue ? "blue" : "red"} -> ` +
        `${rec.outcome.toUpperCase()} in ${rec.rounds} rounds ` +
        `(avg new-bot move ${rec.avgNewMoveMs}ms, game took ${Math.round((Date.now() - t0) / 1000)}s)`
    );
  }

  const wins = records.filter((r) => r.outcome === "new").length;
  const losses = records.filter((r) => r.outcome === "legacy").length;
  const draws = records.filter((r) => r.outcome === "draw").length;
  const errors = records.filter((r) => r.outcome === "error").length;
  const decided = wins + losses;
  const winRate = decided > 0 ? ((wins / decided) * 100).toFixed(1) : "n/a";

  console.log(`\n=== RESULTS ===`);
  console.log(`new bot:    ${wins} wins`);
  console.log(`legacy bot: ${losses} wins`);
  console.log(`draws:      ${draws}, errors: ${errors}`);
  console.log(`win rate (decided games): ${winRate}%  (acceptance gate: >= 80%)`);

  if (errors > 0) process.exitCode = 2;
}

main();
```

- [ ] **Step 2: Build and smoke-run with 2 games**

```bash
npm run build --workspace=packages/bot-engine
npm run selfplay --workspace=packages/bot-engine -- 2 2000
```
Expected: two complete games with a printed outcome each, no `error` outcomes. Debug guide:
- `illegal action` errors → log the offending `action` JSON in `playGame` before `processAction`; most likely an action generated for a piece that died earlier in the same turn. The harness's job is only to surface these; fix belongs in `ActionGenerator` filtering or (if it's a legacy-bot quirk) note it and let the error count stand for legacy-bot moves only.
- Game never ends / round cap always hit → inspect a final `game.board` snapshot; if both bots shuffle pieces, that's a strength problem, not a harness bug — proceed to Task 8 tuning.
- Champion name errors from `createGame` → verify names against `packages/game-engine/src/data/champions.ts` (`Garen`, `Ahri`, `Ashe`, `Aatrox`, `Janna` all exist as of this writing).

- [ ] **Step 3: Commit**

```bash
git add packages/bot-engine/src/selfplay/run.ts
git commit -m "feat(bot-engine): self-play harness, new vs legacy bot"
```

---

### Task 8: Validation run + sanity checks

- [ ] **Step 1: Depth sanity check (deeper must not be weaker)**

Temporarily run two quick batches by editing nothing — use the time limit to constrain depth indirectly is unreliable; instead run this one-off node script from the repo root:

```bash
node -e "
const { GameEngine, getCurrentPlayerId, GameEvent } = require('./packages/game-engine/dist/index.js');
const { BotEngine } = require('./packages/bot-engine/dist/index.js');
const CHAMPS = ['Garen','Ahri','Ashe','Aatrox','Janna'];
let wins = { deep: 0, shallow: 0, draw: 0 };
for (let i = 0; i < 6; i++) {
  const engine = new GameEngine();
  const deep = new BotEngine({ difficulty: 'expert', searchDepth: 3, timeLimit: 3000 });
  const shallow = new BotEngine({ difficulty: 'expert', searchDepth: 1, timeLimit: 3000 });
  const deepIsBlue = i % 2 === 0;
  let game = engine.createGame({ seed: 500 + i, bluePlayerId: 'b', redPlayerId: 'r', blueChampions: CHAMPS, redChampions: CHAMPS, startingGold: 100 });
  const bots = { b: deepIsBlue ? deep : shallow, r: deepIsBlue ? shallow : deep };
  let guard = 0;
  while (!engine.isGameOver(game) && game.currentRound <= 300 && guard++ < 2000) {
    const pid = getCurrentPlayerId(game);
    let a = bots[pid].getAction(game, pid);
    if (!a) break;
    const res = engine.processAction(game, a);
    if (!res.success) break;
    game = res.game;
  }
  const w = engine.isGameOver(game) ? engine.getWinner(game) : null;
  if (!w) wins.draw++;
  else if ((w === 'blue') === deepIsBlue) wins.deep++;
  else wins.shallow++;
  console.log('game', i + 1, '->', w ?? 'draw');
}
console.log(wins);
"
```
Expected: `deep` wins the majority of decided games. If `shallow` wins more, there is a sign/perspective bug in `alphaBeta` — re-check that `maximizing` is true exactly when `getCurrentPlayerId(game) === rootPlayerId`, and that `evaluate` is always called with `rootPlayerId`.

- [ ] **Step 2: The acceptance run**

```bash
npm run selfplay --workspace=packages/bot-engine -- 20 3000
```
Expected: new bot wins ≥ 80% of decided games. Record the full output in the PR/commit message.

If below the gate, tune in this order (one change → re-run 10 games):
1. Average move time far below the limit → raise `NODE_CANDIDATES` 8→10 in `AlphaBetaSearch.ts`.
2. Average move time at the limit with `depth` result mostly 1 → evaluation is too slow; the usual culprit is `evaluatePositionSafety` (it calls `getValidAttacks` per enemy per piece). Cheapest fix: in `calculatePlayerSafety`, skip pieces whose HP is full AND are minions (champions + Poro + damaged pieces still evaluated).
3. Bot wins material but loses on objectives/promotion → raise `passedPawn` weight 1.2→1.5 and `neutralMonster` 0.8→1.0 in `PositionEvaluator.WEIGHTS`.

- [ ] **Step 3: Full workspace verification**

```bash
npm run build --workspace=packages/game-engine
npm run build --workspace=packages/bot-engine
npm run build --workspace=apps/backend
npm run build --workspace=apps/frontend
npm run lint --workspace=apps/backend
npm run test --workspace=apps/backend
npm run test --workspace=packages/bot-engine
```
Expected: everything green. The backend imports only `BotEngine`/`BotDifficulty`, whose signatures are unchanged.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test(bot-engine): self-play validation of alpha-beta bot vs legacy"
```

---

## Out of scope (per spec)

- `BanPickStrategy` and `ItemStrategy` redesigns (only the spell sanity check touches strategy behavior).
- Tuning easy/medium/hard for distinct feel — only expert matters.
- Transposition tables, MCTS, learned weights.

## Deliberate deviation from spec

The spec listed a "secure Drake when Smite guarantees it" scenario test. It is omitted: that behavior lives in the pre-existing `SummonerSpellStrategy` (untouched by this rework except the sanity check), and the Smite spell payload shape isn't exercised by any new code. Objective play is validated end-to-end by the self-play harness instead. If Smite misuse shows up in self-play games, add the scenario test then.
