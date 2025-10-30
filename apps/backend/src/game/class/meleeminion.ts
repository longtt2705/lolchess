import { GameLogic } from "../game.logic";
import { ChessObject } from "./chess";

export class MeleeMinion extends ChessObject {
  /**
   * Count adjacent ally minions (Melee Minion or Caster Minion only)
   */
  private countAdjacentMinions(): number {
    const adjacentSquares = GameLogic.getAdjacentSquares(this.chess.position);
    let count = 0;

    for (const square of adjacentSquares) {
      const ally = GameLogic.getChess(this.game, this.chess.blue, square);
      if (
        ally &&
        (ally.name === "Melee Minion" || ally.name === "Caster Minion")
      ) {
        count++;
      }
    }

    return count;
  }

  /**
   * Override AD to include bonus from adjacent minions
   * +15 AD per adjacent minion
   */
  get ad(): number {
    const baseAd = super.ad;
    
    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return baseAd;
    }

    const adjacentMinionCount = this.countAdjacentMinions();
    return baseAd + adjacentMinionCount * 15;
  }

  /**
   * Override Physical Resistance to include bonus from adjacent minions
   * +15 Physical Resistance per adjacent minion
   */
  get physicalResistance(): number {
    const basePhysicalResistance = super.physicalResistance;
    
    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return basePhysicalResistance;
    }

    const adjacentMinionCount = this.countAdjacentMinions();
    return basePhysicalResistance + adjacentMinionCount * 15;
  }

  /**
   * Override Magic Resistance to include bonus from adjacent minions
   * +15 Magic Resistance per adjacent minion
   */
  get magicResistance(): number {
    const baseMagicResistance = super.magicResistance;
    
    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return baseMagicResistance;
    }

    const adjacentMinionCount = this.countAdjacentMinions();
    return baseMagicResistance + adjacentMinionCount * 15;
  }
}

