import { GameLogic } from "../game.logic";
import { ChessObject } from "./chess";

export class Garen extends ChessObject {
  preEnterTurn(isBlueTurn: boolean): void {
    super.preEnterTurn(isBlueTurn);
    if (
      GameLogic.getAdjacentSquares(this.chess.position).some((square) =>
        GameLogic.getChess(this.game, this.chess.blue, square)
      )
    ) {
      return;
    }
    if (this.chess.stats.hp <= 0) {
      return;
    }
    if (isBlueTurn !== this.chess.blue) {
      return;
    }
    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return;
    }
    this.heal(this, (this.maxHp - this.chess.stats.hp) * 0.1);
  }
}
