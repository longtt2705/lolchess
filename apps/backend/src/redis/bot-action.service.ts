import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { Game } from "../game/types";
import {
  BotActionJob,
  BotActionResult,
  BOT_ACTION_RESULTS_CHANNEL,
} from "./bot-action.processor";

/**
 * Callback type for bot action result handlers
 */
export type BotActionResultHandler = (result: BotActionResult) => void;

/**
 * Bot Action Service
 *
 * Provides:
 * 1. Method to queue bot action jobs
 * 2. Redis Pub/Sub subscription for receiving bot action results
 * 3. Event handling for the Gateway to emit WebSocket events
 */
@Injectable()
export class BotActionService implements OnModuleDestroy {
  private readonly logger = new Logger(BotActionService.name);
  private readonly subscriber: Redis;
  private resultHandlers: Map<string, BotActionResultHandler[]> = new Map();
  private globalHandlers: BotActionResultHandler[] = [];

  constructor(
    @InjectQueue("bot-actions") private readonly botActionQueue: Queue
  ) {
    // Initialize Redis subscriber for Pub/Sub
    this.subscriber = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.subscriber.on("connect", () => {
      this.logger.log("Bot action service Redis subscriber connected");
    });

    this.subscriber.on("error", (err) => {
      this.logger.error("Bot action service Redis subscriber error:", err);
    });

    // Subscribe to bot action results channel
    this.setupSubscription();
  }

  /**
   * Set up Redis Pub/Sub subscription
   */
  private async setupSubscription(): Promise<void> {
    try {
      await this.subscriber.subscribe(BOT_ACTION_RESULTS_CHANNEL);
      this.logger.log(
        `Subscribed to channel: ${BOT_ACTION_RESULTS_CHANNEL}`
      );

      this.subscriber.on("message", (channel, message) => {
        if (channel === BOT_ACTION_RESULTS_CHANNEL) {
          this.handleBotActionResult(message);
        }
      });
    } catch (error) {
      this.logger.error("Failed to subscribe to bot action results:", error);
    }
  }

  /**
   * Handle incoming bot action result from Pub/Sub
   */
  private handleBotActionResult(message: string): void {
    try {
      const result: BotActionResult = JSON.parse(message);
      this.logger.debug(
        `Received bot action result for game ${result.gameId}`
      );

      // Call global handlers
      for (const handler of this.globalHandlers) {
        try {
          handler(result);
        } catch (error) {
          this.logger.error("Error in global bot action handler:", error);
        }
      }

      // Call game-specific handlers
      const gameHandlers = this.resultHandlers.get(result.gameId);
      if (gameHandlers) {
        for (const handler of gameHandlers) {
          try {
            handler(result);
          } catch (error) {
            this.logger.error("Error in game-specific bot action handler:", error);
          }
        }
      }
    } catch (error) {
      this.logger.error("Failed to parse bot action result:", error);
    }
  }

  /**
   * Queue a bot action job
   */
  async queueBotAction(
    gameId: string,
    botPlayerId: string,
    gameState: Game
  ): Promise<void> {
    try {
      const jobData: BotActionJob = {
        gameId,
        botPlayerId,
        gameState,
        timestamp: Date.now(),
      };

      await this.botActionQueue.add("process-bot-action", jobData, {
        priority: 1, // High priority for bot actions
        removeOnComplete: 100,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 500,
        },
      });

      this.logger.log(
        `Queued bot action for ${botPlayerId} in game ${gameId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue bot action for ${botPlayerId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Register a global handler for all bot action results
   * Returns unsubscribe function
   */
  onBotActionResult(handler: BotActionResultHandler): () => void {
    this.globalHandlers.push(handler);
    return () => {
      const index = this.globalHandlers.indexOf(handler);
      if (index > -1) {
        this.globalHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Register a handler for a specific game's bot action results
   * Returns unsubscribe function
   */
  onGameBotActionResult(
    gameId: string,
    handler: BotActionResultHandler
  ): () => void {
    if (!this.resultHandlers.has(gameId)) {
      this.resultHandlers.set(gameId, []);
    }
    this.resultHandlers.get(gameId)!.push(handler);

    return () => {
      const handlers = this.resultHandlers.get(gameId);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        if (handlers.length === 0) {
          this.resultHandlers.delete(gameId);
        }
      }
    };
  }

  /**
   * Remove all handlers for a specific game
   */
  removeGameHandlers(gameId: string): void {
    this.resultHandlers.delete(gameId);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.botActionQueue.getWaitingCount(),
        this.botActionQueue.getActiveCount(),
        this.botActionQueue.getCompletedCount(),
        this.botActionQueue.getFailedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
      };
    } catch (error) {
      this.logger.error("Error getting bot action queue stats:", error);
      return null;
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.subscriber.unsubscribe(BOT_ACTION_RESULTS_CHANNEL);
      await this.subscriber.quit();
      this.globalHandlers = [];
      this.resultHandlers.clear();
      this.logger.log("Bot action service cleaned up");
    } catch (error) {
      this.logger.error("Error during cleanup:", error);
    }
  }
}
