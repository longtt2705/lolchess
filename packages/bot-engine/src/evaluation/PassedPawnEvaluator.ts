import {
  Chess,
  Game,
  GameEngine,
  getPlayerPieces,
  getPieceAtPosition,
  ChessFactory,
  ChessObject,
  Square,
} from '@lolchess/game-engine';
import { PassedPawnScore } from '../types';

/**
 * Evaluates passed pawn promotion potential
 * Analyzes minions that can advance to promotion
 */
export class PassedPawnEvaluator {
  constructor(private gameEngine: GameEngine) {}

  /**
   * Evaluate passed pawn score for a player
   * Returns the total score for all passed pawns
   */
  evaluate(game: Game, playerId: string, opponentId: string): number {
    const pieces = getPlayerPieces(game, playerId);
    const isBlue = game.bluePlayer === playerId;
    let totalScore = 0;
    let passedPawnCount = 0;

    for (const piece of pieces) {
      // Only evaluate minions (Melee and Caster)
      if (!this.isMinion(piece.name)) continue;

      const score = this.evaluatePassedPawn(game, piece, playerId, opponentId, isBlue);

      if (score.isPassedPawn) {
        passedPawnCount++;
        totalScore += score.totalScore;
      }
    }

    // Multiple passed pawns bonus - harder for opponent to stop
    if (passedPawnCount > 1) {
      totalScore += (passedPawnCount - 1) * 30;
    }

    return totalScore;
  }

  /**
   * Evaluate a single minion's passed pawn potential
   */
  evaluatePassedPawn(
    game: Game,
    minion: Chess,
    playerId: string,
    opponentId: string,
    isBlue: boolean,
  ): PassedPawnScore {
    const canPromote = minion.name === 'Melee Minion';

    // Calculate distance and turns to promotion
    const promotionRank = isBlue ? 7 : 0;
    const distanceToPromotion = Math.abs(promotionRank - minion.position.y);

    const minionObject = ChessFactory.createChess(minion, game);
    const effectiveSpeed = this.calculateEffectiveSpeed(minionObject);
    const turnsToPromotion = Math.ceil(distanceToPromotion / effectiveSpeed);

    // Check if this is a passed pawn (no enemy minions blocking)
    const opponentPieces = getPlayerPieces(game, opponentId);
    const opponentMinionPositions = new Set<string>();
    for (const piece of opponentPieces) {
      if (this.isMinion(piece.name)) {
        opponentMinionPositions.add(`${piece.position.x},${piece.position.y}`);
      }
    }

    const isPassedPawn = this.isPassedPawnCheck(minion, opponentMinionPositions, isBlue);

    // If not a passed pawn, return minimal score
    if (!isPassedPawn) {
      return {
        isPassedPawn: false,
        canPromote,
        distanceToPromotion,
        turnsToPromotion,
        isUnstoppable: false,
        pathBlocked: false,
        threatCount: 0,
        supportCount: 0,
        healthFactor: 1.0,
        criticalFlankRisk: false,
        totalScore: 0,
      };
    }

    // Analyze path obstruction
    const pathBlocked = this.isPathBlocked(game, minion, isBlue);

    // Analyze threats (enemies that can intercept)
    const threatAnalysis = this.analyzeThreatsToPawn(
      game,
      minion,
      turnsToPromotion,
      isBlue,
      opponentId,
    );

    // Analyze support structure
    const supportCount = this.analyzeSupportStructure(game, minion, playerId, isBlue);

    // Calculate health factor
    const healthFactor = Math.max(0.3, minion.stats.hp / minion.stats.maxHp);

    // Check if unstoppable
    const isUnstoppable = threatAnalysis.minInterceptionTurns > turnsToPromotion;

    // Calculate total score
    const totalScore = this.calculatePassedPawnScore({
      isPassedPawn,
      canPromote,
      distanceToPromotion,
      turnsToPromotion,
      isUnstoppable,
      pathBlocked,
      threatCount: threatAnalysis.threatCount,
      supportCount,
      healthFactor,
      criticalFlankRisk: threatAnalysis.criticalFlankRisk,
      totalScore: 0, // Will be calculated
    });

    return {
      isPassedPawn,
      canPromote,
      distanceToPromotion,
      turnsToPromotion,
      isUnstoppable,
      pathBlocked,
      threatCount: threatAnalysis.threatCount,
      supportCount,
      healthFactor,
      criticalFlankRisk: threatAnalysis.criticalFlankRisk,
      totalScore,
    };
  }

  /**
   * Calculate the effective speed of a minion considering buffs
   */
  private calculateEffectiveSpeed(minionObject: ChessObject): number {
    let speed = minionObject.speed;

    // First move bonus: +1 speed
    if (!minionObject.chess.hasMovedBefore) {
      speed += 1;
    }

    return speed;
  }

