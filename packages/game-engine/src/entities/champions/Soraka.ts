import { Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getChessAtPosition } from "../../utils/helpers";

export class Soraka extends ChessObject {
  skill(position?: Square): void {
    // Find the target allied chess piece to heal
    const targetChess = getChessAtPosition(
      this.game,
      this.chess.blue,
      position
    );

    if (targetChess && targetChess !== this.chess) {
      const targetChessObject = ChessFactory.createChess(
        targetChess,
        this.game
      );

      // Sacrifice portion of own health
      const sacrificeAmount = Math.floor(this.chess.stats.hp * 0.2);
      this.chess.stats.hp = Math.max(1, this.chess.stats.hp - sacrificeAmount);

      // Heal the target for more than sacrificed
      const healAmount =
        20 +
        Math.floor(targetChessObject.maxHp * (0.1 + (this.ap * 0.1) / 100));
      this.heal(targetChessObject, healAmount);
    }
  }

  protected getActiveSkillPotential(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Don't use if Soraka is too low HP (20% sacrifice)
    if (this.chess.stats.hp < this.chess.stats.maxHp * 0.3) {
      return 0; // Too risky to use
    }

    // Base heal: 20
    const baseHeal = 20;

    // Percentage heal: (10 + 10% of AP) of target's max health
    const avgAllyMaxHp = 100; // Assume average ally max HP
    const percentHeal = (10 + this.ap * 0.1) / 100;
    const totalHeal = baseHeal + avgAllyMaxHp * percentHeal;

    // Healing value (worth more than damage since it saves allies)
    const healValue = totalHeal * 1.2;

    // Cost: sacrifice 20% of own health
    const sacrificeCost = this.chess.stats.maxHp * 0.2 * 0.5; // Cost worth 50% of its value

    // Higher value when allies are wounded (simplified - would ideally check actual ally HP)
    // Assume moderate value - actual bot will prioritize when allies are low
    return healValue - sacrificeCost;
  }

  public getActiveSkillValue(targetPosition?: Square | null): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    if (!targetPosition) {
      return 0; // Soraka's heal requires a target
    }

    const targetPiece = getChessAtPosition(this.game, this.chess.blue, targetPosition);
    if (!targetPiece) {
      return 0;
    }
    const target = ChessFactory.createChess(targetPiece, this.game);

    // Only works on allies (not self, not enemies)
    if (target.chess.blue !== this.chess.blue || target.chess.id === this.chess.id) {
      return 0;
    }

    // Don't use if Soraka is too low HP (20% sacrifice)
    if (this.chess.stats.hp < this.chess.stats.maxHp * 0.3) {
      return 0; // Too risky
    }

    // Don't waste heal on full HP targets
    if (target.chess.stats.hp >= target.chess.stats.maxHp * 0.9) {
      return 0;
    }

    // Base heal: 20
    const baseHeal = 20;

    // Percentage heal: (10 + 10% of AP) of target's max health
    const percentHeal = (10 + this.ap * 0.1) / 100;
    const totalHeal = baseHeal + target.chess.stats.maxHp * percentHeal;

    // Actual heal amount (capped by missing HP)
    const missingHp = target.chess.stats.maxHp - target.chess.stats.hp;
    const actualHeal = Math.min(totalHeal, missingHp);

    // Healing value - more valuable when target is low HP
    const targetHpPercent = target.chess.stats.hp / target.chess.stats.maxHp;
    const urgencyMultiplier = 1 + (1 - targetHpPercent); // 1.0 to 2.0x based on missing HP
    const healValue = actualHeal * 1.2 * urgencyMultiplier;

    // Cost: sacrifice 20% of own health
    const sacrificeAmount = this.chess.stats.maxHp * 0.2;
    const sacrificeCost = sacrificeAmount * 0.5;

    // Higher value for high-value allies
    const targetValue = target.getMaterialValue() * 0.05;

    return Math.max(0, healValue + targetValue - sacrificeCost);
  }
}
