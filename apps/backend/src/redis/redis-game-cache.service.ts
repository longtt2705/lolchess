import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { Game } from "../game/game.schema";

/**
 * Redis-based game state cache service
 * Provides fast in-memory access to game state with queue-based MongoDB persistence
 */
@Injectable()
export class RedisGameCacheService {
  private readonly logger = new Logger(RedisGameCacheService.name);
  private readonly redis: Redis;
  private readonly GAME_KEY_PREFIX = "game:";
  private readonly GAME_TTL = 3600 * 24; // 24 hours TTL for game state

  constructor(
    @InjectQueue("game-persistence") private gamePersistenceQueue: Queue
  ) {
    // Initialize Redis client for cache
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
      this.logger.log("Redis client connected successfully");
    });

    this.redis.on("error", (err) => {
      this.logger.error("Redis client error:", err);
    });
  }

  /**
   * Get game state from Redis cache
   */
  async getGameState(gameId: string): Promise<Game | null> {
    try {
      const key = this.getGameKey(gameId);
      const data = await this.redis.get(key);

      if (!data) {
        this.logger.debug(`Cache miss for game ${gameId}`);
        return null;
      }

      this.logger.debug(`Cache hit for game ${gameId}`);
      return JSON.parse(data) as Game;
    } catch (error) {
      this.logger.error(`Error getting game ${gameId} from cache:`, error);
      return null;
    }
  }

  /**
   * Set game state in Redis cache and queue MongoDB update
   */
  async setGameState(
    gameId: string,
    gameState: Game,
    options?: {
      skipPersistence?: boolean; // Skip queuing MongoDB update
      priority?: number; // Job priority (1-10, higher = more urgent)
    }
  ): Promise<void> {
    try {
      const key = this.getGameKey(gameId);
      const data = JSON.stringify(gameState);

      // Save to Redis cache
      await this.redis.setex(key, this.GAME_TTL, data);
      this.logger.debug(`Game ${gameId} saved to cache`);

      // Queue MongoDB persistence unless explicitly skipped
      if (!options?.skipPersistence) {
        await this.queueGamePersistence(gameId, gameState, options?.priority);
      }
    } catch (error) {
      this.logger.error(`Error setting game ${gameId} in cache:`, error);
      throw error;
    }
  }

  /**
   * Delete game state from Redis cache
   */
  async deleteGameState(gameId: string): Promise<void> {
    try {
      const key = this.getGameKey(gameId);
      await this.redis.del(key);
      this.logger.debug(`Game ${gameId} deleted from cache`);
    } catch (error) {
      this.logger.error(`Error deleting game ${gameId} from cache:`, error);
      throw error;
    }
  }

  /**
   * Check if game exists in cache
   */
  async hasGameState(gameId: string): Promise<boolean> {
    try {
      const key = this.getGameKey(gameId);
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Error checking game ${gameId} existence:`, error);
      return false;
    }
  }

  /**
   * Update game state TTL
   */
  async refreshGameTTL(gameId: string): Promise<void> {
    try {
      const key = this.getGameKey(gameId);
      await this.redis.expire(key, this.GAME_TTL);
    } catch (error) {
      this.logger.error(`Error refreshing TTL for game ${gameId}:`, error);
    }
  }

  /**
   * Queue a job to persist game state to MongoDB
   */
  private async queueGamePersistence(
    gameId: string,
    gameState: Game,
    priority: number = 5
  ): Promise<void> {
    try {
      await this.gamePersistenceQueue.add(
        "persist-game",
        {
          gameId,
          gameState,
          timestamp: Date.now(),
        },
        {
          priority,
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 1000, // Keep last 1000 failed jobs
          attempts: 3, // Retry up to 3 times on failure
          backoff: {
            type: "exponential",
            delay: 1000, // Start with 1 second delay
          },
        }
      );

      this.logger.debug(
        `Game ${gameId} persistence queued (priority: ${priority})`
      );
    } catch (error) {
      this.logger.error(`Error queuing game ${gameId} persistence:`, error);
      throw error;
    }
  }

  /**
   * Get Redis key for game
   */
  private getGameKey(gameId: string): string {
    return `${this.GAME_KEY_PREFIX}${gameId}`;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.gamePersistenceQueue.getWaitingCount(),
        this.gamePersistenceQueue.getActiveCount(),
        this.gamePersistenceQueue.getCompletedCount(),
        this.gamePersistenceQueue.getFailedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
      };
    } catch (error) {
      this.logger.error("Error getting queue stats:", error);
      return null;
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
