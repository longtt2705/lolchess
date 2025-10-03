import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import { RedisGameCacheService } from "./redis-game-cache.service";
import { GamePersistenceProcessor } from "./game-persistence.processor";
import { Game, GameSchema } from "../game/game.schema";

@Module({
  imports: [
    // Import Game schema so GamePersistenceProcessor can access GameModel
    MongooseModule.forFeature([{ name: Game.name, schema: GameSchema }]),
    // Register BullMQ queue for game persistence
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),
    BullModule.registerQueue({
      name: "game-persistence",
    }),
  ],
  providers: [RedisGameCacheService, GamePersistenceProcessor],
  exports: [RedisGameCacheService, BullModule],
})
export class RedisModule {}
