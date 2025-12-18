import { ChessObject } from "./chess";

export class Yasuo extends ChessObject {
  get criticalChance(): number {
    return super.criticalChance * 2;
  }

  get ad(): number {
    if (this.criticalChance > 100) {
      return super.ad + Math.floor((this.criticalChance - 100) * 0.5);
    }
    return super.ad;
  }

  protected postCritDamage(chess: ChessObject, damage: number): void {
    super.postCritDamage(chess, damage);
    this.chess.stats.sunder += 3 + Math.floor(this.ap * 0.1);
  }

}
