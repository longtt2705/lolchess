import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";
import { GameGateway } from "./game.gateway";
import { QueueGateway } from "./queue.gateway";
import { QueueService } from "./queue.service";
import { Game, GameSchema } from "./game.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Game.name, schema: GameSchema }]),
  ],
  controllers: [GameController],
  providers: [GameService, GameGateway, QueueGateway, QueueService],
  exports: [GameService, GameGateway, QueueGateway, QueueService],
})
export class GameModule {}
