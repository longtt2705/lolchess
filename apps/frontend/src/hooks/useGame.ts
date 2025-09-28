import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAppDispatch, useAppSelector } from "./redux";
import { useWebSocket } from "./useWebSocket";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface ChessPosition {
  x: number;
  y: number;
}

export interface ChessPiece {
  id: string;
  name: string;
  position: ChessPosition;
  ownerId: string;
  blue: boolean;
  stats: {
    hp: number;
    maxHp: number;
    ad: number;
    ap: number;
    physicalResistance: number;
    magicResistance: number;
    speed: number;
    goldValue: number;
    attackRange: {
      range: number;
      diagonal: boolean;
      horizontal: boolean;
      vertical: boolean;
    };
  };
  rawStats?: {
    hp: number;
    maxHp: number;
    ad: number;
    ap: number;
    physicalResistance: number;
    magicResistance: number;
    speed: number;
    goldValue: number;
    attackRange: {
      range: number;
      diagonal: boolean;
      horizontal: boolean;
      vertical: boolean;
    };
  };
  skill?: {
    name: string;
    description: string;
    type: "passive" | "active";
    cooldown: number;
    currentCooldown: number;
  };
  cannotMoveBackward: boolean;
  canOnlyMoveVertically: boolean;
  hasMovedBefore: boolean;
  cannotAttack: boolean;
}

export interface GameState {
  id: string;
  status: string;
  phase: string;
  currentRound: number;
  board: ChessPiece[];
  bluePlayer: string;
  redPlayer: string;
  players: Array<{
    id: string;
    userId: string;
    username: string;
    gold: number;
  }>;
  winner?: string;
}

export interface GameAction {
  type: "move" | "attack" | "skill" | "buy_item";
  casterPosition?: ChessPosition;
  targetPosition?: ChessPosition;
  itemId?: string;
  targetChampionId?: string;
}

