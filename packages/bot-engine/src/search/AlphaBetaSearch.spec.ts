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
    // The victim must be a MOBILE piece (champion): a forward-only minion
    // cannot escape the siege's file, so the search would (correctly) prefer
    // advancing first and collecting the trapped kill one ply later. Against
    // a champion, delaying loses the kill, so the immediate attack is best.
    const siege = findPiece(game, "Siege Minion", true);
    const victim = findPiece(game, "Ahri", false);
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
