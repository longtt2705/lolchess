import { GameLogic } from "../game.logic";
import { Square } from "../game.schema";
import { ChessObject } from "./chess";

export class Soraka extends ChessObject {
  skill(position?: Square): void {
    // Find the target allied chess piece to heal
    const targetChess = GameLogic.getChess(
      this.game,
      this.chess.blue,
      position
    );

    if (targetChess && targetChess !== this.chess) {
      const targetChessObject = new ChessObject(targetChess, this.game);

      // Sacrifice portion of own health
      const sacrificeAmount = Math.floor(this.chess.stats.hp * 0.2);
      this.chess.stats.hp = Math.max(1, this.chess.stats.hp - sacrificeAmount);

      // Heal the target for more than sacrificed
      const healAmount = sacrificeAmount + this.ap * 0.2;
      this.heal(targetChessObject, healAmount);
    }
  }
}
