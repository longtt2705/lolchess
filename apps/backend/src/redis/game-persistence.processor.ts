import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Job } from "bullmq";
import { Model } from "mongoose";
import { Game, GameDocument } from "../game/game.schema";

/**
 * BullMQ Worker that processes game persistence jobs
 * Handles asynchronous writes from Redis cache to MongoDB
 */
@Processor("game-persistence")
export class GamePersistenceProcessor extends WorkerHost {
  private readonly logger = new Logger(GamePersistenceProcessor.name);

  constructor(@InjectModel(Game.name) private gameModel: Model<GameDocument>) {
    super();
  }

  /**
   * Process game persistence job
   */
  async process(job: Job<any>): Promise<any> {
    const { gameId, gameState, timestamp } = job.data;

    this.logger.debug(
      `Processing persistence job for game ${gameId} (queued at ${new Date(timestamp).toISOString()})`
    );

    try {
      // Check if game exists in MongoDB
      const existingGame = await this.gameModel.findById(gameId).exec();

      if (!existingGame) {
        // Game doesn't exist, create new document
        this.logger.log(`Creating new game document for ${gameId}`);
        const newGame = new this.gameModel(gameState);
        await newGame.save();
      } else {
        // Game exists, update it
        this.logger.debug(`Updating existing game document for ${gameId}`);

        // Use findByIdAndUpdate with full game state replacement
        await this.gameModel
          .findByIdAndUpdate(
            gameId,
            {
              $set: {
                name: gameState.name,
                status: gameState.status,
                players: gameState.players,
                maxPlayers: gameState.maxPlayers,
                currentRound: gameState.currentRound,
                gameSettings: gameState.gameSettings,
                winner: gameState.winner,
                phase: gameState.phase,
                banPickState: gameState.banPickState,
                bluePlayer: gameState.bluePlayer,
                redPlayer: gameState.redPlayer,
                board: gameState.board,
              },
            },
            { new: true }
          )
          .exec();
      }

      this.logger.log(
        `Successfully persisted game ${gameId} to MongoDB (delay: ${Date.now() - timestamp}ms)`
      );

      return { success: true, gameId, persistedAt: Date.now() };
    } catch (error) {
      this.logger.error(
        `Failed to persist game ${gameId} to MongoDB:`,
        error.message
      );
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Handle job completion
   */
  async onCompleted(job: Job<any>) {
    this.logger.debug(`Job ${job.id} completed for game ${job.data.gameId}`);
  }

  /**
   * Handle job failure
   */
  async onFailed(job: Job<any>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for game ${job.data.gameId}: ${error.message}`
    );
  }
}
