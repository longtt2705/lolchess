import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { GameService } from "./game.service";
import {
  champions,
  basicItems,
  combinedItems,
  allItems,
  viktorModules,
} from "@lolchess/game-engine";

@Controller("games")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  findAll() {
    return this.gameService.findAll();
  }

  @Get("champions")
  getChampions() {
    return champions
      .map((champion) => ({
        ...champion,
        stats: {
          ...champion.stats,
          speed: champion.stats.speed ?? 2,
          criticalChance: champion.stats.criticalChance ?? 15,
          criticalDamage: champion.stats.criticalDamage ?? 150,
          sunder: champion.stats.sunder ?? 0,
          hpRegen: champion.stats.hpRegen ?? 1,
        },
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  @Get("items")
  getItems(@Query("type") type?: string) {
    if (type === "basic") {
      return {
        items: basicItems.map((item) => ({
          ...item,
          effects: item.effects.map((effect) => ({
            ...effect,
            conditional: effect.condition ? true : false,
          })),
        })),
      };
    } else if (type === "combined") {
      return {
        items: combinedItems.map((item) => ({
          ...item,
          effects: item.effects.map((effect) => ({
            ...effect,
            conditional: effect.condition ? true : false,
          })),
        })),
      };
    } else {
      return {
        items: allItems.map((item) => ({
          ...item,
          effects: item.effects.map((effect) => ({
            ...effect,
            conditional: effect.condition ? true : false,
          })),
        })),
      };
    }
  }

  @Get("items/basic")
  getBasicItems() {
    return {
      items: basicItems.map((item) => ({
        ...item,
        effects: item.effects.map((effect) => ({
          ...effect,
          conditional: effect.condition ? true : false,
        })),
      })),
    };
  }

  @Get("active-game")
  getActiveGame(@Query("userId") userId: string) {
    return this.gameService.getActiveGameForUser(userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.gameService.findOne(id);
  }

  @Get(":gameId/ban-pick-state")
  async getBanPickState(@Param("gameId") gameId: string) {
    const gameResult = await this.gameService.findOneById(gameId);
    if (gameResult && gameResult.banPickState) {
      return {
        game: gameResult,
        banPickState: gameResult.banPickState,
      };
    }
    return {
      game: null,
      banPickState: null,
      message: "Game not found or not in ban/pick phase",
    };
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
  async resetGameplay(
    @Param("gameId") gameId: string,
    @Body() body?: { blueChampions?: string[]; redChampions?: string[] }
  ) {
    const isDevelopment = process.env.NODE_ENV === "development";
    if (!isDevelopment) {
      return {
        message: "This action is only available in development mode",
      };
    }
    return this.gameService.resetGameplay(
      gameId,
      body?.blueChampions,
      body?.redChampions
    );
  }

  @Post(":gameId/restore-hp")
  async restoreHp(@Param("gameId") gameId: string) {
    const isDevelopment = process.env.NODE_ENV === "development";
    if (!isDevelopment) {
      return {
        message: "This action is only available in development mode",
      };
    }
    return this.gameService.restoreHp(gameId);
  }

  @Post(":gameId/restore-cooldown")
  async restoreCooldown(@Param("gameId") gameId: string) {
    const isDevelopment = process.env.NODE_ENV === "development";
    if (!isDevelopment) {
      return {
        message: "This action is only available in development mode",
      };
    }
    return this.gameService.restoreCooldown(gameId);
  }

  @Post(":gameId/reset-ban-pick")
  async resetBanPick(@Param("gameId") gameId: string) {
    return this.gameService.resetBanPick(gameId);
  }

  @Post(":gameId/buy-item")
  async buyItem(
    @Param("gameId") gameId: string,
    @Body() buyItemData: { itemId: string; championId: string }
  ) {
    return this.gameService.buyItem(gameId, buyItemData);
  }

  @Get("items/viktor-modules")
  getViktorModules() {
    return { modules: viktorModules };
  }
}
