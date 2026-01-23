import { Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";

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

  protected getActiveSkillPotential(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Base damage: 20 + 80% AD + 50% AP
    const baseDamage = 20 + this.ad * 0.8 + this.ap * 0.5;

    // Assume isolation for higher value (actual isolation check would need target context)
    // Use a conservative multiplier since we can't check isolation here
    const isolationPotential = 1.5; // Between 1x and 2x damage

    return baseDamage * isolationPotential;
  }

  public getActiveSkillValue(targetPosition?: Square | null): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    if (!targetPosition) {
      return 0; // Kha'Zix's skill requires a target
    }

    const targetPiece = getChessAtPosition(this.game, this.chess.blue, targetPosition);
    if (!targetPiece) {
      return 0;
    }
    const target = ChessFactory.createChess(targetPiece, this.game);

    // Only works on enemies
    if (target.chess.blue === this.chess.blue) {
      return 0;
    }

    // Base damage: 20 + 80% AD + 50% AP
    let damage = 20 + this.ad * 0.8 + this.ap * 0.5;

    // Check if target is isolated for bonus damage
    const isIsolated = this.isTargetIsolated(target.chess.position, target.chess.blue);
    if (isIsolated) {
      damage *= 2; // 100% bonus damage to isolated targets
    }

    // Apply damage calculation (resistances, shields, etc.)
    const actualDamage = this.calculateActiveSkillDamage(target);

    // Use actual damage but add bonus for isolation
    return actualDamage + (isIsolated ? 20 : 0); // Extra value for isolation mechanic
  }
}
