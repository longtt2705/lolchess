import { ChessObject } from "./chess";

export class Malphite extends ChessObject {
  preEnterTurn(isBlueTurn: boolean): void {
    super.preEnterTurn(isBlueTurn);
    if (this.chess.stats.hp <= 0) {
      return;
    }
    if (this.chess.skill.currentCooldown > 0) {
      return;
    }
    if (this.isPassiveDisabled()) {
      return;
    }
    this.applyShield(
      (this.chess.stats.maxHp * (10 + this.ap * 0.4)) / 100,
      Number.MAX_SAFE_INTEGER,
      "granite_shield"
    );
  }

  protected postTakenDamage(
    attacker: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true"
  ): void {
    super.postTakenDamage(attacker, damage, damageType);
    if (damage > 0) {
      this.chess.skill.currentCooldown = this.skillCooldown;
    }
  }

  // Override physical resistance calculation to include the +15 bonus
  get physicalResistance(): number {
    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return super.physicalResistance;
    }
    if (this.chess.shields?.length > 0) {
      return super.physicalResistance + 15;
    }
    return super.physicalResistance;
  }
}
