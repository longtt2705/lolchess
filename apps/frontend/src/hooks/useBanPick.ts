import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "./redux";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Summoner spell types
export type SummonerSpellType = "Flash" | "Ghost" | "Heal" | "Barrier" | "Smite";

export const SUMMONER_SPELL_TYPES: SummonerSpellType[] = [
  "Flash",
  "Ghost",
  "Heal",
  "Barrier",
  "Smite",
];

interface BanPickState {
  phase: "ban" | "pick" | "reorder" | "complete";
  currentTurn: "blue" | "red";
  turnNumber: number;

  // Ban phase data
  bannedChampions: string[]; // Champion IDs
  blueBans: string[];
  redBans: string[];
  banHistory: string[]; // Track each ban turn: champion name or "SKIPPED"

  // Pick phase data
  bluePicks: string[]; // Champion IDs (max 5)
  redPicks: string[]; // Champion IDs (max 5)

  // Reorder phase data
  blueChampionOrder?: string[]; // Final champion order after reordering
  redChampionOrder?: string[]; // Final champion order after reordering
  blueReady?: boolean; // Blue player confirmed their order
  redReady?: boolean; // Red player confirmed their order

  // Summoner spell assignments
  blueSummonerSpells?: Record<string, SummonerSpellType>; // Champion name -> spell type
  redSummonerSpells?: Record<string, SummonerSpellType>; // Champion name -> spell type

  // Timing
  turnStartTime: number;
  turnTimeLimit: number; // seconds
}

interface BanPickAction {
  type: "ban" | "pick" | "skip_ban" | "reorder" | "setReady" | "setSummonerSpells";
  championId?: string;
  playerId: string;
  ready?: boolean;
  timestamp: number;
}

interface GameData {
  id: string;
  name: string;
  status: string;
  players: Array<{
    id: string;
    userId: string;
    username: string;
    side?: "blue" | "red";
    selectedChampions: string[];
    bannedChampions: string[];
  }>;
  banPickState?: BanPickState;
  bluePlayer?: string;
  redPlayer?: string;
}

