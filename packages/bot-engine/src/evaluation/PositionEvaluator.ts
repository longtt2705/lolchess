import {
  Chess,
  Game,
  GameEngine,
  getPlayerPieces,
  getPieceAtPosition,
  ChessFactory,
} from "@lolchess/game-engine";
import { EvaluationResult, EvaluationBreakdown } from "../types";
import { MaterialEvaluator } from "./MaterialEvaluator";
import { ThreatEvaluator } from "./ThreatEvaluator";
import { LoSEvaluator } from "./LoSEvaluator";
import { PassedPawnEvaluator } from "./PassedPawnEvaluator";

/**
 * Main position evaluator that combines all evaluation aspects
 * Provides a comprehensive score for a board position
 */
export class PositionEvaluator {
  private materialEvaluator: MaterialEvaluator;
  private threatEvaluator: ThreatEvaluator;
  private losEvaluator: LoSEvaluator;
  private passedPawnEvaluator: PassedPawnEvaluator;

  // Evaluation weights
  private static readonly WEIGHTS = {
    material: 0.8,    // Increased from 0.3 (rewards kills)
    position: 1,    // Decreased from 0.6 (less emphasis on structure)
    threats: 0.7,     // Increased from 1 (rewards attack potential)
    safety: 0.5,      // Increased from 0.5 (prioritize survival, especially Poro)
    mobility: 0.2,
    lineOfSight: 1, // Decreased from 1 (less emphasis on perfect positioning)
    passedPawn: 1.2, // High weight for promotion potential
  };

  constructor(private gameEngine: GameEngine) {
    this.materialEvaluator = new MaterialEvaluator();
    this.threatEvaluator = new ThreatEvaluator(
      gameEngine,
      this.materialEvaluator
    );
    this.losEvaluator = new LoSEvaluator();
    this.passedPawnEvaluator = new PassedPawnEvaluator(gameEngine);
  }

  /**
   * Evaluate the position from a player's perspective
   * Positive score = good for the player
   */
  evaluate(game: Game, playerId: string): number {
    const opponentId = this.getOpponentId(game, playerId);
    const isBlue = game.bluePlayer === playerId;

    // Calculate individual components with NaN protection
    const material = this.sanitizeNumber(this.evaluateMaterial(game, playerId, opponentId));
    const position = this.sanitizeNumber(this.evaluatePosition(game, playerId, opponentId, isBlue));
    const threats = this.sanitizeNumber(this.evaluateThreats(game, playerId, opponentId));
    const lineOfSight = this.sanitizeNumber(this.evaluateLineOfSight(game, playerId, opponentId));
    const safety = this.sanitizeNumber(this.evaluateSafety(game, playerId, opponentId));
    const passedPawn = this.sanitizeNumber(this.evaluatePassedPawns(game, playerId, opponentId));

    // Create breakdown
    const breakdown: EvaluationBreakdown = {
      material,
      position,
      threats,
      lineOfSight,
      safety,
      passedPawn,
    };
    console.log(`[PositionEvaluator] Position breakdown: ${JSON.stringify(breakdown)}`);

    // Calculate weighted total score
    const score =
      material * PositionEvaluator.WEIGHTS.material +
      position * PositionEvaluator.WEIGHTS.position +
      threats * PositionEvaluator.WEIGHTS.threats +
      lineOfSight * PositionEvaluator.WEIGHTS.lineOfSight * (!this.gameEngine.isOpeningPhase(game) ? 0.3 : 1) +
      safety * PositionEvaluator.WEIGHTS.safety +
      passedPawn * PositionEvaluator.WEIGHTS.passedPawn;

    // Final NaN protection
    return this.sanitizeNumber(score);
  }

  /**
   * Sanitize a number to prevent NaN/Infinity from propagating
   */
  private sanitizeNumber(value: number): number {
    if (isNaN(value) || !isFinite(value)) {
      return 0;
    }
    return value;
  }

