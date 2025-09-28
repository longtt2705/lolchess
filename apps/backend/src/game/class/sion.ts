import { ChessObject } from "./chess";

export class Sion extends ChessObject {
  attack(chess: ChessObject): void {
    super.attack(chess);

    // Soul Furnace: gain max health when killing enemies
    if (chess.chess.stats.hp <= 0) {
      this.chess.stats.maxHp += chess.chess.stats.goldValue;
      // Also heal to the new max HP to show the effect
      this.chess.stats.hp = Math.min(
        this.chess.stats.hp + chess.chess.stats.goldValue,
        this.chess.stats.maxHp
      );
    }
  }
}
