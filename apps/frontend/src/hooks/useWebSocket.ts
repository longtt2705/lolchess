import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "./redux";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:3001";

export interface GameStateUpdate {
  game: any;
  oldGame?: any;
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
  const [oldGameState, setOldGameState] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [drawOfferReceived, setDrawOfferReceived] = useState(false);
  const [drawOfferSent, setDrawOfferSent] = useState(false);

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
      setOldGameState(data.oldGame || null);
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

    socket.on(
      "draw-offered",
      (data: { fromUserId: string; message: string }) => {
        console.log("Draw offered:", data);
        setDrawOfferReceived(true);
        setLastUpdate(data.message);
      }
    );

    socket.on("draw-offer-sent", (data: { message: string }) => {
      console.log("Draw offer sent:", data);
      setDrawOfferSent(true);
      setLastUpdate(data.message);
    });

    socket.on("draw-declined", (data: { message: string }) => {
      console.log("Draw declined:", data);
      setDrawOfferSent(false);
      setLastUpdate(data.message);
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

  // Resign from the game
  const resign = () => {
    if (!socketRef.current || !connected || !gameId) {
      console.warn("Cannot resign: socket not connected");
      return;
    }

    console.log("Resigning from game");
    socketRef.current.emit("resign", { gameId });
  };

  // Offer a draw
  const offerDraw = () => {
    if (!socketRef.current || !connected || !gameId) {
      console.warn("Cannot offer draw: socket not connected");
      return;
    }

    console.log("Offering draw");
    socketRef.current.emit("offer-draw", { gameId });
  };

  // Respond to draw offer
  const respondToDraw = (accept: boolean) => {
    if (!socketRef.current || !connected || !gameId) {
      console.warn("Cannot respond to draw: socket not connected");
      return;
    }

    console.log(`Responding to draw offer: ${accept ? "accept" : "decline"}`);
    socketRef.current.emit("respond-draw", { gameId, accept });
  };

  // Buy item
  const buyItem = (itemId: string, championId: string) => {
    if (!socketRef.current || !connected || !gameId) {
      console.warn("Cannot buy item: socket not connected");
      return;
    }

    console.log(`Buying item ${itemId} for champion ${championId}`);
    socketRef.current.emit("buy-item", { gameId, itemId, championId });
  };

  return {
    connected,
    gameState,
    oldGameState,
    lastUpdate,
    sendAction,
    initializeGameplay,
    resign,
    offerDraw,
    respondToDraw,
    buyItem,
    drawOfferReceived,
    setDrawOfferReceived,
    drawOfferSent,
    setDrawOfferSent,
  };
};
