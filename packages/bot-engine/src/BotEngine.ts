import {
  EventPayload,
  Game,
  GameEngine,
  GameEvent,
  GameLogic,
  getPieceAtPosition
} from "@lolchess/game-engine";
import { ChampionEvaluator } from "./evaluation/ChampionEvaluator";
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
  private championEvaluator: ChampionEvaluator;
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
      timeLimit: config.timeLimit ?? defaults.timeLimit ?? 3000,
      engine: config.engine ?? "alphabeta",
    };

    // Initialize components
    this.gameEngine = new GameEngine();
    this.positionEvaluator = new PositionEvaluator(this.gameEngine);
    this.championEvaluator = new ChampionEvaluator();
    const materialEvaluator = new MaterialEvaluator();
    this.threatEvaluator = new ThreatEvaluator(this.gameEngine, materialEvaluator);
    this.actionGenerator = new ActionGenerator(this.gameEngine);
    this.moveOrdering = new MoveOrdering(this.threatEvaluator);
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
      if (spellAction && this.spellImprovesPosition(game, botPlayerId, spellAction)) {
        return spellAction;
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

    // Lower difficulties: occasionally play a random legal board action instead.
    const boardActions = this.actionGenerator
      .generateAll(game, botPlayerId)
      .filter(
        (a) =>
          a.event === GameEvent.MOVE_CHESS ||
          a.event === GameEvent.ATTACK_CHESS ||
          a.event === GameEvent.SKILL
      );
    if (
      action &&
      this.config.randomness &&
      this.config.randomness > 0 &&
      Math.random() < this.config.randomness &&
      boardActions.length > 0
    ) {
      action = this.pickRandom(boardActions);
    }

    // The backend must always get an action: fall back to any legal board action.
    if (!action && boardActions.length > 0) {
      action = boardActions[0];
    }

    return action;
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

  /**
   * Select action using priority-based heuristics (faster, less accurate)
   * 
   * Priority Order:
   * 1. Lethal attacks (can kill an enemy)
   * 2. LoS clearing moves (opening phase only - clear ally blockers for ranged carries)
   * 3. Use skills
   * 4. Any attack on best target
   * 5. Forward movement
   * 6. Buy items
   * 7. Any move
   */
  private selectByHeuristics(
    game: Game,
    botPlayerId: string,
    actions: EventPayload[]
  ): EventPayload {
    const isBlue = game.bluePlayer === botPlayerId;

    // Priority 1: Lethal attacks (can kill an enemy)
    const lethalAttacks = actions.filter(
      (a) => a.event === GameEvent.ATTACK_CHESS && this.canKillTarget(game, a)
    );
    if (lethalAttacks.length > 0) {
      return this.getBestAttack(game, lethalAttacks);
    }

    // Priority 3: Use skills (70% chance)
    const skills = actions.filter((a) => a.event === GameEvent.SKILL);
    if (skills.length > 0 && Math.random() < 0.7) {
      return this.getBestSkillTarget(game, skills, isBlue);
    }

    // Priority 4: Any attack on best target
    const attacks = actions.filter((a) => a.event === GameEvent.ATTACK_CHESS);
    if (attacks.length > 0) {
      return this.getBestAttack(game, attacks);
    }

    // Priority 5: Forward movement
    const moves = actions.filter((a) => a.event === GameEvent.MOVE_CHESS);
    const forwardMoves = moves.filter((m) => this.isForwardMove(m, isBlue));
    if (forwardMoves.length > 0) {
      return this.pickRandom(forwardMoves);
    }

    // Priority 6: Buy items
    if (!game.hasPerformedActionThisTurn && !game.hasBoughtItemThisTurn) {
      const itemPurchases = actions.filter(
        (a) => a.event === GameEvent.BUY_ITEM
      );
      if (itemPurchases.length > 0) {
        const recommendation = this.itemStrategy.recommendPurchase(
          game,
          botPlayerId
        );
        if (recommendation) {
          const matchingAction = itemPurchases.find(
            (a) =>
              a.itemId === recommendation.itemId &&
              a.targetChampionId === recommendation.championId
          );
          if (matchingAction) return matchingAction;
        }
        return this.pickRandom(itemPurchases);
      }
    }

    // Priority 7: Any move
    if (moves.length > 0) {
      return this.pickRandom(moves);
    }

    // Fallback: random action
    return this.pickRandom(actions);
  }


  /**
   * Check if an attack can kill the target
   */
  private canKillTarget(game: Game, action: EventPayload): boolean {
    if (!action.targetPosition || !action.casterPosition) return false;

    const target = getPieceAtPosition(game, action.targetPosition);
    const caster = getPieceAtPosition(game, action.casterPosition);

    if (!target || !caster) return false;

    const damage = this.threatEvaluator.calculateDamage(caster, target);
    return target.stats.hp <= damage;
  }

  /**
   * Get the best attack from a list
   */
  private getBestAttack(game: Game, attacks: EventPayload[]): EventPayload {
    let bestAction = attacks[0];
    let bestScore = -Infinity;

    for (const action of attacks) {
      if (!action.targetPosition || !action.casterPosition) continue;

      const target = getPieceAtPosition(game, action.targetPosition);
      const caster = getPieceAtPosition(game, action.casterPosition);

      if (!target || !caster) continue;

      let score = 0;

      // Prioritize killing
      const damage = this.threatEvaluator.calculateDamage(caster, target);
      if (target.stats.hp <= damage) {
        score += 1000 + (target.stats.goldValue || 0);
      }

      // Prioritize Poro
      if (target.name === "Poro") {
        score += 5000;
      }

      // Prefer low HP targets
      score += (1 - target.stats.hp / target.stats.maxHp) * 100;

      // Prefer high value targets
      const champValue = this.championEvaluator.evaluateChampion(target, game);
      score += champValue.total * 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Get the best skill target
   */
  private getBestSkillTarget(
    game: Game,
    skills: EventPayload[],
    isBlue: boolean
  ): EventPayload {
    // Filter skills targeting enemies
    const enemyTargetSkills = skills.filter((s) => {
      if (!s.targetPosition) return false;
      const target = getPieceAtPosition(game, s.targetPosition);
      if (!target) return false;
      return target.blue !== isBlue;
    });

    if (enemyTargetSkills.length > 0) {
      return this.getBestAttack(game, enemyTargetSkills);
    }

    return this.pickRandom(skills);
  }

  /**
   * Check if a move is forward
   */
  private isForwardMove(move: EventPayload, isBlue: boolean): boolean {
    if (!move.casterPosition || !move.targetPosition) return false;

    if (isBlue) {
      return move.targetPosition.y > move.casterPosition.y;
    } else {
      return move.targetPosition.y < move.casterPosition.y;
    }
  }

  /**
   * Apply randomness to decision
   */
  private applyRandomness(
    best: EventPayload,
    all: EventPayload[]
  ): EventPayload {
    if (
      this.config.randomness &&
      this.config.randomness > 0 &&
      Math.random() < this.config.randomness
    ) {
      return this.pickRandom(all);
    }
    return best;
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
      this.config.timeLimit = config.timeLimit;
    }
  }
}

// Export default instance
export const botEngine = new BotEngine();