  /**
   * Evaluate material difference
   */
  private evaluateMaterial(
    game: Game,
    playerId: string,
    opponentId: string
  ): number {
    return this.materialEvaluator.evaluateDifference(
      game,
      playerId,
      opponentId
    );
  }

  /**
   * Evaluate positional advantage
   */
  private evaluatePosition(
    game: Game,
    playerId: string,
    opponentId: string,
    isBlue: boolean
  ): number {
    const playerPieces = getPlayerPieces(game, playerId);
    const opponentPieces = getPlayerPieces(game, opponentId);

    const playerScore = this.calculatePositionalScore(
      playerPieces,
      opponentPieces,
      isBlue
    );
    const opponentScore = this.calculatePositionalScore(
      opponentPieces,
      playerPieces,
      !isBlue
    );
    return playerScore - opponentScore;
  }

  private calculatePositionalScore(
    pieces: Chess[],
    opponentPieces: Chess[],
    isBlue: boolean
  ): number {
    let score = 0;

    // 1. Pre-calculate piece positions for O(1) lookup
    // This lets us check for "backup" support instantly
    const piecePositions = new Set<string>();
    for (const p of pieces) {
      piecePositions.add(`${p.position.x},${p.position.y}`);
    }

    // Pre-calculate minions by file (column) for doubled pawn detection
    const minionsByFile = new Map<number, Chess[]>();
    for (const p of pieces) {
      if (this.materialEvaluator.isMinion(p.name)) {
        const file = p.position.x;
        if (!minionsByFile.has(file)) {
          minionsByFile.set(file, []);
        }
        minionsByFile.get(file)!.push(p);
      }
    }

    // Pre-calculate opponent minion positions for passed pawn detection
    const opponentMinionPositions = new Set<string>();
    for (const p of opponentPieces) {
      if (this.materialEvaluator.isMinion(p.name)) {
        opponentMinionPositions.add(`${p.position.x},${p.position.y}`);
      }
    }

    for (const piece of pieces) {
      // --- EXISTING LOGIC ---

      // Center control bonus (columns 3-4 are most valuable)
      const centerDistance = Math.abs(piece.position.x - 3.5);
      const centerBonus = (4 - centerDistance) * 2;
      score += centerBonus;

      // Advancement bonus
      const advancement = isBlue ? piece.position.y : 7 - piece.position.y;
      score += advancement * 2;

      // Champions in attacking positions worth more
      if (
        !this.materialEvaluator.isMinion(piece.name) &&
        piece.name !== "Poro"
      ) {
        score += advancement * 1.5;
      }

      // --- PORO LOGIC ---

      // 1. Poro Logic: Prioritize Castling (Safe Corners)
      if (piece.name === "Poro") {
        const safeRow = isBlue ? 0 : 7;
        const isBackRank = piece.position.y === safeRow;

        // Check if Poro is on the "Wings" (files 0-2 or 5-7)
        // This encourages moving away from the dangerous center (files 3-4)
        const isWing = piece.position.x < 2 || piece.position.x > 5;

        if (isBackRank && isWing) {
          score += 100; // Huge bonus for being "castled" - strategic defensive position
        } else if (isBackRank) {
          score += 15; // Bonus for being on back rank (safer than advancing)
        } else {
          // Penalty for stepping out unless absolutely necessary
          score -= 15;
        }
      }

      // --- MINION/PAWN STRUCTURE LOGIC ---

      // 2. Minion Logic: Enhanced Structure & Pawn Evaluation
      if (this.materialEvaluator.isMinion(piece.name)) {
        // Determine where a "supporter" would be.
        // If Blue moves UP, support comes from DOWN (y-1).
        const supportY = isBlue ? piece.position.y - 1 : piece.position.y + 1;

        // Check diagonals behind for a friend (pawn chain)
        const hasLeftSupport = piecePositions.has(
          `${piece.position.x - 1},${supportY}`
        );
        const hasRightSupport = piecePositions.has(
          `${piece.position.x + 1},${supportY}`
        );
        const hasBothSupport = hasLeftSupport && hasRightSupport;
        const isSupported = hasLeftSupport || hasRightSupport;

        // A. Enhanced Structure Bonus (Pawn Chain)
        // Reward minions that are protected by other pawns
        if (hasBothSupport) {
          score += 60; // Double support - very strong structure
        } else if (isSupported) {
          score += 40; // Single support - good structure
        }

        // B. Isolated Pawn Penalty
        // Penalty for minions with no adjacent minions on the same rank (no pawn neighbors)
        const hasLeftNeighbor =
          minionsByFile.has(piece.position.x - 1) &&
          minionsByFile.get(piece.position.x - 1)!.length > 0;
        const hasRightNeighbor =
          minionsByFile.has(piece.position.x + 1) &&
          minionsByFile.get(piece.position.x + 1)!.length > 0;
        const isIsolated = !hasLeftNeighbor && !hasRightNeighbor;
        if (isIsolated) {
          score -= 30; // Isolated pawn penalty
        }

        // C. Doubled Pawn Penalty
        // Penalty for having two minions on the same file (column)
        const minionsOnSameFile = minionsByFile.get(piece.position.x) || [];
        if (minionsOnSameFile.length > 1) {
          score -= 15; // Doubled pawn penalty (applied to each pawn)
        }

        // D. Passed Pawn Bonus
        // Bonus for minions with no enemy minions ahead in same/adjacent files
        const isPassedPawn = this.isPassedPawn(
          piece,
          opponentMinionPositions,
          isBlue
        );
        if (isPassedPawn) {
          // Passed pawn bonus scales with advancement
          score += 50 + advancement * 10;
        }

        // E. Critical Flank Avoidance
        // If on the edge (x=0 or x=7) AND no support, heavy penalty
        const isFlank = piece.position.x === 0 || piece.position.x === 7;
        if (isFlank && !isSupported) {
          score -= 20; // Discourage moving to edges alone
        }
      }

      // --- CHAMPION DEVELOPMENT LOGIC ---

      // 3. Champion Development: Reward moving pieces from starting position
      if (
        !this.materialEvaluator.isMinion(piece.name) &&
        piece.name !== "Poro"
      ) {
        if (piece.hasMovedBefore && piece.startingPosition) {
          score += 30; // Development bonus for having moved

          // Center development extra bonus
          if (piece.position.x >= 2 && piece.position.x <= 5) {
            score += 20; // Extra bonus for developing toward center
          }
        } else {
          // Back rank penalty for undeveloped pieces
          const startRow = isBlue ? 0 : 7;
          if (piece.position.y === startRow) {
            score -= 25; // Penalty for staying on back rank
          }
        }
      }
    }

    return score;
  }

