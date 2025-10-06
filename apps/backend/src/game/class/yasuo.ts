import { ChessObject } from "./chess";

export class Yasuo extends ChessObject {
  get criticalChance(): number {
    return super.criticalChance * 2;
  }

  protected postCritDamage(): void {
    this.chess.stats.sunder += 3 + Math.floor(this.ap * 0.1);
  }

}
