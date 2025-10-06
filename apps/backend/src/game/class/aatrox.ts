import { ChessObject } from "./chess";

export class Aatrox extends ChessObject {
  attack(chess: ChessObject): void {
    // Max 10% of target's max health, plus 50% of the AP
    const bonusDamage =
      Math.floor(chess.maxHp * 0.1) + 0.5 * (this.ap);
    super.attack(chess);
    if (this.chess.skill.currentCooldown > 0) {
      return;
    }
    this.damage(chess, bonusDamage, "magic", this.sunder);
    this.heal(this, bonusDamage);
    this.chess.skill.currentCooldown = this.skillCooldown;
  }
}
