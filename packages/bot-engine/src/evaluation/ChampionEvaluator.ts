import { Chess, Game, champions, getPlayerPieces } from "@lolchess/game-engine";
import { ChampionValue, ChampionRole, TeamComposition } from "../types";

/**
 * Evaluates champion-specific values and team composition
 */
export class ChampionEvaluator {
  // Role value weights for different game situations
  private static readonly ROLE_BASE_VALUES: Record<ChampionRole, number> = {
    assassin: 25,
    mage: 20,
    marksman: 22,
    fighter: 18,
    tank: 15,
    support: 12,
  };

  /**
   * Get comprehensive champion value assessment
   */
  evaluateChampion(piece: Chess, game: Game): ChampionValue {
    const championData = champions.find((c) => c.name === piece.name);

    // Base value from gold
    const baseValue = piece.stats.goldValue || 50;

    // Combat value from stats
    const combatValue = this.calculateCombatValue(piece);

    // Strategic value from role and skills
    const strategicValue = this.calculateStrategicValue(
      piece,
      championData?.role
    );

    // Health factor
    const healthFactor = piece.stats.hp / piece.stats.maxHp;

    // Total combined value
    const total =
      (baseValue + combatValue + strategicValue) * (0.5 + healthFactor * 0.5);

    return {
      baseValue,
      combatValue,
      strategicValue,
      healthFactor,
      total,
    };
  }

  /**
   * Calculate combat effectiveness value
   */
  private calculateCombatValue(piece: Chess): number {
    let value = 0;

    // Damage potential
    const ad = piece.stats.ad || 0;
    const ap = piece.stats.ap || 0;
    value += ad * 0.6 + ap * 0.5;

    // Attack range bonus
    const range = piece.stats.attackRange?.range || 1;
    value += range * 3;

    // Critical strike potential
    const critChance = piece.stats.criticalChance || 0;
    const critDamage = piece.stats.criticalDamage || 125;
    value += (critChance * (critDamage - 100)) / 100;

    // Sustain
    const lifesteal = piece.stats.lifesteal || 0;
    const hpRegen = piece.stats.hpRegen || 0;
    value += lifesteal * 0.5 + hpRegen * 2;

    // Armor penetration
    const sunder = piece.stats.sunder || 0;
    value += sunder * 0.4;

    return value;
  }

  /**
   * Calculate strategic value based on role and skills
   */
  private calculateStrategicValue(
    piece: Chess,
    role?: ChampionRole
  ): number {
    let value = 0;

    // Role base value
    if (role) {
      value += ChampionEvaluator.ROLE_BASE_VALUES[role] || 15;
    }

    // Skill value
    if (piece.skill) {
      // Base skill value
      value += 10;

      // Lower cooldown = more valuable
      const cooldown = piece.skill.cooldown || 0;
      if (cooldown > 0) {
        value += 20 / cooldown;
      }

      // Skill ready bonus
      if (piece.skill.currentCooldown === 0) {
        value += 15;
      }
    }

    // Aura value
    if (piece.auras && piece.auras.length > 0) {
      value += piece.auras.length * 10;
    }

    // Item synergy
    if (piece.items && piece.items.length > 0) {
      value += piece.items.length * 8;
    }

    // Speed value for positioning
    const speed = piece.stats.speed || 1;
    value += speed * 3;

    return value;
  }

  /**
   * Analyze team composition
   */
  analyzeTeamComposition(game: Game, playerId: string): TeamComposition {
    const pieces = getPlayerPieces(game, playerId);
    const composition: TeamComposition = {
      tanks: 0,
      fighters: 0,
      assassins: 0,
      mages: 0,
      marksmen: 0,
      supports: 0,
      totalValue: 0,
    };

    for (const piece of pieces) {
      const championData = champions.find((c) => c.name === piece.name);
      if (!championData) continue;

      switch (championData.role) {
        case "tank":
          composition.tanks++;
          break;
        case "fighter":
          composition.fighters++;
          break;
        case "assassin":
          composition.assassins++;
          break;
        case "mage":
          composition.mages++;
          break;
        case "marksman":
          composition.marksmen++;
          break;
        case "support":
          composition.supports++;
          break;
      }

      composition.totalValue += this.evaluateChampion(piece, game).total;
    }

    return composition;
  }

  /**
   * Get champion role from data
   */
  getChampionRole(championName: string): ChampionRole | undefined {
    const data = champions.find((c) => c.name === championName);
    return data?.role;
  }

  /**
   * Rank champions by value for targeting priority
   */
  rankByPriority(pieces: Chess[], game: Game): Chess[] {
    return [...pieces].sort((a, b) => {
      const valueA = this.evaluateChampion(a, game).total;
      const valueB = this.evaluateChampion(b, game).total;
      return valueB - valueA;
    });
  }
}
