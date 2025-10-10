import { ChessObject } from "./chess";

export class Tryndamere extends ChessObject {
  protected postTakenDamage(attacker: ChessObject, damage: number): void {
    super.postTakenDamage(attacker, damage);

    // Initialize skill payload if needed
    if (!this.chess.skill?.payload) {
      this.chess.skill.payload = { hasUsedUndyingRage: false };
    }

    // Undying Rage: survive with 1 HP the first time he would die
    if (
      this.chess.stats.hp <= 0 &&
      !this.chess.skill.payload.hasUsedUndyingRage
    ) {
      this.chess.stats.hp = 1;
      this.chess.skill.payload.hasUsedUndyingRage = true;
    }
  }

  attack(chess: ChessObject): void {
    super.attack(chess);

    // Deal bonus damage based on missing health
    const missingHp = this.maxHp - this.chess.stats.hp;
    const bonusDamage = Math.floor(missingHp / 3);

    if (bonusDamage > 0) {
      this.damage(chess, bonusDamage, "physical", this, this.sunder);
    }
  }
}
