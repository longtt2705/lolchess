import { ChessObject } from "./chess";

export class Yasuo extends ChessObject {
  attack(chess: ChessObject): void {
    // Yasuo has doubled crit chance (simulate with 50% chance instead of normal 25%)
    const critChance = Math.random() < 0.5;

    if (critChance) {
      // Critical strike deals double damage
      const criticalDamage = this.ad * 2;
      this.damage(chess, criticalDamage, "physical");

      // Gain +3 AD after critical strike
      this.chess.stats.ad += 3;
    } else {
      super.attack(chess);
    }
  }
}
