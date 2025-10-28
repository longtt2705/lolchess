import { ChessObject } from "./chess";

export class Garen extends ChessObject {
  postTakenDamage(
    attacker: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true"
  ): void {
    super.postTakenDamage(attacker, damage, damageType);
    if (damage > 0) {
      this.chess.skill.currentCooldown = this.skillCooldown;
    }
  }

  get physicalResistance(): number {
    if (this.isPassiveDisabled()) {
      return super.physicalResistance;
    }
    return (
      super.physicalResistance + this.chess.skill.payload?.physicalResistance ||
      0
    );
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
    if (!this.chess.skill.payload) {
      this.chess.skill.payload = { physicalResistance: 0 };
    }
    if (this.chess.skill.payload?.physicalResistance < 30) {
      this.chess.skill.payload.physicalResistance += 1;
    }
  }
}
