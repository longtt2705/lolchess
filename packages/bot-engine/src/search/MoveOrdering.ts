import {
  Game,
  EventPayload,
  GameEvent,
  getPieceAtPosition,
} from "@lolchess/game-engine";
import { ScoredAction } from "../types";
import { ThreatEvaluator } from "../evaluation/ThreatEvaluator";

/**
 * Orders moves to improve search efficiency
 * Better move ordering = more alpha-beta pruning = faster search
 */
export class MoveOrdering {
  constructor(private threatEvaluator: ThreatEvaluator) {}

  /**
   * Order actions by priority for better pruning
   * Killer moves (captures, checks) should be searched first
   */
  orderActions(
    game: Game,
    actions: EventPayload[],
    playerId: string
  ): ScoredAction[] {
    const scored: ScoredAction[] = [];

    for (const action of actions) {
      const score = this.scoreAction(game, action, playerId);
      scored.push({
        action,
        score: score.score,
        isKiller: score.isKiller,
        isCapture: score.isCapture,
      });
    }

    // Sort by score (highest first)
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Score an action for ordering
   */
  private scoreAction(
    game: Game,
    action: EventPayload,
    playerId: string
  ): { score: number; isKiller: boolean; isCapture: boolean } {
    let score = 0;
    let isKiller = false;
    let isCapture = false;

    switch (action.event) {
      case GameEvent.ATTACK_CHESS: {
        isCapture = true;
        score += 100; // Attacks are high priority

        if (action.targetPosition) {
          const target = getPieceAtPosition(game, action.targetPosition);
          if (target) {
            // Killing moves are best
            const caster = action.casterPosition
              ? getPieceAtPosition(game, action.casterPosition)
              : null;
            if (caster) {
              const damage = this.threatEvaluator.calculateDamage(
                caster,
                target
              );
              if (target.stats.hp <= damage) {
                isKiller = true;
                score += 500 + (target.stats.goldValue || 0);
              }
            }

            // Attacking Poro is extremely high priority
            if (target.name === "Poro") {
              score += 1000;
            }

            // Low HP targets are better
            const hpPercent = target.stats.hp / target.stats.maxHp;
            score += (1 - hpPercent) * 50;

            // Higher value targets are better
            score += (target.stats.goldValue || 0) * 0.5;
          }
        }
        break;
      }

      case GameEvent.SKILL: {
        score += 80; // Skills are usually good

        if (action.targetPosition) {
          const target = getPieceAtPosition(game, action.targetPosition);
          if (target) {
            // Targeting enemies
            const isBlue = game.bluePlayer === playerId;
            const isEnemy = target.blue !== isBlue;

            if (isEnemy) {
              score += 30;
              if (target.name === "Poro") {
                score += 200;
              }
            }
          }
        }
        break;
      }

      case GameEvent.MOVE_CHESS: {
        score += 20; // Base move score

        if (action.casterPosition && action.targetPosition) {
          const isBlue = game.bluePlayer === playerId;

          // Forward moves are better
          const dy = action.targetPosition.y - action.casterPosition.y;
          const isForward = isBlue ? dy > 0 : dy < 0;
          if (isForward) {
            score += 15;
          }

          // Center moves are better
          const centerDistance = Math.abs(action.targetPosition.x - 3.5);
          score += (4 - centerDistance) * 2;
        }
        break;
      }

      case GameEvent.BUY_ITEM: {
        // Items are lower priority in search (usually evaluated separately)
        score += 10;
        break;
      }
    }

    return { score, isKiller, isCapture };
  }

  /**
   * Get only killer moves (attacks that can capture)
   */
  getKillerMoves(
    game: Game,
    actions: EventPayload[],
    playerId: string
  ): ScoredAction[] {
    const ordered = this.orderActions(game, actions, playerId);
    return ordered.filter((a) => a.isKiller);
  }

  /**
   * Get capture moves
   */
  getCaptureMoves(
    game: Game,
    actions: EventPayload[],
    playerId: string
  ): ScoredAction[] {
    const ordered = this.orderActions(game, actions, playerId);
    return ordered.filter((a) => a.isCapture);
  }

  /**
   * Get top N moves
   */
  getTopMoves(
    game: Game,
    actions: EventPayload[],
    playerId: string,
    n: number
  ): ScoredAction[] {
    const ordered = this.orderActions(game, actions, playerId);
    return ordered.slice(0, n);
  }
}
