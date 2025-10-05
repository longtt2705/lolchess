import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { GameService } from "./game.service";
import { champions } from "./data/champion";
import { basicItems, combinedItems, allItems } from "./data/items";

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

  @Get("items")
  getItems(@Query("type") type?: string) {
    if (type === "basic") {
      return { items: basicItems };
    } else if (type === "combined") {
      return { items: combinedItems };
    } else {
      return { items: allItems };
    }
  }

  @Get("items/basic")
  getBasicItems() {
    return { items: basicItems };
  }

  @Get("active-game")
  getActiveGame(@Query("userId") userId: string) {
    return this.gameService.getActiveGameForUser(userId);
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

  @Post(":gameId/buy-item")
  async buyItem(
    @Param("gameId") gameId: string,
    @Body() buyItemData: { itemId: string; championId: string }
  ) {
    return this.gameService.buyItem(gameId, buyItemData);
  }
}
