import {
  Game,
  EventPayload,
  GameEvent,
  GameEngine,
  ChessFactory,
  getPieceAtPosition,
} from '@lolchess/game-engine';
import { ScoredAction } from '../types';
import { ThreatEvaluator } from '../evaluation/ThreatEvaluator';

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
  constructor(
    private threatEvaluator: ThreatEvaluator,
    private gameEngine?: GameEngine,
  ) {}

  /**
   * Order combat actions by priority
   * Priority: Poro attacks > Kills > Low HP targets > High value targets
   */
  orderCombatActions(game: Game, actions: EventPayload[], playerId: string): ScoredAction[] {
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
    playerId: string,
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
            if (target.name === 'Poro') {
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
              if (target.name === 'Poro') {
                score += 500;
              }

              // Priority 2: Killing skills — mark as killer so quiescence
              // extends skill-kills the same way it extends attack-kills.
              // Skill value estimation can throw for exotic skills, so keep
              // the un-augmented score on error.
              if (action.casterPosition) {
                try {
                  const caster = getPieceAtPosition(game, action.casterPosition);
                  if (caster) {
                    const skillValue = ChessFactory.createChess(caster, game).getActiveSkillValue(
                      action.targetPosition,
                    );
                    if (target.stats.hp <= skillValue) {
                      isKiller = true;
                      score += 500 + (target.stats.goldValue || 0);
                    }
                  }
                } catch {
                  // ignore — fall back to the base score
                }
              }

              // Priority 3: Low HP enemies
              const hpPercent = target.stats.hp / target.stats.maxHp;
              score += (1 - hpPercent) * 40;

              // Priority 4: High value targets
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
  orderActions(game: Game, actions: EventPayload[], playerId: string): ScoredAction[] {
    const scored: ScoredAction[] = [];

    // Danger map for escape-aware move ordering. Without it, move scores are
    // pure forward/center bias, so retreats of pieces standing in enemy fire
    // order at the bottom and get pruned out of the candidate set — the
    // search literally cannot save a threatened piece. Built lazily: only
    // when there are moves to score and an engine is available.
    const dangerMap =
      this.gameEngine && actions.some((a) => a.event === GameEvent.MOVE_CHESS)
        ? this.buildDangerMap(game, playerId)
        : null;

    for (const action of actions) {
      let score: { score: number; isKiller: boolean; isCapture: boolean };

      if (action.event === GameEvent.ATTACK_CHESS || action.event === GameEvent.SKILL) {
        score = this.scoreCombatAction(game, action, playerId);
      } else {
        score = this.scoreNonCombatAction(game, action, playerId);
        if (dangerMap && action.event === GameEvent.MOVE_CHESS) {
          score.score += this.escapeScore(game, action, dangerMap);
        }
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
   * Sum of rough enemy damage reaching each square right now.
   * Damage estimate is stat-based (AD + AP/2) — this is an ordering
   * heuristic, not an evaluation; exactness doesn't pay for itself here.
   */
  private buildDangerMap(game: Game, playerId: string): Map<string, number> {
    const map = new Map<string, number>();
    const isBlue = game.bluePlayer === playerId;

    for (const enemy of game.board) {
      if (enemy.stats.hp <= 0) continue;
      if (enemy.blue === isBlue) continue;
      if (enemy.cannotAttack) continue;

      const dmg = (enemy.stats.ad || 0) + (enemy.stats.ap || 0) * 0.5;
      if (dmg <= 0) continue;

      for (const pos of this.gameEngine!.getValidAttacks(game, enemy.id)) {
        const key = `${pos.x},${pos.y}`;
        map.set(key, (map.get(key) || 0) + dmg);
      }
    }
    return map;
  }

  /**
   * Score the danger differential of a move: leaving fire is good, walking
   * into it is bad, and escaping (or entering) lethal danger dominates the
   * quiet-move scale so such moves survive the candidate cut.
   */
  private escapeScore(game: Game, action: EventPayload, dangerMap: Map<string, number>): number {
    if (!action.casterPosition || !action.targetPosition) return 0;
    const piece = getPieceAtPosition(game, action.casterPosition);
    if (!piece) return 0;

    const hp = piece.stats.hp;
    const dSrc = dangerMap.get(`${action.casterPosition.x},${action.casterPosition.y}`) ?? 0;
    const dDst = dangerMap.get(`${action.targetPosition.x},${action.targetPosition.y}`) ?? 0;

    let score = Math.min(dSrc, hp) - Math.min(dDst, hp);
    if (dSrc >= hp && dDst < hp) score += 250; // escapes lethal danger
    if (dDst >= hp && dSrc < hp) score -= 250; // steps into lethal danger
    return score;
  }

  /**
   * Score non-combat actions (moves, items, utility spells)
   */
  private scoreNonCombatAction(
    game: Game,
    action: EventPayload,
    playerId: string,
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
  getKillerMoves(game: Game, actions: EventPayload[], playerId: string): ScoredAction[] {
    const ordered = this.orderCombatActions(game, actions, playerId);
    return ordered.filter((a) => a.isKiller);
  }

  /**
   * Get capture moves (attacks and enemy-targeting skills)
   */
  getCaptureMoves(game: Game, actions: EventPayload[], playerId: string): ScoredAction[] {
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
    n: number,
  ): ScoredAction[] {
    const ordered = this.orderCombatActions(game, actions, playerId);
    return ordered.slice(0, n);
  }

  /**
   * Get top N moves (legacy support)
   */
  getTopMoves(game: Game, actions: EventPayload[], playerId: string, n: number): ScoredAction[] {
    const ordered = this.orderActions(game, actions, playerId);
    return ordered.slice(0, n);
  }
}
