import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Chess, Game, GameDocument } from "./game.schema";
import { GameLogic } from "./game.logic";
import { RedisGameCacheService } from "../redis/redis-game-cache.service";
import { ChessObject } from "./class/chess";
import { ChessFactory } from "./class/chessFactory";

// Ban/Pick patterns from RULE.md
// 4 total bans (2 per player)
const BAN_ORDER: ("blue" | "red")[] = ["blue", "red", "blue", "red"];

// Pick order for 10 total picks (5 per player) - snake draft
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
  ) { }

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
    return {
      game: { ...game, board: this.cleanBoard(game) },
      message: game ? "Game found" : "Game not found",
    };
  }

  async findOneById(gameId: string) {
    return this.gameModel.findById(gameId).lean().exec();
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
      blueChampionOrder: [],
      redChampionOrder: [],
      blueReady: false,
      redReady: false,
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

    // Check if we need to switch phases (4 total ban turns)
    if (banPickState.turnNumber > 4) {
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

    // Save to MongoDB
    const savedGame = await game.save();

    // Convert Mongoose document to plain object
    const gameObject = savedGame.toObject();

    // Also save to Redis cache for consistency
    // High priority (7) since this is a real-time game state update
    await this.saveGameState(gameId, gameObject, 7);

    return gameObject;
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

    // Advance to next turn first
    banPickState.turnNumber++;

    // Check if we need to switch phases
    if (banPickState.phase === "ban" && banPickState.turnNumber > 4) {
      // Switch to pick phase after 4 ban turns
      banPickState.phase = "pick";
      banPickState.currentTurn = "blue"; // Blue starts picks
      banPickState.turnNumber = 1;
      game.phase = "pick_phase";
    } else if (
      banPickState.phase === "pick" &&
      banPickState.bluePicks.length + banPickState.redPicks.length >= 10
    ) {
      // Picks complete - transition to reorder phase
      console.log(`[SERVICE] 🔄 Transitioning to REORDER phase! Total picks: ${banPickState.bluePicks.length + banPickState.redPicks.length}`);
      banPickState.phase = "reorder";
      banPickState.blueChampionOrder = [...banPickState.bluePicks];
      banPickState.redChampionOrder = [...banPickState.redPicks];
      banPickState.blueReady = false;
      banPickState.redReady = false;
      console.log(`[SERVICE] Phase is now: ${banPickState.phase}`);
      console.log(`[SERVICE] Blue order:`, banPickState.blueChampionOrder);
      console.log(`[SERVICE] Red order:`, banPickState.redChampionOrder);
      // Keep game.phase as "pick_phase" and status as "ban_pick"
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

    // Save to MongoDB
    const savedGame = await game.save();

    // Convert Mongoose document to plain object
    const gameObject = savedGame.toObject();

    // Also save to Redis cache for consistency
    // High priority (7) since this is a real-time game state update
    await this.saveGameState(gameId, gameObject, 7);

    console.log("Ban/pick state after save:", gameObject.banPickState);
    console.log(`[SERVICE] ⚠️ FINAL phase after save: ${gameObject.banPickState?.phase}`);
    return gameObject;
  }

  async processReorderAction(
    gameId: string,
    playerId: string,
    newOrder: string[]
  ) {
    // Get Mongoose document (not cached object) so we can save
    const game = await this.gameModel.findById(gameId).exec();
    if (!game) {
      throw new Error("Game not found");
    }

    const banPickState = game.banPickState;
    if (!banPickState) {
      throw new Error("Ban/pick state not found");
    }

    if (banPickState.phase !== "reorder") {
      throw new Error("Cannot reorder champions - not in reorder phase");
    }

    // Find player's side
    const player = game.players.find((p) => p.userId === playerId);
    if (!player || !player.side) {
      throw new Error("Player not found or side not assigned");
    }

    // Validate the new order contains the same champions as the original picks
    const originalPicks = player.side === "blue" ? banPickState.bluePicks : banPickState.redPicks;

    if (newOrder.length !== originalPicks.length) {
      throw new Error(`Invalid champion order - expected ${originalPicks.length} champions`);
    }

    // Check that all champions in newOrder are in originalPicks
    const sortedOriginal = [...originalPicks].sort();
    const sortedNew = [...newOrder].sort();
    if (JSON.stringify(sortedOriginal) !== JSON.stringify(sortedNew)) {
      throw new Error("Invalid champion order - champions don't match original picks");
    }

    // Update the champion order
    if (player.side === "blue") {
      banPickState.blueChampionOrder = newOrder;
    } else {
      banPickState.redChampionOrder = newOrder;
    }

    // Save to MongoDB
    const savedGame = await game.save();

    // Convert Mongoose document to plain object
    const gameObject = savedGame.toObject();

    // Save to Redis cache
    await this.saveGameState(gameId, gameObject, 7);

    console.log(`Player ${playerId} (${player.side}) reordered champions:`, newOrder);
    return gameObject;
  }

  async setPlayerReady(
    gameId: string,
    playerId: string,
    ready: boolean
  ): Promise<{ game: Game; shouldStartGame: boolean }> {
    // Get Mongoose document (not cached object) so we can save
    const game = await this.gameModel.findById(gameId).exec();
    if (!game) {
      throw new Error("Game not found");
    }

    const banPickState = game.banPickState;
    if (!banPickState) {
      throw new Error("Ban/pick state not found");
    }

    if (banPickState.phase !== "reorder") {
      throw new Error("Cannot set ready - not in reorder phase");
    }

    // Find player's side
    const player = game.players.find((p) => p.userId === playerId);
    if (!player || !player.side) {
      throw new Error("Player not found or side not assigned");
    }

    // Update ready status
    if (player.side === "blue") {
      banPickState.blueReady = ready;
    } else {
      banPickState.redReady = ready;
    }

    let shouldStartGame = false;

    // Check if both players are ready
    if (banPickState.blueReady && banPickState.redReady) {
      // Transition to complete phase
      banPickState.phase = "complete";
      game.phase = "gameplay";
      game.status = "in_progress";

      // Update player.selectedChampions from the final champion orders
      const bluePlayer = game.players.find((p) => p.side === "blue");
      const redPlayer = game.players.find((p) => p.side === "red");

      if (bluePlayer) {
        bluePlayer.selectedChampions = banPickState.blueChampionOrder;
      }
      if (redPlayer) {
        redPlayer.selectedChampions = banPickState.redChampionOrder;
      }

      shouldStartGame = true;
    }

    // Save to MongoDB
    const savedGame = await game.save();

    // Convert Mongoose document to plain object
    const gameObject = savedGame.toObject();

    // Save to Redis cache
    await this.saveGameState(gameId, gameObject, 8);

    console.log(`Player ${playerId} (${player.side}) ready status:`, ready);
    console.log(`Both ready: ${banPickState.blueReady && banPickState.redReady}`);

    return { game: gameObject, shouldStartGame };
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

    if (!game.banPickState || game.banPickState.phase !== "complete") {
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
  ): Promise<{ game: Game; oldGame?: Game; message: string }> {
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
      // Store old game state (deep clone) before processing
      const oldGame = JSON.parse(JSON.stringify(game));

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

      // Clean the board data to remove MongoDB-specific properties that cause casting errors
      const cleanedBoard = this.cleanBoard(updatedGame);

      await this.saveGameState(gameId, updatedGame, 7);

      return {
        game: { ...updatedGame, board: cleanedBoard } as any,
        oldGame: updatedGame.lastAction
          ? ({ ...oldGame, board: this.cleanBoard(oldGame) } as any)
          : undefined,
        message: "Action executed successfully",
      };
    } catch (error) {
      this.logger.error(`Error executing action: ${error.message}`);
      const cleanedBoard = this.cleanBoard(game);
      return {
        game: { ...game, board: cleanedBoard } as any,
        message: `Failed to execute action: ${error.message}`,
      };
    }
  }

  cleanBoard(updatedGame: Game): any[] {
    return updatedGame.board.map((piece) => {
      // Create ChessObject to calculate effective stats
      const chessObject = ChessFactory.createChess(piece, updatedGame);
      if (chessObject.chess.name === "Yasuo") {
        console.log(
          "Yasuo stats:",
          chessObject.getEffectiveStat(piece, "criticalChance")
        );
      }

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
          maxHp: chessObject.maxHp,
          ad: chessObject.ad,
          ap: chessObject.ap,
          physicalResistance: chessObject.physicalResistance,
          magicResistance: chessObject.magicResistance,
          speed: chessObject.speed,
          attackRange: {
            diagonal: piece.stats.attackRange.diagonal,
            horizontal: piece.stats.attackRange.horizontal,
            vertical: piece.stats.attackRange.vertical,
            range: chessObject.range,
          },
          goldValue: piece.stats.goldValue, // Gold value is not affected by modifiers
          sunder: chessObject.sunder,
          criticalChance: chessObject.criticalChance,
          criticalDamage: chessObject.criticalDamage,
          cooldownReduction: chessObject.cooldownReduction,
          lifesteal: chessObject.lifesteal,
          damageAmplification: chessObject.damageAmplification,
          hpRegen: chessObject.hpRegen,
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
          sunder: piece.stats.sunder || 0,
          criticalChance: piece.stats.criticalChance || 0,
          criticalDamage: piece.stats.criticalDamage || 150,
          cooldownReduction: piece.stats.cooldownReduction || 0,
          lifesteal: piece.stats.lifesteal || 0,
          damageAmplification: piece.stats.damageAmplification || 0,
          hpRegen: piece.stats.hpRegen || 0,
        },
        blue: piece.blue,
        items: piece.items
          ? piece.items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            payload: item.payload,
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
            casterName: debuff.casterName,
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
        shields: piece.shields
          ? piece.shields.map((shield) => ({
            id: shield.id,
            amount: shield.amount,
            duration: shield.duration,
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
        deadAtRound: piece.deadAtRound,
      };

      return cleanedPiece;
    });
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

  async resetBanPick(gameId: string): Promise<{ game: Game; message: string }> {
    // Get game from Redis cache first
    const game = await this.getGameState(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    // Reset ban/pick state to initial state
    game.status = "ban_pick";
    game.banPickState = {
      phase: "ban",
      currentTurn: "blue",
      turnNumber: 1,
      turnStartTime: Date.now(),
      turnTimeLimit: 30,
      bannedChampions: [],
      blueBans: [],
      redBans: [],
      bluePicks: [],
      redPicks: [],
      blueChampionOrder: [],
      redChampionOrder: [],
      blueReady: false,
      redReady: false,
      banHistory: [],
    };

    // Clear player champion selections
    game.players = game.players.map((player) => ({
      ...player,
      selectedChampions: [],
    }));

    // Save to Redis cache and queue MongoDB persistence
    // High priority (8) for ban/pick reset
    await this.saveGameState(gameId, game, 8);

    return {
      game,
      message: "Ban/Pick phase reset successfully",
    };
  }

  async buyItem(
    gameId: string,
    buyItemData: { itemId: string; championId: string }
  ): Promise<{ game: Game; oldGame?: Game; message: string }> {
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
      // Store old game state (deep clone) before processing
      const oldGame = JSON.parse(JSON.stringify(game));

      // Get the current user from the request (would need to be passed in properly)
      // For now, we'll determine from the championId ownership
      const champion = game.board.find(
        (piece) => piece.id === buyItemData.championId
      );
      if (!champion) {
        throw new Error("Champion not found");
      }

      const playerId = champion.ownerId;

      // Create BUY_ITEM event
      const eventPayload = {
        playerId: playerId,
        event: "buy_item" as any,
        itemId: buyItemData.itemId,
        targetChampionId: buyItemData.championId,
      };

      // Import GameLogic and process the buy item action
      const { GameLogic } = await import("./game.logic");
      const updatedGame = GameLogic.processGame(game, eventPayload);

      // Import ChessObject for effective stats calculation
      // Clean the board data (similar to executeAction)
      const cleanedBoard = this.cleanBoard(updatedGame);

      // Save to Redis cache and queue MongoDB persistence
      await this.saveGameState(gameId, updatedGame, 7);

      return {
        game: { ...updatedGame, board: cleanedBoard } as any,
        oldGame: updatedGame.lastAction
          ? ({ ...oldGame, board: this.cleanBoard(oldGame) } as any)
          : undefined,
        message: "Item purchased successfully",
      };
    } catch (error) {
      this.logger.error(`Error buying item: ${error.message}`);
      return {
        game: null,
        message: `Failed to buy item: ${error.message}`,
      };
    }
  }

  async resign(gameId: string, userId: string) {
    const game = await this.getGameState(gameId);
    if (!game) {
      return { success: false, message: "Game not found" };
    }

    if (game.status === "finished") {
      return { success: false, message: "Game already finished" };
    }

    try {
      // Determine winner (the other player)
      let winner: string;
      if (userId === game.bluePlayer) {
        winner = "red";
      } else if (userId === game.redPlayer) {
        winner = "blue";
      } else {
        return { success: false, message: "User is not a player in this game" };
      }

      // Update game state
      game.status = "finished";
      game.winner = winner;

      // Save to database
      await this.saveGameState(gameId, game);

      this.logger.log(
        `Game ${gameId}: Player ${userId} resigned. Winner: ${winner}`
      );

      return {
        success: true,
        game,
        message: `Player resigned. ${winner === "blue" ? "Blue" : "Red"} player wins!`,
      };
    } catch (error) {
      this.logger.error(`Error processing resignation: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async acceptDraw(gameId: string) {
    const game = await this.getGameState(gameId);
    if (!game) {
      return { success: false, message: "Game not found" };
    }

    if (game.status === "finished") {
      return { success: false, message: "Game already finished" };
    }

    try {
      // End game as draw
      game.status = "finished";
      game.winner = null;

      // Save to database
      await this.saveGameState(gameId, game);

      this.logger.log(`Game ${gameId}: Draw accepted by both players`);

      return {
        success: true,
        game,
        message: "Game ended in a draw by mutual agreement",
      };
    } catch (error) {
      this.logger.error(`Error accepting draw: ${error.message}`);
      return { success: false, message: error.message };
    }
  }
}
