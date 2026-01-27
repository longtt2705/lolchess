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
  /** Line of Sight score for ranged carries (optional for backward compatibility) */
  lineOfSight?: number;
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
  /** Whether this threat is a skill */
  isAttack: boolean;
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

/**
 * Information about a blocked firing lane for a ranged carry
 */
export interface BlockedLane {
  /** The ranged carry that is blocked */
  carry: Chess;
  /** The ally piece blocking the lane */
  blocker: Chess;
  /** The enemy target that could be attacked if lane was clear */
  target: Chess;
  /** Direction vector of the blocked lane */
  direction: { dx: number; dy: number };
  /** Tactical value of having LoS to the target */
  targetValue: number;
}

/**
 * A move that would clear a blocked lane
 */
export interface LoSClearingMove {
  /** The blocking piece that should move */
  blocker: Chess;
  /** The ranged carry that would benefit */
  carry: Chess;
  /** The enemy target that would become attackable */
  target: Chess;
  /** Current position of blocker */
  moveFrom: Square;
  /** Suggested destination that clears the lane */
  moveTo: Square;
  /** Tactical value of clearing this lane */
  targetValue: number;
}

/**
 * Complete Line of Sight analysis for a player's ranged pieces
 */
export interface LoSAnalysis {
  /** All ranged carries belonging to the player */
  rangedCarries: Chess[];
  /** All blocked lanes for ranged carries */
  blockedLanes: BlockedLane[];
  /** Score from clear lanes (positive) */
  clearLaneScore: number;
  /** Score from blocked lanes (penalty) */
  blockedLaneScore: number;
  /** Net LoS score (clear - blocked) */
  totalScore: number;
}

/**
 * Threat score evaluation for a position
 * Used in two-phase search to evaluate positioning actions
 */
export interface PositionThreatScore {
  /** The position being evaluated */
  position: Square;
  /** Number of enemy targets attackable from this position */
  attackableTargets: number;
  /** Value of the best target attackable from this position */
  bestTargetValue: number;
  /** Safety score (negative if threatened by enemies) */
  safety: number;
  /** Total combined position score */
  total: number;
}

/**
 * Action category for two-phase search
 */
export type ActionCategory = "positioning" | "combat" | "utility";
