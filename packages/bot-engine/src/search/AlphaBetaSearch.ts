import {
  EventPayload,
  Game,
  GameEngine,
  GameEvent,
  cloneGameState,
  getCurrentPlayerId,
  getPieceAtPosition,
} from '@lolchess/game-engine';
import { PositionEvaluator } from '../evaluation/PositionEvaluator';
import { SearchResult } from '../types';
import { ActionGenerator } from './ActionGenerator';
import { MoveOrdering } from './MoveOrdering';

const MATE_SCORE = 100000;
const ROOT_CANDIDATES = 24;
const NODE_CANDIDATES = 16;
const MIN_MOVE_CANDIDATES = 6;
const MAX_QUIESCENCE_PLIES = 4;
const MAX_FORCING_ACTIONS = 6;

export interface AlphaBetaOptions {
  /** Maximum nominal search depth in plies (board actions) */
  maxDepth: number;
  /** Hard time budget in milliseconds; the last fully completed depth wins */
  timeLimit: number;
}

/** Thrown internally when the time budget expires; caught by iterative deepening. */
class SearchTimeout extends Error {}

/**
 * Iterative-deepening minimax with alpha-beta pruning.
 *
 * - Searches board actions only (move / attack / skill). Item buys and
 *   summoner spells are decided outside the tree by BotEngine.
 * - Uses gameEngine.processAction (deep clone) as the rules oracle, so every
 *   game mechanic is honored without reimplementation.
 * - Evaluates every node from the ROOT player's perspective; opponent nodes
 *   minimize. (Equivalent to negamax given the symmetric evaluator, with
 *   fewer sign-flip pitfalls.)
 * - The search world has crits disabled (gameSettings.disableCrit) so the
 *   tree is deterministic; ThreatEvaluator prices crit as expected damage.
 */
export class AlphaBetaSearch {
  private nodesSearched = 0;
  private startTime = 0;
  private timeLimit = 0;

  constructor(
    private gameEngine: GameEngine,
    private evaluator: PositionEvaluator,
    private actionGenerator: ActionGenerator,
    private moveOrdering: MoveOrdering,
  ) {}

  search(game: Game, rootPlayerId: string, options: AlphaBetaOptions): SearchResult {
    this.nodesSearched = 0;
    this.startTime = Date.now();
    // Guard against a non-finite/non-positive budget: `elapsed > NaN` is
    // always false, which would disable checkTime entirely and let the
    // search run unbounded to maxDepth.
    this.timeLimit =
      isFinite(options.timeLimit) && options.timeLimit > 0 ? options.timeLimit : 3000;

    const root = cloneGameState(game);
    root.gameSettings = { ...root.gameSettings, disableCrit: true };

    const rootActions = this.candidateActions(root, rootPlayerId, ROOT_CANDIDATES);
    if (rootActions.length === 0) {
      return {
        bestAction: null,
        score: 0,
        nodesSearched: 0,
        depth: 0,
        timeMs: Date.now() - this.startTime,
      };
    }

    let bestAction: EventPayload | null = null;
    let bestScore = -Infinity;
    let completedDepth = 0;
    let previousBest: EventPayload | null = null;

    for (let depth = 1; depth <= options.maxDepth; depth++) {
      // Don't start a depth we likely can't finish: a depth begun past the
      // halfway mark burns the remaining budget and gets discarded anyway.
      if (Date.now() - this.startTime > this.timeLimit / 2) break;

      // Partial-iteration state, visible to the timeout handler. Root moves
      // are ordered previous-best first, so once at least one root move has
      // been fully searched at this depth, `iterBest` is the argmax over a
      // set that includes the previous depth's choice — strictly
      // better-informed than the depth-(d-1) answer. Observed in self-play
      // at 3000ms: critical moves burned the full budget starting depth 3,
      // timed out mid-iteration, discarded the work, and played the shallow
      // depth-2 move (the corner-walk blunders in seeds 1001/1019).
      const ordered = this.putFirst(rootActions, previousBest);
      let iterBest: EventPayload | null = null;
      let iterScore = -Infinity;
      let completedAny = false;

      try {
        let alpha = -Infinity;

        for (const action of ordered) {
          const result = this.gameEngine.processAction(root, action);
          if (!result.success) continue;
          this.nodesSearched++;

          const score = this.alphaBeta(result.game, depth - 1, alpha, Infinity, rootPlayerId, 1);
          completedAny = true;
          if (score > iterScore) {
            iterScore = score;
            iterBest = action;
          }
          alpha = Math.max(alpha, score);
        }

        if (iterBest) {
          bestAction = iterBest;
          bestScore = iterScore;
          completedDepth = depth;
          previousBest = iterBest;
        }

        // A forced win was found — no need to search deeper.
        if (bestScore > MATE_SCORE - 1000) break;
      } catch (e) {
        if (e instanceof SearchTimeout) {
          // Adopt the partial iteration's best if it searched at least one
          // root move to full depth (which, by ordering, includes the
          // previous best unless that move itself failed to apply).
          if (completedAny && iterBest) {
            bestAction = iterBest;
            bestScore = iterScore;
            // completedDepth intentionally NOT bumped: it reports fully
            // completed depths only.
          }
          break;
        }
        throw e;
      }
    }

    return {
      bestAction,
      score: bestScore,
      nodesSearched: this.nodesSearched,
      depth: completedDepth,
      timeMs: Date.now() - this.startTime,
    };
  }

