import { ChessObject } from "./chess";

export class Aatrox extends ChessObject {
  attack(chess: ChessObject): void {
    // Max 10% of target's max health, plus 10% of the AD bonus
    const bonusDamage =
      Math.floor(chess.maxHp * 0.1) + 0.1 * (this.ad - this.chess.stats.ad);
    super.attack(chess);
    if (this.chess.skill.currentCooldown > 0) {
      return;
    }
    this.damage(chess, bonusDamage, "magic");
    this.heal(this, bonusDamage);
    this.chess.skill.currentCooldown = this.chess.skill.cooldown;
  }
}
