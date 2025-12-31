import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import { RedisGameCacheService } from "./redis-game-cache.service";
import { GamePersistenceProcessor } from "./game-persistence.processor";
import { BotActionProcessor } from "./bot-action.processor";
import { BotActionService } from "./bot-action.service";
import { GameMongooseSchema, GAME_MODEL_NAME } from "../game/game.schema";
import { GameModule } from "../game/game.module";

@Module({
  imports: [
    // Import Game schema so GamePersistenceProcessor can access GameModel
    MongooseModule.forFeature([
      { name: GAME_MODEL_NAME, schema: GameMongooseSchema },
    ]),
    // Forward ref to GameModule for BotActionProcessor dependencies
    forwardRef(() => GameModule),
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
    // Register BullMQ queue for bot actions
    BullModule.registerQueue({
      name: "bot-actions",
    }),
  ],
  providers: [
    RedisGameCacheService,
    GamePersistenceProcessor,
    BotActionProcessor,
    BotActionService,
  ],
  exports: [RedisGameCacheService, BotActionService, BullModule],
})
export class RedisModule {}
