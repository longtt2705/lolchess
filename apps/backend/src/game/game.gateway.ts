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

@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  namespace: "/game",
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private gameRooms = new Map<string, Set<string>>(); // gameId -> Set of socketIds
  private userSockets = new Map<string, string>(); // userId -> socketId
  private socketUsers = new Map<string, string>(); // socketId -> userId

  constructor(private readonly gameService: GameService) {}

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
}


