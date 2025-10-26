import { ChessObject } from "./chess";

export class Aatrox extends ChessObject {
  protected attack(chess: ChessObject): number {
    const baseDamage = super.attack(chess);

    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return baseDamage;
    }

    if (this.chess.skill.currentCooldown > 0) {
      return baseDamage;
    }

    // Max 10% of target's max health, plus 50% of the AP
    const bonusDamage = Math.floor(chess.maxHp * 0.1) + 0.5 * this.ap;
    const healAmount = 10 + this.ap * 0.25;
    this.damage(chess, bonusDamage, "magic", this, this.sunder);
    this.heal(this, healAmount);
    this.chess.skill.currentCooldown = this.skillCooldown;
    return baseDamage;
  }
}
