import { ChessObject } from "./chess";

export class TwistedFate extends ChessObject {
  attack(chess: ChessObject): void {
    // Stacked Deck: deal bonus damage
    const bonusDamage = Math.floor(this.ap * 0.25);

    super.attack(chess);

    if (bonusDamage > 0) {
      this.damage(chess, bonusDamage, "magic");
    }

    // Note: Gold bonus for Twisted Fate is now handled automatically
    // in the awardGoldForKill method in the base ChessObject class
    // Twisted Fate gets +10 bonus gold per kill as defined in his passive
  }
}
