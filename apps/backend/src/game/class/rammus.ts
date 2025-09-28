import { ChessObject } from "./chess";

export class Rammus extends ChessObject {
  protected postTakenDamage(attacker: ChessObject, damage: number): void {
    super.postTakenDamage(attacker, damage);

    // Defensive Ball Curl: return damage based on physical resistance
    const returnDamage = Math.floor(this.physicalResistance * 0.2);
    if (returnDamage > 0) {
      this.damage(attacker, returnDamage, "magic");
    }
  }
}
