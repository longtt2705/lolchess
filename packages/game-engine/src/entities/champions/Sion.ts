import { ChessObject } from "../ChessObject";
import { Square } from "../../types";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentEnemies, getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";

export class Sion extends ChessObject {
  // Soul Furnace active skill
  skill(position?: Square): void {
    // Get all adjacent squares
    const adjacentSquares = getAdjacentSquares(this.chess.position);

    // Drain 5% of max health from each enemy adjacent to Sion
    adjacentSquares.forEach((square) => {
      // Get enemy pieces (opposite team)
      const targetChess = getChessAtPosition(
        this.game,
        !this.chess.blue, // Opposite team
        square
      );

      if (targetChess) {
        const targetChessObject = ChessFactory.createChess(
          targetChess,
          this.game
        );

        // Deal 5% of target's max health as magic damage
        const drainDamage = Math.floor(
          targetChessObject.maxHp * (0.04 + (this.ap * 0.03) / 100)
        );
        this.activeSkillDamage(
          targetChessObject,
          drainDamage,
          "true",
          this,
          this.sunder
        );

        this.chess.stats.maxHp += drainDamage;
        this.heal(this, drainDamage);
      }
    });

    // After draining all adjacent enemies, grant shield
    // Shield amount: (10 + 40% of AP)% of Sion's max health
    const shieldAmount = Math.floor(this.maxHp * 0.1 + this.ap * 0.4);
    this.applyShield(shieldAmount, 3);
  }

  protected getActiveSkillPotential(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Average damage potential per adjacent enemy
    // Drains (4 + 3% AP)% of each enemy's max health
    const drainPercent = 4 + (this.ap * 0.03);
    const avgEnemyHp = 100; // Assume average enemy HP
    const damagePerEnemy = avgEnemyHp * (drainPercent / 100);

    // Assume 2-3 adjacent enemies on average
    const avgAdjacentEnemies = 2.5;
    const totalDamage = damagePerEnemy * avgAdjacentEnemies;

    // Shield value: (10% of max health + 40% AP)
    const shieldAmount = this.maxHp * 0.1 + this.ap * 0.4;
    const shieldValue = shieldAmount * 0.5; // Shields worth 50% of their value

    return totalDamage + shieldValue;
  }

  public getActiveSkillValue(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    const adjacentEnemies = getAdjacentEnemies(this.game, this.chess.position, this.chess.blue);
    if (adjacentEnemies.length === 0) {
      return 0;
    }

    let drainDamage = 0;
    let shieldValue = 0;
    let additionalTargetValue = 0;
    // Drain 5% of max health from each enemy adjacent to Sion
    adjacentEnemies.forEach((enemy) => {
      const enemyObject = ChessFactory.createChess(enemy, this.game);

      // Drain: (4 + 3% AP)% of target's max health
      const drainPercent = 4 + (this.ap * 0.03);
      drainDamage = (drainPercent / 100) * enemyObject.chess.stats.maxHp;

      // Shield value: (10% of max health + 40% AP) for 3 turns
      const shieldAmount = this.maxHp * 0.1 + this.ap * 0.4;
      shieldValue = shieldAmount * 0.5; // Shields worth 50%
    });

    console.log("Sion active skill value:", drainDamage + shieldValue + additionalTargetValue);
    return drainDamage + shieldValue + additionalTargetValue;
  }
}
