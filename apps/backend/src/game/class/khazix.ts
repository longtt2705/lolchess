import { GameLogic } from "../game.logic";
import { Square } from "../game.schema";
import { ChessObject } from "./chess";

export class KhaZix extends ChessObject {
  // Check if a target is isolated (no allied pieces adjacent)
  private isTargetIsolated(
    targetPosition: Square,
    targetIsBlue: boolean
  ): boolean {
    const adjacentSquares = GameLogic.getAdjacentSquares(targetPosition);

    for (const square of adjacentSquares) {
      const adjacentChess = GameLogic.getChess(this.game, targetIsBlue, square);
      if (adjacentChess) {
        return false; // Found an ally, not isolated
      }
    }

    return true; // No allies found, target is isolated
  }

  skill(position?: Square): void {
    if (!this.validateSkill(this.chess.skill, position)) {
      throw new Error("Invalid skill");
    }

    // Find the target chess piece
    const targetChess = GameLogic.getChess(
      this.game,
      !this.chess.blue,
      position
    );

    if (targetChess) {
      const targetChessObject = new ChessObject(targetChess, this.game);

      // Base damage
      let damage = 20 + this.ad * 0.8;

      // Check if target is isolated for bonus damage
      if (this.isTargetIsolated(targetChess.position, targetChess.blue)) {
        damage *= 1.5; // 50% bonus damage to isolated targets
      }

      // Deal physical damage
      this.damage(targetChessObject, damage, "physical");
    }

    // Set skill on cooldown
    this.chess.skill.currentCooldown = this.chess.skill.cooldown;
  }
}
