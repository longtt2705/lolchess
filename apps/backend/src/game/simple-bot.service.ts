import { Injectable, Logger } from "@nestjs/common";
import {
  Game,
  EventPayload,
  SummonerSpellType,
  SUMMONER_SPELL_TYPES,
} from "@lolchess/game-engine";
import {
  BotEngine,
  BotConfig,
  BotDifficulty,
  EvaluationResult,
} from "@lolchess/bot-engine";

/**
 * Simple Bot Service
 *
 * NestJS wrapper around the @lolchess/bot-engine package.
 * Manages bot instances for different games and provides
 * the interface for the game service to interact with bots.
 */
@Injectable()
export class SimpleBotService {
  private readonly logger = new Logger(SimpleBotService.name);

  // Store bot engines per game/player for state persistence
  private botEngines: Map<string, BotEngine> = new Map();

  // Default difficulty for bots
  private defaultDifficulty: BotDifficulty = "expert";

  /**
   * Get or create a bot engine for a specific bot player
   */
  private getBotEngine(
    botPlayerId: string,
    difficulty?: BotDifficulty
  ): BotEngine {
    const key = botPlayerId;

    if (!this.botEngines.has(key)) {
      const config: Partial<BotConfig> = {
        difficulty: difficulty || this.defaultDifficulty,
      };
      this.botEngines.set(key, new BotEngine(config));
      this.logger.debug(
        `Created bot engine for ${botPlayerId} with difficulty ${config.difficulty}`
      );
    }

    return this.botEngines.get(key)!;
  }

  /**
   * Get the best action for the bot to take
   */
  getAction(game: Game, botPlayerId: string): EventPayload | null {
    const botEngine = this.getBotEngine(botPlayerId);
    const action = botEngine.getAction(game, botPlayerId);

    if (!action) {
      this.logger.warn(`No valid actions available for bot ${botPlayerId}`);
      return null;
    }

    this.logger.debug(`Bot ${botPlayerId} action: ${JSON.stringify(action)}`);
    return action;
  }

  /**
   * Check if a player ID belongs to a bot
   */
  isBotPlayer(playerId: string): boolean {
    return playerId.startsWith("bot-player-");
  }

  /**
   * Get bot's champion ban choice
   */
  getBotBanChoice(
    bannedChampions: string[],
    blueBans?: string[],
    redBans?: string[]
  ): string | null {
    // Use a temporary engine for ban/pick decisions
    const botEngine = new BotEngine({ difficulty: this.defaultDifficulty });
    const banChoice = botEngine.getBanChoice(
      bannedChampions,
      blueBans,
      redBans
    );

    this.logger.debug(`Bot ban choice: ${banChoice}`);
    return banChoice;
  }

  /**
   * Get bot's champion pick choice
   */
  getBotPickChoice(
    bannedChampions: string[],
    alreadyPicked: string[],
    botPicks: string[]
  ): string | null {
    const botEngine = new BotEngine({ difficulty: this.defaultDifficulty });
    const pickChoice = botEngine.getPickChoice(
      bannedChampions,
      alreadyPicked,
      botPicks
    );

    this.logger.debug(`Bot pick choice: ${pickChoice}`);
    return pickChoice;
  }

  /**
   * Get bot's champion reorder
   */
  getBotChampionOrder(championIds: string[]): string[] {
    const botEngine = new BotEngine({ difficulty: this.defaultDifficulty });
    const order = botEngine.getChampionOrder(championIds);

    this.logger.debug(`Bot champion order: ${JSON.stringify(order)}`);
    return order;
  }

  /**
   * Get bot's summoner spell assignments for champions
   * Assigns spells based on simple strategy:
   * - Flash for assassins/mages (mobility)
   * - Ghost for fighters (chase potential)
   * - Heal for supports/tanks (sustain)
   * - Barrier for marksmen (protection)
   * - Smite for remaining (objective control)
   */
  getBotSpellAssignments(
    championNames: string[]
  ): Record<string, SummonerSpellType> {
    const assignments: Record<string, SummonerSpellType> = {};
    const availableSpells = [...SUMMONER_SPELL_TYPES];

    // Simple assignment: just assign spells in order
    // In a more sophisticated bot, we could consider champion roles
    championNames.forEach((championName, index) => {
      if (index < availableSpells.length) {
        assignments[championName] = availableSpells[index];
      }
    });

    this.logger.debug(
      `Bot spell assignments: ${JSON.stringify(assignments)}`
    );
    return assignments;
  }

  /**
   * Evaluate current game position for a bot
   */
  evaluatePosition(game: Game, botPlayerId: string): EvaluationResult {
    const botEngine = this.getBotEngine(botPlayerId);
    return botEngine.evaluatePosition(game, botPlayerId);
  }

  /**
   * Get quick position score for a bot
   */
  getPositionScore(game: Game, botPlayerId: string): number {
    const botEngine = this.getBotEngine(botPlayerId);
    return botEngine.quickEvaluate(game, botPlayerId);
  }

  /**
   * Set difficulty for a specific bot
   */
  setBotDifficulty(botPlayerId: string, difficulty: BotDifficulty): void {
    const botEngine = this.getBotEngine(botPlayerId, difficulty);
    botEngine.setConfig({ difficulty });
    this.logger.debug(`Set bot ${botPlayerId} difficulty to ${difficulty}`);
  }

  /**
   * Set default difficulty for new bots
   */
  setDefaultDifficulty(difficulty: BotDifficulty): void {
    this.defaultDifficulty = difficulty;
    this.logger.debug(`Set default bot difficulty to ${difficulty}`);
  }

  /**
   * Clean up bot engine when game ends
   */
  cleanupBot(botPlayerId: string): void {
    if (this.botEngines.has(botPlayerId)) {
      this.botEngines.delete(botPlayerId);
      this.logger.debug(`Cleaned up bot engine for ${botPlayerId}`);
    }
  }

  /**
   * Clean up all bot engines
   */
  cleanupAll(): void {
    const count = this.botEngines.size;
    this.botEngines.clear();
    this.logger.debug(`Cleaned up ${count} bot engines`);
  }

  /**
   * Get all possible actions for a bot (for debugging)
   */
  getAllActions(game: Game, botPlayerId: string): EventPayload[] {
    const botEngine = this.getBotEngine(botPlayerId);
    return botEngine.getAllActions(game, botPlayerId);
  }

  /**
   * Validate an action for a bot
   */
  validateAction(game: Game, action: EventPayload): boolean {
    const botEngine = new BotEngine();
    return botEngine.validateAction(game, action);
  }
}
