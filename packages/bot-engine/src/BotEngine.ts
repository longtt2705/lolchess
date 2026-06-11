import {
  EventPayload,
  Game,
  GameEngine,
  GameEvent,
  GameLogic,
  getPieceAtPosition
} from "@lolchess/game-engine";
import { MaterialEvaluator } from "./evaluation/MaterialEvaluator";
import { PositionEvaluator } from "./evaluation/PositionEvaluator";
import { ThreatEvaluator } from "./evaluation/ThreatEvaluator";
import { ActionGenerator } from "./search/ActionGenerator";
import { LegacySearch } from "./search/BestMoveSearch";
import { AlphaBetaSearch } from "./search/AlphaBetaSearch";
import { MoveOrdering } from "./search/MoveOrdering";
import { BanPickStrategy } from "./strategy/BanPickStrategy";
import { ItemStrategy } from "./strategy/ItemStrategy";
import { SummonerSpellStrategy } from "./strategy/SummonerSpellStrategy";
import {
  BotConfig,
  BotDifficulty,
  EvaluationResult,
  SearchResult,
} from "./types";

/**
 * Default configurations for each difficulty level
 */
const DEFAULT_CONFIGS: Record<BotDifficulty, Partial<BotConfig>> = {
  easy: { searchDepth: 1, randomness: 0.35, timeLimit: 1000 },
  medium: { searchDepth: 2, randomness: 0.15, timeLimit: 3000 },
  hard: { searchDepth: 3, randomness: 0.05, timeLimit: 8000 },
  expert: { searchDepth: 4, randomness: 0, timeLimit: 20000 },
};

/**
 * Main Bot Engine
 *
 * Provides AI decision-making for the game:
 * - Action selection during gameplay
 * - Champion ban/pick decisions
 * - Item purchase strategy
 * - Position evaluation
 */
export class BotEngine {
  private gameEngine: GameEngine;
  private positionEvaluator: PositionEvaluator;
  private threatEvaluator: ThreatEvaluator;
  private actionGenerator: ActionGenerator;
  private alphaBeta: AlphaBetaSearch;
  private legacySearch: LegacySearch;
  private moveOrdering: MoveOrdering;
  private banPickStrategy: BanPickStrategy;
  private itemStrategy: ItemStrategy;
  private summonerSpellStrategy: SummonerSpellStrategy;
  private config: BotConfig;

  constructor(config: Partial<BotConfig> = {}) {
    const difficulty = config.difficulty || "medium";
    const defaults = DEFAULT_CONFIGS[difficulty];

    this.config = {
      difficulty,
      searchDepth: config.searchDepth ?? defaults.searchDepth ?? 2,
      randomness: config.randomness ?? defaults.randomness ?? 0.15,
      // sanitizeTimeLimit, not ??: a NaN timeLimit (e.g. parseInt of a bad
      // CLI arg) passes ?? untouched and then disables EVERY time check —
      // `Date.now() - start > NaN` is always false, so the search never
      // times out.
      timeLimit:
        BotEngine.sanitizeTimeLimit(config.timeLimit) ??
        defaults.timeLimit ??
        3000,
      engine: config.engine ?? "alphabeta",
    };

    // Initialize components
    this.gameEngine = new GameEngine();
    this.positionEvaluator = new PositionEvaluator(this.gameEngine);
    const materialEvaluator = new MaterialEvaluator();
    this.threatEvaluator = new ThreatEvaluator(this.gameEngine, materialEvaluator);
    this.actionGenerator = new ActionGenerator(this.gameEngine);
    this.moveOrdering = new MoveOrdering(this.threatEvaluator, this.gameEngine);
    this.alphaBeta = new AlphaBetaSearch(
      this.gameEngine,
      this.positionEvaluator,
      this.actionGenerator,
      this.moveOrdering
    );
    this.legacySearch = new LegacySearch(
      this.gameEngine,
      this.positionEvaluator,
      this.actionGenerator
    );
    this.banPickStrategy = new BanPickStrategy();
    this.itemStrategy = new ItemStrategy();
    this.summonerSpellStrategy = new SummonerSpellStrategy(this.gameEngine);
  }

