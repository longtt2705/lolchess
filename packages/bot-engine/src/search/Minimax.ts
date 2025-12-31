import {
  Game,
  GameEngine,
  EventPayload,
  cloneGameState,
} from "@lolchess/game-engine";
import { SearchResult, ScoredAction } from "../types";
import { PositionEvaluator } from "../evaluation/PositionEvaluator";
import { ActionGenerator } from "./ActionGenerator";
import { MoveOrdering } from "./MoveOrdering";
import { ThreatEvaluator } from "../evaluation/ThreatEvaluator";

/**
 * Minimax search with alpha-beta pruning
 * Finds the best move by looking ahead
 */
export class Minimax {
  private moveOrdering: MoveOrdering;
  private nodesSearched: number = 0;
  private startTime: number = 0;
  private timeLimit: number = 5000; // Default 5 second limit

  constructor(
    private gameEngine: GameEngine,
    private evaluator: PositionEvaluator,
    private actionGenerator: ActionGenerator
  ) {
    const threatEvaluator = new ThreatEvaluator(gameEngine);
    this.moveOrdering = new MoveOrdering(threatEvaluator);
  }

  /**
   * Search for the best move
   */
  search(
    game: Game,
    playerId: string,
    depth: number,
    timeLimit?: number
  ): SearchResult {
    this.nodesSearched = 0;
    this.startTime = Date.now();
    this.timeLimit = timeLimit || 5000;

    const actions = this.actionGenerator.generateAll(game, playerId);
    if (actions.length === 0) {
      return {
        bestAction: null,
        score: 0,
        nodesSearched: 0,
        depth: 0,
        timeMs: 0,
      };
    }

    // Order moves for better pruning
    const orderedActions = this.moveOrdering.orderActions(
      game,
      actions,
      playerId
    );

    let bestAction = orderedActions[0].action;
    let bestScore = -Infinity;
    const alpha = -Infinity;
    const beta = Infinity;

    for (const { action } of orderedActions) {
      // Time check
      if (this.isTimeUp()) break;

      // Simulate the action
      const result = this.gameEngine.processAction(game, action);
      if (!result.success) continue;

      // Evaluate resulting position
      const score = this.minimax(
        result.game,
        depth - 1,
        alpha,
        beta,
        false, // Next move is opponent's
        playerId
      );

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return {
      bestAction,
      score: bestScore,
      nodesSearched: this.nodesSearched,
      depth,
      timeMs: Date.now() - this.startTime,
    };
  }

  /**
   * Minimax with alpha-beta pruning
   */
  private minimax(
    game: Game,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    originalPlayerId: string
  ): number {
    this.nodesSearched++;

    // Check for terminal state
    const terminalScore = this.evaluator.getTerminalScore(
      game,
      originalPlayerId
    );
    if (terminalScore !== null) {
      return terminalScore;
    }

    // Depth limit or time limit reached
    if (depth <= 0 || this.isTimeUp()) {
      return this.evaluator.quickEvaluate(game, originalPlayerId);
    }

    // Determine current player
    const currentPlayerId = this.getCurrentPlayer(game);
    if (!currentPlayerId) {
      return this.evaluator.quickEvaluate(game, originalPlayerId);
    }

    const actions = this.actionGenerator.generateAll(game, currentPlayerId);
    if (actions.length === 0) {
      return this.evaluator.quickEvaluate(game, originalPlayerId);
    }

    // Order moves for better pruning
    const orderedActions = this.moveOrdering.orderActions(
      game,
      actions,
      currentPlayerId
    );

    if (isMaximizing) {
      let maxEval = -Infinity;

      for (const { action } of orderedActions) {
        if (this.isTimeUp()) break;

        const result = this.gameEngine.processAction(game, action);
        if (!result.success) continue;

        const evaluation = this.minimax(
          result.game,
          depth - 1,
          alpha,
          beta,
          false,
          originalPlayerId
        );

        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);

        if (beta <= alpha) break; // Beta cutoff
      }

      return maxEval;
    } else {
      let minEval = Infinity;

      for (const { action } of orderedActions) {
        if (this.isTimeUp()) break;

        const result = this.gameEngine.processAction(game, action);
        if (!result.success) continue;

        const evaluation = this.minimax(
          result.game,
          depth - 1,
          alpha,
          beta,
          true,
          originalPlayerId
        );

        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);

        if (beta <= alpha) break; // Alpha cutoff
      }

      return minEval;
    }
  }

  /**
   * Iterative deepening search
   * Searches deeper progressively until time runs out
   */
  iterativeDeepening(
    game: Game,
    playerId: string,
    maxDepth: number,
    timeLimit: number
  ): SearchResult {
    this.startTime = Date.now();
    this.timeLimit = timeLimit;

    let bestResult: SearchResult = {
      bestAction: null,
      score: 0,
      nodesSearched: 0,
      depth: 0,
      timeMs: 0,
    };

    for (let depth = 1; depth <= maxDepth; depth++) {
      if (this.isTimeUp()) break;

      const result = this.search(game, playerId, depth, timeLimit);

      // Only use result if search completed or found something
      if (result.bestAction) {
        bestResult = result;
      }

      // If we found a winning move, stop searching
      if (result.score > 50000) break;
    }

    return bestResult;
  }

  /**
   * Quiescence search - extend search for tactical positions
   * Only considers captures to avoid horizon effect
   */
  quiescenceSearch(
    game: Game,
    alpha: number,
    beta: number,
    playerId: string
  ): number {
    this.nodesSearched++;

    // Stand-pat evaluation
    const standPat = this.evaluator.quickEvaluate(game, playerId);

    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;

    // Only consider captures
    const captures = this.actionGenerator.generateAttacks(game, playerId);
    if (captures.length === 0) return standPat;

    const orderedCaptures = this.moveOrdering.getCaptureMoves(
      game,
      captures,
      playerId
    );

    for (const { action } of orderedCaptures) {
      if (this.isTimeUp()) break;

      const result = this.gameEngine.processAction(game, action);
      if (!result.success) continue;

      const score = -this.quiescenceSearch(result.game, -beta, -alpha, playerId);

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }

    return alpha;
  }

  /**
   * Get current player from game state
   */
  private getCurrentPlayer(game: Game): string | undefined {
    return this.gameEngine.getCurrentPlayer(game);
  }

  /**
   * Check if time limit exceeded
   */
  private isTimeUp(): boolean {
    return Date.now() - this.startTime > this.timeLimit;
  }
}
