import { ChessObject } from "./chess";

export class Sion extends ChessObject {
  protected attack(chess: ChessObject): number {
    const baseDamage = super.attack(chess);

    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return baseDamage;
    }

    const bonusDamage = Math.floor(this.chess.stats.maxHp * 0.1) + this.ap * 0.5;
    if (bonusDamage > 0) {
      this.damage(chess, bonusDamage, "magic", this, this.sunder);
    }
    // Soul Furnace: gain max health when killing enemies
    if (chess.chess.stats.hp <= 0) {
      this.chess.stats.maxHp += chess.chess.stats.goldValue;
      // Also heal to the new max HP to show the effect
      this.chess.stats.hp = Math.min(
        this.chess.stats.hp + chess.chess.stats.goldValue,
        this.chess.stats.maxHp
      );
    }
    return baseDamage;
  }
}
