import {
  Game,
  Square,
  getPlayerPieces,
  ChessFactory,
  getPieceAtPosition,
} from "@lolchess/game-engine";
/**
 * Evaluates Line of Sight (LoS) for ranged pieces
 *
 * Key concept: Friendly pieces block ranged attacks, so the bot needs to:
 * 1. Identify when ranged carries have blocked firing lanes
 * 2. Find moves that clear these blocks ("window opening")
 * 3. Avoid creating new blocks when moving
 */
export class LoSEvaluator {
  constructor() { }

  evaluateLoS(game: Game, playerId: string): number {
    let score = 0;
    const baseScore = 10;
    const isBlue = game.bluePlayer === playerId;
    const pieces = getPlayerPieces(game, playerId);
    // Dedupe by coordinate key — Set<Square> would compare object references
    const uniqueAttackSquares = new Map<string, Square>();
    for (const piece of pieces) {
      const availableAttackSquares = ChessFactory.createChess(piece, game).getAvailableAttackSquares();
      for (const square of availableAttackSquares) {
        uniqueAttackSquares.set(`${square.x},${square.y}`, square);
      }
    }

    for (const square of uniqueAttackSquares.values()) {
      // Intentionally excludes the z (x=-1) and i (x=8) monster files:
      // objective control is NeutralMonsterEvaluator's job, not LoS.
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
}
