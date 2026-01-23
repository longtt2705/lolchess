import { Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";

export class Blitzcrank extends ChessObject {
  skill(position?: Square): void {
    // Find the target chess piece to pull
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

      // Deal magic damage
      this.activeSkillDamage(
        targetChessObject,
        15 + this.ap * 0.8,
        "magic",
        this,
        this.sunder
      );

      // Store the original position for reference
      const originalPosition = { ...targetChess.position };

      // Pull the target to Blitzcrank (find adjacent square in the pull direction)
      // Calculate direction vector from target to Blitzcrank
      const dx = this.chess.position.x - targetChess.position.x;
      const dy = this.chess.position.y - targetChess.position.y;

      // Normalize to get direction (will be -1, 0, or 1 for each component)
      const dirX = dx === 0 ? 0 : dx / Math.abs(dx);
      const dirY = dy === 0 ? 0 : dy / Math.abs(dy);

      // Calculate the ideal target position (one step towards Blitzcrank)
      const idealPosition: Square = {
        x: targetChess.position.x + dirX,
        y: targetChess.position.y + dirY,
      };

      // Check if the ideal position is adjacent to Blitzcrank and empty
      const isAdjacentToBlitz =
        Math.abs(idealPosition.x - this.chess.position.x) <= 1 &&
        Math.abs(idealPosition.y - this.chess.position.y) <= 1 &&
        !(
          idealPosition.x === this.chess.position.x &&
          idealPosition.y === this.chess.position.y
        );

      const isIdealEmpty =
        !getChessAtPosition(this.game, true, idealPosition) &&
        !getChessAtPosition(this.game, false, idealPosition);

      if (isAdjacentToBlitz && isIdealEmpty) {
        // Ideal position is available
        targetChess.position = idealPosition;
      } else {
        // Fallback: find any adjacent empty square (in case ideal is blocked)
        const adjacentSquares = getAdjacentSquares(this.chess.position);
        const emptyAdjacent = adjacentSquares.find(
          (square) =>
            !getChessAtPosition(this.game, true, square) &&
            !getChessAtPosition(this.game, false, square)
        );

        if (emptyAdjacent) {
          targetChess.position = emptyAdjacent;
        }
      }

      // Store the final pulled position in the skill payload for the animation
      if (this.chess.skill) {
        if (!this.chess.skill.payload) {
          this.chess.skill.payload = {};
        }
        this.chess.skill.payload.pulledToPosition = { ...targetChess.position };
      }
    }
  }

  protected getActiveSkillPotential(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Base damage: 15 + 80% AP
    const baseDamage = 15 + this.ap * 0.8;

    // Displacement is highly valuable (hook effect)
    const displacementValue = 15;

    return baseDamage + displacementValue;
  }

  public getActiveSkillValue(targetPosition?: Square | null): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    if (!targetPosition) {
      return 0; // Blitzcrank's hook requires a target
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

    // Base damage: 15 + 80% AP
    const damage = this.calculateActiveSkillDamage(target);

    // Displacement value - pulling enemy towards Blitzcrank
    // Higher value if target is valuable (low HP, high material value)
    const targetValue = target.getMaterialValue();
    const displacementValue = 15 + targetValue * 0.1;

    // Extra value if target is far away (hooks are more valuable for gap closing)
    const distance = Math.max(
      Math.abs(this.chess.position.x - target.chess.position.x),
      Math.abs(this.chess.position.y - target.chess.position.y)
    );
    const distanceBonus = distance > 2 ? 10 : 0;

    return damage + displacementValue + distanceBonus;
  }
}