export const useBanPick = (gameId: string) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [banPickState, setBanPickState] = useState<BanPickState | null>(null);
  const [playerSide, setPlayerSide] = useState<"blue" | "red" | null>(null);
  const [lastAction, setLastAction] = useState<BanPickAction | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial ban/pick state via REST API
  useEffect(() => {
    if (!gameId || !user) {
      setLoading(false);
      return;
    }

    const fetchInitialState = async () => {
      try {
        console.log("🔄 Fetching initial ban/pick state for game:", gameId);
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/games/${gameId}/ban-pick-state`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch ban/pick state");
        }

        const data = await response.json();
        console.log("📊 Initial ban/pick state loaded:", data);

        if (data.game && data.banPickState) {
          setGameData(data.game);
          setBanPickState(data.banPickState);

          // Determine player's side
          const currentPlayer = data.game.players.find(
            (p: any) => p.userId === user.id
          );
          if (currentPlayer?.side) {
            setPlayerSide(currentPlayer.side);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching initial ban/pick state:", error);
        toast.error("Failed to load ban/pick state");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialState();
  }, [gameId, user]);

  useEffect(() => {
    if (!user || !gameId) {
      console.log("useBanPick: No user or gameId available");
      setIsConnected(false);
      return;
    }

    console.log("useBanPick: Initializing socket connection for game:", gameId);

    // Initialize socket connection
    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      timeout: 10000,
    });
    socketRef.current = socket;

    // Socket event listeners
    socket.on("connect", () => {
      console.log("✅ Connected to ban/pick server");
      setIsConnected(true);

      // Join the ban/pick phase for this game
      socket.emit("joinBanPickPhase", {
        gameId,
        playerId: user.id,
      });
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Ban/pick socket connection error:", error);
      toast.error(`Failed to connect to ban/pick: ${error.message}`);
      setIsConnected(false);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Disconnected from ban/pick server. Reason:", reason);
      setIsConnected(false);
    });

    // Ban/Pick specific events
    socket.on(
      "banPickStateUpdate",
      (data: {
        game: GameData;
        banPickState: BanPickState;
        lastAction?: BanPickAction;
      }) => {
        console.log("📊 Ban/pick state updated:", data);

        setGameData(data.game);
        setBanPickState(data.banPickState);

        if (data.lastAction) {
          setLastAction(data.lastAction);

          // Show appropriate toast based on action type
          if (data.lastAction.type === "skip_ban") {
            toast.success("Ban skipped");
          } else if (data.lastAction.type === "ban") {
            toast.success(`Champion banned: ${data.lastAction.championId}`);
          } else if (data.lastAction.type === "pick") {
            toast.success(`Champion picked: ${data.lastAction.championId}`);
          } else if (data.lastAction.type === "reorder") {
            // Don't show toast for reorder actions (too frequent while dragging)
            console.log("🔄 Champion order updated");
          } else if (data.lastAction.type === "setReady") {
            // Only show toast if it's not the current user
            if (data.lastAction.playerId !== user.id) {
              const readyText = data.lastAction.ready ? "is ready!" : "changed their order";
              toast(`Opponent ${readyText}`, { icon: "👤" });
            }
          }
        }

        // Determine player's side
        const currentPlayer = data.game.players.find(
          (p) => p.userId === user.id
        );
        if (currentPlayer?.side) {
          setPlayerSide(currentPlayer.side);
        }
      }
    );

    socket.on(
      "banPickComplete",
      (data: { game: GameData; message: string }) => {
        console.log("🎉 Ban/pick phase complete:", data);
        toast.success(data.message);

        // Navigate to the actual game after a delay
        setTimeout(() => {
          navigate(`/game/${gameId}`);
        }, 3000);
      }
    );

    socket.on(
      "playerJoinedBanPick",
      (data: { playerId: string; message: string }) => {
        console.log("👤 Player joined ban/pick:", data);
        if (data.playerId !== user.id) {
          toast(`Player joined ban/pick phase`, { icon: "👤" });
        }
      }
    );

    socket.on("error", (data: { message: string }) => {
      console.error("❌ Ban/pick error:", data);
      toast.error(data.message);
    });

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up ban/pick socket connection");
      setIsConnected(false);
      socket.disconnect();
    };
  }, [user, gameId, navigate]);

  const banChampion = (championId: string) => {
    if (!socketRef.current || !user || !gameId) {
      toast.error("Not connected to ban/pick server");
      return;
    }

    if (!banPickState || banPickState.phase !== "ban") {
      toast.error("Not in ban phase");
      return;
    }

    if (banPickState.currentTurn !== playerSide) {
      toast.error("It's not your turn!");
      return;
    }

    console.log("🚫 Banning champion:", championId);
    socketRef.current.emit("banChampion", {
      gameId,
      playerId: user.id,
      championId,
    });
  };

  const pickChampion = (championId: string) => {
    if (!socketRef.current || !user || !gameId) {
      toast.error("Not connected to ban/pick server");
      return;
    }

    if (!banPickState || banPickState.phase !== "pick") {
      toast.error("Not in pick phase");
      return;
    }

    if (banPickState.currentTurn !== playerSide) {
      toast.error("It's not your turn!");
      return;
    }

    console.log("✅ Picking champion:", championId);
    socketRef.current.emit("pickChampion", {
      gameId,
      playerId: user.id,
      championId,
    });
  };

  const skipBan = () => {
    if (!socketRef.current || !user || !gameId) {
      toast.error("Not connected to ban/pick server");
      return;
    }

    if (!banPickState || banPickState.phase !== "ban") {
      toast.error("Not in ban phase");
      return;
    }

    if (banPickState.currentTurn !== playerSide) {
      toast.error("It's not your turn!");
      return;
    }

    console.log("⏭️ Skipping ban");
    socketRef.current.emit("skipBan", {
      gameId,
      playerId: user.id,
    });
  };

  const getBanPickState = () => {
    if (!socketRef.current || !gameId) return;

    socketRef.current.emit("getBanPickState", { gameId });
  };

  const reorderChampions = (newOrder: string[]) => {
    if (!socketRef.current || !user || !gameId) {
      toast.error("Not connected to ban/pick server");
      return;
    }

    if (!banPickState || banPickState.phase !== "reorder") {
      toast.error("Not in reorder phase");
      return;
    }

    console.log("🔄 Reordering champions:", newOrder);
    socketRef.current.emit("reorderChampions", {
      gameId,
      playerId: user.id,
      newOrder,
    });
  };

  const setReady = (ready: boolean) => {
    if (!socketRef.current || !user || !gameId) {
      toast.error("Not connected to ban/pick server");
      return;
    }

    if (!banPickState || banPickState.phase !== "reorder") {
      toast.error("Not in reorder phase");
      return;
    }

    console.log(`${ready ? "✅" : "❌"} Setting ready status:`, ready);
    socketRef.current.emit("setReady", {
      gameId,
      playerId: user.id,
      ready,
    });
  };

  const setSummonerSpells = (spellAssignments: Record<string, SummonerSpellType>) => {
    if (!socketRef.current || !user || !gameId) {
      toast.error("Not connected to ban/pick server");
      return;
    }

    if (!banPickState || banPickState.phase !== "reorder") {
      toast.error("Not in reorder phase");
      return;
    }

    console.log("🔮 Setting summoner spells:", spellAssignments);
    socketRef.current.emit("setSummonerSpells", {
      gameId,
      playerId: user.id,
      spellAssignments,
    });
  };

  const isMyTurn = banPickState?.currentTurn === playerSide;
  const currentAction = banPickState?.phase === "ban" ? "ban" : "pick";

  // Get current player's summoner spell assignments
  const mySummonerSpells = playerSide === "blue" 
    ? banPickState?.blueSummonerSpells 
    : banPickState?.redSummonerSpells;

  return {
    isConnected,
    loading,
    gameData,
    banPickState,
    playerSide,
    lastAction,
    isMyTurn,
    currentAction,
    banChampion,
    pickChampion,
    skipBan,
    getBanPickState,
    reorderChampions,
    setReady,
    setSummonerSpells,
    mySummonerSpells,
  };
};
