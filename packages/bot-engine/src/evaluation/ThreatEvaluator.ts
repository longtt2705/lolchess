import {
  Chess,
  ChessFactory,
  ChessObject,
  Game,
  GameEngine,
  getPieceAtPosition,
  getPlayerPieces,
  Square,
} from "@lolchess/game-engine";
import { ThreatInfo, PositionThreatScore } from "../types";
import { MaterialEvaluator } from "./MaterialEvaluator";

/**
 * Evaluates threats and attack opportunities
 */
export class ThreatEvaluator {
  constructor(
    private gameEngine: GameEngine,
    private materialEvaluator: MaterialEvaluator
  ) { }
  /**
   * Get all threats a player can make
   */
  getPlayerThreats(game: Game, playerId: string): ThreatInfo[] {
    const threats: ThreatInfo[] = [];
    const pieces = getPlayerPieces(game, playerId);
    const listActions: {
      attacker: ChessObject;
      priority: number;
      isAttack: boolean;
    }[] = [];

    for (const piece of pieces) {
      const chessObject = ChessFactory.createChess(piece, game);

      const attackScore = chessObject.getAttackScore();
      if (attackScore > 0) {
        listActions.push({
          attacker: chessObject,
          priority: attackScore,
          isAttack: true,
        });
      }

      const skillScore = chessObject.getActiveSkillScore();
      if (skillScore > 0) {
        listActions.push({
          attacker: chessObject,
          priority: skillScore,
          isAttack: false,
        });
      }
    }

    // Get top 40% of actions
    listActions.sort((a, b) => b.priority - a.priority);
    const topActions = listActions.slice(0, Math.floor(listActions.length * 0.4));


    for (const action of topActions) {
      if (action.isAttack) {
        const attackTargets = this.gameEngine.getValidAttacks(game, action.attacker.chess.id);
        for (const targetPos of attackTargets) {
          const target = getPieceAtPosition(game, targetPos);
          if (!target) continue;
          const targetChessObject = ChessFactory.createChess(target, game);
          const potentialDamage =
            action.attacker.calculateDamageAttack(targetChessObject);
          const canKill = targetChessObject.chess.stats.hp <= potentialDamage;

          // Calculate priority
          let priority = potentialDamage;
          if (canKill) priority += 100;
          if (target.name === "Poro") priority += 500;

          threats.push({
            attacker: action.attacker.chess,
            target,
            damage: potentialDamage,
            canKill,
            priority: priority * (targetChessObject.damageTargetPriorityFactor ?? 1),
          });
        }
      } else {
        if (action.attacker.chess.skill?.targetTypes === "none") {
          // Self-cast skill with no target
          const skillValue = action.attacker.getActiveSkillValue(null);

          // For self-cast skills, add as a general utility threat
          threats.push({
            attacker: action.attacker.chess,
            target: action.attacker.chess, // Self-target
            damage: skillValue,
            canKill: false,
            priority: skillValue * (action.attacker.damageTargetPriorityFactor ?? 1),
          });
        } else {
          const skillTargets = this.gameEngine.getValidSkillTargets(game, action.attacker.chess.id);
          for (const targetPos of skillTargets) {
            // Get the actual tactical value of using skill on this target
            // This includes damage, utility (healing, shields, buffs), and strategic value
            const skillValue = action.attacker.getActiveSkillValue(targetPos);

            if (skillValue === 0) continue; // Skip if skill has no value for this target

            const target = getPieceAtPosition(game, targetPos);
            if (!target) continue;
            const targetChessObject = ChessFactory.createChess(target, game);

            // Estimate if skill can kill based on target HP and skill value
            // For damage skills, high value + low target HP suggests kill potential
            const isEnemy = target.blue !== action.attacker.chess.blue;
            const lowHp = targetChessObject.chess.stats.hp < targetChessObject.chess.stats.maxHp * 0.3;
            const canKill = isEnemy && lowHp && skillValue > 50; // Rough estimate

            // Calculate priority based on skill value
            let priority = skillValue;
            if (canKill) priority += 100;
            if (target.name === "Poro") priority += 500;

            threats.push({
              attacker: action.attacker.chess,
              target,
              damage: skillValue, // Use skillValue as damage estimate
              canKill,
              priority: priority * (targetChessObject.damageTargetPriorityFactor ?? 1),
            });
          }
        }
      }
    }

    // Sort by priority (highest first)
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
    // return threats.reduce((acc, threat) => acc + threat.priority, 0);
    return threats.at(0)?.priority ?? 0;
  }

  /**
   * Calculate damage between two pieces
   */
  calculateDamage(attacker: Chess, target: Chess): number {
    // Create a temporary game-like context for ChessFactory
    const tempGame = { board: [attacker, target] } as Game;
    const attackerObject = ChessFactory.createChess(attacker, tempGame);
    const targetObject = ChessFactory.createChess(target, tempGame);
    return attackerObject.calculateDamageAttack(targetObject);
  }

  // ============================================
  // Two-Phase Search: Potential Threat Evaluation
  // ============================================

