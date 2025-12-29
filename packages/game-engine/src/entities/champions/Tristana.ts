import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";

export class Tristana extends ChessObject {
  get range(): number {
    return Math.min(super.range + Math.floor(this.game.currentRound / 10), 8);
  }

  attack(chess: ChessObject): number {
    const baseDamage = super.attack(chess);

    // Initialize or get attack count from skill payload
    if (!this.chess.skill?.payload) {
      this.chess.skill.payload = { attackCount: 0 };
    }

    this.chess.skill.payload.attackCount++;

    // Every 4th attack deals bonus (10+50% of AP + 25% of AD) physical damage to the target and his adjacent squares
    if (this.chess.skill.payload.attackCount % 4 === 0) {
      const bonusDamage = 10 + this.ap * 0.5 + this.ad * 0.25;

      // Damage the primary target
      this.damage(chess, bonusDamage, "physical", this, this.sunder);

      // Get adjacent squares and damage enemies in them
      const adjacentSquares = getAdjacentSquares(
        chess.chess.position
      );
      for (const square of adjacentSquares) {
        const adjacentEnemy = getChessAtPosition(
          this.game,
          !this.chess.blue,
          square
        );
        if (adjacentEnemy && adjacentEnemy.stats.hp > 0) {
          const adjacentChessObject = ChessFactory.createChess(
            adjacentEnemy,
            this.game
          );
          this.damage(
            adjacentChessObject,
            bonusDamage,
            "physical",
            this,
            this.sunder
          );
        }
      }
    }
    return baseDamage;
  }
}
