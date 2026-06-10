/**
 * @lolchess/bot-engine
 *
 * AI/Bot decision-making engine for LOL Chess
 *
 * This package contains:
 * - Position evaluation algorithms
 * - Champion value assessment
 * - Search algorithms (minimax with alpha-beta pruning)
 * - Strategic decision making for ban/pick, items, positioning
 *
 * @example
 * ```typescript
 * import { BotEngine } from '@lolchess/bot-engine';
 *
 * const bot = new BotEngine({ difficulty: 'hard' });
 * const action = bot.getAction(game, botPlayerId);
 * ```
 */

// Main engine
export { BotEngine, botEngine } from "./BotEngine";

// Types
export {
  BotConfig,
  BotDifficulty,
  EvaluationResult,
  EvaluationBreakdown,
  SearchResult,
  ChampionValue,
  ThreatInfo,
  ScoredAction,
  ChampionRole,
  TeamComposition,
} from "./types";

// Evaluation
export { PositionEvaluator } from "./evaluation/PositionEvaluator";
export { MaterialEvaluator } from "./evaluation/MaterialEvaluator";
export { ChampionEvaluator } from "./evaluation/ChampionEvaluator";
export { ThreatEvaluator } from "./evaluation/ThreatEvaluator";

// Search
export { ActionGenerator } from "./search/ActionGenerator";
export { AlphaBetaSearch } from "./search/AlphaBetaSearch";
export { LegacySearch } from "./search/BestMoveSearch";
// Backward-compatible alias: "Minimax" now points at the real minimax.
export { AlphaBetaSearch as Minimax } from "./search/AlphaBetaSearch";
export { MoveOrdering } from "./search/MoveOrdering";

// Strategy
export { BanPickStrategy } from "./strategy/BanPickStrategy";
export { ItemStrategy } from "./strategy/ItemStrategy";
export { SummonerSpellStrategy } from "./strategy/SummonerSpellStrategy";
