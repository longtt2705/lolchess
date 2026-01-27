import { ChessObject } from "../ChessObject";
import { getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";
import { Square, AttackRange } from "../../types";

export class MeleeMinion extends ChessObject {
  /**
   * Count adjacent ally minions (Melee Minion or Caster Minion only)
   */
  private countAdjacentMinions(): number {
    const adjacentSquares = getAdjacentSquares(this.chess.position);
    let count = 0;

    for (const square of adjacentSquares) {
      const ally = getChessAtPosition(this.game, this.chess.blue, square);
      if (
        ally &&
        [
          "Melee Minion",
          "Caster Minion",
          "Sand Soldier",
          "Super Minion",
          "Poro",
        ].includes(ally.name) &&
        ally.stats.hp > 0
      ) {
        count++;
      }
    }
    return count;
  }

  /**
   * Override validateAttack to prevent backward attacks
   * Blue minions cannot attack backward (negative Y), Red minions cannot attack forward (positive Y)
   */
  validateAttack(position: Square, attackRange: AttackRange): boolean {
    // Check backward attack restriction
    const deltaY = position.y - this.chess.position.y;

    if (this.chess.blue) {
      // Blue minions cannot attack backward (negative Y direction)
      if (deltaY < 0) return false;
    } else {
      // Red minions cannot attack backward (positive Y direction)
      if (deltaY > 0) return false;
    }

    return super.validateAttack(position, attackRange);
  }

  /**
   * Check if an attack qualifies for Critical Flank
   * Conditions: diagonal attack at range 1, target is a basic minion
   */
  protected isCriticalFlank(target: ChessObject): boolean {
    if (this.hasBaronBuff()) {
      return false;
    }

    const deltaX = Math.abs(target.chess.position.x - this.chess.position.x);
    const deltaY = Math.abs(target.chess.position.y - this.chess.position.y);
    const isDiagonalRangeOne = deltaX === 1 && deltaY === 1;

    const isBasicMinion =
      target.chess.name === "Melee Minion" ||
      target.chess.name === "Caster Minion";

    return isDiagonalRangeOne && isBasicMinion;
  }

  /**
   * Override attack to implement The Critical Flank passive
   * When attacking another basic minion diagonally at range 1:
   * - Execute: Deal true damage equal to 100% of target's max HP (instant kill)
   * - Advance: Move into the target's position
   */
  protected attack(
    chess: ChessObject,
    forceCritical: boolean = false,
    damageMultiplier: number = 1
  ): number {
    // Check for Critical Flank conditions
    if (this.isCriticalFlank(chess)) {
      // Save target position before the kill
      const targetPosition = {
        x: chess.chess.position.x,
        y: chess.chess.position.y,
      };

      // Deal true damage equal to 100% of target's max HP (instant kill)
      const executeDamage = this.damage(
        chess,
        99999,
        "true",
        this,
        0, // No sunder for true damage
        true // This is from an attack
      );

      // Track Critical Flank proc in game.lastAction for animation
      if (this.game.lastAction) {
        this.game.lastAction.criticalFlankProc = true;
        this.game.lastAction.criticalFlankAdvancePosition = targetPosition;
      }

      // Advance: Move attacker to the target's former position
      this.chess.position = targetPosition;

      return executeDamage;
    }

    // Normal attack if Critical Flank conditions are not met
    return super.attack(chess, forceCritical, damageMultiplier);
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