  /**
   * Check if a minion is a passed pawn (no enemy minions blocking its path)
   */
  private isPassedPawn(
    piece: Chess,
    opponentMinionPositions: Set<string>,
    isBlue: boolean
  ): boolean {
    const file = piece.position.x;
    const rank = piece.position.y;

    // Check all squares ahead in same file and adjacent files
    const filesToCheck = [file - 1, file, file + 1].filter(
      (f) => f >= -1 && f <= 8
    );

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
   * Evaluate threat potential
   */
  private evaluateThreats(
    game: Game,
    playerId: string,
    opponentId: string
  ): number {
    const ourThreats = this.threatEvaluator.evaluateThreatScore(game, playerId);
    const theirThreats = this.threatEvaluator.evaluateThreatScore(
      game,
      opponentId
    );
    return ourThreats - theirThreats;
  }

  /**
  * Evaluate Line of Sight for ranged carries
  * Positive = good LoS (clear lanes to enemies)
  * Negative = bad LoS (blocked by allies)
  */
  private evaluateLineOfSight(
    game: Game,
    playerId: string,
    opponentId: string
  ): number {
    const ourLoS = this.losEvaluator.evaluateLoS(game, playerId);
    const theirLoS = this.losEvaluator.evaluateLoS(game, opponentId);
    return ourLoS - theirLoS;
  }

  private evaluateSafety(
    game: Game,
    playerId: string,
    opponentId: string
  ): number {
    let safety = 0;
    const pieces = getPlayerPieces(game, playerId);
    for (const piece of pieces) {
      if (piece.name === "Poro") {
        const poroSafety = this.threatEvaluator.evaluatePositionSafety(game, piece, playerId);

        // CRITICAL: If Poro is under direct threat, massively penalize
        if (poroSafety < -50) {
          // Enemy can deal significant damage - 10x multiplier for emergency escape
          safety += poroSafety * 10;
        } else {
          safety += poroSafety * 2;
        }
      } else {
        safety -= ChessFactory.createChess(piece, game).damageTargetPriorityFactor * this.threatEvaluator.evaluatePositionSafety(game, piece, playerId);
      }
    }
    return safety;
  }

  /**
   * Evaluate passed pawn promotion potential
   */
  private evaluatePassedPawns(
    game: Game,
    playerId: string,
    opponentId: string
  ): number {
    return this.passedPawnEvaluator.evaluate(game, playerId, opponentId);
  }

  /**
   * Get the LoS evaluator for external use (e.g., by BotEngine)
   */
  getLoSEvaluator(): LoSEvaluator {
    return this.losEvaluator;
  }

  /**
   * Evaluate position and return detailed breakdown
   */
  evaluateWithBreakdown(game: Game, playerId: string): EvaluationResult {
    const opponentId = this.getOpponentId(game, playerId);
    const isBlue = game.bluePlayer === playerId;

    // Calculate individual components
    const material = this.evaluateMaterial(game, playerId, opponentId);
    const position = this.evaluatePosition(game, playerId, opponentId, isBlue);
    const threats = this.evaluateThreats(game, playerId, opponentId);
    const lineOfSight = this.evaluateLineOfSight(game, playerId, opponentId);
    const safety = this.evaluateSafety(game, playerId, opponentId);
    const passedPawn = this.evaluatePassedPawns(game, playerId, opponentId);

    // Create breakdown
    const breakdown: EvaluationBreakdown = {
      material,
      position,
      threats,
      lineOfSight,
      safety,
      passedPawn,
    };

    // Calculate weighted total score
    const score =
      material * PositionEvaluator.WEIGHTS.material +
      position * PositionEvaluator.WEIGHTS.position +
      threats * PositionEvaluator.WEIGHTS.threats +
      lineOfSight * PositionEvaluator.WEIGHTS.lineOfSight +
      safety * PositionEvaluator.WEIGHTS.safety +
      passedPawn * PositionEvaluator.WEIGHTS.passedPawn;

    return { score, breakdown };
  }

  /**
   * Quick evaluation for search (simplified, faster)
   */
  quickEvaluate(game: Game, playerId: string): number {
    const opponentId = this.getOpponentId(game, playerId);
    const isBlue = game.bluePlayer === playerId;

    // Only calculate material and threats for speed
    const material = this.evaluateMaterial(game, playerId, opponentId);
    const threats = this.evaluateThreats(game, playerId, opponentId);

    return (
      material * PositionEvaluator.WEIGHTS.material +
      threats * PositionEvaluator.WEIGHTS.threats
    );
  }

  /**
   * Get opponent player ID
   */
  private getOpponentId(game: Game, playerId: string): string {
    return game.bluePlayer === playerId ? game.redPlayer! : game.bluePlayer!;
  }

  /**
   * Check if game is over
   */
  isGameOver(game: Game): boolean {
    return this.gameEngine.isGameOver(game);
  }

  /**
   * Get winner evaluation (large positive/negative score)
   */
  getTerminalScore(game: Game, playerId: string): number | null {
    if (!this.isGameOver(game)) return null;

    const winner = this.gameEngine.getWinner(game);
    if (winner === undefined) return null;
    if (winner === null) return 0; // Draw

    // Check if we won
    const isBlue = game.bluePlayer === playerId;
    const weWon =
      (isBlue && winner === "blue") || (!isBlue && winner === "red");

    return weWon ? 100000 : -100000;
  }
}
