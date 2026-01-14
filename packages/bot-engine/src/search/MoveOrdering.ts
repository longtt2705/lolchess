import {
  Game,
  EventPayload,
  GameEvent,
  getPieceAtPosition,
} from "@lolchess/game-engine";
import { ScoredAction } from "../types";
import { ThreatEvaluator } from "../evaluation/ThreatEvaluator";

/**
 * Orders combat actions for efficient search
 *
 * With two-phase search, this class focuses on ordering combat actions:
 * - Attacks (prioritized by kill potential, target value)
 * - Damage skills (prioritized by enemy targeting, Poro priority)
 *
 * Better ordering = more pruning in alpha-beta = faster search
 */
export class MoveOrdering {
  constructor(private threatEvaluator: ThreatEvaluator) { }

  /**
   * Order combat actions by priority
   * Priority: Poro attacks > Kills > Low HP targets > High value targets
   */
  orderCombatActions(
    game: Game,
    actions: EventPayload[],
    playerId: string
  ): ScoredAction[] {
    const scored: ScoredAction[] = [];

    for (const action of actions) {
      const score = this.scoreCombatAction(game, action, playerId);
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
   * Score a combat action for ordering
   */
  private scoreCombatAction(
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
        score += 100; // Base attack priority

        if (action.targetPosition && action.casterPosition) {
          const target = getPieceAtPosition(game, action.targetPosition);
          const caster = getPieceAtPosition(game, action.casterPosition);

          if (target && caster) {
            // Priority 1: Attacking Poro (win condition)
            if (target.name === "Poro") {
              score += 1000;
            }

            // Priority 2: Killing moves
            const damage = this.threatEvaluator.calculateDamage(caster, target);
            if (target.stats.hp <= damage) {
              isKiller = true;
              score += 500 + (target.stats.goldValue || 0);
            }

            // Priority 3: Low HP targets (easier to finish off later)
            const hpPercent = target.stats.hp / target.stats.maxHp;
            score += (1 - hpPercent) * 50;

            // Priority 4: High value targets
            score += (target.stats.goldValue || 0) * 0.5;
          }
        }
        break;
      }

      case GameEvent.SKILL: {
        score += 80; // Base skill priority

        if (action.targetPosition) {
          const target = getPieceAtPosition(game, action.targetPosition);
          if (target) {
            const isBlue = game.bluePlayer === playerId;
            const isEnemy = target.blue !== isBlue;

            if (isEnemy) {
              isCapture = true;
              score += 30;

              // Priority 1: Skills targeting Poro
              if (target.name === "Poro") {
                score += 500;
              }

              // Priority 2: Low HP enemies
              const hpPercent = target.stats.hp / target.stats.maxHp;
              score += (1 - hpPercent) * 40;

              // Priority 3: High value targets
              score += (target.stats.goldValue || 0) * 0.3;
            }
          }
        }
        break;
      }

      default:
        // Non-combat actions get lowest priority
        score = 0;
        break;
    }

    return { score, isKiller, isCapture };
  }

  /**
   * Order all actions (legacy support)
   * Delegates to specialized ordering based on action type
   */
  orderActions(
    game: Game,
    actions: EventPayload[],
    playerId: string
  ): ScoredAction[] {
    const scored: ScoredAction[] = [];

    for (const action of actions) {
      let score: { score: number; isKiller: boolean; isCapture: boolean };

      if (
        action.event === GameEvent.ATTACK_CHESS ||
        action.event === GameEvent.SKILL
      ) {
        score = this.scoreCombatAction(game, action, playerId);
      } else {
        score = this.scoreNonCombatAction(game, action, playerId);
      }

      scored.push({
        action,
        score: score.score,
        isKiller: score.isKiller,
        isCapture: score.isCapture,
      });
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Score non-combat actions (moves, items, utility spells)
   */
  private scoreNonCombatAction(
    game: Game,
    action: EventPayload,
    playerId: string
  ): { score: number; isKiller: boolean; isCapture: boolean } {
    let score = 0;

    switch (action.event) {
      case GameEvent.MOVE_CHESS: {
        score += 20; // Base move score

        if (action.casterPosition && action.targetPosition) {
          const isBlue = game.bluePlayer === playerId;

          // Forward moves are slightly better
          const dy = action.targetPosition.y - action.casterPosition.y;
          const isForward = isBlue ? dy > 0 : dy < 0;
          if (isForward) {
            score += 10;
          }

          // Center moves are slightly better
          const centerDistance = Math.abs(action.targetPosition.x - 3.5);
          score += (4 - centerDistance) * 2;
        }
        break;
      }

      case GameEvent.USE_SUMMONER_SPELL: {
        // Summoner spells get moderate priority
        score += 30;
        break;
      }

      case GameEvent.BUY_ITEM: {
        // Items are low priority in search
        score += 10;
        break;
      }
    }

    return { score, isKiller: false, isCapture: false };
  }

  /**
   * Get only killer moves (attacks that can kill)
   */
  getKillerMoves(
    game: Game,
    actions: EventPayload[],
    playerId: string
  ): ScoredAction[] {
    const ordered = this.orderCombatActions(game, actions, playerId);
    return ordered.filter((a) => a.isKiller);
  }

  /**
   * Get capture moves (attacks and enemy-targeting skills)
   */
  getCaptureMoves(
    game: Game,
    actions: EventPayload[],
    playerId: string
  ): ScoredAction[] {
    const ordered = this.orderCombatActions(game, actions, playerId);
    return ordered.filter((a) => a.isCapture);
  }

  /**
   * Get top N combat moves
   */
  getTopCombatMoves(
    game: Game,
    actions: EventPayload[],
    playerId: string,
    n: number
  ): ScoredAction[] {
    const ordered = this.orderCombatActions(game, actions, playerId);
    return ordered.slice(0, n);
  }

  /**
   * Get top N moves (legacy support)
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
