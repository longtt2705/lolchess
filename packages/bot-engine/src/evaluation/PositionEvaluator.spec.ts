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

  it("is symmetric in a mid-game position where pieces threaten each other (exposes safety sign bug)", () => {
    // seed=42: blue pieces start at y=0..1, red at y=6..7
    // Advance blue minion e2->e3->e4 and mirror for red f7->f6->f5
    // This puts two minions adjacent (y=3 vs y=4), making safety non-zero
    const { engine, game } = makeGame(42);
    const evaluator = new PositionEvaluator(engine);

    let state = game;

    // Blue minion e-file: x=4, y=1 -> y=2
    let result = engine.processAction(state, {
      playerId: BLUE,
      event: "move_chess" as any,
      casterPosition: { x: 4, y: 1 },
      targetPosition: { x: 4, y: 2 },
    });
    expect(result.success).toBe(true);
    state = result.game;

    // Red minion e-file mirror: x=4, y=6 -> y=5
    result = engine.processAction(state, {
      playerId: RED,
      event: "move_chess" as any,
      casterPosition: { x: 4, y: 6 },
      targetPosition: { x: 4, y: 5 },
    });
    expect(result.success).toBe(true);
    state = result.game;

    // Blue advances again: x=4, y=2 -> y=3
    result = engine.processAction(state, {
      playerId: BLUE,
      event: "move_chess" as any,
      casterPosition: { x: 4, y: 2 },
      targetPosition: { x: 4, y: 3 },
    });
    expect(result.success).toBe(true);
    state = result.game;

    // Red advances again: x=4, y=5 -> y=4
    result = engine.processAction(state, {
      playerId: RED,
      event: "move_chess" as any,
      casterPosition: { x: 4, y: 5 },
      targetPosition: { x: 4, y: 4 },
    });
    expect(result.success).toBe(true);
    state = result.game;

    // At this point blue minion is at (4,3) and red minion at (4,4):
    // they are adjacent and threaten each other, making safety non-zero.
    const blueScore = evaluator.evaluate(state, BLUE);
    const redScore = evaluator.evaluate(state, RED);

    expect(blueScore).toBeCloseTo(-redScore, 3);
  });
});
