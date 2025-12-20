import { ChessObject } from "./chess";
import { GameLogic } from "../game.logic";
import { Square } from "../game.schema";
import { ChessFactory } from "./chessFactory";

export class Garen extends ChessObject {
  /**
   * Judgment - Active Skill
   * Garen spins his sword for 2 turns, dealing 100% AD as physical damage
   * to all adjacent enemies each turn and gaining a shield of 20 + 100% AP.
   */
  skill(position?: Square): void {
    // Apply shield: 20 base + 100% AP for 2 turns
    const shieldAmount = 20 + this.ap * 1;
    this.applyShield(shieldAmount, 2, "garen_judgment_shield");

    // Deal immediate damage to all adjacent enemies on activation
    this.dealSpinDamage();
  }

  /**
   * Deal 100% AD physical damage to all adjacent enemies
   */
  private dealSpinDamage(): void {
    const adjacentSquares = GameLogic.getAdjacentSquares(this.chess.position);

    adjacentSquares.forEach((square) => {
      // Get enemy pieces (opposite team)
      const targetChess = GameLogic.getChess(
        this.game,
        !this.chess.blue,
        square
      );

      if (targetChess) {
        const targetChessObject = ChessFactory.createChess(
          targetChess,
          this.game
        );

        // Deal 100% AD as physical damage
        const damage = this.ad;
        this.activeSkillDamage(
          targetChessObject,
          damage,
          "physical",
          this,
          this.sunder
        );
      }
    });
  }
}
