import {
  Chess,
  Game,
  GameEngine,
  Square,
  getPlayerPieces,
  isPathClear,
  champions,
  ChessFactory,
  getPieceAtPosition,
} from "@lolchess/game-engine";
import { BlockedLane, LoSAnalysis, LoSClearingMove } from "../types";

/**
 * Direction vectors for 8-directional movement
 */
const DIRECTIONS = [
  { dx: 0, dy: 1 }, // Up (forward for blue)
  { dx: 0, dy: -1 }, // Down (forward for red)
  { dx: 1, dy: 0 }, // Right
  { dx: -1, dy: 0 }, // Left
  { dx: 1, dy: 1 }, // Diagonal up-right
  { dx: -1, dy: 1 }, // Diagonal up-left
  { dx: 1, dy: -1 }, // Diagonal down-right
  { dx: -1, dy: -1 }, // Diagonal down-left
];

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
      // if center square, give a bonus)
      if ((square.y === 3 || square.y === 4) && (square.x === 3 || square.x === 4)) {
        score += baseScore * 2;
      }

      const target = getPieceAtPosition(game, square);
      if (!target) score += baseScore;
      else score += ChessFactory.createChess(target, game).damageTargetPriorityFactor * baseScore;
    }
    return score;
  }
}