  /**
   * Get the best action for the bot to take
   *
   * Priority Order:
   * 1. Free actions (summoner spells) - don't end turn
   * 2. Free actions (item purchases) - don't end turn
   * 3. Main search (positioning/combat)
   */
  getAction(game: Game, botPlayerId: string): EventPayload | null {
    // Phase 0: free actions (don't end the turn)

    // Summoner spells — sanity-checked: only cast if it actually improves the position.
    if (!game.hasUsedSummonerSpellThisTurn) {
      const spellAction = this.summonerSpellStrategy.recommendSummonerSpell(
        game,
        botPlayerId
      );
      if (spellAction) {
        // The payload carries no spell id; derive it from the caster piece.
        // Ghost (speed buff) and Barrier (shield) are invisible to the
        // position evaluator, so the eval-delta gate would always reject
        // them — trust the strategy's own logic for those. Keep the gate for
        // Flash/Heal/Smite, whose effects (position, HP) the evaluator sees.
        const caster = spellAction.casterPosition
          ? getPieceAtPosition(game, spellAction.casterPosition)
          : null;
        const spellType = caster?.summonerSpell?.type;
        const evaluatorBlind = spellType === "Ghost" || spellType === "Barrier";
        if (
          evaluatorBlind ||
          this.spellImprovesPosition(game, botPlayerId, spellAction)
        ) {
          return spellAction;
        }
      }
    }

    // Item purchases
    const currentItemPrice = GameLogic.getCurrentItemPrice(game.players.find((p) => p.userId === botPlayerId)!);
    if (!game.hasBoughtItemThisTurn && this.itemStrategy.shouldBuyItem(game, botPlayerId, currentItemPrice)) {
      const itemRec = this.itemStrategy.recommendPurchase(game, botPlayerId);
      if (itemRec) {
        return {
          playerId: botPlayerId,
          event: GameEvent.BUY_ITEM,
          itemId: itemRec.itemId,
          targetChampionId: itemRec.championId,
        };
      }
    }

    // Phase 1: board action via search
    const searchResult =
      this.config.engine === "legacy"
        ? this.legacySearch.searchV2(game, botPlayerId, this.config.timeLimit)
        : this.alphaBeta.search(game, botPlayerId, {
            maxDepth: this.config.searchDepth,
            timeLimit: this.config.timeLimit ?? 3000,
          });

    let action = searchResult.bestAction;

    // Board actions are only needed for the randomness path or the null
    // fallback, so generate the list lazily.

    // Lower difficulties: occasionally play a random legal board action instead.
    if (
      action &&
      this.config.randomness &&
      this.config.randomness > 0 &&
      Math.random() < this.config.randomness
    ) {
      const boardActions = this.generateBoardActions(game, botPlayerId);
      if (boardActions.length > 0) {
        action = this.pickRandom(boardActions);
      }
    }

    // The backend must always get an action: fall back to the best-ordered
    // legal board action.
    if (!action) {
      const boardActions = this.generateBoardActions(game, botPlayerId);
      action =
        this.moveOrdering.orderActions(game, boardActions, botPlayerId)[0]
          ?.action ?? null;
    }

    return action;
  }

  /**
   * All legal board actions (move / attack / skill) for a player.
   */
  private generateBoardActions(game: Game, playerId: string): EventPayload[] {
    return this.actionGenerator
      .generateAll(game, playerId)
      .filter(
        (a) =>
          a.event === GameEvent.MOVE_CHESS ||
          a.event === GameEvent.ATTACK_CHESS ||
          a.event === GameEvent.SKILL
      );
  }

