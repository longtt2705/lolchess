import {
  EventPayload,
  Game,
  GameEngine,
  GameEvent,
  getPieceAtPosition,
} from '@lolchess/game-engine';
import { MaterialEvaluator } from '../evaluation/MaterialEvaluator';
import { PositionEvaluator } from '../evaluation/PositionEvaluator';
import { ThreatEvaluator } from '../evaluation/ThreatEvaluator';
import { SearchResult } from '../types';
import { ActionGenerator } from './ActionGenerator';

/**
 * Two-Phase Best Move Search
 *
 * Phase 1 (Positioning): Find the optimal position for pieces
 *   - Evaluate moves, Flash, and mobility skills (like Ezreal E)
 *   - Score each position by threat potential
 *
 * Phase 2 (Combat): Choose the best attack/skill from optimal position
 *   - Only evaluated if current position is already optimal or after repositioning
 */
export class BestMoveSearch {
  private nodesSearched: number = 0;
  private startTime: number = 0;
  private timeLimit: number = 5000;
  private threatEvaluator: ThreatEvaluator;

  constructor(
    private gameEngine: GameEngine,
    private evaluator: PositionEvaluator,
    private actionGenerator: ActionGenerator,
  ) {
    this.threatEvaluator = new ThreatEvaluator(gameEngine, new MaterialEvaluator());
  }

