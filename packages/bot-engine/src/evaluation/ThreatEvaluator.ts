import {
  Chess,
  Game,
  GameEngine,
  getPlayerPieces,
  getPieceAtPosition,
  Square,
} from "@lolchess/game-engine";
import { ThreatInfo } from "../types";

/**
 * Evaluates threats and attack opportunities
 */
export class ThreatEvaluator {
  constructor(private gameEngine: GameEngine) {}

  /**
   * Calculate damage considering armor/resistance
   */
  calculateDamage(
    attacker: Chess,
    target: Chess,
    damageType: "physical" | "magic" = "physical"
  ): number {
    const baseDamage =
      damageType === "physical"
        ? attacker.stats.ad || 0
        : attacker.stats.ap || 0;

    const resistance =
      damageType === "physical"
        ? target.stats.physicalResistance || 0
        : target.stats.magicResistance || 0;

    // Apply sunder (armor penetration)
    const effectiveResistance = Math.max(
      0,
      resistance - (attacker.stats.sunder || 0)
    );

    // Damage reduction formula
    const damageMultiplier = 100 / (100 + effectiveResistance);
    let damage = baseDamage * damageMultiplier;

    // Apply damage amplification
    damage *= 1 + (attacker.stats.damageAmplification || 0) / 100;

    // Expected critical damage
    const critChance = attacker.stats.criticalChance || 0;
    const critDamage = attacker.stats.criticalDamage || 125;
    const expectedCritBonus = (critChance / 100) * ((critDamage - 100) / 100);
    damage *= 1 + expectedCritBonus;

    return Math.floor(damage);
  }

  /**
   * Get all threats a player can make
   */
  getPlayerThreats(game: Game, playerId: string): ThreatInfo[] {
    const threats: ThreatInfo[] = [];
    const pieces = getPlayerPieces(game, playerId);

    for (const piece of pieces) {
      if (piece.cannotAttack || piece.stats.hp <= 0) continue;

      const attackTargets = this.gameEngine.getValidAttacks(game, piece.id);
      for (const targetPos of attackTargets) {
        const target = getPieceAtPosition(game, targetPos);
        if (!target) continue;

        const damage = this.calculateDamage(piece, target, "physical");
        const canKill = target.stats.hp <= damage;

        // Calculate priority
        let priority = damage;
        if (canKill) priority += 100;
        if (target.name === "Poro") priority += 500;
        priority += (target.stats.goldValue || 0) * 0.5;

        threats.push({
          attacker: piece,
          target,
          damage,
          canKill,
          priority,
        });
      }
    }

    // Sort by priority (highest first)
    return threats.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get threats against a specific piece
   */
  getThreatsAgainst(game: Game, targetPiece: Chess): ThreatInfo[] {
    const threats: ThreatInfo[] = [];

    for (const piece of game.board) {
      if (piece.stats.hp <= 0 || piece.cannotAttack) continue;
      if (piece.blue === targetPiece.blue && piece.ownerId !== "neutral")
        continue;

      const attackTargets = this.gameEngine.getValidAttacks(game, piece.id);
      const canAttackTarget = attackTargets.some(
        (pos) =>
          pos.x === targetPiece.position.x && pos.y === targetPiece.position.y
      );

      if (canAttackTarget) {
        const damage = this.calculateDamage(piece, targetPiece, "physical");
        threats.push({
          attacker: piece,
          target: targetPiece,
          damage,
          canKill: targetPiece.stats.hp <= damage,
          priority: damage,
        });
      }
    }

    return threats.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get lethal threats (attacks that can kill)
   */
  getLethalThreats(game: Game, playerId: string): ThreatInfo[] {
    return this.getPlayerThreats(game, playerId).filter((t) => t.canKill);
  }

  /**
   * Evaluate overall threat score for a player
   */
  evaluateThreatScore(game: Game, playerId: string): number {
    const threats = this.getPlayerThreats(game, playerId);
    let score = 0;

    for (const threat of threats) {
      score += threat.damage * 0.5;
      if (threat.canKill) score += 50;
      if (threat.target.name === "Poro") score += 200;
    }

    return score;
  }

  /**
   * Check if Poro is under immediate threat
   */
  isPoroThreatened(game: Game, playerId: string): boolean {
    const pieces = getPlayerPieces(game, playerId);
    const poro = pieces.find((p) => p.name === "Poro");
    if (!poro) return true; // Already dead

    const threats = this.getThreatsAgainst(game, poro);
    return threats.length > 0;
  }

  /**
   * Get the best attack target from available attacks
   */
  getBestAttackTarget(
    game: Game,
    attackerPiece: Chess,
    targetPositions: Square[]
  ): Square | null {
    let bestTarget: Square | null = null;
    let bestPriority = -Infinity;

    for (const pos of targetPositions) {
      const target = getPieceAtPosition(game, pos);
      if (!target) continue;

      const damage = this.calculateDamage(attackerPiece, target, "physical");
      const canKill = target.stats.hp <= damage;

      let priority = damage;
      if (canKill) priority += 100 + (target.stats.goldValue || 0);
      if (target.name === "Poro") priority += 1000;

      // Prefer low HP targets
      const hpPercent = target.stats.hp / target.stats.maxHp;
      priority += (1 - hpPercent) * 30;

      if (priority > bestPriority) {
        bestPriority = priority;
        bestTarget = pos;
      }
    }

    return bestTarget;
  }
}
