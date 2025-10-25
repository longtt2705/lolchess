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
    private readonly queueService: QueueService
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
        console.log(
          `User ${userId} is already in an active game: ${activeGameResult.game.id}`
        );
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
      console.log(`Only ${queue.length} players in queue, need 2 for match`);
      return;
    }

    // Take the first 2 players
    const player1 = queue[0];
    const player2 = queue[1];

    console.log(
      `Creating match between ${player1.username} and ${player2.username}`
    );

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

      console.log(`✅ Match created successfully: Game ID ${game.id}`);
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

      console.log(
        `Player ${playerId} joining ban-pick phase for game ${gameId}`
      );

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

      console.log(`Player ${playerId} banning ${championId} in game ${gameId}`);

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

        // Check if ban-pick is complete
        if (result.banPickState?.phase === "complete") {
          await this.gameService.initializeGameplay(gameId);
          this.server.to(gameId).emit("banPickComplete", {
            game: result,
            message: "Ban/pick phase complete! Starting game...",
          });
        }
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

      console.log(`Player ${playerId} picking ${championId} in game ${gameId}`);

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

        // Check if ban-pick is complete
        if (result.banPickState?.phase === "complete") {
          await this.gameService.initializeGameplay(gameId);
          this.server.to(gameId).emit("banPickComplete", {
            game: result,
            message: "Ban/pick phase complete! Starting game...",
          });
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

      console.log(`Player ${playerId} skipping ban in game ${gameId}`);

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
}
