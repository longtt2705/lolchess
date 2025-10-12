import { ChessObject } from "./chess";

export class Zed extends ChessObject {
  attack(chess: ChessObject): number {
    const baseDamage = super.attack(chess);

    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return baseDamage;
    }

    const isLowHealth = chess.chess.stats.hp < chess.maxHp * 0.5; // Below 50% health

    // Contempt for the Weak: bonus magic damage to low health targets
    if (isLowHealth) {
      const bonusDamage = Math.floor(chess.maxHp * 0.1) + this.ap * 0.5;
      this.damage(chess, bonusDamage, "magic", this, this.sunder);
    }
    return baseDamage;
  }
}
