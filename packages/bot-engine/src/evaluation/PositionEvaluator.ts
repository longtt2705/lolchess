import {
  Chess,
  Game,
  GameEngine,
  getPlayerPieces,
  getPieceAtPosition,
} from "@lolchess/game-engine";
import { EvaluationResult, EvaluationBreakdown } from "../types";
import { MaterialEvaluator } from "./MaterialEvaluator";
import { ChampionEvaluator } from "./ChampionEvaluator";
import { ThreatEvaluator } from "./ThreatEvaluator";

/**
 * Main position evaluator that combines all evaluation aspects
 * Provides a comprehensive score for a board position
 */
export class PositionEvaluator {
  private materialEvaluator: MaterialEvaluator;
  private championEvaluator: ChampionEvaluator;
  private threatEvaluator: ThreatEvaluator;

  // Evaluation weights
  private static readonly WEIGHTS = {
    material: 1.0,
    position: 0.3,
    threats: 0.4,
    safety: 0.5,
    mobility: 0.2,
  };

  constructor(private gameEngine: GameEngine) {
    this.materialEvaluator = new MaterialEvaluator();
    this.championEvaluator = new ChampionEvaluator();
    this.threatEvaluator = new ThreatEvaluator(gameEngine);
  }

  /**
   * Evaluate the position from a player's perspective
   * Positive score = good for the player
   */
  evaluate(game: Game, playerId: string): EvaluationResult {
    const opponentId = this.getOpponentId(game, playerId);
    const isBlue = game.bluePlayer === playerId;

    // Calculate individual components
    const material = this.evaluateMaterial(game, playerId, opponentId);
    const position = this.evaluatePosition(game, playerId, opponentId, isBlue);
    const threats = this.evaluateThreats(game, playerId, opponentId);
    const safety = this.evaluateSafety(game, playerId, opponentId);
    const mobility = this.evaluateMobility(game, playerId, opponentId);

    // Create breakdown
    const breakdown: EvaluationBreakdown = {
      material,
      position,
      threats,
      safety,
      mobility,
    };

    // Calculate weighted total score
    const score =
      material * PositionEvaluator.WEIGHTS.material +
      position * PositionEvaluator.WEIGHTS.position +
      threats * PositionEvaluator.WEIGHTS.threats +
      safety * PositionEvaluator.WEIGHTS.safety +
      mobility * PositionEvaluator.WEIGHTS.mobility;

    return { score, breakdown };
  }

  /**
   * Quick evaluation for search (faster, less accurate)
   */
  quickEvaluate(game: Game, playerId: string): number {
    const opponentId = this.getOpponentId(game, playerId);

    // Quick material difference
    const materialScore = this.materialEvaluator.evaluateDifference(
      game,
      playerId,
      opponentId
    );

    // Quick Poro safety check
    const playerPieces = getPlayerPieces(game, playerId);
    const opponentPieces = getPlayerPieces(game, opponentId);

    const playerPoro = playerPieces.find((p) => p.name === "Poro");
    const opponentPoro = opponentPieces.find((p) => p.name === "Poro");

    let safetyBonus = 0;
    if (!playerPoro) safetyBonus -= 10000; // We lost
    if (!opponentPoro) safetyBonus += 10000; // We won
    if (playerPoro) safetyBonus += playerPoro.stats.hp * 5;
    if (opponentPoro) safetyBonus -= opponentPoro.stats.hp * 5;

    return materialScore + safetyBonus;
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

  /**
   * Calculate positional score for a set of pieces
   */
  private calculatePositionalScore(pieces: Chess[], isBlue: boolean): number {
    let score = 0;

    for (const piece of pieces) {
      // Center control bonus (columns 3-4 are most valuable)
      const centerDistance = Math.abs(piece.position.x - 3.5);
      const centerBonus = (4 - centerDistance) * 2;
      score += centerBonus;

      // Advancement bonus (further forward = better)
      const advancement = isBlue
        ? piece.position.y
        : 7 - piece.position.y;
      score += advancement * 2;

      // Champions in attacking positions worth more
      if (!this.materialEvaluator.isMinion(piece.name) && piece.name !== "Poro") {
        score += advancement * 1.5;
      }

      // Poro should stay back
      if (piece.name === "Poro") {
        const safeRow = isBlue ? 0 : 7;
        const distanceFromSafe = Math.abs(piece.position.y - safeRow);
        score -= distanceFromSafe * 5;
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
    const ourThreats = this.threatEvaluator.evaluateThreatScore(
      game,
      playerId
    );
    const theirThreats = this.threatEvaluator.evaluateThreatScore(
      game,
      opponentId
    );
    return ourThreats - theirThreats;
  }

  /**
   * Evaluate Poro (King) safety
   */
  private evaluateSafety(
    game: Game,
    playerId: string,
    opponentId: string
  ): number {
    const ourSafety = this.calculatePoroSafety(game, playerId);
    const theirSafety = this.calculatePoroSafety(game, opponentId);
    return ourSafety - theirSafety;
  }

  /**
   * Calculate Poro safety score
   */
  private calculatePoroSafety(game: Game, playerId: string): number {
    const pieces = getPlayerPieces(game, playerId);
    const poro = pieces.find((p) => p.name === "Poro");

    if (!poro) return -10000; // Poro dead = game over

    let safety = 0;

    // HP bonus
    safety += poro.stats.hp * 3;

    // Defenders nearby bonus
    const defenders = pieces.filter(
      (p) =>
        p.name !== "Poro" &&
        p.stats.hp > 0 &&
        Math.abs(p.position.x - poro.position.x) <= 2 &&
        Math.abs(p.position.y - poro.position.y) <= 2
    );
    safety += defenders.length * 20;

    // Check if Poro is under threat
    if (this.threatEvaluator.isPoroThreatened(game, playerId)) {
      safety -= 100;
    }

    return safety;
  }

  /**
   * Evaluate mobility (number of valid actions)
   */
  private evaluateMobility(
    game: Game,
    playerId: string,
    opponentId: string
  ): number {
    const ourMobility = this.calculateMobility(game, playerId);
    const theirMobility = this.calculateMobility(game, opponentId);
    return ourMobility - theirMobility;
  }

  /**
   * Calculate mobility score
   */
  private calculateMobility(game: Game, playerId: string): number {
    const pieces = getPlayerPieces(game, playerId);
    let mobility = 0;

    for (const piece of pieces) {
      if (piece.stats.hp <= 0) continue;

      // Count valid moves
      const moves = this.gameEngine.getValidMoves(game, piece.id);
      mobility += moves.length;

      // Count valid attacks (weighted higher)
      if (!piece.cannotAttack) {
        const attacks = this.gameEngine.getValidAttacks(game, piece.id);
        mobility += attacks.length * 2;
      }

      // Count valid skill targets
      if (piece.skill && piece.skill.currentCooldown === 0) {
        const skillTargets = this.gameEngine.getValidSkillTargets(
          game,
          piece.id
        );
        mobility += skillTargets.length * 1.5;
      }
    }

    return mobility;
  }

  /**
   * Get opponent player ID
   */
  private getOpponentId(game: Game, playerId: string): string {
    return game.bluePlayer === playerId
      ? game.redPlayer!
      : game.bluePlayer!;
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
    const weWon = (isBlue && winner === "blue") || (!isBlue && winner === "red");

    return weWon ? 100000 : -100000;
  }
}
