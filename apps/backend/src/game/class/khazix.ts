import { Square } from "../types";
import { ChessObject } from "./chess";
import { ChessFactory } from "./chessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../utils/helpers";

export class KhaZix extends ChessObject {
  // Check if a target is isolated (no allied pieces adjacent)
  private isTargetIsolated(
    targetPosition: Square,
    targetIsBlue: boolean
  ): boolean {
    const adjacentSquares = getAdjacentSquares(targetPosition);

    for (const square of adjacentSquares) {
      const adjacentChess = getChessAtPosition(this.game, targetIsBlue, square);
      if (adjacentChess) {
        return false; // Found an ally, not isolated
      }
    }

    return true; // No allies found, target is isolated
  }

  skill(position?: Square): void {
    // Find the target chess piece
    const targetChess = getChessAtPosition(
      this.game,
      !this.chess.blue,
      position
    );

    if (targetChess) {
      const targetChessObject = ChessFactory.createChess(
        targetChess,
        this.game
      );

      // Base damage
      let damage = 20 + this.ad * 0.8;

      // Check if target is isolated for bonus damage
      if (this.isTargetIsolated(targetChess.position, targetChess.blue)) {
        damage *= 2; // 100% bonus damage to isolated targets
      }

      // Deal physical damage
      this.activeSkillDamage(
        targetChessObject,
        damage,
        "physical",
        this,
        this.sunder
      );
    }
  }
}
