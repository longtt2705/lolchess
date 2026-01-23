import { Debuff, Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";

export class Ezreal extends ChessObject {
  skill(position?: Square): void {
    // Store original position for animation
    const originalPosition = { ...this.chess.position };

    // Teleport Ezreal to the target position
    this.chess.position = position;

    // Calculate sunder buff amount
    const sunderBonus = 5 + this.ap * 0.1;

    // Apply sunder buff to Ezreal for 3 turns
    this.applyDebuff(this, {
      id: "arcane_shift_sunder",
      name: "Arcane Shift",
      description: `Increases sunder by ${Math.floor(sunderBonus)} for 3 turns.`,
      duration: 3,
      maxDuration: 3,
      effects: [
        {
          stat: "sunder",
          modifier: sunderBonus,
          type: "add",
        },
      ],
      damagePerTurn: 0,
      damageType: "magic",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
      currentStacks: 0,
      maximumStacks: 1,
    } as Debuff);

    // Track affected enemy for animation
    const affectedEnemies: Array<{
      targetId: string;
      targetPosition: Square;
    }> = [];

    // Find all adjacent squares and get all adjacent enemies
    const adjacentSquares = getAdjacentSquares(position);
    const adjacentEnemies: Array<{
      chess: any;
      chessObject: ChessObject;
    }> = [];

    adjacentSquares.forEach((square) => {
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
        adjacentEnemies.push({
          chess: targetChess,
          chessObject: targetChessObject,
        });
      }
    });

    // Find the lowest health adjacent enemy
    if (adjacentEnemies.length > 0) {
      const lowestHealthEnemy = adjacentEnemies.reduce((lowest, current) => {
        return current.chess.stats.hp < lowest.chess.stats.hp
          ? current
          : lowest;
      });

      // Deal (10 + 40% AP + 10% AD) magic damage to the lowest health enemy
      this.activeSkillDamage(
        lowestHealthEnemy.chessObject,
        10 + this.ap * 0.4 + this.ad * 0.1,
        "magic",
        this,
        this.sunder
      );

      // Track this enemy for animation
      affectedEnemies.push({
        targetId: lowestHealthEnemy.chess.id,
        targetPosition: { ...lowestHealthEnemy.chess.position },
      });
    }

    // Store payload data for animation
    if (this.chess.skill) {
      if (!this.chess.skill.payload) {
        this.chess.skill.payload = {};
      }
      this.chess.skill.payload.originalPosition = originalPosition;
      this.chess.skill.payload.landingPosition = position;
      this.chess.skill.payload.affectedEnemies = affectedEnemies;
    }
  }

  protected getAttackPotential(): number {
    if (this.hasDebuff("arcane_shift_sunder")) {
      return super.getAttackPotential() + 10;
    }
    return super.getAttackPotential();
  }

  protected getActiveSkillPotential(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Base damage: 10 + 40% AP + 10% AD (to lowest HP adjacent enemy)
    const baseDamage = 10 + this.ap * 0.4 + this.ad * 0.1;

    // Sunder buff: (5 + 10% of AP) for 3 turns
    const sunderBonus = 5 + this.ap * 0.1;
    // This increases future attack damage, assume 2-3 attacks during buff duration
    const sunderValue = sunderBonus * 2.5; 

    // Repositioning/mobility value
    const mobilityValue = 12;

    // Position safety improvement (escaping or repositioning to better spot)
    const safetyValue = 8;

    return baseDamage + sunderValue + mobilityValue + safetyValue;
  }

  public getActiveSkillValue(targetPosition?: Square | null): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Ezreal teleports to a square - targetPosition is the destination
    if (!targetPosition) {
      return 0; // Requires target position
    }
    
    let totalValue = 0;

    // Sunder buff: (5 + 10% of AP) for 3 turns
    const sunderBonus = 5 + this.ap * 0.1;
    // Assume 2-3 future attacks benefit from this
    const sunderValue = sunderBonus * 2.5;
    totalValue += sunderValue;

    // Repositioning value - always gained
    const mobilityValue = 12;
    totalValue += mobilityValue;

    // Check if there are enemies near the destination to deal damage to
    const adjacentSquares = getAdjacentSquares(targetPosition);
    for (const adjPos of adjacentSquares) {
      const targetPiece = getChessAtPosition(this.game, this.chess.blue, adjPos);
      if (!targetPiece || targetPiece.blue === this.chess.blue) continue;
      
      const target = ChessFactory.createChess(targetPiece, this.game);
      // Base damage: 10 + 40% AP + 10% AD
      const damage = this.calculateActiveSkillDamage(target);
      totalValue += damage;

      // Bonus if target is low HP (skill targets lowest HP adjacent)
      const targetHpPercent = target.chess.stats.hp / target.chess.stats.maxHp;
      if (targetHpPercent < 0.5) {
        totalValue += 10; // Bonus for likely being the lowest HP target
      }
    }

    // Safety value - escaping danger or repositioning strategically
    // This would ideally check if current position is under threat
    const safetyValue = 8;
    totalValue += safetyValue;

    return totalValue;
  }
}
