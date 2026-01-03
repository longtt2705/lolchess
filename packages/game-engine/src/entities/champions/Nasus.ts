import { Debuff, Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentEnemies } from "../../utils/helpers";

export class Nasus extends ChessObject {
  /**
   * Fury of the Sands - Nasus's transformation ultimate
   * Transforms into Ascended form for 3 turns:
   * - Gains 50 HP, 20 Physical Resistance, 1 Attack Range
   * - Deals (10 + 10% AP)% of Max HP magic damage to adjacent enemies
   * - Applies slow and DOT to hit enemies
   * - Basic attacks deal bonus (5 + 10% AP)% of target's Max HP
   */
  skill(position?: Square): void {
    // Store original maxHP before transformation
    const originalMaxHp = this.maxHp;
    const currentHp = this.chess.stats.hp;

    // Create transformation debuff
    const transformDebuff = this.createTransformationDebuff(originalMaxHp);
    this.applyDebuff(this, transformDebuff);

    // After applying the debuff, the maxHP increases by 50
    // We need to add 50 to current HP as well (as per the spec: 40/100 -> 90/150)
    this.chess.stats.hp = Math.min(this.maxHp, currentHp + 50);

    // Find all adjacent enemies and deal AOE damage
    const adjacentEnemies = getAdjacentEnemies(
      this.game,
      this.chess.position,
      this.chess.blue
    );

    // Calculate damage: (10 + 15% of AP)% of enemy's Max HP
    const percentDamage = 10 + this.ap * 0.15;

    for (const enemy of adjacentEnemies) {
      const enemyObject = ChessFactory.createChess(enemy, this.game);

      // Deal % max HP magic damage
      const damage = Math.floor((percentDamage / 100) * enemy.stats.maxHp);
      this.activeSkillDamage(enemyObject, damage, "magic", this, this.sunder);

      // Apply slow + DOT debuff to hit enemies
      this.applySlowDebuff(enemyObject);
    }
  }

  /**
   * Create the transformation debuff with stat bonuses
   */
  private createTransformationDebuff(originalMaxHp: number): Debuff {
    return {
      id: "fury_of_the_sands",
      name: "Fury of the Sands",
      description: `Ascended Form: +50 Max HP, +20 Physical Resistance, +1 Attack Range. Basic attacks deal bonus damage equal to ${Math.floor(5 + this.ap * 0.1)}% of target's Max HP.`,
      duration: 3,
      maxDuration: 3,
      effects: [
        {
          stat: "maxHp",
          modifier: 50,
          type: "add",
        },
        {
          stat: "physicalResistance",
          modifier: 20,
          type: "add",
        },
      ],
      damagePerTurn: 0,
      damageType: "magic",
      healPerTurn: 0,
      stun: false,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
      currentStacks: 1,
      maximumStacks: 1,
      isTransformation: true,
      onExpireId: "nasus_transform",
      payload: {
        originalMaxHp: originalMaxHp,
        bonusMaxHp: 50,
      },
    };
  }

  /**
   * Apply slow and DOT debuff to enemies hit by transformation
   */
  private applySlowDebuff(target: ChessObject): void {
    const dotDamage = 5 + this.ap * 0.1;

    const slowDebuff: Debuff = {
      id: "fury_of_the_sands_slow",
      name: "Sands of Ruin",
      description: `Slowed and taking ${Math.floor(dotDamage)} magic damage per turn.`,
      duration: 2,
      maxDuration: 2,
      effects: [
        {
          stat: "speed",
          modifier: -1,
          type: "add",
        },
      ],
      damagePerTurn: dotDamage,
      damageType: "magic",
      healPerTurn: 0,
      stun: false,
      unique: false,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
      currentStacks: 1,
      maximumStacks: 1,
    };

    this.applyDebuff(target, slowDebuff);
  }

  /**
   * Check if Nasus is in Ascended (transformed) form
   */
  get isTransformed(): boolean {
    return (
      this.chess.debuffs?.some((debuff) => debuff.id === "fury_of_the_sands") ??
      false
    );
  }

  /**
   * Override range to add +1 when transformed
   */
  get range(): number {
    let baseRange = super.range;
    if (this.isTransformed) {
      baseRange += 1;
    }
    return baseRange;
  }

  /**
   * Override attack to deal bonus % max HP damage when transformed
   */
  attack(target: ChessObject): number {
    const baseDamage = super.attack(target);

    // If transformed, deal bonus damage based on target's max HP
    if (this.isTransformed) {
      const bonusAd = this.ad - this.chess.stats.ad;
      const percentDamage = 10 + bonusAd * 0.1;
      const bonusDamage = Math.floor(
        (percentDamage / 100) * target.chess.stats.maxHp
      );
      this.damage(target, bonusDamage, "magic", this, this.sunder);
      return baseDamage + bonusDamage;
    }

    return baseDamage;
  }
}
