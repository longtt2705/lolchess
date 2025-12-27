import { Debuff } from "../types";
import { GameLogic } from "../game.logic";
import { ChessObject } from "./chess";

export class Poro extends ChessObject {
  /**
   * Override applyDebuff to make Poro immune to stun effects.
   * This prevents situations where all chess pieces are stunned and no one can move.
   */
  applyDebuff(chess: ChessObject, debuff: Debuff): boolean {
    // If the debuff would stun and the target is a Poro, ignore it
    if (debuff.stun && chess.chess.name === "Poro") {
      return false;
    }
    return super.applyDebuff(chess, debuff);
  }
  get speed(): number {
    return 1;
  }
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
        ally.name in
          [
            "Melee Minion",
            "Caster Minion",
            "Sand Soldier",
            "Super Minion",
            "Poro",
          ] &&
        ally.stats.hp > 0
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
    const adjacentMinionCount = this.countAdjacentMinions();
    return baseAd + adjacentMinionCount * 15;
  }

  /**
   * Override Physical Resistance to include bonus from adjacent minions
   * +15 Physical Resistance per adjacent minion
   */
  get physicalResistance(): number {
    const basePhysicalResistance = super.physicalResistance;
    const adjacentMinionCount = this.countAdjacentMinions();
    return basePhysicalResistance + adjacentMinionCount * 15;
  }

  /**
   * Override Magic Resistance to include bonus from adjacent minions
   * +15 Magic Resistance per adjacent minion
   */
  get magicResistance(): number {
    const baseMagicResistance = super.magicResistance;
    const adjacentMinionCount = this.countAdjacentMinions();
    return baseMagicResistance + adjacentMinionCount * 15;
  }
}
