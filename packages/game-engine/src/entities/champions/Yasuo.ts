import { Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getChessAtPosition, isValidBoardPosition } from "../../utils/helpers";

export class Yasuo extends ChessObject {
  get criticalChance(): number {
    return super.criticalChance * 2;
  }

  get ad(): number {
    if (this.criticalChance > 100) {
      return super.ad + Math.floor((this.criticalChance - 100) * 0.5);
    }
    return super.ad;
  }

  protected postCritDamage(chess: ChessObject, damage: number): void {
    super.postCritDamage(chess, damage);

    // Apply shield: (10 + 10% of AP)% of max health for 3 turns
    this.applyShield(
      Math.floor((this.maxHp * (10 + this.ap * 0.1)) / 100),
      3,
      "yasuo_critical_strike_shield"
    );

    // Fire whirlwind in the target direction
    this.fireWhirlwind(chess);
  }

  private fireWhirlwind(attackedTarget: ChessObject): void {
    const yasuoPos = this.chess.position;
    const targetPos = attackedTarget.chess.position;

    // Calculate direction from Yasuo to target
    const dx = targetPos.x - yasuoPos.x;
    const dy = targetPos.y - yasuoPos.y;

    // Normalize to get step direction (-1, 0, or 1)
    const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

    // Find all enemies in the line from Yasuo's position to edge of board
    const whirlwindTargets: Array<{
      targetId: string;
      targetPosition: Square;
    }> = [];

    // Calculate whirlwind damage: 10 + 30% AD + 20% AP
    const whirlwindDamage = 10 + this.ad * 0.3 + this.ap * 0.2;

    // Start from Yasuo's position and step in the direction
    let currentX = yasuoPos.x + stepX;
    let currentY = yasuoPos.y + stepY;

    // Continue until we reach the board edge
    // Board x: -1 to 8, y: 0 to 7
    while (isValidBoardPosition(currentX, currentY)) {
      const currentSquare: Square = { x: currentX, y: currentY };

      // Find enemy at this position
      const enemyChess = getChessAtPosition(
        this.game,
        !this.chess.blue,
        currentSquare
      );

      if (enemyChess) {
        const enemyChessObject = ChessFactory.createChess(
          enemyChess,
          this.game
        );

        // Deal magic damage to enemy
        this.damage(
          enemyChessObject,
          whirlwindDamage,
          "magic",
          this,
          this.sunder
        );

        // Track target for animation
        whirlwindTargets.push({
          targetId: enemyChess.id,
          targetPosition: { ...enemyChess.position },
        });
      }

      // Move to next position in the line
      currentX += stepX;
      currentY += stepY;
    }

    // Store whirlwind targets in skill payload for animation
    // The game.logic will copy this to actionDetails
    // Always set this (even if empty) so the tornado animation plays on every crit
    if (!this.chess.skill.payload) {
      this.chess.skill.payload = {};
    }
    this.chess.skill.payload.whirlwindTargets = whirlwindTargets;
  }
}
