import { GameLogic } from "../game.logic";
import { Square } from "../types";
import { ChessObject } from "./chess";
import { ChessFactory } from "./chessFactory";

export class Blitzcrank extends ChessObject {
  skill(position?: Square): void {
    // Find the target chess piece to pull
    const targetChess = GameLogic.getChess(
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
        !GameLogic.getChess(this.game, true, idealPosition) &&
        !GameLogic.getChess(this.game, false, idealPosition);

      if (isAdjacentToBlitz && isIdealEmpty) {
        // Ideal position is available
        targetChess.position = idealPosition;
      } else {
        // Fallback: find any adjacent empty square (in case ideal is blocked)
        const adjacentSquares = GameLogic.getAdjacentSquares(
          this.chess.position
        );
        const emptyAdjacent = adjacentSquares.find(
          (square) =>
            !GameLogic.getChess(this.game, true, square) &&
            !GameLogic.getChess(this.game, false, square)
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
}