  /**
   * Evaluate the threat potential if a piece moves to a target position
   * This is used in Phase 1 of two-phase search to find the optimal position
   */
  evaluatePotentialThreats(
    game: Game,
    piece: Chess,
    targetPosition: Square,
    playerId: string
  ): PositionThreatScore {
    // Temporarily move the piece to the target position
    const originalPosition = { ...piece.position };
    piece.position = { ...targetPosition };

    // Get all potential attack targets from this position
    const attackTargets = this.gameEngine.getValidAttacks(game, piece.id);
    const skillTargets =
      piece.skill?.currentCooldown === 0
        ? this.gameEngine.getValidSkillTargets(game, piece.id)
        : [];

    let attackableTargets = 0;
    let bestTargetValue = 0;
    let totalThreatValue = 0;

    // Evaluate attack targets
    for (const targetPos of attackTargets) {
      const target = getPieceAtPosition(game, targetPos);
      if (!target) continue;

      attackableTargets++;

      const targetValue = this.evaluateTargetValue(game, piece, target);
      totalThreatValue += targetValue;

      if (targetValue > bestTargetValue) {
        bestTargetValue = targetValue;
      }
    }

    // Evaluate skill targets (only for damage skills)
    if (
      piece.skill?.type === "active" &&
      piece.skill?.targetTypes !== "squareInRange"
    ) {
      for (const targetPos of skillTargets) {
        const target = getPieceAtPosition(game, targetPos);
        if (!target) continue;

        // Avoid double counting if also in attack range
        const alreadyCounted = attackTargets.some(
          (at) => at.x === targetPos.x && at.y === targetPos.y
        );
        if (!alreadyCounted) {
          attackableTargets++;
          const targetValue = this.evaluateTargetValue(game, piece, target);
          totalThreatValue += targetValue;

          if (targetValue > bestTargetValue) {
            bestTargetValue = targetValue;
          }
        }
      }
    }

    // Evaluate position safety
    const safety = this.evaluatePositionSafety(game, piece, playerId);

    // Restore original position
    piece.position = originalPosition;

    // Calculate total score
    const total =
      totalThreatValue * 1.0 + // Threat potential weight
      bestTargetValue * 0.5 + // Bonus for having good targets
      safety * 0.3; // Safety factor

    return {
      position: targetPosition,
      attackableTargets,
      bestTargetValue,
      safety,
      total,
    };
  }

  /**
   * Evaluate the value of attacking a specific target
   */
  private evaluateTargetValue(
    game: Game,
    attacker: Chess,
    target: Chess
  ): number {
    let value = 0;

    // Poro is extremely high value
    if (target.name === "Poro") {
      value += 1000;
    }

    // Material value
    value += this.materialEvaluator.evaluatePiece(target, game);

    // Low HP targets are more valuable (easier to kill)
    const hpPercent = target.stats.hp / target.stats.maxHp;
    value += (1 - hpPercent) * 50;

    // Check if we can kill
    const damage = this.calculateDamage(attacker, target);
    if (target.stats.hp <= damage) {
      value += 200; // Kill bonus
    }

    return value;
  }

  /**
   * Evaluate how safe a position is from enemy attacks
   * Returns negative value if threatened
   */
  evaluatePositionSafety(game: Game, piece: Chess, playerId: string): number {
    let safety = 0;
    const isBlue = game.bluePlayer === playerId;

    // Find all enemy pieces that can attack this position
    for (const enemy of game.board) {
      if (enemy.stats.hp <= 0) continue;
      if (enemy.blue === isBlue) continue; // Skip allies
      if (enemy.cannotAttack) continue;

      const enemyAttacks = this.gameEngine.getValidAttacks(game, enemy.id);
      const canAttackUs = enemyAttacks.some(
        (pos) => pos.x === piece.position.x && pos.y === piece.position.y
      );

      if (canAttackUs) {
        const potentialDamage = this.calculateDamage(enemy, piece);
        safety -= potentialDamage;

        // Extra penalty if enemy can kill us
        if (piece.stats.hp <= potentialDamage) {
          safety -= 200;
        }
      }
    }

    return safety;
  }

  /**
   * Evaluate threat score for a player from a specific game state
   * This is a faster version for use in search
   */
  quickThreatScore(game: Game, playerId: string): number {
    let score = 0;
    const pieces = getPlayerPieces(game, playerId);
    const isBlue = game.bluePlayer === playerId;

    for (const piece of pieces) {
      if (piece.stats.hp <= 0 || piece.cannotAttack) continue;
      const isStunned = piece.debuffs?.some((d) => d.stun) ?? false;
      if (isStunned) continue;

      const attackTargets = this.gameEngine.getValidAttacks(game, piece.id);

      for (const targetPos of attackTargets) {
        const target = getPieceAtPosition(game, targetPos);
        if (!target) continue;

        // Check target is enemy
        if (target.blue === isBlue) continue;

        // Add value based on target
        if (target.name === "Poro") {
          score += 500;
        }

        score += this.materialEvaluator.evaluatePiece(target, game) * 0.5;

        // Low HP bonus
        const hpPercent = target.stats.hp / target.stats.maxHp;
        score += (1 - hpPercent) * 30;
      }
    }

    return score;
  }
}
