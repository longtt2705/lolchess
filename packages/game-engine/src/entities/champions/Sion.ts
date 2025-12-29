import { ChessObject } from "../ChessObject";
import { Square } from "../../types";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";

export class Sion extends ChessObject {
  // Soul Furnace active skill
  skill(position?: Square): void {
    // Get all adjacent squares
    const adjacentSquares = getAdjacentSquares(this.chess.position);

    // Drain 5% of max health from each enemy adjacent to Sion
    adjacentSquares.forEach((square) => {
      // Get enemy pieces (opposite team)
      const targetChess = getChessAtPosition(
        this.game,
        !this.chess.blue, // Opposite team
        square
      );

      if (targetChess) {
        const targetChessObject = ChessFactory.createChess(
          targetChess,
          this.game
        );

        // Deal 5% of target's max health as magic damage
        const drainDamage = Math.floor(
          targetChessObject.maxHp * (0.04 + (this.ap * 0.03) / 100)
        );
        this.activeSkillDamage(
          targetChessObject,
          drainDamage,
          "true",
          this,
          this.sunder
        );

        this.chess.stats.maxHp += drainDamage;
        this.chess.stats.hp += drainDamage;
      }
    });

    // After draining all adjacent enemies, grant shield
    // Shield amount: (10 + 40% of AP)% of Sion's max health
    const shieldAmount = Math.floor(this.maxHp * 0.1 + this.ap * 0.4);
    this.applyShield(shieldAmount, 3);
  }
}
