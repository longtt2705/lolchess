import { ChessObject } from "../ChessObject";

export class Rammus extends ChessObject {
  protected postTakenDamage(
    attacker: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true",
    fromAttack: boolean = false
  ): void {
    super.postTakenDamage(attacker, damage, damageType, fromAttack);

    if (fromAttack) {
      const returnDamage = Math.floor(this.physicalResistance * 0.2);
      if (returnDamage > 0) {
        this.damage(attacker, returnDamage, "magic", this, this.sunder);
      }
    }
  }
  protected attack(
    chess: ChessObject,
    forceCritical: boolean = false,
    damageMultiplier: number = 1
  ): number {
    const baseDamage = super.attack(chess, forceCritical, damageMultiplier);

    const bonusDamage = Math.floor(
      this.physicalResistance * (0.1 + (this.ap * 0.2) / 100)
    );
    if (bonusDamage > 0) {
      this.damage(chess, bonusDamage, "magic", this, this.sunder, false);
    }
    return baseDamage;
  }
}
