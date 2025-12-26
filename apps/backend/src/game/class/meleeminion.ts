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