export const useGame = (gameId: string) => {
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector((state) => state.auth);

  // WebSocket connection for real-time updates
  const {
    connected: wsConnected,
    gameState: wsGameState,
    lastUpdate,
    sendAction: wsSendAction,
    initializeGameplay: wsInitializeGameplay,
  } = useWebSocket(gameId);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<ChessPiece | null>(null);
  const [validMoves, setValidMoves] = useState<ChessPosition[]>([]);
  const [validAttacks, setValidAttacks] = useState<ChessPosition[]>([]);

  // Update game state from WebSocket
  useEffect(() => {
    if (wsGameState) {
      setGameState(wsGameState);
      setLoading(false);
      setError(null);
    }
  }, [wsGameState]);

  // Fetch initial game state if WebSocket isn't connected
  useEffect(() => {
    if (!gameId || wsConnected) return;

    const fetchGameState = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/games/${gameId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.game) {
          setGameState(response.data.game);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch game state");
      } finally {
        setLoading(false);
      }
    };

    fetchGameState();
  }, [gameId, wsConnected]);

  // Initialize gameplay if needed
  const initializeGameplay = useCallback(async () => {
    if (!gameId) return;

    // Use WebSocket if connected, otherwise fall back to HTTP
    if (wsConnected) {
      wsInitializeGameplay();
    } else {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.post(
          `${API_URL}/games/${gameId}/initialize-gameplay`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.game) {
          setGameState(response.data.game);
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Failed to initialize gameplay"
        );
      }
    }
  }, [gameId, wsConnected, wsInitializeGameplay]);

  // Execute game action
  const executeAction = useCallback(
    async (action: GameAction) => {
      if (!gameState || !currentUser) return;

      // Clear selection immediately for better UX
      setSelectedPiece(null);
      setValidMoves([]);
      setValidAttacks([]);

      // Use WebSocket if connected, otherwise fall back to HTTP
      if (wsConnected) {
        const actionData = {
          event:
            action.type === "move"
              ? "move_chess"
              : action.type === "attack"
                ? "attack_chess"
                : action.type === "skill"
                  ? "skill"
                  : "buy_item",
          casterPosition: action.casterPosition,
          targetPosition: action.targetPosition,
          itemId: action.itemId,
          targetChampionId: action.targetChampionId,
        };

        wsSendAction(actionData);
      } else {
        try {
          const token = localStorage.getItem("token");
          const payload = {
            playerId: currentUser.id,
            event:
              action.type === "move"
                ? "move_chess"
                : action.type === "attack"
                  ? "attack_chess"
                  : action.type === "skill"
                    ? "skill"
                    : "buy_item",
            casterPosition: action.casterPosition,
            targetPosition: action.targetPosition,
            itemId: action.itemId,
            targetChampionId: action.targetChampionId,
          };

          const response = await axios.post(
            `${API_URL}/games/${gameId}/action`,
            payload,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (response.data.game) {
            setGameState(response.data.game);
          }
        } catch (err: any) {
          setError(err.response?.data?.message || "Failed to execute action");
        }
      }
    },
    [gameState, currentUser, gameId, wsConnected, wsSendAction]
  );

  // Select piece and calculate valid moves/attacks
  const selectPiece = useCallback(
    (piece: ChessPiece) => {
      if (!gameState || !currentUser) return;

      // Only allow selecting own pieces
      if (piece.ownerId !== currentUser.id) return;

      // Check if it's player's turn
      const isPlayerTurn =
        gameState.currentRound % 2 ===
        (gameState.bluePlayer === currentUser.id ? 1 : 0);
      if (!isPlayerTurn) return;

      setSelectedPiece(piece);

      // Calculate valid moves and attacks separately
      const moves: ChessPosition[] = [];
      const attacks: ChessPosition[] = [];

      // Calculate effective speed with first move bonus for minions
      let effectiveSpeed = piece.stats.speed;

      // First move bonus: Minions get +1 speed on their first move
      if (
        !piece.hasMovedBefore &&
        (piece.name === "Melee Minion" || piece.name === "Caster Minion")
      ) {
        effectiveSpeed += 1;
      }

      const speed = effectiveSpeed;
      const attackRange = piece.stats.attackRange;

      // Define 8 directions for movement/attacks (horizontal, vertical, diagonal)
      const directions = [
        { dx: 0, dy: 1 }, // North
        { dx: 0, dy: -1 }, // South
        { dx: 1, dy: 0 }, // East
        { dx: -1, dy: 0 }, // West
        { dx: 1, dy: 1 }, // Northeast
        { dx: 1, dy: -1 }, // Southeast
        { dx: -1, dy: 1 }, // Northwest
        { dx: -1, dy: -1 }, // Southwest
      ];

      // Calculate MOVEMENT (uses speed)
      directions.forEach(({ dx, dy }) => {
        for (let step = 1; step <= speed; step++) {
          const newX = piece.position.x + dx * step;
          const newY = piece.position.y + dy * step;

          // Check board bounds
          if (newX < -1 || newX > 8 || newY < 0 || newY > 7) break;

          // Check backward movement restriction
          if (piece.cannotMoveBackward) {
            // For blue pieces (bottom team), can't move to lower Y positions (backward)
            if (piece.blue && newY < piece.position.y) break;
            // For red pieces (top team), can't move to higher Y positions (backward)
            if (!piece.blue && newY > piece.position.y) break;
          }

          // Check vertical-only movement restriction
          if (piece.canOnlyMoveVertically) {
            // Vertical-only pieces can only move in Y direction (forward/backward)
            // They cannot move horizontally (X position must stay the same)
            if (newX !== piece.position.x) break;
          }

          const targetPosition = { x: newX, y: newY };
          const occupiedBy = gameState.board.find(
            (p) =>
              p.position.x === newX && p.position.y === newY && p.stats.hp > 0
          );

          if (!occupiedBy) {
            // Empty square - can move here
            moves.push(targetPosition);
          } else {
            // Square is occupied - can't move through it
            break;
          }
        }
      });

      // Calculate ATTACKS (uses attackRange)
      directions.forEach(({ dx, dy }) => {
        // Check if attackRange exists
        if (!attackRange) return;

        // Check if this direction is allowed for attacks
        const isHorizontal = dy === 0;
        const isVertical = dx === 0;
        const isDiagonal = Math.abs(dx) === Math.abs(dy);

        if (isHorizontal && !attackRange.horizontal) return;
        if (isVertical && !attackRange.vertical) return;
        if (isDiagonal && !attackRange.diagonal) return;

        for (let step = 1; step <= attackRange.range; step++) {
          const newX = piece.position.x + dx * step;
          const newY = piece.position.y + dy * step;

          // Check board bounds
          if (newX < -1 || newX > 8 || newY < 0 || newY > 7) break;

          const targetPosition = { x: newX, y: newY };
          const occupiedBy = gameState.board.find(
            (p) =>
              p.position.x === newX && p.position.y === newY && p.stats.hp > 0
          );

          if (occupiedBy) {
            // Found a piece
            if (occupiedBy.ownerId !== piece.ownerId) {
              // Enemy piece - can attack
              attacks.push(targetPosition);
            }
            // Either way, path is blocked for further attacks
            break;
          }
          // Empty square - continue checking further along this direction
        }
      });

      setValidMoves(moves);
      setValidAttacks(attacks);
    },
    [gameState, currentUser]
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedPiece(null);
    setValidMoves([]);
    setValidAttacks([]);
  }, []);

  // Check if it's current user's turn
  const isMyTurn =
    gameState && currentUser
      ? gameState.currentRound % 2 ===
      (gameState.bluePlayer === currentUser.id ? 1 : 0)
      : false;

  // Get current player data
  const currentPlayer = gameState?.players.find(
    (p) => p.userId === currentUser?.id
  );

  // Get opponent data
  const opponent = gameState?.players.find((p) => p.userId !== currentUser?.id);

  return {
    gameState,
    loading,
    error,
    selectedPiece,
    validMoves,
    validAttacks,
    isMyTurn,
    currentPlayer,
    opponent,
    selectPiece,
    clearSelection,
    executeAction,
    initializeGameplay,
    // WebSocket status
    connected: wsConnected,
    lastUpdate,
  };
};
