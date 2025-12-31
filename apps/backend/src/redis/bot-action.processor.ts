import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Inject, forwardRef } from "@nestjs/common";
import { Job } from "bullmq";
import Redis from "ioredis";
import { GameService } from "../game/game.service";
import { SimpleBotService } from "../game/simple-bot.service";
import { Game } from "../game/types";

/**
 * Bot Action Job Payload
 */
export interface BotActionJob {
  gameId: string;
  botPlayerId: string;
  gameState: Game;
  timestamp: number;
}

/**
 * Bot Action Result - Published to Redis Pub/Sub
 */
export interface BotActionResult {
  gameId: string;
  botPlayerId: string;
  success: boolean;
  game?: Game;
  oldGame?: Game;
  message: string;
  isGameOver?: boolean;
  winner?: string;
}

/**
 * Redis Pub/Sub channel for bot action results
 */
export const BOT_ACTION_RESULTS_CHANNEL = "bot-action-results";

/**
 * BullMQ Worker that processes bot action jobs
 * 
 * This processor:
 * 1. Receives bot action jobs from the queue
 * 2. Gets the bot's action from SimpleBotService
 * 3. Executes the action through GameService (like a player action)
 * 4. Publishes results to Redis Pub/Sub for the Gateway to emit WebSocket events
 */
@Processor("bot-actions")
export class BotActionProcessor extends WorkerHost {
  private readonly logger = new Logger(BotActionProcessor.name);
  private readonly redis: Redis;

  constructor(
    @Inject(forwardRef(() => GameService))
    private readonly gameService: GameService,
    @Inject(forwardRef(() => SimpleBotService))
    private readonly simpleBotService: SimpleBotService
  ) {
    super();

    // Initialize Redis client for Pub/Sub publishing
    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on("connect", () => {
      this.logger.log("Bot action processor Redis client connected");
    });

    this.redis.on("error", (err) => {
      this.logger.error("Bot action processor Redis error:", err);
    });
  }

  /**
   * Process bot action job
   */
  async process(job: Job<BotActionJob>): Promise<BotActionResult> {
    const { gameId, botPlayerId, gameState, timestamp } = job.data;

    this.logger.log(
      `Processing bot action for ${botPlayerId} in game ${gameId} (queued at ${new Date(timestamp).toISOString()})`
    );

    try {
      // Get fresh game state to ensure we have the latest
      const currentGameResult = await this.gameService.findOne(gameId);
      const currentGame = currentGameResult.game;

      if (!currentGame) {
        const result: BotActionResult = {
          gameId,
          botPlayerId,
          success: false,
          message: "Game not found",
        };
        await this.publishResult(result);
        return result;
      }

      // Verify it's still the bot's turn
      const currentPlayerId = this.gameService.getCurrentPlayer(currentGame);
      if (currentPlayerId !== botPlayerId) {
        this.logger.warn(
          `Bot ${botPlayerId} turn skipped - current player is ${currentPlayerId}`
        );
        const result: BotActionResult = {
          gameId,
          botPlayerId,
          success: false,
          message: "Not bot's turn anymore",
        };
        await this.publishResult(result);
        return result;
      }

      // Process the bot's turn
      const actionResult = await this.gameService.processBotTurn(
        gameId,
        currentGame
      );

      if (!actionResult || !actionResult.game) {
        const result: BotActionResult = {
          gameId,
          botPlayerId,
          success: false,
          message: actionResult?.message || "Failed to process bot turn",
        };
        await this.publishResult(result);
        return result;
      }

      // Build successful result
      const result: BotActionResult = {
        gameId,
        botPlayerId,
        success: true,
        game: actionResult.game,
        oldGame: actionResult.oldGame,
        message: actionResult.message,
        isGameOver: actionResult.game.status === "finished",
        winner: actionResult.game.winner,
      };

      // Publish result to Redis Pub/Sub
      await this.publishResult(result);

      this.logger.log(
        `Bot ${botPlayerId} action completed in game ${gameId} (delay: ${Date.now() - timestamp}ms)`
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error processing bot action for ${botPlayerId} in game ${gameId}:`,
        error.message
      );

      const result: BotActionResult = {
        gameId,
        botPlayerId,
        success: false,
        message: `Bot action failed: ${error.message}`,
      };

      await this.publishResult(result);
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Publish result to Redis Pub/Sub channel
   */
  private async publishResult(result: BotActionResult): Promise<void> {
    try {
      await this.redis.publish(
        BOT_ACTION_RESULTS_CHANNEL,
        JSON.stringify(result)
      );
      this.logger.debug(
        `Published bot action result for game ${result.gameId}`
      );
    } catch (error) {
      this.logger.error("Failed to publish bot action result:", error);
    }
  }

  /**
   * Handle job completion
   */
  async onCompleted(job: Job<BotActionJob>) {
    this.logger.debug(
      `Bot action job ${job.id} completed for game ${job.data.gameId}`
    );
  }

  /**
   * Handle job failure
   */
  async onFailed(job: Job<BotActionJob>, error: Error) {
    this.logger.error(
      `Bot action job ${job.id} failed for game ${job.data.gameId}: ${error.message}`
    );
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
