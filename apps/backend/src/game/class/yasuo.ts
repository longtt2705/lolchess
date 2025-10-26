import { ChessObject } from "./chess";

export class Yasuo extends ChessObject {
  get criticalChance(): number {
    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return super.criticalChance;
    }
    return super.criticalChance * 2;
  }

  get ad(): number {
    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return super.ad;
    }
    if (this.criticalChance > 100) {
      return super.ad + Math.floor((this.criticalChance - 100) * 0.5);
    }
    return super.ad;
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