  private alphaBeta(
    game: Game,
    depth: number,
    alpha: number,
    beta: number,
    rootPlayerId: string,
    ply: number,
  ): number {
    this.checkTime();

    const terminal = this.evaluator.getTerminalScore(game, rootPlayerId);
    if (terminal !== null) {
      // Prefer faster wins and slower losses.
      if (terminal > 0) return terminal - ply;
      if (terminal < 0) return terminal + ply;
      return 0;
    }

    if (depth === 0) {
      return this.quiescence(game, alpha, beta, rootPlayerId, ply, MAX_QUIESCENCE_PLIES);
    }

    const currentPlayer = getCurrentPlayerId(game);
    if (!currentPlayer) return this.evaluator.evaluate(game, rootPlayerId);
    const maximizing = currentPlayer === rootPlayerId;

    const actions = this.candidateActions(game, currentPlayer, NODE_CANDIDATES);
    if (actions.length === 0) {
      // No board action available: stalemate is a draw by the rules.
      return 0;
    }

    let best = maximizing ? -Infinity : Infinity;
    let anyApplied = false;

    for (const action of actions) {
      const result = this.gameEngine.processAction(game, action);
      if (!result.success) continue;
      anyApplied = true;
      this.nodesSearched++;

      const score = this.alphaBeta(result.game, depth - 1, alpha, beta, rootPlayerId, ply + 1);
      if (maximizing) {
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
      } else {
        best = Math.min(best, score);
        beta = Math.min(beta, score);
      }
      if (beta <= alpha) break;
    }

    if (!anyApplied) return this.evaluator.evaluate(game, rootPlayerId);
    return best;
  }

  /**
   * Combat extension: when nominal depth runs out, keep searching forcing
   * actions (kills and Poro attacks) so exchanges are never cut off mid-trade.
   */
  private quiescence(
    game: Game,
    alpha: number,
    beta: number,
    rootPlayerId: string,
    ply: number,
    remaining: number,
  ): number {
    this.checkTime();

    const terminal = this.evaluator.getTerminalScore(game, rootPlayerId);
    if (terminal !== null) {
      if (terminal > 0) return terminal - ply;
      if (terminal < 0) return terminal + ply;
      return 0;
    }

    const standPat = this.evaluator.evaluate(game, rootPlayerId);
    if (remaining === 0) return standPat;

    const currentPlayer = getCurrentPlayerId(game);
    if (!currentPlayer) return standPat;
    const maximizing = currentPlayer === rootPlayerId;

    if (maximizing) {
      if (standPat >= beta) return standPat;
      alpha = Math.max(alpha, standPat);
    } else {
      if (standPat <= alpha) return standPat;
      beta = Math.min(beta, standPat);
    }

    const forcing = this.forcingActions(game, currentPlayer);
    if (forcing.length === 0) return standPat;

    let best = standPat;
    for (const action of forcing) {
      const result = this.gameEngine.processAction(game, action);
      if (!result.success) continue;
      this.nodesSearched++;

      const score = this.quiescence(result.game, alpha, beta, rootPlayerId, ply + 1, remaining - 1);
      if (maximizing) {
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
      } else {
        best = Math.min(best, score);
        beta = Math.min(beta, score);
      }
      if (beta <= alpha) break;
    }
    return best;
  }

