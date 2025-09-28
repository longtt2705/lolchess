import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "./redux";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:3001";

export interface GameStateUpdate {
  game: any;
  message?: string;
}

export interface GameEvent {
  type: string;
  data: any;
}

export const useWebSocket = (gameId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!gameId || !user) return;

    console.log("Connecting to WebSocket...", { gameId, userId: user.id });

    const socket = io(`${WS_URL}/game`, {
      transports: ["websocket", "polling"],
      upgrade: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("WebSocket connected");
      setConnected(true);

      // Join the game room
      socket.emit("join-game", { gameId, userId: user.id });
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setConnected(false);
    });

    // Game events
    socket.on("game-state", (data: GameStateUpdate) => {
      console.log("Game state updated:", data);
      setGameState(data.game);
      setLastUpdate(data.message || "Game state updated");
    });

    socket.on("gameplay-initialized", (data: GameStateUpdate) => {
      console.log("Gameplay initialized:", data);
      setGameState(data.game);
      setLastUpdate("Gameplay initialized");
    });

    socket.on("game-over", (data: { winner: string; game: any }) => {
      console.log("Game over:", data);
      setGameState(data.game);
      setLastUpdate(`Game over! Winner: ${data.winner || "Draw"}`);
    });

    socket.on("player-joined", (data: { userId: string }) => {
      console.log("Player joined:", data);
      setLastUpdate(`Player ${data.userId} joined`);
    });

    socket.on("player-left", (data: { userId: string }) => {
      console.log("Player left:", data);
      setLastUpdate(`Player ${data.userId} left`);
    });

    socket.on("action-error", (data: { message: string }) => {
      console.error("Action error:", data);
      setLastUpdate(`Error: ${data.message}`);
    });

    socket.on("error", (data: { message: string }) => {
      console.error("Socket error:", data);
      setLastUpdate(`Error: ${data.message}`);
    });

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up WebSocket connection");
      socket.emit("leave-game", { gameId, userId: user.id });
      socket.disconnect();
      setConnected(false);
    };
  }, [gameId, user]);

  // Send game action through WebSocket
  const sendAction = (actionData: any) => {
    if (!socketRef.current || !connected || !gameId) {
      console.warn("Cannot send action: socket not connected");
      return;
    }

    console.log("Sending action:", actionData);
    socketRef.current.emit("game-action", {
      gameId,
      actionData,
    });
  };

  // Initialize gameplay through WebSocket
  const initializeGameplay = () => {
    if (!socketRef.current || !connected || !gameId) {
      console.warn("Cannot initialize gameplay: socket not connected");
      return;
    }

    console.log("Initializing gameplay through WebSocket");
    socketRef.current.emit("initialize-gameplay", { gameId });
  };

  return {
    connected,
    gameState,
    lastUpdate,
    sendAction,
    initializeGameplay,
  };
};
