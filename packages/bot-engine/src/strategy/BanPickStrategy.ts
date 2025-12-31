import { champions } from "@lolchess/game-engine";
import { ChampionRole, TeamComposition } from "../types";

/**
 * Strategy for champion banning, picking, and ordering
 */
export class BanPickStrategy {
  // High-priority champions to ban
  private static readonly PRIORITY_BANS = [
    "Yasuo",
    "Zed",
    "Jhin",
    "Kha'Zix",
    "Viktor",
    "Tristana",
    "Blitzcrank",
    "Malphite",
    "Sion",
    "Aatrox",
  ];

  // Ideal team composition (roles to fill)
  private static readonly IDEAL_COMPOSITION: ChampionRole[] = [
    "tank",      // 1st - frontline
    "fighter",   // 2nd - damage + sustain
    "marksman",  // 3rd - ranged damage
    "mage",      // 4th - magic damage
    "support",   // 5th - utility (or another damage if needed)
  ];

  /**
   * Get a champion to ban
   */
  getBan(
    bannedChampions: string[],
    _blueBans?: string[],
    _redBans?: string[]
  ): string | null {
    const allChampionNames = champions.map((c) => c.name);
    const available = allChampionNames.filter(
      (name) => !bannedChampions.includes(name)
    );

    if (available.length === 0) return null;

    // Try to ban priority champions first
    for (const priority of BanPickStrategy.PRIORITY_BANS) {
      if (available.includes(priority)) {
        return priority;
      }
    }

    // Random ban if no priority available
    return available[Math.floor(Math.random() * available.length)];
  }

  /**
   * Get a champion to pick
   */
  getPick(
    bannedChampions: string[],
    alreadyPicked: string[],
    botPicks: string[]
  ): string | null {
    const unavailable = [...bannedChampions, ...alreadyPicked];
    const available = champions.filter((c) => !unavailable.includes(c.name));

    if (available.length === 0) return null;

    // Determine what role we need
    const neededRole = this.getNeededRole(botPicks);

    // Find best champion for that role
    const roleChampions = available.filter((c) => c.role === neededRole);

    if (roleChampions.length > 0) {
      // Pick the best champion of that role (by stats)
      const best = this.rankChampionsByStrength(roleChampions)[0];
      return best.name;
    }

    // Fallback: pick strongest available champion
    const ranked = this.rankChampionsByStrength(available);
    return ranked[0].name;
  }

  /**
   * Determine what role the team needs
   */
  private getNeededRole(currentPicks: string[]): ChampionRole {
    const pickIndex = currentPicks.length;
    if (pickIndex < BanPickStrategy.IDEAL_COMPOSITION.length) {
      return BanPickStrategy.IDEAL_COMPOSITION[pickIndex];
    }
    // Default to fighter for extra picks
    return "fighter";
  }

  /**
   * Rank champions by overall strength
   */
  private rankChampionsByStrength(
    championList: typeof champions
  ): typeof champions {
    return [...championList].sort((a, b) => {
      const scoreA = this.calculateChampionScore(a);
      const scoreB = this.calculateChampionScore(b);
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate a champion's overall strength score
   */
  private calculateChampionScore(
    champion: (typeof champions)[0]
  ): number {
    let score = 0;

    const stats = champion.stats;

    // Offensive stats
    score += (stats.ad || 0) * 1.5;
    score += (stats.ap || 0) * 1.2;
    score += (stats.criticalChance || 0) * 0.8;

    // Defensive stats
    score += (stats.maxHp || 0) * 0.3;
    score += (stats.physicalResistance || 0) * 0.5;
    score += (stats.magicResistance || 0) * 0.3;

    // Utility stats
    score += (stats.speed || 1) * 5;
    score += (stats.hpRegen || 0) * 2;
    score += (stats.lifesteal || 0) * 1.5;

    // Attack range bonus
    const range = stats.attackRange?.range || 1;
    score += range * 8;

    // Skill bonus
    if (champion.skill) {
      score += 20;
      const cooldown = champion.skill.cooldown || 0;
      if (cooldown > 0) {
        score += 30 / cooldown; // Lower cooldown = better
      }
    }

    // Role-based adjustments
    switch (champion.role) {
      case "assassin":
        score *= 1.15; // Assassins are strong in this game
        break;
      case "marksman":
        score *= 1.1;
        break;
      case "mage":
        score *= 1.05;
        break;
    }

    return score;
  }

  /**
   * Order champions for optimal positioning
   * Returns champions in order: front to back
   */
  getOrder(championNames: string[]): string[] {
    const championData = championNames
      .map((name) => champions.find((c) => c.name === name))
      .filter((c) => c !== undefined) as typeof champions;

    // Categorize by role
    const tanks: string[] = [];
    const fighters: string[] = [];
    const others: string[] = [];
    const supports: string[] = [];
    const ranged: string[] = [];

    for (const champ of championData) {
      switch (champ.role) {
        case "tank":
          tanks.push(champ.name);
          break;
        case "fighter":
          fighters.push(champ.name);
          break;
        case "support":
          supports.push(champ.name);
          break;
        case "marksman":
        case "mage":
          ranged.push(champ.name);
          break;
        default:
          others.push(champ.name);
      }
    }

    // Order: tanks first, then fighters, then others, then ranged, then supports
    // This puts tankier units in front positions
    return [...tanks, ...fighters, ...others, ...ranged, ...supports];
  }

  /**
   * Analyze opponent's picks and suggest counters
   */
  suggestCounter(
    opponentPicks: string[],
    bannedChampions: string[],
    alreadyPicked: string[]
  ): string | null {
    const unavailable = [...bannedChampions, ...alreadyPicked];
    const available = champions.filter((c) => !unavailable.includes(c.name));

    if (available.length === 0) return null;

    // Analyze opponent's composition
    const opponentRoles = opponentPicks
      .map((name) => champions.find((c) => c.name === name)?.role)
      .filter((r) => r !== undefined) as ChampionRole[];

    // Counter logic
    const hasManySquishy =
      opponentRoles.filter((r) => r === "mage" || r === "marksman").length >= 2;
    const hasManyTanks =
      opponentRoles.filter((r) => r === "tank" || r === "fighter").length >= 2;

    if (hasManySquishy) {
      // Pick assassins to dive squishies
      const assassins = available.filter((c) => c.role === "assassin");
      if (assassins.length > 0) {
        return this.rankChampionsByStrength(assassins)[0].name;
      }
    }

    if (hasManyTanks) {
      // Pick champions with %hp damage or armor pen
      const tankBusters = available.filter(
        (c) =>
          c.name === "Aatrox" || // % hp damage
          (c.stats.sunder && c.stats.sunder > 0) // Armor pen
      );
      if (tankBusters.length > 0) {
        return this.rankChampionsByStrength(tankBusters)[0].name;
      }
    }

    // Default to strongest available
    return this.rankChampionsByStrength(available)[0].name;
  }
}
