import { ChessObject } from "./chess";

export class Malphite extends ChessObject {
  attack(chess: ChessObject): number {
    const baseDamage = super.attack(chess);

    // Granite Shield: deal damage equal to 10% of physical resistance
    const bonusDamage = Math.floor(this.physicalResistance * 0.1);
    if (bonusDamage > 0) {
      this.damage(chess, bonusDamage, "magic", this, this.sunder);
    }
    return baseDamage;
  }

  // Override physical resistance calculation to include the +15 bonus
  get physicalResistance(): number {
    return super.physicalResistance + 15;
  }

  // Override attack range to include the +1 range bonus
  validateAttack(position: any, attackRange: any): boolean {
    // Create modified attack range with +1 range
    const modifiedRange = {
      ...attackRange,
      range: (attackRange.range || 1) + 1,
    };

    return super.validateAttack(position, modifiedRange);
  }
}
