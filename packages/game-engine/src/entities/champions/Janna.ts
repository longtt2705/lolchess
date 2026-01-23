import { Chess, Debuff, Square, Game } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";

export class Janna extends ChessObject {
  constructor(chess: Chess, game: Game) {
    super(chess, game);
  }

  createSpeedBoostDebuff(): Debuff {
    return {
      id: "speed_boost",
      name: "Speed Boost",
      description: "Increases speed by 2",
      duration: 2,
      maxDuration: 2,
      effects: [
        {
          stat: "speed",
          modifier: 2,
          type: "add",
        },
      ],
      damagePerTurn: 0,
      damageType: "physical",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
    } as Debuff;
  }

  applySpeedBoost(target: ChessObject): boolean {
    const speedBoostDebuff = this.createSpeedBoostDebuff();
    return this.applyDebuff(target, speedBoostDebuff);
  }

  // Override skill method if Janna has special abilities
  skill(position?: Square): void {
    // Add +2 Move Speed to nearby allies for 2 turns (does not stack with aura)
    getAdjacentSquares(this.chess.position).forEach((square) => {
      const targetChess = getChessAtPosition(
        this.game,
        this.chess.blue,
        square
      );
      if (targetChess) {
        const targetChessObject = ChessFactory.createChess(
          targetChess,
          this.game
        );
        // Only apply if the target doesn't already have the speed boost
        const hasSpeedBoost = targetChess.debuffs.some(
          (d) => d.id === "speed_boost"
        );
        if (!hasSpeedBoost) {
          this.applySpeedBoost(targetChessObject);
        }

        targetChessObject.applyShield(20 + this.ap * 1, 2, `janna_shield_${targetChessObject.chess.id}`);
      }
    });
  }

  protected getActiveSkillPotential(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Shield: 20 + 100% AP per adjacent ally
    const shieldAmount = 20 + this.ap * 1.0;
    const shieldValue = shieldAmount * 0.5; // Shields worth 50% of their value

    // Speed boost: +2 Move Speed for 2 turns per ally
    const speedBoostValue = 10; // Speed is valuable

    // Assume 2-3 adjacent allies on average
    const avgAdjacentAllies = 2;
    const totalValue = (shieldValue + speedBoostValue) * avgAdjacentAllies;

    return totalValue;
  }

  public getActiveSkillValue(targetPosition?: Square | null): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Janna's skill doesn't target a specific piece - it buffs all adjacent allies
    // Return base value for self-cast AOE buff
    if (!targetPosition) {
      return 40; // Good value for AOE shields and buffs
    }
    
    const targetPiece = getChessAtPosition(this.game, this.chess.blue, targetPosition);
    if (!targetPiece) {
      return 0;
    }
    const target = ChessFactory.createChess(targetPiece, this.game);
    
    // Check if target is adjacent ally
    const isAdjacent = Math.abs(this.chess.position.x - target.chess.position.x) <= 1 &&
                      Math.abs(this.chess.position.y - target.chess.position.y) <= 1;
    
    if (!isAdjacent || target.chess.blue !== this.chess.blue) {
      return 0; // Target not adjacent or is enemy
    }

    let totalValue = 0;

    // Shield: 20 + 100% AP
    const shieldAmount = 20 + this.ap * 1.0;
    
    // Shield is more valuable if target is low HP or under threat
    const targetHpPercent = target.chess.stats.hp / target.chess.stats.maxHp;
    const urgencyMultiplier = 1 + (1 - targetHpPercent) * 0.5; // 1.0 to 1.5x
    const shieldValue = shieldAmount * 0.5 * urgencyMultiplier;
    totalValue += shieldValue;

    // Speed boost: +2 Move Speed for 2 turns
    const speedBoostValue = 10;
    totalValue += speedBoostValue;

    // Higher value for high-value allies
    const targetValue = target.getMaterialValue() * 0.03;
    totalValue += targetValue;

    // Assume 1-2 other adjacent allies will also get buffed
    const multiTargetBonus = totalValue * 1.5;

    return totalValue + multiTargetBonus;
  }
}
