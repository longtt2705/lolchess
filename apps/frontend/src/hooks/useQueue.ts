import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "./redux";
import {
  setQueueStatus,
  joinQueue as joinQueueAction,
  leaveQueue,
  setMatchFound,
  setActiveGame,
  fetchActiveGame,
} from "../store/gameSlice";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const useQueue = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { queue } = useAppSelector((state) => state.game);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      console.log("useQueue: No user available, skipping socket connection");
      setIsConnected(false);
      return;
    }

    console.log("useQueue: Initializing socket connection to:", API_URL);
    console.log("useQueue: User data:", user);

    // Fetch active game on mount
    dispatch(fetchActiveGame(user.id));

    // Initialize socket connection
    const socket = io(API_URL, {
      transports: ["websocket", "polling"], // Allow fallback to polling
      timeout: 10000, // 10 second timeout
    });
    socketRef.current = socket;

    // Socket event listeners
    socket.on("connect", () => {
      console.log("✅ Connected to matchmaking server");
      console.log("Socket ID:", socket.id);
      setIsConnected(true);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      toast.error(`Failed to connect to server: ${error.message}`);
      setIsConnected(false);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Disconnected from matchmaking server. Reason:", reason);
      setIsConnected(false);
      dispatch(leaveQueue());
    });

    socket.on(
      "queueJoined",
      (data: { position: number; playersInQueue: number }) => {
        dispatch(
          setQueueStatus({
            inQueue: true,
            position: data.position,
            queueSize: data.playersInQueue,
            matchFound: false,
          })
        );
        toast.success(`Joined queue! Position: ${data.position}`);
      }
    );

    socket.on("queueLeft", (data: { message: string }) => {
      dispatch(leaveQueue());
      toast(data.message, { icon: "ℹ️" });
    });

    socket.on(
      "queueStatus",
      (data: {
        position: number | null;
        queueSize: number;
        inQueue: boolean;
      }) => {
        dispatch(
          setQueueStatus({
            position: data.position,
            queueSize: data.queueSize,
            inQueue: data.inQueue,
          })
        );
      }
    );

    socket.on(
      "matchFound",
      (data: {
        game: any;
        opponent: { id: string; username: string };
        phase?: string;
      }) => {
        console.log("🎯 Match found!", data);
        console.log("Game object:", data.game);
        console.log("Phase:", data.phase);
        console.log("Game ID:", data.game?.id || data.game?._id);

        dispatch(setMatchFound(data));
        toast.success(`Match found! vs ${data.opponent.username}`);

        // Navigate to the appropriate page based on game phase
        setTimeout(() => {
          const gameId = data.game?.id || data.game?._id;
          console.log("Navigating with game ID:", gameId);

          if (data.phase === "ban_pick") {
            console.log("Navigating to ban-pick page");
            navigate(`/ban-pick/${gameId}`);
          } else {
            console.log("Navigating to game page");
            navigate(`/game/${gameId}`);
          }
        }, 2000);
      }
    );

    socket.on("alreadyInGame", (data: { game: any; message: string }) => {
      console.log("⚠️ Already in game:", data);
      dispatch(setActiveGame(data.game));
      dispatch(leaveQueue());
      toast.error(data.message);
    });

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up socket connection");
      setIsConnected(false);
      socket.disconnect();
    };
  }, [user, dispatch, navigate]);

  const joinQueue = () => {
    console.log("joinQueue called");
    console.log("socketRef.current:", socketRef.current);
    console.log("socketRef.current?.connected:", socketRef.current?.connected);
    console.log("user:", user);

    if (!socketRef.current) {
      console.error("No socket connection available");
      toast.error("Not connected to server - please wait for connection");
      return;
    }

    if (!socketRef.current.connected) {
      console.error("Socket not connected");
      toast.error("Connecting to server... Please try again in a moment");
      return;
    }

    if (!user) {
      console.error("No user data available");
      toast.error("User not logged in - please refresh the page");
      return;
    }

    console.log("Emitting joinQueue event with:", {
      userId: user.id,
      username: user.username,
    });

    dispatch(joinQueueAction());
    socketRef.current.emit("joinQueue", {
      userId: user.id,
      username: user.username,
    });
  };

  const cancelQueue = () => {
    if (!socketRef.current || !user) return;

    socketRef.current.emit("leaveQueue", {
      userId: user.id,
    });
  };

  const getQueueStatus = () => {
    if (!socketRef.current || !user) return;

    socketRef.current.emit("getQueueStatus", {
      userId: user.id,
    });
  };

  return {
    queue,
    joinQueue,
    cancelQueue,
    getQueueStatus,
    isConnected,
  };
};