  /**
   * Board actions only, heuristically ordered, top-N expanded.
   * Forcing actions (kills, Poro attacks) are never pruned away.
   */
  private candidateActions(game: Game, playerId: string, limit: number): EventPayload[] {
    const all = this.actionGenerator
      .generateAll(game, playerId)
      .filter(
        (a) =>
          a.event === GameEvent.MOVE_CHESS ||
          a.event === GameEvent.ATTACK_CHESS ||
          a.event === GameEvent.SKILL,
      );

    const scored = this.moveOrdering.orderActions(game, all, playerId);
    const top = scored.slice(0, limit);
    const selected = new Set(top.map((s) => s.action));
    const rest = scored.slice(limit);

    // Move quota: combat actions outscore quiet moves, so a pure top-N cut
    // can starve the tree of defensive/repositioning moves. Top up with the
    // best remaining moves until the quota is met.
    let moveCount = top.filter((s) => s.action.event === GameEvent.MOVE_CHESS).length;
    if (moveCount < MIN_MOVE_CANDIDATES) {
      for (const s of rest) {
        if (moveCount >= MIN_MOVE_CANDIDATES) break;
        if (s.action.event !== GameEvent.MOVE_CHESS || selected.has(s.action)) continue;
        top.push(s);
        selected.add(s.action);
        moveCount++;
      }
    }

    // Forcing actions (kills, Poro attacks) and own-Poro moves are never
    // pruned away. Poro escape moves order terribly (backward, toward the
    // edge) so the top-N cut starves them — leaving the search literally
    // unable to walk its king out of a mating attack.
    for (const s of rest) {
      if (selected.has(s.action)) continue;
      if (s.isKiller || this.targetsPoro(game, s.action) || this.movesOwnPoro(game, s.action)) {
        top.push(s);
        selected.add(s.action);
      }
    }
    return top.map((s) => s.action);
  }

  /** True when the action moves the acting player's own Poro (king safety). */
  private movesOwnPoro(game: Game, action: EventPayload): boolean {
    if (action.event !== GameEvent.MOVE_CHESS || !action.casterPosition) {
      return false;
    }
    const caster = getPieceAtPosition(game, action.casterPosition);
    return !!caster && caster.name === 'Poro';
  }

  private forcingActions(game: Game, playerId: string): EventPayload[] {
    const combat = this.actionGenerator
      .generateAll(game, playerId)
      .filter((a) => a.event === GameEvent.ATTACK_CHESS || a.event === GameEvent.SKILL);
    const scored = this.moveOrdering.orderActions(game, combat, playerId);
    return scored
      .filter((s) => s.isKiller || this.targetsPoro(game, s.action))
      .slice(0, MAX_FORCING_ACTIONS)
      .map((s) => s.action);
  }

  private targetsPoro(game: Game, action: EventPayload): boolean {
    if (!action.targetPosition) return false;
    const target = getPieceAtPosition(game, action.targetPosition);
    return !!target && target.name === 'Poro';
  }

  private putFirst(actions: EventPayload[], first: EventPayload | null): EventPayload[] {
    // Always return a copy so callers never alias the cached root array.
    if (!first) return [...actions];
    const rest = actions.filter((a) => a !== first);
    return rest.length === actions.length ? actions : [first, ...rest];
  }

  private checkTime(): void {
    if (Date.now() - this.startTime > this.timeLimit) {
      throw new SearchTimeout();
    }
  }
}
