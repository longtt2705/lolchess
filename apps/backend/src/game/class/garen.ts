import { ChessObject } from "./chess";

export class Garen extends ChessObject {
  postTakenDamage(
    attacker: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true"
  ): void {
    super.postTakenDamage(attacker, damage, damageType);
    if (damage > 0) {
      if (this.chess.skill.currentCooldown === 0) {
        this.applyShield(
          (this.chess.stats.maxHp * (10 + this.ap * 0.4)) / 100,
          2,
          "perseverance_shield"
        );
      }
      this.chess.skill.currentCooldown = this.skillCooldown;
    }
  }

  preEnterTurn(isBlueTurn: boolean): void {
    super.preEnterTurn(isBlueTurn);
    if (this.chess.stats.hp <= 0) {
      return;
    }
    if (isBlueTurn !== this.chess.blue) {
      return;
    }
    if (this.chess.skill.currentCooldown > 0) {
      return;
    }
    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return;
    }
    this.heal(this, this.maxHp * 0.1);
  }
}
