import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { GameService } from "./game.service";
import { champions } from "./data/champion";

@Controller("games")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  findAll() {
    return this.gameService.findAll();
  }

  @Get("champions")
  getChampions() {
    return champions;
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.gameService.findOne(id);
  }

  @Post()
  create(@Body() createGameDto: any) {
    return this.gameService.create(createGameDto);
  }

  @Post(":gameId/initialize-gameplay")
  async initializeGameplay(@Param("gameId") gameId: string) {
    return this.gameService.initializeGameplay(gameId);
  }

  @Post(":gameId/action")
  async executeAction(
    @Param("gameId") gameId: string,
    @Body() actionData: any
  ) {
    return this.gameService.executeAction(gameId, actionData);
  }

  @Post(":gameId/reset-gameplay")
  async resetGameplay(@Param("gameId") gameId: string) {
    return this.gameService.resetGameplay(gameId);
  }
}
