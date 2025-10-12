import { ChessObject } from "./chess";

export class Aatrox extends ChessObject {
  protected attack(chess: ChessObject): number {
    // Max 10% of target's max health, plus 50% of the AP
    const bonusDamage = Math.floor(chess.maxHp * 0.1) + 0.5 * this.ap;
    const baseDamage = super.attack(chess);
    if (this.chess.skill.currentCooldown > 0) {
      return baseDamage;
    }
    this.damage(chess, bonusDamage, "magic", this, this.sunder);
    this.heal(this, bonusDamage);
    this.chess.skill.currentCooldown = this.skillCooldown;
    return baseDamage;
  }
}
