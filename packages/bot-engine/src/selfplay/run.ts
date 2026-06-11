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
  maxNewMoveMs: number;
  /** Wall-clock ms not backed by monotonic time (process was suspended). */
  suspendedMs: number;
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
  let suspendedMs = 0;
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
    // Wall vs monotonic clock: Date.now() keeps advancing while the process
    // is suspended (system sleep / SIGSTOP) but performance.now() does not.
    // A move whose wall time far exceeds its monotonic time was stalled by
    // the environment, not by the bot.
    const t0 = Date.now();
    const m0 = performance.now();
    try {
      action = bots[pid].getAction(game, pid);
    } catch (e) {
      console.error(`  [seed ${seed}] bot ${pid} threw:`, e);
      return record(seed, newIsBlue, "error", game, newMoveTimes, suspendedMs);
    }
    const wallMs = Date.now() - t0;
    const monoMs = performance.now() - m0;
    if (wallMs - monoMs > 500) {
      suspendedMs += wallMs - monoMs;
      console.error(
        `  [seed ${seed}] process suspension detected during ${pid} move: ` +
          `wall=${wallMs}ms mono=${Math.round(monoMs)}ms`
      );
    }
    if (pid === newBotId) newMoveTimes.push(Math.round(monoMs));
    if (monoMs > timeLimit * 1.5) {
      console.error(
        `  [seed ${seed}] SLOW MOVE by ${pid}: mono=${Math.round(monoMs)}ms ` +
          `(budget ${timeLimit}ms) round=${game.currentRound}`
      );
    }

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
        return record(seed, newIsBlue, "draw", game, newMoveTimes, suspendedMs);
      }
      action = fallback;
    }

    const result = engine.processAction(game, action);
    if (!result.success) {
      console.error(`  [seed ${seed}] illegal action by ${pid}: ${result.error}`, JSON.stringify(action));
      return record(seed, newIsBlue, "error", game, newMoveTimes, suspendedMs);
    }
    game = result.game;
  }

  if (!engine.isGameOver(game)) {
    return record(seed, newIsBlue, "draw", game, newMoveTimes, suspendedMs);
  }

  const winner = engine.getWinner(game); // "blue" | "red" | null
  if (winner === null || winner === undefined) {
    return record(seed, newIsBlue, "draw", game, newMoveTimes, suspendedMs);
  }
  const newWon = (winner === "blue") === newIsBlue;
  return record(seed, newIsBlue, newWon ? "new" : "legacy", game, newMoveTimes, suspendedMs);
}

function record(
  seed: number,
  newIsBlue: boolean,
  outcome: Outcome,
  game: Game,
  newMoveTimes: number[],
  suspendedMs: number
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
    maxNewMoveMs: newMoveTimes.length > 0 ? Math.max(...newMoveTimes) : 0,
    suspendedMs: Math.round(suspendedMs),
  };
}

function main() {
  const numGames = parseInt(process.argv[2] ?? "10", 10);
  const timeLimitArg = parseInt(process.argv[3] ?? "3000", 10);
  // A NaN time limit would silently disable every time check downstream.
  const timeLimit =
    isFinite(timeLimitArg) && timeLimitArg > 0 ? timeLimitArg : 3000;
  const records: GameRecord[] = [];

  console.log(`Self-play: ${numGames} games, ${timeLimit}ms/move, new(alphabeta) vs legacy(greedy)\n`);

  for (let i = 0; i < numGames; i++) {
    const seed = parseInt(process.argv[4] ?? "1000", 10) + i;
    const newIsBlue = i % 2 === 0; // alternate colors
    const t0 = Date.now();
    const rec = playGame(seed, newIsBlue, timeLimit);
    records.push(rec);
    console.log(
      `game ${i + 1}/${numGames} seed=${seed} new=${newIsBlue ? "blue" : "red"} -> ` +
        `${rec.outcome.toUpperCase()} in ${rec.rounds} rounds ` +
        `(avg new-bot move ${rec.avgNewMoveMs}ms, max ${rec.maxNewMoveMs}ms` +
        `${rec.suspendedMs > 0 ? `, SUSPENDED ${rec.suspendedMs}ms` : ""}, ` +
        `game took ${Math.round((Date.now() - t0) / 1000)}s)`
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
