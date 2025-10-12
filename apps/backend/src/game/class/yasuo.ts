import { ChessObject } from "./chess";

export class Yasuo extends ChessObject {
  get criticalChance(): number {
    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return super.criticalChance;
    }
    return super.criticalChance * 2;
  }

  protected postCritDamage(chess: ChessObject, damage: number): void {
    super.postCritDamage(chess, damage);
    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return;
    }
    this.chess.stats.sunder += 3 + Math.floor(this.ap * 0.1);
  }

}
