import { Game, EventPayload, Chess, Square } from "@lolchess/game-engine";

/**
 * Bot difficulty levels
 */
export type BotDifficulty = "easy" | "medium" | "hard" | "expert";

/**
 * Configuration for the bot engine
 */
export interface BotConfig {
  /** Difficulty level affects search depth and randomness */
  difficulty: BotDifficulty;
  /** How many moves ahead to search (0 = heuristics only) */
  searchDepth: number;
  /** Maximum time for search in milliseconds */
  timeLimit?: number;
  /** Randomness factor (0-1), adds variance to prevent predictability */
  randomness?: number;
}

/**
 * Breakdown of position evaluation
 */
export interface EvaluationBreakdown {
  /** Material value difference */
  material: number;
  /** Positional advantage (center control, advancement) */
  position: number;
  /** Threat potential (pieces that can attack) */
  threats: number;
  /** King (Poro) safety */
  safety: number;
  /** Mobility (number of valid moves) */
  mobility: number;
}

/**
 * Result of position evaluation
 */
export interface EvaluationResult {
  /** Total score (positive = good for evaluated player) */
  score: number;
  /** Detailed breakdown of the score */
  breakdown: EvaluationBreakdown;
}

/**
 * Result of minimax search
 */
export interface SearchResult {
  /** Best action found */
  bestAction: EventPayload | null;
  /** Evaluation score of best action */
  score: number;
  /** Number of positions examined */
  nodesSearched: number;
  /** Actual depth searched */
  depth: number;
  /** Time taken in milliseconds */
  timeMs: number;
}

/**
 * Champion value assessment
 */
export interface ChampionValue {
  /** Base gold value */
  baseValue: number;
  /** Combat effectiveness (damage output potential) */
  combatValue: number;
  /** Strategic value (skills, utility) */
  strategicValue: number;
  /** Current HP factor (0-1) */
  healthFactor: number;
  /** Total combined value */
  total: number;
}

/**
 * Threat information for an attack
 */
export interface ThreatInfo {
  /** The attacking piece */
  attacker: Chess;
  /** The threatened piece */
  target: Chess;
  /** Estimated damage */
  damage: number;
  /** Whether this attack can kill the target */
  canKill: boolean;
  /** Priority score for this threat */
  priority: number;
}

/**
 * Action with evaluation score
 */
export interface ScoredAction {
  action: EventPayload;
  score: number;
  isKiller?: boolean;
  isCapture?: boolean;
}

/**
 * Champion role for team composition
 */
export type ChampionRole =
  | "assassin"
  | "mage"
  | "support"
  | "marksman"
  | "tank"
  | "fighter";

/**
 * Team composition analysis
 */
export interface TeamComposition {
  tanks: number;
  fighters: number;
  assassins: number;
  mages: number;
  marksmen: number;
  supports: number;
  totalValue: number;
}
