import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { GameService } from "./game.service";
import { Logger, OnModuleDestroy } from "@nestjs/common";
import { BotActionService } from "../redis/bot-action.service";
import { BotActionResult } from "../redis/bot-action.processor";

@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  namespace: "/game",
})
export class GameGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);
  private gameRooms = new Map<string, Set<string>>(); // gameId -> Set of socketIds
  private userSockets = new Map<string, string>(); // userId -> socketId
  private socketUsers = new Map<string, string>(); // socketId -> userId
  private unsubscribeBotResults: (() => void) | null = null;

  constructor(
    private readonly gameService: GameService,
    private readonly botActionService: BotActionService
  ) {}

  /**
   * Initialize the gateway and subscribe to bot action results
   */
  afterInit() {
    this.logger.log(
      "GameGateway initialized, subscribing to bot action results"
    );
    this.unsubscribeBotResults = this.botActionService.onBotActionResult(
      this.handleBotActionResult.bind(this)
    );
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    if (this.unsubscribeBotResults) {
      this.unsubscribeBotResults();
      this.unsubscribeBotResults = null;
    }
  }

  /**
   * Handle bot action results from Redis Pub/Sub
   */
  private handleBotActionResult(result: BotActionResult): void {
    const {
      gameId,
      botPlayerId,
      success,
      game,
      oldGame,
      message,
      isGameOver,
      winner,
    } = result;

    this.logger.log(
      `Received bot action result for game ${gameId}, success: ${success}`
    );

    if (!success) {
      // Emit error to clients
      this.server.to(gameId).emit("bot-error", {
        botPlayerId,
        error: message,
      });
      return;
    }

    if (game) {
      // Broadcast the bot's action result
      if (game.lastAction && oldGame) {
        this.server.to(gameId).emit("game-state", {
          game,
          oldGame,
          message,
          isBotAction: true,
        });
      } else {
        this.server.to(gameId).emit("game-state", {
          game,
          message,
          isBotAction: true,
        });
      }

      // Check if game is finished
      if (isGameOver) {
        this.server.to(gameId).emit("game-over", {
          winner,
          game,
        });
        return;
      }

      // Check if it's still a bot's turn and queue the next action
      this.checkAndQueueBotTurn(gameId, game);
    }
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Clean up user mappings
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      this.userSockets.delete(userId);
      this.socketUsers.delete(client.id);
    }

    // Remove from all game rooms
    for (const [gameId, sockets] of this.gameRooms.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.gameRooms.delete(gameId);
        }
      }
    }
  }

  @SubscribeMessage("join-game")
  async handleJoinGame(
    @MessageBody() data: { gameId: string; userId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId, userId } = data;

      // Store user-socket mapping
      this.userSockets.set(userId, client.id);
      this.socketUsers.set(client.id, userId);

      // Join the game room
      client.join(gameId);

      // Add to our room tracking
      if (!this.gameRooms.has(gameId)) {
        this.gameRooms.set(gameId, new Set());
      }
      this.gameRooms.get(gameId)!.add(client.id);

      // Get current game state and send to client
      const gameResult = await this.gameService.findOne(gameId);
      client.emit("game-state", { game: gameResult.game });

      // Notify other players in the room
      client.to(gameId).emit("player-joined", { userId });

      console.log(`User ${userId} joined game ${gameId}`);
    } catch (error) {
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("leave-game")
  handleLeaveGame(
    @MessageBody() data: { gameId: string; userId: string },
    @ConnectedSocket() client: Socket
  ) {
    const { gameId, userId } = data;

    client.leave(gameId);

    // Remove from room tracking
    const gameRoom = this.gameRooms.get(gameId);
    if (gameRoom) {
      gameRoom.delete(client.id);
      if (gameRoom.size === 0) {
        this.gameRooms.delete(gameId);
      }
    }

    // Notify other players
    client.to(gameId).emit("player-left", { userId });

    console.log(`User ${userId} left game ${gameId}`);
  }

  @SubscribeMessage("game-action")
  async handleGameAction(
    @MessageBody() data: { gameId: string; actionData: any },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId, actionData } = data;
      const userId = this.socketUsers.get(client.id);

      if (!userId) {
        client.emit("error", { message: "User not authenticated" });
        return;
      }

      // Execute the action
      const result = await this.gameService.executeAction(gameId, {
        ...actionData,
        playerId: userId,
      });

      if (result.game) {
        // Broadcast updated game state to all players in the room
        // Include oldGame if there's a lastAction (for animations)
        if (result.game.lastAction && result.oldGame) {
          this.server.to(gameId).emit("game-state", {
            game: result.game,
            oldGame: result.oldGame,
            message: result.message,
          });
        } else {
          this.server.to(gameId).emit("game-state", {
            game: result.game,
            message: result.message,
          });
        }

        // If game is finished, send game over event
        if (result.game.status === "finished") {
          this.server.to(gameId).emit("game-over", {
            winner: result.game.winner,
            game: result.game,
          });
        } else {
          // Check if it's now a bot's turn and queue the action
          await this.checkAndQueueBotTurn(gameId, result.game);
        }
      } else {
        // Send error back to the client who made the action
        client.emit("action-error", { message: result.message });
      }
    } catch (error) {
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("initialize-gameplay")
  async handleInitializeGameplay(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId } = data;

      const result = await this.gameService.initializeGameplay(gameId);

      if (result.game) {
        // Broadcast to all players in the room that gameplay has started
        this.server.to(gameId).emit("gameplay-initialized", {
          game: result.game,
          message: result.message,
        });

        // Check if the first player is a bot and queue their action
        if (result.game.status === "in_progress") {
          await this.checkAndQueueBotTurn(gameId, result.game);
        }
      } else {
        client.emit("error", { message: result.message });
      }
    } catch (error) {
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("resign")
  async handleResign(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId } = data;
      const userId = this.socketUsers.get(client.id);

      if (!userId) {
        client.emit("error", { message: "User not authenticated" });
        return;
      }

      const result = await this.gameService.resign(gameId, userId);

      if (result.game) {
        // Broadcast game over to all players
        this.server.to(gameId).emit("game-state", { game: result.game });
        this.server.to(gameId).emit("game-over", {
          winner: result.game.winner,
          game: result.game,
          reason: "resignation",
        });
      } else {
        client.emit("error", { message: result.message });
      }
    } catch (error) {
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("offer-draw")
  async handleOfferDraw(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId } = data;
      const userId = this.socketUsers.get(client.id);

      if (!userId) {
        client.emit("error", { message: "User not authenticated" });
        return;
      }

      // Notify the other player about the draw offer
      client.to(gameId).emit("draw-offered", {
        fromUserId: userId,
        message: "Your opponent has offered a draw",
      });

      // Confirm to the offering player
      client.emit("draw-offer-sent", {
        message: "Draw offer sent to opponent",
      });

      console.log(`User ${userId} offered draw in game ${gameId}`);
    } catch (error) {
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("respond-draw")
  async handleRespondDraw(
    @MessageBody() data: { gameId: string; accept: boolean },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId, accept } = data;
      const userId = this.socketUsers.get(client.id);

      if (!userId) {
        client.emit("error", { message: "User not authenticated" });
        return;
      }

      if (accept) {
        // Accept draw - end game as draw
        const result = await this.gameService.acceptDraw(gameId);

        if (result.game) {
          this.server.to(gameId).emit("game-state", { game: result.game });
          this.server.to(gameId).emit("game-over", {
            winner: null,
            game: result.game,
            reason: "draw by agreement",
          });
        }
      } else {
        // Decline draw - notify the other player
        client.to(gameId).emit("draw-declined", {
          message: "Your opponent declined the draw offer",
        });
      }
    } catch (error) {
      client.emit("error", { message: error.message });
    }
  }

  @SubscribeMessage("buy-item")
  async handleBuyItem(
    @MessageBody() data: { gameId: string; itemId: string; championId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const { gameId, itemId, championId } = data;
      const userId = this.socketUsers.get(client.id);

      if (!userId) {
        client.emit("error", { message: "User not authenticated" });
        return;
      }

      // Execute the buy item action
      const result = await this.gameService.buyItem(gameId, {
        itemId,
        championId,
      });

      if (result.game) {
        // Broadcast updated game state to all players in the room
        // Include oldGame if there's a lastAction (for animations)
        if (result.game.lastAction && result.oldGame) {
          this.server.to(gameId).emit("game-state", {
            game: result.game,
            oldGame: result.oldGame,
            message: result.message,
          });
        } else {
          this.server.to(gameId).emit("game-state", {
            game: result.game,
            message: result.message,
          });
        }

        // Check if it's now a bot's turn and queue the action
        if (result.game.status === "in_progress") {
          await this.checkAndQueueBotTurn(gameId, result.game);
        }
      } else {
        // Send error back to the client who made the action
        client.emit("action-error", { message: result.message });
      }
    } catch (error) {
      client.emit("error", { message: error.message });
    }
  }

  // Helper method to broadcast game state updates
  broadcastGameUpdate(gameId: string, gameState: any) {
    this.server.to(gameId).emit("game-state", { game: gameState });
  }

  // Helper method to notify players of specific events
  notifyGameEvent(gameId: string, event: string, data: any) {
    this.server.to(gameId).emit(event, data);
  }

  /**
   * Check if it's a bot's turn and queue the bot action
   * This is called after a human action is processed
   */
  private async checkAndQueueBotTurn(gameId: string, game: any): Promise<void> {
    // Check if game is still in progress
    if (game.status !== "in_progress" || game.phase !== "gameplay") {
      return;
    }

    // Check if next player is a bot
    const currentPlayerId = this.gameService.getCurrentPlayer(game);
    if (!currentPlayerId || !this.gameService.isBotPlayer(currentPlayerId)) {
      return;
    }

    this.logger.log(
      `Bot turn detected for ${currentPlayerId} in game ${gameId}, queuing action`
    );

    // Emit "bot-thinking" event to clients immediately
    this.server.to(gameId).emit("bot-thinking", {
      botPlayerId: currentPlayerId,
      message: "Bot is thinking...",
    });

    try {
      // Queue the bot action - the processor will handle it asynchronously
      await this.botActionService.queueBotAction(gameId, currentPlayerId, game);
    } catch (error) {
      this.logger.error(`Error queuing bot action: ${error.message}`);
      this.server.to(gameId).emit("bot-error", {
        botPlayerId: currentPlayerId,
        error: error.message,
      });
    }
  }
}
