import { GameLogic } from "../game.logic";
import { Square } from "../game.schema";
import { ChessObject } from "./chess";

export class Blitzcrank extends ChessObject {
  skill(position?: Square): void {
    if (!this.validateSkill(this.chess.skill, position)) {
      throw new Error("Invalid skill");
    }

    // Find the target chess piece to pull
    const targetChess = GameLogic.getChess(
      this.game,
      !this.chess.blue,
      position
    );

    if (targetChess) {
      const targetChessObject = new ChessObject(targetChess, this.game);

      // Deal magic damage
      this.damage(targetChessObject, 15 + this.ap * 0.6, "magic", this.sunder);

      // Pull the target to Blitzcrank (find adjacent square)
      const adjacentSquares = GameLogic.getAdjacentSquares(this.chess.position);
      const emptyAdjacent = adjacentSquares.find(
        (square) =>
          !GameLogic.getChess(this.game, true, square) &&
          !GameLogic.getChess(this.game, false, square)
      );

      if (emptyAdjacent) {
        targetChess.position = emptyAdjacent;
      }
    }

    // Set skill on cooldown
    this.chess.skill.currentCooldown = this.skillCooldown;
  }
}
