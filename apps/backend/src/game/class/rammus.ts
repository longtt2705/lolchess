import { ChessObject } from "./chess";

export class Rammus extends ChessObject {
  protected postTakenDamage(attacker: ChessObject, damage: number, damageType: "physical" | "magic" | "true"): void {
    super.postTakenDamage(attacker, damage, damageType);

    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return;
    }

    // Defensive Ball Curl: return damage based on physical resistance
    const returnDamage = Math.floor(this.physicalResistance * 0.2);
    if (returnDamage > 0) {
      this.damage(attacker, returnDamage, "magic", this, this.sunder);
    }
  }
}
