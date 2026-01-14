import { EventPayload, Game, GameEngine } from "@lolchess/game-engine";
import { PositionEvaluator } from "../evaluation/PositionEvaluator";
import { ScoredAction, SearchResult } from "../types";
import { ActionGenerator } from "./ActionGenerator";

interface SearchNode {
  game: Game;
  rootAction: EventPayload | null; // The action that started this chain
  depth: number;
}

export class BestMoveSearch {
  private nodesSearched: number = 0;
  private startTime: number = 0;
  private timeLimit: number = 5000;

  constructor(
    private gameEngine: GameEngine,
    private evaluator: PositionEvaluator,
    private actionGenerator: ActionGenerator
  ) {}

  /**
   * BFS Search to find the sequence of actions within ONE turn
   * that results in the highest board evaluation.
   */
  search(game: Game, playerId: string, timeLimit: number = 5000): SearchResult {
    this.nodesSearched = 0;
    this.startTime = Date.now();
    this.timeLimit = timeLimit;

    // 1. Setup BFS Queue
    const queue: SearchNode[] = [];

    // Push initial state
    queue.push({
      game: game,
      rootAction: null,
      depth: 0,
    });

    let bestAction: EventPayload | null = null;
    let maxScore = -Infinity;

    // 2. BFS Loop
    while (queue.length > 0) {
      // Time Check
      if (this.isTimeUp()) break;

      const currentNode = queue.shift()!;
      const { game: currentGame, rootAction, depth } = currentNode;

      // 3. Generate all possible actions for this state
      const actions = this.actionGenerator.generateAll(currentGame, playerId);

      // If no actions (stuck/stunned), evaluate what we have
      if (actions.length === 0 && rootAction) {
        const score = this.evaluator.evaluate(currentGame, playerId);
        if (score > maxScore) {
          maxScore = score;
          bestAction = rootAction;
        }
        continue;
      }

      // 4. Process all actions
      for (const scoredAction of actions) {
        // Optimization: Skip obviously bad moves if needed
        // if (scoredAction.score < -1000) continue;

        const action = scoredAction;
        const processResult = this.gameEngine.processAction(
          currentGame,
          action
        );

        if (!processResult.success) continue;

        const nextGame = processResult.game;
        this.nodesSearched++;

        // Calculate Score immediately for this state
        // We use evaluate(bot) - evaluate(player) inside the evaluator
        const score = this.evaluator.evaluate(nextGame, playerId);

        // Keep track if this is the best state seen so far
        // The action to return is the ROOT action that started this chain
        const currentRootAction = rootAction || action;

        if (score > maxScore) {
          maxScore = score;
          bestAction = currentRootAction;
        }

        // 5. Handling "Free" Actions (Flash, Buffs)
        // If it is STILL our turn in the next state, we must enqueue it
        // to see what we can do *after* this free action.
        if (this.gameEngine.getCurrentPlayer(nextGame) === playerId) {
          queue.push({
            game: nextGame,
            rootAction: currentRootAction,
            depth: depth + 1,
          });
        }
        // If turn ended, we stop this branch (we don't predict opponent moves in this BFS)
      }
    }

    return {
      bestAction: bestAction,
      score: maxScore,
      nodesSearched: this.nodesSearched,
      depth: 1, // Conceptually depth 1 (our turn), though technically variable steps
      timeMs: Date.now() - this.startTime,
    };
  }

  private isTimeUp(): boolean {
    return Date.now() - this.startTime > this.timeLimit;
  }
}
