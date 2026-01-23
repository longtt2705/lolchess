import { ChessObject } from "../ChessObject";
import { Square } from "../../types";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";

export class Garen extends ChessObject {
  /**
   * Judgment - Active Skill
   * Garen spins his sword for 2 turns, dealing 100% AD as physical damage
   * to all adjacent enemies each turn and gaining a shield of 20 + 100% AP.
   */
  skill(position?: Square): void {
    // Apply shield: 20 base + 100% AP for 2 turns
    const shieldAmount = 20 + this.ap * 0.6;
    this.applyShield(shieldAmount, 2, "garen_judgment_shield");

    // Deal immediate damage to all adjacent enemies on activation
    this.dealSpinDamage();
  }

  /**
   * Deal 100% AD physical damage to all adjacent enemies
   */
  private dealSpinDamage(): void {
    const adjacentSquares = getAdjacentSquares(this.chess.position);

    adjacentSquares.forEach((square) => {
      // Get enemy pieces (opposite team)
      const targetChess = getChessAtPosition(
        this.game,
        !this.chess.blue,
        square
      );

      if (targetChess) {
        const targetChessObject = ChessFactory.createChess(
          targetChess,
          this.game
        );

        // Deal 100% AD as physical damage
        const damage = this.ad;
        this.activeSkillDamage(
          targetChessObject,
          damage,
          "physical",
          this,
          this.sunder
        );
      }
    });
  }

  protected getActiveSkillPotential(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Damage: 100% AD to all adjacent enemies
    const damagePerEnemy = this.ad;

    // Assume 2-3 adjacent enemies on average
    const avgAdjacentEnemies = 2.5;
    const totalDamage = damagePerEnemy * avgAdjacentEnemies;

    // Shield value: 20 + 60% AP for 2 turns
    const shieldAmount = 20 + this.ap * 0.6;
    const shieldValue = shieldAmount * 0.5; // Shields worth 50% of their value

    return totalDamage + shieldValue;
  }

  public getActiveSkillValue(targetPosition?: Square | null): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Garen's skill doesn't target a specific piece - it's an AOE spin
    // Return base value for self-cast AOE
    if (!targetPosition) {
      return 35; // Good value for AOE damage
    }
    
    const targetPiece = getChessAtPosition(this.game, this.chess.blue, targetPosition);
    if (!targetPiece) {
      return 0;
    }
    const target = ChessFactory.createChess(targetPiece, this.game);
    
    // Check if target is adjacent and enemy
    const isAdjacent = Math.abs(this.chess.position.x - target.chess.position.x) <= 1 &&
                      Math.abs(this.chess.position.y - target.chess.position.y) <= 1;
    
    if (!isAdjacent || target.chess.blue === this.chess.blue) {
      return 0; // Target not in AOE range or is ally
    }

    // Damage: 100% AD to target
    const damage = this.calculateActiveSkillDamage(target);

    // Shield value: 20 + 60% AP for 2 turns
    const shieldAmount = 20 + this.ap * 0.6;
    const shieldValue = shieldAmount * 0.5;

    // Assume we'll hit 1-2 other adjacent enemies
    const additionalTargetValue = damage * 1.5;

    return damage + shieldValue + additionalTargetValue;
  }
}