  /**
   * Check if a minion is a passed pawn (no enemy minions blocking)
   */
  private isPassedPawnCheck(
    minion: Chess,
    opponentMinionPositions: Set<string>,
    isBlue: boolean,
  ): boolean {
    const file = minion.position.x;
    const rank = minion.position.y;

    // Check all squares ahead in same file and adjacent files
    const filesToCheck = [file - 1, file, file + 1].filter((f) => f >= 0 && f <= 7);

    for (const f of filesToCheck) {
      // Check all ranks ahead
      if (isBlue) {
        // Blue moves up (increasing y)
        for (let r = rank + 1; r <= 7; r++) {
          if (opponentMinionPositions.has(`${f},${r}`)) {
            return false; // Blocked by enemy minion
          }
        }
      } else {
        // Red moves down (decreasing y)
        for (let r = rank - 1; r >= 0; r--) {
          if (opponentMinionPositions.has(`${f},${r}`)) {
            return false; // Blocked by enemy minion
          }
        }
      }
    }

    return true; // No enemy minions blocking
  }

  /**
   * Check if the direct path is blocked by any piece
   */
  private isPathBlocked(game: Game, minion: Chess, isBlue: boolean): boolean {
    const file = minion.position.x;
    const rank = minion.position.y;
    const promotionRank = isBlue ? 7 : 0;

    // Check direct vertical path
    if (isBlue) {
      for (let r = rank + 1; r <= promotionRank; r++) {
        const piece = getPieceAtPosition(game, { x: file, y: r });
        if (piece && piece.stats.hp > 0) {
          // Check if it's a ghosted ally (doesn't block)
          const isAlly = piece.blue === minion.blue;
          const hasGhost = piece.debuffs?.some((d) => d.name === 'Ghost') ?? false;
          if (!isAlly || !hasGhost) {
            return true;
          }
        }
      }
    } else {
      for (let r = rank - 1; r >= promotionRank; r--) {
        const piece = getPieceAtPosition(game, { x: file, y: r });
        if (piece && piece.stats.hp > 0) {
          // Check if it's a ghosted ally (doesn't block)
          const isAlly = piece.blue === minion.blue;
          const hasGhost = piece.debuffs?.some((d) => d.name === 'Ghost') ?? false;
          if (!isAlly || !hasGhost) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Analyze threats to the pawn - enemies that can intercept
   */
  private analyzeThreatsToPawn(
    game: Game,
    minion: Chess,
    turnsToPromotion: number,
    isBlue: boolean,
    opponentId: string,
  ): {
    threatCount: number;
    minInterceptionTurns: number;
    criticalFlankRisk: boolean;
  } {
    const opponentPieces = getPlayerPieces(game, opponentId);
    const promotionRank = isBlue ? 7 : 0;
    let threatCount = 0;
    let minInterceptionTurns = Infinity;
    let criticalFlankRisk = false;

    // Calculate the promotion path squares
    const pathSquares = this.getPromotionPathSquares(minion, isBlue);

    for (const enemy of opponentPieces) {
      if (enemy.stats.hp <= 0) continue;

      const enemyObject = ChessFactory.createChess(enemy, game);
      const enemySpeed = enemyObject.speed;

      // Check if enemy can reach any square on the promotion path
      for (const pathSquare of pathSquares) {
        const distance = this.calculateManhattanDistance(enemy.position, pathSquare);
        const turnsToReach = Math.ceil(distance / enemySpeed);

        if (turnsToReach <= turnsToPromotion) {
          threatCount++;
          minInterceptionTurns = Math.min(minInterceptionTurns, turnsToReach);
          break; // Count each enemy only once
        }
      }

      // Check for Critical Flank risk (enemy minions diagonal)
      if (enemy.name === 'Melee Minion' || enemy.name === 'Caster Minion') {
        const deltaX = Math.abs(enemy.position.x - minion.position.x);
        const deltaY = Math.abs(enemy.position.y - minion.position.y);
        if (deltaX === 1 && deltaY === 1) {
          // Enemy minion is diagonal - potential Critical Flank
          const isInFront = isBlue
            ? enemy.position.y > minion.position.y
            : enemy.position.y < minion.position.y;
          if (!isInFront) {
            // Enemy is diagonal and behind/beside - can Critical Flank
            criticalFlankRisk = true;
          }
        }
      }

      // Special case: Check enemy Poro (King) distance
      if (enemy.name === 'Poro') {
        // Poro can only capture at range 1
        const promotionSquare = { x: minion.position.x, y: promotionRank };
        const poroDistance = this.calculateManhattanDistance(enemy.position, promotionSquare);
        const turnsForPoroToReach = Math.ceil(poroDistance / enemySpeed);

        if (turnsForPoroToReach <= turnsToPromotion + 1) {
          // Poro can reach the promotion square around the same time
          threatCount++;
          minInterceptionTurns = Math.min(minInterceptionTurns, turnsForPoroToReach);
        }
      }
    }

    return { threatCount, minInterceptionTurns, criticalFlankRisk };
  }

  /**
   * Get all squares on the promotion path (including diagonals)
   */
  private getPromotionPathSquares(minion: Chess, isBlue: boolean): Square[] {
    const squares: Square[] = [];
    const file = minion.position.x;
    const rank = minion.position.y;
    const promotionRank = isBlue ? 7 : 0;

    // Minions can move diagonally forward, so include adjacent files
    const filesToConsider = [file - 1, file, file + 1].filter((f) => f >= 0 && f <= 7);

    for (const f of filesToConsider) {
      if (isBlue) {
        for (let r = rank + 1; r <= promotionRank; r++) {
          squares.push({ x: f, y: r });
        }
      } else {
        for (let r = rank - 1; r >= promotionRank; r--) {
          squares.push({ x: f, y: r });
        }
      }
    }

    return squares;
  }

  /**
   * Calculate Manhattan distance between two positions
   */
  private calculateManhattanDistance(pos1: Square, pos2: Square): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  /**
   * Analyze support structure (pawn chain, friendly pieces)
   */
  private analyzeSupportStructure(
    game: Game,
    minion: Chess,
    playerId: string,
    isBlue: boolean,
  ): number {
    let supportCount = 0;
    const playerPieces = getPlayerPieces(game, playerId);

    // Check for pawn chain (diagonal allies behind)
    const supportY = isBlue ? minion.position.y - 1 : minion.position.y + 1;

    for (const ally of playerPieces) {
      if (ally.id === minion.id || ally.stats.hp <= 0) continue;

      // Check diagonal support (pawn chain)
      if (ally.position.y === supportY) {
        const deltaX = Math.abs(ally.position.x - minion.position.x);
        if (deltaX === 1) {
          supportCount++;
        }
      }

      // Check for nearby friendly pieces that can protect
      const distance = this.calculateManhattanDistance(ally.position, minion.position);
      if (distance <= 2 && ally.name !== 'Poro') {
        supportCount++;
      }
    }

    return supportCount;
  }

  /**
   * Calculate the final score for a passed pawn
   */
  private calculatePassedPawnScore(score: PassedPawnScore): number {
    let total = 0;

    if (!score.isPassedPawn) return 0;

    // Base passed pawn bonus
    total += 50;

    // Advancement bonus (closer to promotion is better)
    const advancement = 7 - score.distanceToPromotion;
    total += advancement * 15;

    // Unstoppable bonus (huge reward)
    if (score.isUnstoppable) {
      total += 200;
    }

    // Turns to promotion bonus (fewer turns = better)
    const turnBonus = Math.max(0, 8 - score.turnsToPromotion) * 25;
    total += turnBonus;

    // Path blocked penalty
    if (score.pathBlocked) {
      total -= 40;
    }

    // Threat penalty
    total -= score.threatCount * 20;

    // Support bonus
    total += score.supportCount * 15;

    // Critical Flank risk penalty
    if (score.criticalFlankRisk) {
      total -= 30;
    }

    // Only Melee Minions can promote - massive bonus
    if (score.canPromote) {
      total *= 1.5;
    } else {
      // Caster minions as passed pawns are less valuable
      total *= 0.5;
    }

    // Health factor (low HP minions are risky)
    total *= score.healthFactor;

    return Math.floor(total);
  }

  /**
   * Check if a piece is a minion type
   */
  private isMinion(pieceName: string): boolean {
    return [
      'Melee Minion',
      'Caster Minion',
      'Siege Minion',
      'Super Minion',
      'Sand Soldier',
    ].includes(pieceName);
  }

  /**
   * Get detailed passed pawn analysis for debugging
   */
  getPassedPawnDetails(game: Game, playerId: string, opponentId: string): PassedPawnScore[] {
    const pieces = getPlayerPieces(game, playerId);
    const isBlue = game.bluePlayer === playerId;
    const scores: PassedPawnScore[] = [];

    for (const piece of pieces) {
      if (!this.isMinion(piece.name)) continue;

      const score = this.evaluatePassedPawn(game, piece, playerId, opponentId, isBlue);

      if (score.isPassedPawn) {
        scores.push(score);
      }
    }

    return scores;
  }
}
