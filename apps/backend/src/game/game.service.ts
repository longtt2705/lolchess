import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Game, GameDocument } from "./game.schema";
import { GameLogic } from "./game.logic";
import { RedisGameCacheService } from "../redis/redis-game-cache.service";

// Ban/Pick patterns from RULE.md
const BAN_ORDER: ("blue" | "red")[] = [
  "blue",
  "red",
  "blue",
  "red",
  "blue",
  "red",
  "blue",
  "red",
  "blue",
  "red",
];

const PICK_ORDER: ("blue" | "red")[] = [
  "blue",
  "red",
  "red",
  "blue",
  "blue",
  "red",
  "red",
  "blue",
  "blue",
  "red",
];

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    private readonly redisCache: RedisGameCacheService
  ) {}

  /**
   * Get game state - tries Redis cache first, falls back to MongoDB
   */
  private async getGameState(gameId: string): Promise<Game | null> {
    // Try Redis cache first
    let game = await this.redisCache.getGameState(gameId);

    if (game) {
      this.logger.debug(`Game ${gameId} retrieved from Redis cache`);
      return game;
    }

    // Cache miss - fetch from MongoDB
    this.logger.debug(`Game ${gameId} not in cache, fetching from MongoDB`);
    const gameDoc = await this.gameModel.findById(gameId).exec();

    if (gameDoc) {
      // Cache the game state for future requests
      const gameObj = gameDoc.toObject();
      await this.redisCache.setGameState(gameId, gameObj, {
        skipPersistence: true, // Don't queue persistence since it's already in DB
      });
      return gameObj;
    }

    return null;
  }

  /**
   * Save game state - saves to Redis cache and queues MongoDB persistence
   */
  private async saveGameState(
    gameId: string,
    game: any, // Using any to handle cleaned board data
    priority: number = 5
  ): Promise<void> {
    this.logger.debug(
      `Saving game ${gameId} to Redis with priority ${priority}`
    );
    await this.redisCache.setGameState(gameId, game as Game, { priority });
  }

  async findAll() {
    const games = await this.gameModel.find().exec();
    return {
      games,
      message: "LOL Chess games retrieved successfully",
    };
  }

  async findOne(id: string) {
    const game = await this.getGameState(id);
    if (game) {
      this.logger.debug(
        `FindOne: Game ${id} has ${game.board?.length || 0} pieces`
      );
      if (game.board && game.board.length > 0) {
        this.logger.debug(
          `FindOne: First piece HP: ${game.board[0]?.stats?.hp || "N/A"}`
        );
      }
    }
    return {
      game,
      message: game ? "Game found" : "Game not found",
    };
  }

  async getActiveGameForUser(userId: string) {
    // Find games where the user is a player and the game is not finished
    // Note: This query must go to MongoDB as we need to search across games
    const gameDoc = await this.gameModel
      .findOne({
        $or: [{ bluePlayer: userId }, { redPlayer: userId }],
        status: { $in: ["ban_pick", "in_progress"] },
      })
      .exec();

    if (gameDoc) {
      const game = gameDoc.toObject();
      const gameId = game._id?.toString() || gameDoc._id.toString();
      this.logger.log(`User ${userId} has an active game: ${gameId}`);

      // Cache the game state for future requests
      await this.redisCache.setGameState(gameId, game, {
        skipPersistence: true,
      });

      return {
        game,
        hasActiveGame: true,
        message: "Active game found",
      };
    }

    return {
      game: null,
      hasActiveGame: false,
      message: "No active game found",
    };
  }

  async create(createGameDto: any) {
    const newGame = new this.gameModel({
      ...createGameDto,
      maxPlayers: 2, // 1v1 game
      status: "ban_pick", // Start with ban/pick phase
      phase: "ban_phase",
      players: [],
    });

    const savedGame = await newGame.save();

    return {
      game: savedGame,
      message: "1v1 game created successfully",
    };
  }

  async initializeBanPickPhase(
    gameId: string,
    bluePlayerId: string,
    redPlayerId: string
  ) {
    const game = await this.gameModel.findById(gameId).exec();
    if (!game) {
      throw new Error("Game not found");
    }

    // Set up players with sides
    game.bluePlayer = bluePlayerId;
    game.redPlayer = redPlayerId;

    // Update player objects
    game.players = game.players.map((player) => {
      if (player.userId === bluePlayerId) {
        player.side = "blue";
        player.position = 0;
      } else if (player.userId === redPlayerId) {
        player.side = "red";
        player.position = 1;
      }
      return player;
    });

    // Initialize ban/pick state
    game.banPickState = {
      phase: "ban",
      currentTurn: "blue", // Blue always starts
      turnNumber: 1,
      bannedChampions: [],
      blueBans: [],
      redBans: [],
      banHistory: [], // Track each ban turn
      bluePicks: [],
      redPicks: [],
      turnStartTime: Date.now(),
      turnTimeLimit: 30, // 30 seconds per turn
    };

    game.status = "ban_pick";
    game.phase = "ban_phase";

    await game.save();
    return game;
  }

  async processSkipBan(gameId: string, playerId: string) {
    const game = await this.gameModel.findById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.phase !== "ban_phase") {
      throw new Error("Not in ban phase");
    }

    const banPickState = game.banPickState;
    if (!banPickState || banPickState.phase !== "ban") {
      throw new Error("Not in ban phase");
    }

    // Verify it's the player's turn
    const playerSide =
      game.bluePlayer?.toString() === playerId ? "blue" : "red";
    if (banPickState.currentTurn !== playerSide) {
      throw new Error("It's not your turn");
    }

    // Skip the ban by advancing to the next turn without adding to banned champions
    // But we still need to track this as a ban turn for phase advancement

    // Add "SKIPPED" to ban history to track this turn
    banPickState.banHistory.push("SKIPPED");

    // Advance to next turn
    banPickState.turnNumber++;

    // Check if we need to switch phases (10 total ban turns)
    if (banPickState.turnNumber > 10) {
      // Switch to pick phase
      banPickState.phase = "pick";
      banPickState.currentTurn = "blue"; // Blue starts picks
      banPickState.turnNumber = 1;
      game.phase = "pick_phase";
    } else {
      // Continue in ban phase - alternating bans
      const nextTurn =
        BAN_ORDER[(banPickState.turnNumber - 1) % BAN_ORDER.length];
      banPickState.currentTurn = nextTurn;
    }

    banPickState.turnStartTime = Date.now();

    await game.save();
    return game;
  }

  async processBanPickAction(
    gameId: string,
    playerId: string,
    championId: string,
    actionType: "ban" | "pick"
  ) {
    const game = await this.gameModel.findById(gameId).exec();
    if (!game || !game.banPickState) {
      throw new Error("Game or ban/pick state not found");
    }

    const player = game.players.find((p) => p.userId === playerId);
    if (!player || !player.side) {
      throw new Error("Player not found or side not assigned");
    }

    const banPickState = game.banPickState;

    // Validate turn
    if (banPickState.currentTurn !== player.side) {
      throw new Error("Not your turn");
    }

    // Validate action type matches current phase
    if (actionType !== banPickState.phase) {
      throw new Error(
        `Current phase is ${banPickState.phase}, not ${actionType}`
      );
    }

    // Validate champion not already banned/picked (skip this check if championId is null for skip)
    if (
      championId &&
      (banPickState.bannedChampions.includes(championId) ||
        banPickState.bluePicks.includes(championId) ||
        banPickState.redPicks.includes(championId))
    ) {
      throw new Error("Champion already banned or picked");
    }

    // Process the action
    if (actionType === "ban") {
      if (championId) {
        banPickState.bannedChampions.push(championId);
        banPickState.banHistory.push(championId); // Track in ban history

        if (player.side === "blue") {
          banPickState.blueBans.push(championId);
        } else {
          banPickState.redBans.push(championId);
        }
        player.bannedChampions.push(championId);
      } else {
        // Skip ban
        banPickState.banHistory.push("SKIPPED");
      }
    } else if (actionType === "pick") {
      if (!championId) {
        throw new Error("Champion ID is required for pick action");
      }

      if (player.side === "blue") {
        banPickState.bluePicks.push(championId);
      } else {
        banPickState.redPicks.push(championId);
      }
      player.selectedChampions.push(championId);
    }

    // Advance turn
    const totalActions =
      banPickState.bannedChampions.length +
      banPickState.bluePicks.length +
      banPickState.redPicks.length;

    // Advance to next turn first
    banPickState.turnNumber++;

    // Check if we need to switch phases
    if (banPickState.phase === "ban" && banPickState.turnNumber > 10) {
      // Switch to pick phase after 10 ban turns
      banPickState.phase = "pick";
      banPickState.currentTurn = "blue"; // Blue starts picks
      banPickState.turnNumber = 1;
      game.phase = "pick_phase";
    } else if (
      banPickState.phase === "pick" &&
      banPickState.bluePicks.length + banPickState.redPicks.length >= 10
    ) {
      // Ban/Pick complete
      banPickState.phase = "complete";
      game.phase = "gameplay";
      game.status = "in_progress";
    } else {
      // Continue in current phase
      if (banPickState.phase === "ban") {
        // Alternating bans
        const nextTurn =
          BAN_ORDER[(banPickState.turnNumber - 1) % BAN_ORDER.length];
        banPickState.currentTurn = nextTurn;
      } else if (banPickState.phase === "pick") {
        // Snake draft picks
        const pickIndex =
          banPickState.bluePicks.length + banPickState.redPicks.length;
        if (pickIndex < PICK_ORDER.length) {
          banPickState.currentTurn = PICK_ORDER[pickIndex];
        }
      }
    }

    banPickState.turnStartTime = Date.now();

    await game.save();
    return game;
  }

  async addPlayerToGame(gameId: string, playerId: string, username: string) {
    const game = await this.gameModel.findById(gameId).exec();
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.players.length >= game.maxPlayers) {
      throw new Error("Game is full");
    }

    const newPlayer = {
      id: Math.random().toString(36).substring(7),
      userId: playerId,
      username: username,
      health: 100,
      gold: 0,
      level: 1,
      experience: 0,
      board: [],
      bench: [],
      position: game.players.length,
      isEliminated: false,
      lastRoundDamage: 0,
      selectedChampions: [],
      bannedChampions: [],
    };

    game.players.push(newPlayer);

    // If we have 2 players, initialize ban/pick phase
    if (game.players.length === 2) {
      const bluePlayer = game.players[0].userId;
      const redPlayer = game.players[1].userId;
      await this.initializeBanPickPhase(gameId, bluePlayer, redPlayer);
    }

    await game.save();
    return game;
  }

  // Add multiple players to a game in one operation to avoid version conflicts
  async addPlayersToGame(
    gameId: string,
    players: Array<{ userId: string; username: string }>
  ) {
    const game = await this.gameModel.findById(gameId).exec();
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.players.length + players.length > game.maxPlayers) {
      throw new Error("Adding these players would exceed game capacity");
    }

    // Add all players
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const newPlayer = {
        id: Math.random().toString(36).substring(7),
        userId: player.userId,
        username: player.username,
        health: 100,
        gold: 0,
        level: 1,
        experience: 0,
        board: [],
        bench: [],
        position: game.players.length + i,
        isEliminated: false,
        lastRoundDamage: 0,
        selectedChampions: [],
        bannedChampions: [],
      };
      game.players.push(newPlayer);
    }
    await game.save();

    // If we have 2 players, initialize ban/pick phase
    if (game.players.length === 2) {
      const bluePlayer = game.players[0].userId;
      const redPlayer = game.players[1].userId;
      await this.initializeBanPickPhase(gameId, bluePlayer, redPlayer);
    }

    return game;
  }

  async addPlayersToGameForQueue(
    gameId: string,
    players: Array<{ userId: string; username: string }>
  ): Promise<{ game: Game; message: string }> {
    const game = await this.gameModel.findById(gameId).exec();
    if (!game) {
      return {
        game: null,
        message: "Game not found",
      };
    }

    // Add players to the game
    for (const player of players) {
      const newPlayer = {
        id: Math.random().toString(36).substring(7),
        userId: player.userId,
        username: player.username,
        gold: 0,
        board: [],
        bench: [],
        position: game.players.length,
        isEliminated: false,
        lastRoundDamage: 0,
        selectedChampions: [],
        bannedChampions: [],
        side: game.players.length === 0 ? "blue" : "red", // First player is blue, second is red
      };
      game.players.push(newPlayer);
    }

    // Set player IDs for the game
    if (game.players.length >= 2) {
      game.bluePlayer = game.players.find((p) => p.side === "blue")?.userId;
      game.redPlayer = game.players.find((p) => p.side === "red")?.userId;
    }

    await game.save();

    // Initialize ban/pick phase if we have 2 players
    if (game.players.length === 2) {
      const bluePlayer = game.players[0].userId;
      const redPlayer = game.players[1].userId;
      await this.initializeBanPickPhase(gameId, bluePlayer, redPlayer);
    }

    return {
      game,
      message: "Players added successfully",
    };
  }

  async initializeGameplay(
    gameId: string
  ): Promise<{ game: Game; message: string }> {
    const game = await this.getGameState(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (
      game.phase !== "gameplay" ||
      !game.banPickState ||
      game.banPickState.phase !== "complete"
    ) {
      throw new Error(
        "Game is not ready for gameplay initialization - ban/pick phase must be complete"
      );
    }

    try {
      // Extract champion selections from players (not banPickState)
      const bluePlayer = game.players.find((p) => p.side === "blue");
      const redPlayer = game.players.find((p) => p.side === "red");

      const blueChampions = bluePlayer?.selectedChampions || [];
      const redChampions = redPlayer?.selectedChampions || [];

      this.logger.log("Initializing with champions:", {
        blueChampions,
        redChampions,
      });

      // Import GameLogic and initialize the game board
      const { GameLogic } = await import("./game.logic");
      const initializedGame = GameLogic.initGame(
        game,
        blueChampions,
        redChampions
      );

      this.logger.log(
        "Initialized game board:",
        initializedGame.board.length,
        "pieces"
      );

      // Save to Redis cache and queue MongoDB persistence
      // High priority (8) since this is a critical game state transition
      await this.saveGameState(gameId, initializedGame, 8);

      return {
        game: initializedGame,
        message: "Game successfully initialized for gameplay",
      };
    } catch (error) {
      return {
        game,
        message: `Failed to initialize gameplay: ${error.message}`,
      };
    }
  }

  async executeAction(
    gameId: string,
    actionData: any
  ): Promise<{ game: Game; message: string }> {
    // Get game from Redis cache first
    const game = await this.getGameState(gameId);
    if (!game) {
      return {
        game: null,
        message: "Game not found",
      };
    }

    if (game.status !== "in_progress" || game.phase !== "gameplay") {
      return {
        game,
        message: "Game is not in progress or not in gameplay phase",
      };
    }

    try {
      // Import GameLogic and process the action
      const { GameLogic } = await import("./game.logic");

      // Create EventPayload from actionData
      const eventPayload = {
        playerId: actionData.playerId,
        event: actionData.event,
        casterPosition: actionData.casterPosition,
        targetPosition: actionData.targetPosition,
        itemId: actionData.itemId,
        targetChampionId: actionData.targetChampionId,
      };

      const updatedGame = GameLogic.processGame(game, eventPayload);

      this.logger.debug(
        "Game processed successfully, board has",
        updatedGame.board.length,
        "pieces"
      );
      this.logger.debug("First piece stats:", updatedGame.board[0]?.stats);

      // Import ChessObject for effective stats calculation
      const { ChessObject } = await import("./class/chess");

      // Clean the board data to remove MongoDB-specific properties that cause casting errors
      const cleanedBoard = updatedGame.board.map((piece) => {
        // Debug: Check if champions have skills before cleaning
        if (
          piece.name !== "Melee Minion" &&
          piece.name !== "Caster Minion" &&
          piece.name !== "Siege Minion" &&
          piece.name !== "Poro"
        ) {
          console.log(
            `Cleaning ${piece.name}: skill =`,
            piece.skill
              ? {
                  name: piece.skill.name,
                  type: piece.skill.type,
                  cooldown: piece.skill.cooldown,
                  currentCooldown: piece.skill.currentCooldown,
                  targetTypes: piece.skill.targetTypes,
                }
              : "undefined"
          );
        }

        // Create ChessObject to calculate effective stats
        const chessObject = new ChessObject(piece, updatedGame);

        const cleanedPiece = {
          id: piece.id,
          name: piece.name,
          position: {
            x: piece.position.x,
            y: piece.position.y,
          },
          cannotMoveBackward: piece.cannotMoveBackward,
          canOnlyMoveVertically: piece.canOnlyMoveVertically || false,
          hasMovedBefore: piece.hasMovedBefore || false,
          cannotAttack: piece.cannotAttack,
          ownerId: piece.ownerId,
          stats: {
            hp: piece.stats.hp, // Current HP is not affected by modifiers
            maxHp: chessObject.getEffectiveStat(piece, "maxHp"),
            ad: chessObject.getEffectiveStat(piece, "ad"),
            ap: chessObject.getEffectiveStat(piece, "ap"),
            physicalResistance: chessObject.getEffectiveStat(
              piece,
              "physicalResistance"
            ),
            magicResistance: chessObject.getEffectiveStat(
              piece,
              "magicResistance"
            ),
            speed: chessObject.getEffectiveStat(piece, "speed"),
            attackRange: {
              diagonal: piece.stats.attackRange.diagonal,
              horizontal: piece.stats.attackRange.horizontal,
              vertical: piece.stats.attackRange.vertical,
              range:
                chessObject.getEffectiveStat(piece, "range") ||
                piece.stats.attackRange.range,
            },
            goldValue: piece.stats.goldValue, // Gold value is not affected by modifiers
          },
          // Include raw stats for comparison/debugging if needed
          rawStats: {
            hp: piece.stats.hp,
            maxHp: piece.stats.maxHp,
            ad: piece.stats.ad,
            ap: piece.stats.ap,
            physicalResistance: piece.stats.physicalResistance,
            magicResistance: piece.stats.magicResistance,
            speed: piece.stats.speed,
            attackRange: {
              diagonal: piece.stats.attackRange.diagonal,
              horizontal: piece.stats.attackRange.horizontal,
              vertical: piece.stats.attackRange.vertical,
              range: piece.stats.attackRange.range,
            },
            goldValue: piece.stats.goldValue,
          },
          blue: piece.blue,
          items: piece.items
            ? piece.items.map((item) => ({
                id: item.id,
                name: item.name,
                description: item.description,
                stats: item.stats,
                unique: item.unique,
              }))
            : [],
          debuffs: piece.debuffs
            ? piece.debuffs.map((debuff) => ({
                id: debuff.id,
                name: debuff.name,
                description: debuff.description,
                duration: debuff.duration,
                maxDuration: debuff.maxDuration,
                effects: debuff.effects
                  ? debuff.effects.map((effect) => ({
                      stat: effect.stat,
                      modifier: effect.modifier,
                      type: effect.type,
                    }))
                  : [],
                damagePerTurn: debuff.damagePerTurn || 0,
                damageType: debuff.damageType || "0",
                healPerTurn: debuff.healPerTurn || 0,
                unique: debuff.unique || false,
                appliedAt: debuff.appliedAt,
                casterPlayerId: debuff.casterPlayerId,
              }))
            : [],
          auras: piece.auras
            ? piece.auras.map((aura) => ({
                id: aura.id,
                name: aura.name,
                description: aura.description,
                range: aura.range,
                effects: aura.effects
                  ? aura.effects.map((effect) => ({
                      stat: effect.stat,
                      modifier: effect.modifier,
                      type: effect.type,
                      target: effect.target,
                    }))
                  : [],
                active: aura.active,
                requiresAlive: aura.requiresAlive,
                duration: aura.duration,
              }))
            : [],
          skill: piece.skill
            ? {
                name: piece.skill.name,
                description: piece.skill.description,
                cooldown: piece.skill.cooldown,
                attackRange: piece.skill.attackRange
                  ? {
                      diagonal: piece.skill.attackRange.diagonal,
                      horizontal: piece.skill.attackRange.horizontal,
                      vertical: piece.skill.attackRange.vertical,
                      range: piece.skill.attackRange.range,
                    }
                  : {
                      diagonal: false,
                      horizontal: false,
                      vertical: false,
                      range: 1,
                    },
                targetTypes: piece.skill.targetTypes,
                currentCooldown: piece.skill.currentCooldown,
                type: piece.skill.type,
                payload: piece.skill.payload,
              }
            : undefined,
        };

        // Debug: Check if skill survived cleaning
        if (
          piece.name !== "Melee Minion" &&
          piece.name !== "Caster Minion" &&
          piece.name !== "Siege Minion" &&
          piece.name !== "Poro"
        ) {
          console.log(
            `After cleaning ${piece.name}: skill =`,
            cleanedPiece.skill ? "present" : "filtered out"
          );
        }

        return cleanedPiece;
      });

      console.log(
        "About to save cleaned board with",
        cleanedBoard.length,
        "pieces"
      );
      console.log(
        "Sample cleaned piece:",
        JSON.stringify(cleanedBoard[0], null, 2)
      );

      // Save to Redis cache and queue MongoDB persistence
      // High priority (7) for gameplay actions
      const gameToSave = {
        ...updatedGame,
        board: cleanedBoard, // Use cleaned board with effective stats
      };

      await this.saveGameState(gameId, gameToSave, 7);

      this.logger.log(
        "Game saved successfully to Redis, board has",
        gameToSave.board.length,
        "pieces"
      );

      return {
        game: gameToSave as any,
        message: "Action executed successfully",
      };
    } catch (error) {
      return {
        game,
        message: `Failed to execute action: ${error.message}`,
      };
    }
  }

  async resetGameplay(
    gameId: string
  ): Promise<{ game: Game; message: string }> {
    // Get game from Redis cache first
    const game = await this.getGameState(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    game.phase = "gameplay";
    game.board = [];
    // Extract champion selections from players (not banPickState)
    const bluePlayer = game.players.find((p) => p.side === "blue");
    const redPlayer = game.players.find((p) => p.side === "red");

    const blueChampions = bluePlayer?.selectedChampions || [];
    const redChampions = redPlayer?.selectedChampions || [];

    // Import GameLogic and initialize the game board
    const { GameLogic } = await import("./game.logic");
    const initializedGame = GameLogic.initGame(
      game,
      blueChampions,
      redChampions
    );
    // Save to Redis cache and queue MongoDB persistence
    // High priority (8) for gameplay reset
    await this.saveGameState(gameId, initializedGame, 8);

    return {
      game: initializedGame,
      message: "Gameplay reset successfully",
    };
  }
}
