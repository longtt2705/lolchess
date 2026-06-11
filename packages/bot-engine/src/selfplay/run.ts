/**
 * Self-play harness: new AlphaBeta bot vs legacy greedy bot.
 *
 * Usage (after building game-engine and bot-engine):
 *   npm run selfplay --workspace=packages/bot-engine            # default 10 games
 *   npm run selfplay --workspace=packages/bot-engine -- 30      # 30 games
 *   npm run selfplay --workspace=packages/bot-engine -- 30 5000 # 30 games, 5s/move
 *
 * Acceptance gate from the spec: new bot wins >= 80% of decided games.
 */
import { GameEngine, Game, getCurrentPlayerId, GameEvent } from "@lolchess/game-engine";
import { BotEngine } from "../BotEngine";

const CHAMPS = ["Garen", "Ahri", "Ashe", "Aatrox", "Janna"];
const BLUE_ID = "blue-bot";
const RED_ID = "red-bot";
const MAX_ROUNDS = 400; // 200 turns each, then declared a draw
const MAX_ACTIONS_PER_TURN = 6; // free actions safety valve

type Outcome = "new" | "legacy" | "draw" | "error";

interface GameRecord {
  seed: number;
  newIsBlue: boolean;
  outcome: Outcome;
  rounds: number;
  avgNewMoveMs: number;
}

function playGame(seed: number, newIsBlue: boolean, timeLimit: number): GameRecord {
  const engine = new GameEngine();
  const newBot = new BotEngine({ difficulty: "expert", timeLimit });
  const legacyBot = new BotEngine({ difficulty: "expert", timeLimit, engine: "legacy" });

  let game: Game = engine.createGame({
    seed,
    bluePlayerId: BLUE_ID,
    redPlayerId: RED_ID,
    blueChampions: CHAMPS,
    redChampions: CHAMPS,
    startingGold: 100,
  });

  const bots: Record<string, BotEngine> = {
    [BLUE_ID]: newIsBlue ? newBot : legacyBot,
    [RED_ID]: newIsBlue ? legacyBot : newBot,
  };
  const newBotId = newIsBlue ? BLUE_ID : RED_ID;

  const newMoveTimes: number[] = [];
  let actionsThisRound = 0;
  let lastRound = game.currentRound;

  while (!engine.isGameOver(game) && game.currentRound <= MAX_ROUNDS) {
    const pid = getCurrentPlayerId(game);
    if (!pid) break;

    if (game.currentRound !== lastRound) {
      lastRound = game.currentRound;
      actionsThisRound = 0;
    }
    actionsThisRound++;

    let action;
    const t0 = Date.now();
    try {
      action = bots[pid].getAction(game, pid);
    } catch (e) {
      console.error(`  [seed ${seed}] bot ${pid} threw:`, e);
      return record(seed, newIsBlue, "error", game, newMoveTimes);
    }
    if (pid === newBotId) newMoveTimes.push(Date.now() - t0);

    // Safety valve: if a bot loops on free actions, force a board action.
    if (actionsThisRound > MAX_ACTIONS_PER_TURN || !action) {
      const fallback = bots[pid]
        .getAllActions(game, pid)
        .find(
          (a) =>
            a.event === GameEvent.MOVE_CHESS ||
            a.event === GameEvent.ATTACK_CHESS ||
            a.event === GameEvent.SKILL
        );
      if (!fallback) {
        // No board action at all: stalemate -> draw
        return record(seed, newIsBlue, "draw", game, newMoveTimes);
      }
      action = fallback;
    }

    const result = engine.processAction(game, action);
    if (!result.success) {
      console.error(`  [seed ${seed}] illegal action by ${pid}: ${result.error}`, JSON.stringify(action));
      return record(seed, newIsBlue, "error", game, newMoveTimes);
    }
    game = result.game;
  }

  if (!engine.isGameOver(game)) {
    return record(seed, newIsBlue, "draw", game, newMoveTimes);
  }

  const winner = engine.getWinner(game); // "blue" | "red" | null
  if (winner === null || winner === undefined) {
    return record(seed, newIsBlue, "draw", game, newMoveTimes);
  }
  const newWon = (winner === "blue") === newIsBlue;
  return record(seed, newIsBlue, newWon ? "new" : "legacy", game, newMoveTimes);
}

function record(
  seed: number,
  newIsBlue: boolean,
  outcome: Outcome,
  game: Game,
  newMoveTimes: number[]
): GameRecord {
  const avg =
    newMoveTimes.length > 0
      ? newMoveTimes.reduce((a, b) => a + b, 0) / newMoveTimes.length
      : 0;
  return {
    seed,
    newIsBlue,
    outcome,
    rounds: game.currentRound,
    avgNewMoveMs: Math.round(avg),
  };
}

function main() {
  const numGames = parseInt(process.argv[2] ?? "10", 10);
  const timeLimit = parseInt(process.argv[3] ?? "3000", 10);
  const records: GameRecord[] = [];

  console.log(`Self-play: ${numGames} games, ${timeLimit}ms/move, new(alphabeta) vs legacy(greedy)\n`);

  for (let i = 0; i < numGames; i++) {
    const seed = 1000 + i;
    const newIsBlue = i % 2 === 0; // alternate colors
    const t0 = Date.now();
    const rec = playGame(seed, newIsBlue, timeLimit);
    records.push(rec);
    console.log(
      `game ${i + 1}/${numGames} seed=${seed} new=${newIsBlue ? "blue" : "red"} -> ` +
        `${rec.outcome.toUpperCase()} in ${rec.rounds} rounds ` +
        `(avg new-bot move ${rec.avgNewMoveMs}ms, game took ${Math.round((Date.now() - t0) / 1000)}s)`
    );
  }

  const wins = records.filter((r) => r.outcome === "new").length;
  const losses = records.filter((r) => r.outcome === "legacy").length;
  const draws = records.filter((r) => r.outcome === "draw").length;
  const errors = records.filter((r) => r.outcome === "error").length;
  const decided = wins + losses;
  const winRate = decided > 0 ? ((wins / decided) * 100).toFixed(1) : "n/a";

  console.log(`\n=== RESULTS ===`);
  console.log(`new bot:    ${wins} wins`);
  console.log(`legacy bot: ${losses} wins`);
  console.log(`draws:      ${draws}, errors: ${errors}`);
  console.log(`win rate (decided games): ${winRate}%  (acceptance gate: >= 80%)`);

  if (errors > 0) process.exitCode = 2;
}

main();
