import {
  Chess,
  Game,
  GameEngine,
  getPieceAtPosition,
  getPlayerPieces,
  Square
} from "@lolchess/game-engine";
import { ChessEvalFactory } from "../champion/ChessEvalFactory";
import { ThreatInfo } from "../types";
import { MaterialEvaluator } from "./MaterialEvaluator";

/**
 * Evaluates threats and attack opportunities
 */
export class ThreatEvaluator {
  constructor(private gameEngine: GameEngine, private materialEvaluator: MaterialEvaluator) { }
  /**
   * Get all threats a player can make
   */
  getPlayerThreats(game: Game, playerId: string): ThreatInfo[] {
    const threats: ThreatInfo[] = [];
    const pieces = getPlayerPieces(game, playerId);

    for (const piece of pieces) {
      const chessObjectEval = ChessEvalFactory.createChess(piece, game);
      if (piece.cannotAttack || chessObjectEval.isStunned || piece.stats.hp <= 0) continue;

      const attackTargets = this.gameEngine.getValidAttacks(game, piece.id);
      for (const targetPos of attackTargets) {
        const target = getPieceAtPosition(game, targetPos);
        if (!target) continue;
        const targetChessObject = ChessEvalFactory.createChess(target, game);
        const potentialDamage = chessObjectEval.calculateDamageAttack(targetChessObject);
        const canKill = targetChessObject.chess.stats.hp <= potentialDamage;

        // Calculate priority
        let priority = potentialDamage;
        if (canKill) priority += 100;
        if (target.name === "Poro") priority += 500;
        priority += this.materialEvaluator.evaluatePiece(target);

        threats.push({
          attacker: piece,
          target,
          damage: potentialDamage,
          canKill,
          priority,
        });
      }

      if (piece.skill?.type === "active" && piece.skill?.currentCooldown === 0) {
        const skillTargets = this.gameEngine.getValidSkillTargets(game, piece.id);
        for (const targetPos of skillTargets) {
          const target = getPieceAtPosition(game, targetPos);
          if (!target) continue;
          const targetChessObject = ChessEvalFactory.createChess(target, game);
          const potentialDamage = chessObjectEval.calculateDamageActiveSkill(targetChessObject);
          const canKill = targetChessObject.chess.stats.hp <= potentialDamage;

          // Calculate priority
          let priority = potentialDamage;
          if (canKill) priority += 100;
          if (target.name === "Poro") priority += 500;
          priority += this.materialEvaluator.evaluatePiece(target);

          threats.push({
            attacker: piece,
            target,
            damage: potentialDamage,
            canKill,
            priority,
          });
        }
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
