import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { GameService } from "./game.service";
import { QueueService, QueuePlayer } from "./queue.service";
import { SimpleBotService } from "./simple-bot.service";

// Delay for bot actions to make them feel more natural
const BOT_ACTION_DELAY_MS = 1500;

@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  // No namespace - this handles the root namespace for queue/matchmaking
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private socketUsers = new Map<string, string>(); // socketId -> userId

  constructor(
    private readonly gameService: GameService,
    private readonly queueService: QueueService,
    private readonly simpleBotService: SimpleBotService
  ) {}

  handleConnection(client: Socket) {
    console.log(`Queue Gateway - Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Queue Gateway - Client disconnected: ${client.id}`);

    // Clean up user mappings and remove from queue
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      this.queueService.removeFromQueue(userId);
      this.socketUsers.delete(client.id);
      console.log(`Removed user ${userId} from queue on disconnect`);
    }
  }

  @SubscribeMessage("joinQueue")
  async handleJoinQueue(
    @MessageBody() data: { userId: string; username: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { userId, username } = data;

      console.log(`User ${username} (${userId}) joining queue`);

      // Check if user is already in an active game
      const activeGameResult =
        await this.gameService.getActiveGameForUser(userId);
      if (activeGameResult.hasActiveGame) {
        client.emit("alreadyInGame", {
          game: activeGameResult.game,
          message:
            "You are already in an active game. Please finish or leave that game first.",
        });
        return;
      }

      // Store socket mapping
      this.socketUsers.set(client.id, userId);

      // Add to queue
      const queuePlayer: QueuePlayer = {
        id: `queue_${Date.now()}`,
        userId,
        username,
        socketId: client.id,
        queuedAt: new Date(),
      };

      const queueStatus = this.queueService.addToQueue(queuePlayer);

      // Notify client they joined the queue
      client.emit("queueJoined", queueStatus);

      // Check for match immediately
      this.checkForMatches();
    } catch (error) {
      console.error("Error joining queue:", error);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("leaveQueue")
  handleLeaveQueue(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { userId } = data;

      console.log(`User ${userId} leaving queue`);

      const removed = this.queueService.removeFromQueue(userId);

      if (removed) {
        client.emit("queueLeft", { message: "Left queue successfully" });
      }

      // Clean up socket mapping
      this.socketUsers.delete(client.id);
    } catch (error) {
      console.error("Error leaving queue:", error);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("getQueueStatus")
  handleGetQueueStatus(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { userId } = data;

      const position = this.queueService.getQueuePosition(userId);
      const queueSize = this.queueService.getQueueSize();

      client.emit("queueStatus", {
        position: position > 0 ? position : null,
        queueSize,
        inQueue: position > 0,
      });
    } catch (error) {
      console.error("Error getting queue status:", error);
      client.emit("error", { message: error.message });
    }
  }

  private async checkForMatches() {
    const queue = this.queueService.getQueueStatus();

    // Need at least 2 players for a match
    if (queue.length < 2) {
      return;
    }

    // Take the first 2 players
    const player1 = queue[0];
    const player2 = queue[1];

    try {
      // Remove players from queue first
      this.queueService.removeFromQueue(player1.userId);
      this.queueService.removeFromQueue(player2.userId);

      // Create a new game
      const gameData = {
        name: `${player1.username} vs ${player2.username}`,
        maxPlayers: 2,
        gameSettings: {
          roundTime: 60,
          startingGold: 0,
        },
      };

      const gameResult = await this.gameService.create(gameData);
      const game = gameResult.game;

      if (!game) {
        throw new Error("Failed to create game");
      }

      // Add both players to the game
      const addPlayersResult = await this.gameService.addPlayersToGameForQueue(
        game.id,
        [
          { userId: player1.userId, username: player1.username },
          { userId: player2.userId, username: player2.username },
        ]
      );

      if (!addPlayersResult.game) {
        throw new Error(addPlayersResult.message);
      }

      const updatedGameData = addPlayersResult.game;

      // Notify both players of the match
      const matchData = {
        game: updatedGameData,
        phase: "ban_pick", // Start with ban/pick phase
      };

      // Send to player 1
      const socket1 = this.server.sockets.sockets.get(player1.socketId);
      if (socket1) {
        socket1.emit("matchFound", {
          ...matchData,
          opponent: { id: player2.userId, username: player2.username },
        });
      }

      // Send to player 2
      const socket2 = this.server.sockets.sockets.get(player2.socketId);
      if (socket2) {
        socket2.emit("matchFound", {
          ...matchData,
          opponent: { id: player1.userId, username: player1.username },
        });
      }
    } catch (error) {
      console.error("Error creating match:", error);

      // Re-add players to queue if match creation failed
      try {
        this.queueService.addToQueue(player1);
        this.queueService.addToQueue(player2);
      } catch (requeueError) {
        console.error("Error re-adding players to queue:", requeueError);
      }
    }
  }

  @SubscribeMessage("joinBanPickPhase")
  async handleJoinBanPickPhase(
    @MessageBody() data: { gameId: string; playerId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId, playerId } = data;

      // Store socket mapping
      this.socketUsers.set(client.id, playerId);

      // Join the game room (for ban-pick updates)
      client.join(gameId);

      // Get current game state and send to client
      const gameResult = await this.gameService.findOne(gameId);
      if (gameResult.game && gameResult.game.banPickState) {
        client.emit("banPickStateUpdate", {
          game: gameResult.game,
          banPickState: gameResult.game.banPickState,
        });

        // Notify other players
        client.to(gameId).emit("playerJoinedBanPick", {
          playerId,
          message: "Player joined ban/pick phase",
        });

        // Check if it's a bot's turn to act
        await this.checkAndProcessBotBanPickTurn(gameId, gameResult.game);
      }
    } catch (error) {
      console.error("Error joining ban-pick phase:", error);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("banChampion")
  async handleBanChampion(
    @MessageBody()
    data: { gameId: string; playerId: string; championId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId, playerId, championId } = data;

      // Process the ban action
      const result = await this.gameService.processBanPickAction(
        gameId,
        playerId,
        championId,
        "ban"
      );

      if (result) {
        // Broadcast updated state to all players in the room
        this.server.to(gameId).emit("banPickStateUpdate", {
          game: result,
          banPickState: result.banPickState,
          lastAction: {
            type: "ban",
            championId,
            playerId,
            timestamp: Date.now(),
          },
        });

        // Check if it's now the bot's turn
        await this.checkAndProcessBotBanPickTurn(gameId, result);
      }
    } catch (error) {
      console.error("Error processing ban:", error);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("pickChampion")
  async handlePickChampion(
    @MessageBody()
    data: { gameId: string; playerId: string; championId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId, playerId, championId } = data;

      // Process the pick action
      const result = await this.gameService.processBanPickAction(
        gameId,
        playerId,
        championId,
        "pick"
      );

      if (result) {
        // Broadcast updated state to all players in the room
        this.server.to(gameId).emit("banPickStateUpdate", {
          game: result,
          banPickState: result.banPickState,
          lastAction: {
            type: "pick",
            championId,
            playerId,
            timestamp: Date.now(),
          },
        });

        // Check if entered reorder phase
        if (result.banPickState?.phase === "reorder") {
          // If bot is in the game, automatically reorder and set ready
          await this.checkAndProcessBotReorderTurn(gameId, result);
        } else {
          // Check if it's now the bot's turn for picking
          await this.checkAndProcessBotBanPickTurn(gameId, result);
        }
      }
    } catch (error) {
      console.error("Error processing pick:", error);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("skipBan")
  async handleSkipBan(
    @MessageBody() data: { gameId: string; playerId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId, playerId } = data;

      // Process the skip ban action (pass null as championId)
      const result = await this.gameService.processBanPickAction(
        gameId,
        playerId,
        null,
        "ban"
      );

      if (result) {
        // Broadcast updated state to all players in the room
        this.server.to(gameId).emit("banPickStateUpdate", {
          game: result,
          banPickState: result.banPickState,
          lastAction: {
            type: "skip_ban",
            playerId,
            timestamp: Date.now(),
          },
        });

        // Check if it's now the bot's turn
        await this.checkAndProcessBotBanPickTurn(gameId, result);
      }
    } catch (error) {
      console.error("Error processing skip ban:", error);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("getBanPickState")
  async handleGetBanPickState(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId } = data;

      const gameResult = await this.gameService.findOne(gameId);
      if (gameResult.game && gameResult.game.banPickState) {
        client.emit("banPickStateUpdate", {
          game: gameResult.game,
          banPickState: gameResult.game.banPickState,
        });
      }
    } catch (error) {
      console.error("Error getting ban-pick state:", error);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("reorderChampions")
  async handleReorderChampions(
    @MessageBody()
    data: { gameId: string; playerId: string; newOrder: string[] },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId, playerId, newOrder } = data;

      // Process the reorder action
      const result = await this.gameService.processReorderAction(
        gameId,
        playerId,
        newOrder
      );

      if (result) {
        // Broadcast updated state to all players in the room
        this.server.to(gameId).emit("banPickStateUpdate", {
          game: result,
          banPickState: result.banPickState,
          lastAction: {
            type: "reorder",
            playerId,
            timestamp: Date.now(),
          },
        });
      }
    } catch (error) {
      console.error("Error processing champion reorder:", error);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("setSummonerSpells")
  async handleSetSummonerSpells(
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      spellAssignments: Record<string, string>;
    },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId, playerId, spellAssignments } = data;

      // Process the summoner spell assignment
      const result = await this.gameService.setSummonerSpells(
        gameId,
        playerId,
        spellAssignments as Record<string, any>
      );

      if (result) {
        // Broadcast updated state to all players in the room
        this.server.to(gameId).emit("banPickStateUpdate", {
          game: result,
          banPickState: result.banPickState,
          lastAction: {
            type: "setSummonerSpells",
            playerId,
            timestamp: Date.now(),
          },
        });
      }
    } catch (error) {
      console.error("Error setting summoner spells:", error);
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("setReady")
  async handleSetReady(
    @MessageBody()
    data: { gameId: string; playerId: string; ready: boolean },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId, playerId, ready } = data;

      // Process the ready action
      const result = await this.gameService.setPlayerReady(
        gameId,
        playerId,
        ready
      );

      if (result.game) {
        // Broadcast updated state to all players in the room
        this.server.to(gameId).emit("banPickStateUpdate", {
          game: result.game,
          banPickState: result.game.banPickState,
          lastAction: {
            type: "setReady",
            playerId,
            ready,
            timestamp: Date.now(),
          },
        });

        // If both players are ready, initialize gameplay and emit banPickComplete
        if (result.shouldStartGame) {
          await this.gameService.initializeGameplay(gameId);
          this.server.to(gameId).emit("banPickComplete", {
            game: result.game,
            message: "Both players ready! Starting game...",
          });
        }
      }
    } catch (error) {
      console.error("Error setting ready status:", error);
      client.emit("error", { message: error.message });
    }
  }

  /**
   * Check if it's a bot's turn and automatically process bot's ban/pick action
   */
  private async checkAndProcessBotBanPickTurn(
    gameId: string,
    game: any
  ): Promise<void> {
    const banPickState = game.banPickState;
    if (
      !banPickState ||
      banPickState.phase === "reorder" ||
      banPickState.phase === "complete"
    ) {
      return;
    }

    // Determine current player
    const currentPlayerId =
      banPickState.currentTurn === "blue" ? game.bluePlayer : game.redPlayer;

    // Check if current player is a bot
    if (!this.simpleBotService.isBotPlayer(currentPlayerId)) {
      return;
    }

    // Add a delay to make bot actions feel more natural
    await new Promise((resolve) => setTimeout(resolve, BOT_ACTION_DELAY_MS));

    try {
      let championChoice: string | null = null;
      let actionType: "ban" | "pick" = banPickState.phase;

      if (banPickState.phase === "ban") {
        // Bot selects a champion to ban
        championChoice = this.simpleBotService.getBotBanChoice(
          banPickState.bannedChampions,
          banPickState.blueBans,
          banPickState.redBans
        );
      } else if (banPickState.phase === "pick") {
        // Bot selects a champion to pick
        const botSide = currentPlayerId === game.bluePlayer ? "blue" : "red";
        const botPicks =
          botSide === "blue" ? banPickState.bluePicks : banPickState.redPicks;
        const allPicked = [...banPickState.bluePicks, ...banPickState.redPicks];

        championChoice = this.simpleBotService.getBotPickChoice(
          banPickState.bannedChampions,
          allPicked,
          botPicks
        );
      }

      // Process bot's action
      const result = await this.gameService.processBanPickAction(
        gameId,
        currentPlayerId,
        championChoice,
        actionType
      );

      if (result) {
        // Broadcast bot's action
        this.server.to(gameId).emit("banPickStateUpdate", {
          game: result,
          banPickState: result.banPickState,
          lastAction: {
            type: actionType,
            championId: championChoice,
            playerId: currentPlayerId,
            timestamp: Date.now(),
            isBot: true,
          },
        });

        // Check if entered reorder phase
        if (result.banPickState?.phase === "reorder") {
          await this.checkAndProcessBotReorderTurn(gameId, result);
        } else {
          // Recursively check for next bot turn
          await this.checkAndProcessBotBanPickTurn(gameId, result);
        }
      }
    } catch (error) {
      console.error(`Error processing bot ban/pick action:`, error);
      this.server.to(gameId).emit("bot-error", {
        playerId: currentPlayerId,
        error: error.message,
      });
    }
  }

  /**
   * Check if bot needs to reorder and set ready
   */
  private async checkAndProcessBotReorderTurn(
    gameId: string,
    game: any
  ): Promise<void> {
    const banPickState = game.banPickState;
    if (!banPickState || banPickState.phase !== "reorder") {
      return;
    }

    // Check if either player is a bot
    const isBotBlue = this.simpleBotService.isBotPlayer(game.bluePlayer);
    const isBotRed = this.simpleBotService.isBotPlayer(game.redPlayer);

    if (!isBotBlue && !isBotRed) {
      return; // No bots in game
    }

    // Add delay for bot reorder action
    await new Promise((resolve) => setTimeout(resolve, BOT_ACTION_DELAY_MS));

    try {
      // Process bot reorder if needed
      if (isBotBlue && banPickState.blueChampionOrder.length > 0) {
        const reorderedChampions = this.simpleBotService.getBotChampionOrder(
          banPickState.blueChampionOrder
        );

        const reorderResult = await this.gameService.processReorderAction(
          gameId,
          game.bluePlayer,
          reorderedChampions
        );

        if (reorderResult) {
          this.server.to(gameId).emit("banPickStateUpdate", {
            game: reorderResult,
            banPickState: reorderResult.banPickState,
            lastAction: {
              type: "reorder",
              playerId: game.bluePlayer,
              timestamp: Date.now(),
              isBot: true,
            },
          });

          game = reorderResult; // Update game reference
        }
      }

      if (isBotRed && banPickState.redChampionOrder.length > 0) {
        const reorderedChampions = this.simpleBotService.getBotChampionOrder(
          banPickState.redChampionOrder
        );

        const reorderResult = await this.gameService.processReorderAction(
          gameId,
          game.redPlayer,
          reorderedChampions
        );

        if (reorderResult) {
          this.server.to(gameId).emit("banPickStateUpdate", {
            game: reorderResult,
            banPickState: reorderResult.banPickState,
            lastAction: {
              type: "reorder",
              playerId: game.redPlayer,
              timestamp: Date.now(),
              isBot: true,
            },
          });

          game = reorderResult; // Update game reference
        }
      }

      // Add another small delay before setting summoner spells
      await new Promise((resolve) =>
        setTimeout(resolve, BOT_ACTION_DELAY_MS / 2)
      );

      // Set bot summoner spells
      if (isBotBlue && banPickState.blueChampionOrder.length > 0) {
        const spellAssignments = this.simpleBotService.getBotSpellAssignments(
          banPickState.blueChampionOrder
        );

        const spellResult = await this.gameService.setSummonerSpells(
          gameId,
          game.bluePlayer,
          spellAssignments
        );

        if (spellResult) {
          this.server.to(gameId).emit("banPickStateUpdate", {
            game: spellResult,
            banPickState: spellResult.banPickState,
            lastAction: {
              type: "setSummonerSpells",
              playerId: game.bluePlayer,
              timestamp: Date.now(),
              isBot: true,
            },
          });

          game = spellResult; // Update game reference
        }
      }

      if (isBotRed && banPickState.redChampionOrder.length > 0) {
        const spellAssignments = this.simpleBotService.getBotSpellAssignments(
          banPickState.redChampionOrder
        );

        const spellResult = await this.gameService.setSummonerSpells(
          gameId,
          game.redPlayer,
          spellAssignments
        );

        if (spellResult) {
          this.server.to(gameId).emit("banPickStateUpdate", {
            game: spellResult,
            banPickState: spellResult.banPickState,
            lastAction: {
              type: "setSummonerSpells",
              playerId: game.redPlayer,
              timestamp: Date.now(),
              isBot: true,
            },
          });

          game = spellResult; // Update game reference
        }
      }

      // Add another small delay before setting ready
      await new Promise((resolve) =>
        setTimeout(resolve, BOT_ACTION_DELAY_MS / 2)
      );

      // Set bot(s) as ready
      if (isBotBlue) {
        const readyResult = await this.gameService.setPlayerReady(
          gameId,
          game.bluePlayer,
          true
        );

        if (readyResult.game) {
          this.server.to(gameId).emit("banPickStateUpdate", {
            game: readyResult.game,
            banPickState: readyResult.game.banPickState,
            lastAction: {
              type: "setReady",
              playerId: game.bluePlayer,
              ready: true,
              timestamp: Date.now(),
              isBot: true,
            },
          });

          // Check if game should start
          if (readyResult.shouldStartGame) {
            await this.gameService.initializeGameplay(gameId);
            this.server.to(gameId).emit("banPickComplete", {
              game: readyResult.game,
              message: "Both players ready! Starting game...",
            });
          }

          game = readyResult.game; // Update game reference
        }
      }

      if (isBotRed) {
        const readyResult = await this.gameService.setPlayerReady(
          gameId,
          game.redPlayer,
          true
        );

        if (readyResult.game) {
          this.server.to(gameId).emit("banPickStateUpdate", {
            game: readyResult.game,
            banPickState: readyResult.game.banPickState,
            lastAction: {
              type: "setReady",
              playerId: game.redPlayer,
              ready: true,
              timestamp: Date.now(),
              isBot: true,
            },
          });

          // Check if game should start
          if (readyResult.shouldStartGame) {
            await this.gameService.initializeGameplay(gameId);
            this.server.to(gameId).emit("banPickComplete", {
              game: readyResult.game,
              message: "Both players ready! Starting game...",
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error processing bot reorder/ready:`, error);
      this.server.to(gameId).emit("bot-error", {
        error: error.message,
      });
    }
  }
}