  searchV2(game: Game, playerId: string, timeLimit: number = 5000): SearchResult {
    this.nodesSearched = 0;
    this.startTime = Date.now();
    this.timeLimit = timeLimit;

    // Before searching, check if currently position is good enough
    const currentScore = this.evaluator.evaluate(game, playerId);
    if (currentScore > 500) {
      const combatResult = this.searchCombat(game, playerId);
      if (combatResult) {
        return combatResult;
      }
    }

    const allActions = this.actionGenerator.generateAll(game, playerId);
    if (allActions.length === 0) {
      return this.fallbackSearch(game, playerId);
    }
    let bestAction: EventPayload | null = allActions[0];
    let bestScore = -Infinity;

    // Check current Poro safety for escape bonus calculation
    const isBlue = game.bluePlayer === playerId;
    const poroPiece = game.board.find((p) => p.name === 'Poro' && p.blue === isBlue);
    const currentPoroSafety = poroPiece
      ? this.threatEvaluator.evaluatePositionSafety(game, poroPiece, playerId)
      : 0;

    for (const action of allActions) {
      if (this.isTimeUp()) break;

      const result = this.gameEngine.processAction(game, action);
      if (!result.success) continue;

      this.nodesSearched++;

      let score = this.evaluator.evaluate(result.game, playerId);

      // EMERGENCY ESCAPE BONUS: If Poro is under threat and this move gets it to safety
      if (
        action.event === GameEvent.MOVE_CHESS &&
        action.casterPosition &&
        poroPiece &&
        action.casterPosition.x === poroPiece.position.x &&
        action.casterPosition.y === poroPiece.position.y &&
        currentPoroSafety < -50
      ) {
        // Calculate new Poro safety after the move
        const newPoroPiece = result.game.board.find((p) => p.name === 'Poro' && p.blue === isBlue);
        if (newPoroPiece) {
          const newPoroSafety = this.threatEvaluator.evaluatePositionSafety(
            result.game,
            newPoroPiece,
            playerId,
          );

          // If Poro escapes from danger, give huge bonus
          if (newPoroSafety > currentPoroSafety + 50) {
            score += 500; // Emergency escape bonus
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }
    return {
      bestAction,
      score: bestScore,
      nodesSearched: this.nodesSearched,
      depth: 1,
      timeMs: Date.now() - this.startTime,
    };
  }

  /**
   * Two-Phase Search to find the best action
   *
   * Phase 1: Find optimal position (maximize threat potential)
   * Phase 2: Execute best combat action from that position
   */
  search(game: Game, playerId: string, timeLimit: number = 5000): SearchResult {
    this.nodesSearched = 0;
    this.startTime = Date.now();
    this.timeLimit = timeLimit;

    // Phase 1: Find optimal positioning
    const positioningResult = this.searchPositioning(game, playerId);

    // If we found a positioning action that improves our threat score
    if (positioningResult.bestAction) {
      // Check if it's a free action (Flash, summoner spells)
      if (this.actionGenerator.isFreeAction(positioningResult.bestAction)) {
        // Apply the free action and continue searching
        const result = this.gameEngine.processAction(game, positioningResult.bestAction);
        if (result.success) {
          // Recursively search from new position
          const continuedSearch = this.search(
            result.game,
            playerId,
            this.timeLimit - (Date.now() - this.startTime),
          );

          // Return the chain starting with our positioning action
          return {
            bestAction: positioningResult.bestAction,
            score: continuedSearch.score,
            nodesSearched: this.nodesSearched + continuedSearch.nodesSearched,
            depth: 1 + continuedSearch.depth,
            timeMs: Date.now() - this.startTime,
          };
        }
      }

      // Non-free positioning action (move, mobility skill) - return it
      return positioningResult;
    }

    // Phase 2: Already in optimal position, find best combat action
    const combatResult = this.searchCombat(game, playerId);
    if (!combatResult) {
      return this.fallbackSearch(game, playerId);
    }
    return {
      bestAction: combatResult.bestAction,
      score: combatResult.score,
      nodesSearched: this.nodesSearched,
      depth: 1,
      timeMs: Date.now() - this.startTime,
    };
  }

  /**
   * Phase 1: Search for the best positioning action
   * Returns the action that maximizes threat potential
   */
  private searchPositioning(game: Game, playerId: string): SearchResult {
    // Get current threat score
    const currentThreatScore = this.threatEvaluator.evaluateThreatScore(game, playerId);

    // Generate positioning actions
    const positioningActions = this.actionGenerator.generatePositioningActions(game, playerId);

    let bestAction: EventPayload | null = null;
    let bestScore = currentThreatScore;
    const bestThreatImprovement = 0;

    // Evaluate each positioning action
    for (const action of positioningActions) {
      if (this.isTimeUp()) break;

      const result = this.gameEngine.processAction(game, action);
      if (!result.success) continue;

      this.nodesSearched++;

      // Calculate threat score after positioning
      const newThreatScore = this.threatEvaluator.evaluateThreatScore(result.game, playerId);

      // Bonus for first-move shield (25% max HP for 2 turns)
      let shieldBonus = 0;
      if (action.event === GameEvent.MOVE_CHESS && action.casterPosition) {
        const piece = getPieceAtPosition(game, action.casterPosition);
        if (
          piece &&
          !piece.hasMovedBefore &&
          (piece.name === 'Melee Minion' || piece.name === 'Caster Minion') &&
          action.targetPosition
        ) {
          const deltaY = Math.abs(action.targetPosition.y - piece.position.y);
          const isForward = piece.blue
            ? action.targetPosition.y > piece.position.y
            : action.targetPosition.y < piece.position.y;

          if (deltaY === 2 && isForward) {
            // Shield value: 25% of max HP for 2 turns
            // Worth 50% of shield amount as defensive value
            shieldBonus = piece.stats.maxHp * 0.25 * 0.5;
          }
        }
      }

      // Also consider full position evaluation for tie-breaking
      const positionScore = this.evaluator.evaluate(result.game, playerId);
      const threatImprovement = newThreatScore - currentThreatScore;

      // Combine threat improvement with position evaluation and shield bonus
      const combinedScore = positionScore + threatImprovement + shieldBonus;

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestAction = action;
      }
    }

    // Only return positioning action if it improves threat potential
    // or significantly improves position
    if (bestThreatImprovement > 0 || bestScore > currentThreatScore + 50) {
      return {
        bestAction,
        score: bestScore,
        nodesSearched: this.nodesSearched,
        depth: 1,
        timeMs: Date.now() - this.startTime,
      };
    }

    // No improvement from repositioning
    return {
      bestAction: null,
      score: currentThreatScore,
      nodesSearched: this.nodesSearched,
      depth: 0,
      timeMs: Date.now() - this.startTime,
    };
  }

  /**
   * Phase 2: Search for the best combat action
   * Assumes we're already in the optimal position
   */
  private searchCombat(game: Game, playerId: string): SearchResult | null {
    const threatInfo = this.threatEvaluator.getBestThreat(game, playerId);
    if (!threatInfo) {
      return null;
    }

    // Generate combat actions
    const bestAction = this.actionGenerator.generateCombatActionFromThreat(playerId, threatInfo);

    return {
      bestAction,
      score: threatInfo.priority,
      nodesSearched: this.nodesSearched,
      depth: 1,
      timeMs: Date.now() - this.startTime,
    };
  }

  /**
   * Fallback search when no positioning or combat actions are available
   * Uses original BFS approach for utility actions (items, buffs)
   */
  private fallbackSearch(game: Game, playerId: string): SearchResult {
    const allActions = this.actionGenerator.generateAll(game, playerId);

    if (allActions.length === 0) {
      return {
        bestAction: null,
        score: this.evaluator.evaluate(game, playerId),
        nodesSearched: this.nodesSearched,
        depth: 0,
        timeMs: Date.now() - this.startTime,
      };
    }

    let bestAction: EventPayload | null = allActions[0];
    let bestScore = -Infinity;

    for (const action of allActions) {
      if (this.isTimeUp()) break;

      const result = this.gameEngine.processAction(game, action);
      if (!result.success) continue;

      this.nodesSearched++;

      const score = this.evaluator.evaluate(result.game, playerId);

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return {
      bestAction,
      score: bestScore,
      nodesSearched: this.nodesSearched,
      depth: 1,
      timeMs: Date.now() - this.startTime,
    };
  }

  private isTimeUp(): boolean {
    return Date.now() - this.startTime > this.timeLimit;
  }
}

// Kept ONLY as the self-play benchmark opponent for the AlphaBetaSearch rework.
// Remove once the new search is validated (see docs/superpowers/specs/2026-06-10-bot-minimax-rework-design.md).
export { BestMoveSearch as LegacySearch };
