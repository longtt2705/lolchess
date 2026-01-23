import { Debuff, Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";

export class Ahri extends ChessObject {
  // Create the Spirit Rush debuff
  createSpiritRushDebuff(casterPlayerId: string): Debuff {
    return {
      id: "spirit_rush",
      name: "Spirit Rush",
      description:
        "Reduces speed by 1 and deals 10 + 50% AP magic damage each turn",
      duration: 2,
      maxDuration: 2,
      effects: [
        {
          stat: "speed",
          modifier: -1,
          type: "add",
        },
      ],
      damagePerTurn: 5 + this.ap * 0.1, // Adjust damage as needed
      damageType: "magic",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: casterPlayerId,
      casterName: this.chess.name,
      currentStacks: 0,
      maximumStacks: 1,
    } as Debuff;
  }

  // Apply Spirit Rush debuff to target
  applySpiritRush(target: ChessObject, casterPlayerId: string): boolean {
    const spiritRushDebuff = this.createSpiritRushDebuff(casterPlayerId);
    return this.applyDebuff(target, spiritRushDebuff);
  }

  skill(position?: Square): void {
    this.move(position, this.chess.skill?.attackRange?.range);

    // Deal damage and apply Spirit Rush debuff to any piece at or adjacent to the target square
    getAdjacentSquares(position).forEach((square) => {
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
        // Deal damage
        this.activeSkillDamage(
          targetChessObject,
          10 + this.ap * 0.25,
          "magic",
          this,
          this.sunder
        );

        // Apply Spirit Rush debuff
        this.applySpiritRush(targetChessObject, this.chess.ownerId);
      }
    });
  }

  protected getActiveSkillPotential(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Base damage: 10 + 25% AP to target and adjacent enemies
    const baseDamage = 10 + this.ap * 0.25;

    // Assume 2-3 enemies hit (target + adjacent)
    const avgEnemiesHit = 2.5;
    const totalDamage = baseDamage * avgEnemiesHit;

    // DoT: (5 + 10% AP) magic damage per turn for 2 turns
    const dotDamage = (5 + this.ap * 0.1) * 2; // Total DoT over 2 turns
    const totalDotDamage = dotDamage * avgEnemiesHit;

    // Dash/repositioning value
    const mobilityValue = 10;

    // Slow debuff adds control value
    const slowValue = 5 * avgEnemiesHit;

    return totalDamage + totalDotDamage + mobilityValue + slowValue;
  }

  public getActiveSkillValue(targetPosition?: Square | null): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Ahri dashes to a square - targetPosition is the destination
    if (!targetPosition) {
      return 0; // Requires target position
    }
    
    let totalValue = 0;
    
    // Mobility value for repositioning
    totalValue += 15;
    
    // Check for enemies at/adjacent to destination for damage value
    const adjacentSquares = getAdjacentSquares(targetPosition);
    const positionsToCheck = [targetPosition, ...adjacentSquares];
    
    for (const pos of positionsToCheck) {
      const targetPiece = getChessAtPosition(this.game, this.chess.blue, pos);
      if (!targetPiece || targetPiece.blue === this.chess.blue) continue;
      
      const target = ChessFactory.createChess(targetPiece, this.game);
      // Base damage: 10 + 25% AP
      const directDamage = this.calculateActiveSkillDamage(target);

      // DoT: (5 + 10% AP) per turn for 2 turns
      const dotDamage = (5 + this.ap * 0.1) * 2;

      // Slow debuff value
      const slowValue = 5;

      // Mobility/repositioning value
      const mobilityValue = 10;

      // Assume 1-2 other enemies will be hit at destination
      const aoeBonus = directDamage * 1.5;

      return directDamage + dotDamage + slowValue + mobilityValue + aoeBonus;
    }

    // For ally/self target, only mobility value
    return 10; // Pure repositioning value
  }
}
