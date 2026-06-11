import { GameEngine } from "@lolchess/game-engine";
import { PositionEvaluator } from "./PositionEvaluator";
import { NeutralMonsterEvaluator } from "./NeutralMonsterEvaluator";

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

  it("is symmetric when a neutral monster (Drake) is on the board (exposes turn-bonus asymmetry)", () => {
    const { engine, game } = makeGame(42);
    const evaluator = new PositionEvaluator(engine);

    // Place Drake at a central position adjacent to pieces we'll move there.
    // Drake position: x=4, y=3 (center of board).
    const template = game.board[0];
    const fakeDrake = {
      ...JSON.parse(JSON.stringify(template)),
      id: "test-drake",
      name: "Infernal Drake",
      ownerId: "neutral",
      blue: undefined,
      position: { x: 4, y: 3 },
      stats: { ...JSON.parse(JSON.stringify(template.stats)), hp: 250, maxHp: 250 },
    } as any;
    (game.board as any[]).push(fakeDrake);

    // Move a blue piece to be adjacent (y=2, same file) so it can attack the Drake.
    // Find an existing blue piece and teleport it.
    const bluePiece = game.board.find(
      (p) => p.ownerId === BLUE && p.stats.hp > 0
    )!;
    bluePiece.position = { x: 4, y: 2 };

    // Move a red piece to also be adjacent (y=4) so both sides have range.
    const redPiece = game.board.find(
      (p) => p.ownerId === RED && p.stats.hp > 0
    )!;
    redPiece.position = { x: 4, y: 4 };

    // Set round to an even number so it is RED's turn.
    // With the bug: evaluate(game, BLUE) always gives BLUE isCurrentTurn=true
    // even though it's actually RED's turn — breaking symmetry.
    (game as any).currentRound = 2;

    // Evaluate from both sides — must be an exact mirror.
    const blueScore = evaluator.evaluate(game, BLUE);
    const redScore = evaluator.evaluate(game, RED);

    expect(blueScore).toBeCloseTo(-redScore, 3);
  });

  it("NeutralMonsterEvaluator.evaluate is anti-symmetric: evaluate(A,B) === -evaluate(B,A)", () => {
    const { engine, game } = makeGame(42);
    const neutralEvaluator = new NeutralMonsterEvaluator(engine);

    // Place Drake adjacent to pieces of both sides so control score is non-zero.
    const template = game.board[0];
    const fakeDrake = {
      ...JSON.parse(JSON.stringify(template)),
      id: "test-drake",
      name: "Infernal Drake",
      ownerId: "neutral",
      blue: undefined,
      position: { x: 4, y: 3 },
      stats: { ...JSON.parse(JSON.stringify(template.stats)), hp: 250, maxHp: 250 },
    } as any;
    (game.board as any[]).push(fakeDrake);

    // Teleport one blue piece and one red piece adjacent to the Drake.
    const bluePiece = game.board.find(
      (p) => p.ownerId === BLUE && p.stats.hp > 0
    )!;
    bluePiece.position = { x: 4, y: 2 };

    const redPiece = game.board.find(
      (p) => p.ownerId === RED && p.stats.hp > 0
    )!;
    redPiece.position = { x: 4, y: 4 };

    // Use an even round so it's RED's turn — the bug gives blue a free +50
    // turn-advantage bonus that red doesn't get when evaluating symmetrically.
    (game as any).currentRound = 2;

    const blueScore = neutralEvaluator.evaluate(game, BLUE, RED);
    const redScore = neutralEvaluator.evaluate(game, RED, BLUE);

    expect(blueScore).toBeCloseTo(-redScore, 3);
  });

  it("is symmetric when blue has a passed pawn and red does not (exposes passed-pawn asymmetry bug)", () => {
    // Arrange: teleport a blue Melee Minion deep into red territory and clear
    // all red minions (Melee, Caster, Siege) from files 0-2 so the blue minion
    // at (1,5) passes the isPassedPawnCheck and gets a nonzero passedPawn score.
    const { engine, game } = makeGame(42);
    const evaluator = new PositionEvaluator(engine);

    // Teleport the blue Melee Minion on file 1 to y=5 (deep into red territory)
    const blueMinion = game.board.find(
      (p) => p.name === "Melee Minion" && p.ownerId === BLUE && p.position.x === 1
    )!;
    blueMinion.position = { x: 1, y: 5 };

    // Wipe out all red minion-type pieces on files 0–2 so nothing blocks the
    // passed-pawn check on the same/adjacent files ahead of the blue minion.
    game.board.forEach((p) => {
      if (
        ["Melee Minion", "Caster Minion", "Siege Minion"].includes(p.name) &&
        p.ownerId === RED &&
        p.position.x >= 0 &&
        p.position.x <= 2
      ) {
        p.stats.hp = 0;
      }
    });

    // Verify the scenario actually triggers a nonzero passedPawn component.
    const blueBreakdown = evaluator.evaluateWithBreakdown(game, BLUE);
    expect(blueBreakdown.breakdown.passedPawn).not.toBe(0);

    // The core assertion: full evaluation must be anti-symmetric.
    const blueScore = evaluator.evaluate(game, BLUE);
    const redScore = evaluator.evaluate(game, RED);
    expect(blueScore).toBeCloseTo(-redScore, 3);
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

describe("PositionEvaluator Poro execution pricing", () => {
  // Regression for the seed-1014 loss mode: a legacy Siege Minion parked next
  // to the castled Poro executed it 10 HP at a time over 10 turns while the
  // bot was ahead on total HP. The flat -damage safety pricing (~-15 eval
  // points after multipliers) could never outweigh the +100 castle bonus, so
  // no escape or defense was ever worth it to the search.
  function setupExecution(poroHp: number) {
    const engine = new GameEngine();
    const game = engine.createGame({
      seed: 42,
      bluePlayerId: BLUE,
      redPlayerId: RED,
      blueChampions: CHAMPS,
      redChampions: CHAMPS,
      startingGold: 100,
    });
    const evaluator = new PositionEvaluator(engine);

    // Keep only the two Poros and one red Siege Minion bearing on the blue
    // Poro along an open file.
    const siege = game.board.find(
      (p) => p.name === "Siege Minion" && p.ownerId === RED && p.stats.hp > 0
    )!;
    for (const p of game.board) {
      if (p.name === "Poro" || p.id === siege.id) continue;
      p.stats.hp = 0;
    }
    const bluePoro = game.board.find(
      (p) => p.name === "Poro" && p.ownerId === BLUE
    )!;
    const redPoro = game.board.find(
      (p) => p.name === "Poro" && p.ownerId === RED
    )!;
    bluePoro.position = { x: 1, y: 0 }; // castled corner
    bluePoro.stats.hp = poroHp;
    redPoro.position = { x: 7, y: 7 };
    siege.position = { x: 1, y: 4 }; // same file, clear path to the Poro

    return { evaluator, game };
  }

  it("prices a chip attacker on the Poro worse as the Poro's HP drops", () => {
    const atFull = setupExecution(200);
    const atLow = setupExecution(60);

    const safetyFull =
      atFull.evaluator.evaluateWithBreakdown(atFull.game, BLUE).breakdown.safety;
    const safetyLow =
      atLow.evaluator.evaluateWithBreakdown(atLow.game, BLUE).breakdown.safety;

    // Same attacker, same damage per hit — but the low-HP Poro is closer to
    // execution, so the threat must price substantially worse.
    expect(safetyLow).toBeLessThan(safetyFull - 100);
  });

  it("prices Poro chip threats above the castle walk-out cost while escape is still possible", () => {
    // Walking out of the castled corner costs ~115 positional points
    // (+100 castle bonus lost, -15 step-out penalty). With several turns
    // still available to escape (hp well above per-hit damage), the safety
    // penalty (weighted 0.5 in the total) must already exceed that, or the
    // search will always prefer to stand and die slowly.
    const { evaluator, game } = setupExecution(100);
    const withAttacker =
      evaluator.evaluateWithBreakdown(game, BLUE).breakdown.safety;

    const noAttacker = setupExecution(100);
    const siege = noAttacker.game.board.find(
      (p) => p.name === "Siege Minion" && p.ownerId === RED && p.stats.hp > 0
    )!;
    siege.stats.hp = 0;
    const withoutAttacker =
      noAttacker.evaluator.evaluateWithBreakdown(noAttacker.game, BLUE)
        .breakdown.safety;

    const weightedPenalty = (withoutAttacker - withAttacker) * 0.5; // safety weight
    expect(weightedPenalty).toBeGreaterThan(115);
  });

  it("stays anti-symmetric with the execution escalation active", () => {
    const { evaluator, game } = setupExecution(60);
    expect(evaluator.evaluate(game, BLUE)).toBeCloseTo(
      -evaluator.evaluate(game, RED),
      3
    );
  });
});
