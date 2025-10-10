import { ChessObject } from "./chess";

export class TwistedFate extends ChessObject {
  attack(chess: ChessObject): number {
    // Stacked Deck: deal bonus damage
    const bonusDamage = 5 + Math.floor(this.ap * 0.8);

    const baseDamage = super.attack(chess);

    if (bonusDamage > 0) {
      this.damage(chess, bonusDamage, "magic", this, this.sunder);
    }

    // Note: Gold bonus for Twisted Fate is now handled automatically
    // in the awardGoldForKill method in the base ChessObject class
    // Twisted Fate gets +10 bonus gold per kill as defined in his passive
    return baseDamage;
  }
}
