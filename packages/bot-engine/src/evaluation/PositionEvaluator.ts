import {
  Chess,
  Game,
  GameEngine,
  getPlayerPieces,
  getPieceAtPosition,
} from "@lolchess/game-engine";
import { EvaluationResult, EvaluationBreakdown } from "../types";
import { MaterialEvaluator } from "./MaterialEvaluator";
import { ThreatEvaluator } from "./ThreatEvaluator";
import { LoSEvaluator } from "./LoSEvaluator";

/**
 * Main position evaluator that combines all evaluation aspects
 * Provides a comprehensive score for a board position
 */
export class PositionEvaluator {
  private materialEvaluator: MaterialEvaluator;
  private threatEvaluator: ThreatEvaluator;
  private losEvaluator: LoSEvaluator;

  // Evaluation weights
  private static readonly WEIGHTS = {
    material: 1.0,
    position: 0.3,
    threats: 0.4,
    safety: 0.5,
    mobility: 0.2,
    lineOfSight: 0.35, // LoS is important for ranged carries
  };

  constructor(private gameEngine: GameEngine) {
    this.materialEvaluator = new MaterialEvaluator();
    this.threatEvaluator = new ThreatEvaluator(
      gameEngine,
      this.materialEvaluator
    );
    this.losEvaluator = new LoSEvaluator(gameEngine);
  }

  /**
   * Evaluate the position from a player's perspective
   * Positive score = good for the player
   */
  evaluate(game: Game, playerId: string): number {
    const opponentId = this.getOpponentId(game, playerId);
    const isBlue = game.bluePlayer === playerId;

    // Calculate individual components
    const material = this.evaluateMaterial(game, playerId, opponentId);
    const position = this.evaluatePosition(game, playerId, opponentId, isBlue);
    const threats = this.evaluateThreats(game, playerId, opponentId);
    const lineOfSight = this.evaluateLineOfSight(game, playerId, opponentId);

    // Create breakdown
    const breakdown: EvaluationBreakdown = {
      material,
      position,
      threats,
      lineOfSight,
    };

    // Calculate weighted total score
    const score =
      material * PositionEvaluator.WEIGHTS.material +
      position * PositionEvaluator.WEIGHTS.position +
      threats * PositionEvaluator.WEIGHTS.threats +
      lineOfSight * PositionEvaluator.WEIGHTS.lineOfSight;

    return score;
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
    const playerScore = this.calculatePositionalScore(
      getPlayerPieces(game, playerId),
      isBlue
    );
    const opponentScore = this.calculatePositionalScore(
      getPlayerPieces(game, opponentId),
      !isBlue
    );
    return playerScore - opponentScore;
  }

  private calculatePositionalScore(pieces: Chess[], isBlue: boolean): number {
    let score = 0;

    // 1. Pre-calculate piece positions for O(1) lookup
    // This lets us check for "backup" support instantly
    const piecePositions = new Set<string>();
    for (const p of pieces) {
      piecePositions.add(`${p.position.x},${p.position.y}`);
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

      // --- NEW LOGIC STARTS HERE ---

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

      // 2. Minion Logic: Structure & Flank Safety
      if (this.materialEvaluator.isMinion(piece.name)) {
        // Determine where a "supporter" would be.
        // If Blue moves UP, support comes from DOWN (y-1).
        const supportY = isBlue ? piece.position.y - 1 : piece.position.y + 1;

        // Check diagonals behind for a friend
        const hasLeftSupport = piecePositions.has(
          `${piece.position.x - 1},${supportY}`
        );
        const hasRightSupport = piecePositions.has(
          `${piece.position.x + 1},${supportY}`
        );
        const isSupported = hasLeftSupport || hasRightSupport;

        // A. Structure Bonus (Pawn Chain)
        // Reward minions that are protected by others pawns
        if (isSupported) {
          score += 25;
        }

        // B. Critical Flank Avoidance
        // If on the edge (x=0 or x=7) AND no support, heavy penalty
        const isFlank = piece.position.x === 0 || piece.position.x === 7;
        if (isFlank && !isSupported) {
          score -= 20; // Discourage moving to edges alone
        }
      }
    }

    return score;
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

    // Create breakdown
    const breakdown: EvaluationBreakdown = {
      material,
      position,
      threats,
      lineOfSight,
    };

    // Calculate weighted total score
    const score =
      material * PositionEvaluator.WEIGHTS.material +
      position * PositionEvaluator.WEIGHTS.position +
      threats * PositionEvaluator.WEIGHTS.threats +
      lineOfSight * PositionEvaluator.WEIGHTS.lineOfSight;

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