  /**
   * Sanity check for spell recommendations: simulate the spell and require the
   * evaluation to improve. Prevents wasting long-cooldown spells (Flash) on
   * positions the board search can handle anyway.
   */
  private spellImprovesPosition(
    game: Game,
    botPlayerId: string,
    spellAction: EventPayload
  ): boolean {
    const SPELL_MARGIN = 30;
    const sim = this.gameEngine.processAction(game, spellAction);
    if (!sim.success) return false;
    const before = this.positionEvaluator.evaluate(game, botPlayerId);
    const after = this.positionEvaluator.evaluate(sim.game, botPlayerId);
    return after >= before + SPELL_MARGIN;
  }

  /** A usable time budget is a finite positive number; anything else is rejected. */
  private static sanitizeTimeLimit(t: number | undefined): number | undefined {
    return typeof t === "number" && isFinite(t) && t > 0 ? t : undefined;
  }

  /**
   * Pick random element
   */
  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ============================================
  // Champion Ban/Pick Methods
  // ============================================

  /**
   * Get a champion to ban
   */
  getBanChoice(
    bannedChampions: string[],
    blueBans?: string[],
    redBans?: string[]
  ): string | null {
    return this.banPickStrategy.getBan(bannedChampions, blueBans, redBans);
  }

  /**
   * Get a champion to pick
   */
  getPickChoice(
    bannedChampions: string[],
    alreadyPicked: string[],
    botPicks: string[]
  ): string | null {
    return this.banPickStrategy.getPick(
      bannedChampions,
      alreadyPicked,
      botPicks
    );
  }

  /**
   * Get champion order for positioning
   */
  getChampionOrder(championNames: string[]): string[] {
    return this.banPickStrategy.getOrder(championNames);
  }

  // ============================================
  // Evaluation Methods
  // ============================================

  /**
   * Evaluate current position with detailed breakdown
   */
  evaluatePosition(game: Game, playerId: string): EvaluationResult {
    return this.positionEvaluator.evaluateWithBreakdown(game, playerId);
  }

  /**
   * Quick position evaluation (for search)
   */
  quickEvaluate(game: Game, playerId: string): number {
    return this.positionEvaluator.quickEvaluate(game, playerId);
  }

  /**
   * Search for best move with look-ahead using iterative-deepening alpha-beta.
   */
  search(
    game: Game,
    playerId: string,
    depth?: number,
    timeLimit?: number
  ): SearchResult {
    return this.alphaBeta.search(game, playerId, {
      maxDepth: depth ?? this.config.searchDepth,
      timeLimit: timeLimit ?? this.config.timeLimit ?? 3000,
    });
  }

  // ============================================
  // Item Strategy Methods
  // ============================================

  /**
   * Get item purchase recommendation
   */
  getItemRecommendation(
    game: Game,
    playerId: string
  ): { itemId: string; championId: string } | null {
    return this.itemStrategy.recommendPurchase(game, playerId);
  }

  /**
   * Check if should buy item
   */
  shouldBuyItem(game: Game, playerId: string, currentItemPrice: number): boolean {
    return this.itemStrategy.shouldBuyItem(game, playerId, currentItemPrice);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get all possible actions
   */
  getAllActions(game: Game, playerId: string): EventPayload[] {
    return this.actionGenerator.generateAll(game, playerId);
  }

  /**
   * Validate an action
   */
  validateAction(game: Game, action: EventPayload): boolean {
    return this.actionGenerator.isValidAction(game, action);
  }

  /**
   * Get bot configuration
   */
  getConfig(): BotConfig {
    return { ...this.config };
  }

  /**
   * Update bot configuration
   */
  setConfig(config: Partial<BotConfig>): void {
    if (config.difficulty !== undefined) {
      this.config.difficulty = config.difficulty;
    }
    if (config.searchDepth !== undefined) {
      this.config.searchDepth = config.searchDepth;
    }
    if (config.randomness !== undefined) {
      this.config.randomness = config.randomness;
    }
    if (config.timeLimit !== undefined) {
      this.config.timeLimit =
        BotEngine.sanitizeTimeLimit(config.timeLimit) ?? this.config.timeLimit;
    }
    if (config.engine !== undefined) {
      this.config.engine = config.engine;
    }
  }
}

// Export default instance
export const botEngine = new BotEngine();
