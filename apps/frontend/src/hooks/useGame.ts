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
  startingPosition?: ChessPosition;
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
    sunder?: number;
    criticalChance?: number;
    criticalDamage?: number;
    cooldownReduction?: number;
    lifesteal?: number;
    hpRegen: number;
    durability?: number;
    attackRange: {
      range: number;
      diagonal: boolean;
      horizontal: boolean;
      vertical: boolean;
      lShape?: boolean;
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
    sunder?: number;
    criticalChance?: number;
    criticalDamage?: number;
    cooldownReduction?: number;
    lifesteal?: number;
    hpRegen: number;
    durability?: number;
    attackRange: {
      range: number;
      diagonal: boolean;
      horizontal: boolean;
      vertical: boolean;
      lShape?: boolean;
    };
  };
  skill?: {
    name: string;
    description: string;
    type: "passive" | "active";
    cooldown: number;
    currentCooldown: number;
    attackRange?: {
      range: number;
      diagonal: boolean;
      horizontal: boolean;
      vertical: boolean;
      lShape?: boolean;
    };
    targetTypes?:
      | "square"
      | "squareInRange"
      | "ally"
      | "allyMinion"
      | "enemy"
      | "none";
  };
  shields?: Array<{
    amount: number;
    duration: number;
  }>;
  items?: Array<{
    id: string;
    name: string;
    description: string;
    unique: boolean;
    cooldown: number;
    currentCooldown: number;
  }>;
  cannotMoveBackward: boolean;
  canOnlyMoveVertically: boolean;
  hasMovedBefore: boolean;
  cannotAttack: boolean;
  deadAtRound?: number;
}

export interface ActionDetails {
  timestamp: number;
  actionType: "move_chess" | "attack_chess" | "skill" | "buy_item";
  casterId: string;
  casterPosition: ChessPosition;
  targetId?: string;
  targetPosition?: ChessPosition;
  fromPosition?: ChessPosition;
  damage?: number;
  affectedPieceIds: string[];
  statChanges?: Record<string, { oldValue: number; newValue: number }>;
  itemId?: string;
  skillName?: string;
  pulledToPosition?: ChessPosition; // For Rocket Grab: actual position the target was pulled to
  killedPieceIds?: string[];
  killerPlayerId?: string;
  selfDamage?: Record<string, number>; // Track self-damage for animation (pieceId -> damage amount)
  guinsooProc?: boolean; // Track if Guinsoo's Rageblade proc'd on this attack
  whirlwindTargets?: Array<{
    targetId: string;
    targetPosition: ChessPosition;
  }>; // For Yasuo: targets hit by the whirlwind on critical strike
  additionalAttacks?: Array<{
    attackerId: string;
    attackerPosition: ChessPosition;
    targetId: string;
    targetPosition: ChessPosition;
  }>; // For Sand Soldiers: chain attacks from nearby soldiers
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
    side?: "blue" | "red";
    selectedChampions?: string[];
    bannedChampions?: string[];
  }>;
  winner?: string;
  lastAction?: ActionDetails;
  hasBoughtItemThisTurn: boolean;
  hasPerformedActionThisTurn: boolean;
  shopItems?: string[]; // Current available shop item IDs (rotates periodically)
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
    oldGameState: wsOldGameState,
    lastUpdate,
    sendAction: wsSendAction,
    initializeGameplay: wsInitializeGameplay,
    resign: wsResign,
    offerDraw: wsOfferDraw,
    respondToDraw: wsRespondToDraw,
    buyItem: wsBuyItem,
    drawOfferReceived,
    setDrawOfferReceived,
    drawOfferSent,
    setDrawOfferSent,
  } = useWebSocket(gameId);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [displayState, setDisplayState] = useState<GameState | null>(null); // What's currently displayed
  const [queuedState, setQueuedState] = useState<GameState | null>(null); // Waiting for animations to finish
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<ChessPiece | null>(null);
  const [validMoves, setValidMoves] = useState<ChessPosition[]>([]);
  const [validAttacks, setValidAttacks] = useState<ChessPosition[]>([]);
  const [validSkillTargets, setValidSkillTargets] = useState<ChessPosition[]>(
    []
  );
  const [isSkillMode, setIsSkillMode] = useState(false);

  // Update game state from WebSocket
  useEffect(() => {
    if (wsGameState) {
      setGameState(wsGameState);

      // If there's an oldGame and lastAction, show old state first and queue new state
      if (wsOldGameState && wsGameState.lastAction) {
        setDisplayState(wsOldGameState);
        setQueuedState(wsGameState);
      } else {
        // No animations - show new state immediately
        setDisplayState(wsGameState);
        setQueuedState(null);
      }

      setLoading(false);
      setError(null);
    }
  }, [wsGameState, wsOldGameState]);

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
      setValidSkillTargets([]);
      setIsSkillMode(false);

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

      // Calculate L-SHAPE ATTACKS (knight-like movement)
      if (attackRange && attackRange.lShape) {
        // All 8 possible L-shape moves: 2 squares in one direction, 1 perpendicular
        const lShapeOffsets = [
          { dx: 2, dy: 1 }, // Right 2, Up 1
          { dx: 2, dy: -1 }, // Right 2, Down 1
          { dx: -2, dy: 1 }, // Left 2, Up 1
          { dx: -2, dy: -1 }, // Left 2, Down 1
          { dx: 1, dy: 2 }, // Right 1, Up 2
          { dx: 1, dy: -2 }, // Right 1, Down 2
          { dx: -1, dy: 2 }, // Left 1, Up 2
          { dx: -1, dy: -2 }, // Left 1, Down 2
        ];

        lShapeOffsets.forEach(({ dx, dy }) => {
          const newX = piece.position.x + dx;
          const newY = piece.position.y + dy;

          // Check board bounds
          if (newX < -1 || newX > 8 || newY < 0 || newY > 7) return;

          const targetPosition = { x: newX, y: newY };
          const occupiedBy = gameState.board.find(
            (p) =>
              p.position.x === newX && p.position.y === newY && p.stats.hp > 0
          );

          // L-shape can only attack enemy pieces (not empty squares)
          if (occupiedBy && occupiedBy.ownerId !== piece.ownerId) {
            attacks.push(targetPosition);
          }
        });
      }

      // Check for ZED'S DEATH MARK - can attack marked targets from anywhere
      if (piece.name === "Zed") {
        // Find all enemy pieces with Death Mark from this Zed
        gameState.board.forEach((target) => {
          // Skip if not an enemy or dead
          if (target.ownerId === piece.ownerId || target.stats.hp <= 0) return;

          // Check if target has Death Mark debuff from this Zed
          const deathMarkId = `death_mark_${piece.id}_${target.id}`;
          const hasDeathMark = (target as any).debuffs?.some(
            (debuff: any) => debuff.id === deathMarkId
          );

          if (hasDeathMark) {
            // Add marked target as valid attack regardless of range
            attacks.push({ x: target.position.x, y: target.position.y });
          }
        });
      }

      // Check for CASTLING (Poro with Siege Minion/Rook)
      if (piece.name === "Poro" && !piece.hasMovedBefore) {
        // Check kingside castling (right/east)
        const kingsideRook = gameState.board.find(
          (p) =>
            p.position.x === 7 &&
            p.position.y === piece.position.y &&
            p.name === "Siege Minion" &&
            p.blue === piece.blue &&
            p.stats.hp > 0 &&
            !p.hasMovedBefore
        );

        if (kingsideRook) {
          // Check if path is clear between king and rook
          const pathClear = ![5, 6].some((x) =>
            gameState.board.find(
              (p) =>
                p.position.x === x &&
                p.position.y === piece.position.y &&
                p.stats.hp > 0
            )
          );

          if (pathClear) {
            moves.push({ x: piece.position.x + 2, y: piece.position.y });
          }
        }

        // Check queenside castling (left/west)
        const queensideRook = gameState.board.find(
          (p) =>
            p.position.x === 0 &&
            p.position.y === piece.position.y &&
            p.name === "Siege Minion" &&
            p.blue === piece.blue &&
            p.stats.hp > 0 &&
            !p.hasMovedBefore
        );

        if (queensideRook) {
          // Check if path is clear between king and rook
          const pathClear = ![1, 2, 3].some((x) =>
            gameState.board.find(
              (p) =>
                p.position.x === x &&
                p.position.y === piece.position.y &&
                p.stats.hp > 0
            )
          );

          if (pathClear) {
            moves.push({ x: piece.position.x - 2, y: piece.position.y });
          }
        }
      }

      // Check for KNIGHT MOVE (Champions in slots 1 and 6 on first move)
      const isKnightSlot =
        piece.startingPosition &&
        (piece.startingPosition.y === 0 || piece.startingPosition.y === 7) &&
        (piece.startingPosition.x === 1 || piece.startingPosition.x === 6);

      if (!piece.hasMovedBefore && isKnightSlot) {
        // Knight moves: L-shaped pattern (2+1 or 1+2)
        const knightMoves = [
          { dx: 2, dy: 1 }, // 2 right, 1 up
          { dx: 2, dy: -1 }, // 2 right, 1 down
          { dx: -2, dy: 1 }, // 2 left, 1 up
          { dx: -2, dy: -1 }, // 2 left, 1 down
          { dx: 1, dy: 2 }, // 1 right, 2 up
          { dx: 1, dy: -2 }, // 1 right, 2 down
          { dx: -1, dy: 2 }, // 1 left, 2 up
          { dx: -1, dy: -2 }, // 1 left, 2 down
        ];

        knightMoves.forEach(({ dx, dy }) => {
          const newX = piece.position.x + dx;
          const newY = piece.position.y + dy;

          // Check board bounds
          if (newX < -1 || newX > 8 || newY < 0 || newY > 7) return;

          const targetPosition = { x: newX, y: newY };
          const occupiedBy = gameState.board.find(
            (p) =>
              p.position.x === newX && p.position.y === newY && p.stats.hp > 0
          );

          if (!occupiedBy) {
            // Empty square - can move here (knight can jump over pieces)
            moves.push(targetPosition);
          } else if (occupiedBy.ownerId !== piece.ownerId) {
            // Enemy piece - can attack with knight move
            attacks.push(targetPosition);
          }
          // If occupied by friendly piece, can't move there
        });
      }

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
    setValidSkillTargets([]);
    setIsSkillMode(false);
  }, []);

  // Activate skill targeting mode
  const activateSkillMode = useCallback(
    (piece: ChessPiece) => {
      if (!gameState || !piece.skill || piece.skill.type !== "active") return;

      const skill = piece.skill;
      const skillTargets: ChessPosition[] = [];

      // If skill has no targetTypes or is "none", execute immediately
      if (!skill.targetTypes || skill.targetTypes === "none") {
        setIsSkillMode(false);
        setValidSkillTargets([]);
        return;
      }

      // Get skill range (default to 1 if not specified)
      const skillRange = skill.attackRange || {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      };

      // Handle L-shape movement (like knight in chess)
      if (skillRange.lShape) {
        // L-shape offsets: 2 squares in one direction + 1 square perpendicular
        const lShapeOffsets = [
          { dx: 2, dy: 1 },
          { dx: 2, dy: -1 },
          { dx: -2, dy: 1 },
          { dx: -2, dy: -1 },
          { dx: 1, dy: 2 },
          { dx: 1, dy: -2 },
          { dx: -1, dy: 2 },
          { dx: -1, dy: -2 },
        ];

        lShapeOffsets.forEach(({ dx, dy }) => {
          const newX = piece.position.x + dx;
          const newY = piece.position.y + dy;

          // Check board bounds
          if (newX < -1 || newX > 8 || newY < 0 || newY > 7) return;

          const targetPosition = { x: newX, y: newY };
          const occupiedBy = gameState.board.find(
            (p) =>
              p.position.x === newX && p.position.y === newY && p.stats.hp > 0
          );

          // Handle different target types for L-shape
          if (skill.targetTypes === "square") {
            // Can target empty squares
            if (!occupiedBy) {
              skillTargets.push(targetPosition);
            }
          } else if (skill.targetTypes === "squareInRange") {
            // Can target empty squares within range
            if (!occupiedBy) {
              skillTargets.push(targetPosition);
            }
          } else if (skill.targetTypes === "enemy") {
            // Can only target enemy pieces
            if (occupiedBy && occupiedBy.ownerId !== piece.ownerId) {
              skillTargets.push(targetPosition);
            }
          } else if (skill.targetTypes === "ally") {
            // Can only target ally pieces
            if (occupiedBy && occupiedBy.ownerId === piece.ownerId) {
              skillTargets.push(targetPosition);
            }
          } else if (skill.targetTypes === "allyMinion") {
            // Can only target ally minions
            if (
              occupiedBy &&
              occupiedBy.ownerId === piece.ownerId &&
              (occupiedBy.name === "Melee Minion" ||
                occupiedBy.name === "Caster Minion")
            ) {
              skillTargets.push(targetPosition);
            }
          }
        });
      } else {
        // Standard directional movement (not L-shape)
        // Define 8 directions
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

        // Calculate valid skill targets based on skill range and target type
        directions.forEach(({ dx, dy }) => {
          // Check if this direction is allowed
          const isHorizontal = dy === 0;
          const isVertical = dx === 0;
          const isDiagonal = Math.abs(dx) === Math.abs(dy);

          if (isHorizontal && !skillRange.horizontal) return;
          if (isVertical && !skillRange.vertical) return;
          if (isDiagonal && !skillRange.diagonal) return;

          for (let step = 1; step <= skillRange.range; step++) {
            const newX = piece.position.x + dx * step;
            const newY = piece.position.y + dy * step;

            // Check board bounds
            if (newX < -1 || newX > 8 || newY < 0 || newY > 7) break;

            const targetPosition = { x: newX, y: newY };
            const occupiedBy = gameState.board.find(
              (p) =>
                p.position.x === newX && p.position.y === newY && p.stats.hp > 0
            );

            // Handle different target types
            if (skill.targetTypes === "square") {
              // Can target empty squares within range (path must be clear)
              if (occupiedBy) {
                break; // Stop at any piece - path blocked
              }
              skillTargets.push(targetPosition);
            } else if (skill.targetTypes === "squareInRange") {
              // Can target empty squares within range (ignoring obstacles)
              if (!occupiedBy) {
                skillTargets.push(targetPosition);
              }
              // Don't break - continue checking full range even if square is occupied
            } else if (skill.targetTypes === "enemy") {
              // Can only target enemy pieces
              if (occupiedBy && occupiedBy.ownerId !== piece.ownerId) {
                skillTargets.push(targetPosition);
                break; // Stop at first enemy
              } else if (occupiedBy) {
                break; // Stop at ally
              }
            } else if (skill.targetTypes === "ally") {
              // Can only target ally pieces
              if (occupiedBy && occupiedBy.ownerId === piece.ownerId) {
                skillTargets.push(targetPosition);
                break; // Stop at first ally
              } else if (occupiedBy) {
                break; // Stop at enemy
              }
            } else if (skill.targetTypes === "allyMinion") {
              // Can only target ally minions (Melee Minion or Caster Minion)
              if (
                occupiedBy &&
                occupiedBy.ownerId === piece.ownerId &&
                (occupiedBy.name === "Melee Minion" ||
                  occupiedBy.name === "Caster Minion")
              ) {
                skillTargets.push(targetPosition);
                break; // Stop at first ally minion
              } else if (occupiedBy) {
                break; // Stop at any piece
              }
            }
          }
        });
      }

      setValidSkillTargets(skillTargets);
      setIsSkillMode(true);
      // Clear normal move/attack highlights
      setValidMoves([]);
      setValidAttacks([]);
    },
    [gameState]
  );

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

  // Resign from the game
  const resign = useCallback(() => {
    if (wsConnected) {
      wsResign();
    }
  }, [wsConnected, wsResign]);

  // Offer a draw
  const offerDraw = useCallback(() => {
    if (wsConnected) {
      wsOfferDraw();
    }
  }, [wsConnected, wsOfferDraw]);

  // Respond to draw offer
  const respondToDraw = useCallback(
    (accept: boolean) => {
      if (wsConnected) {
        wsRespondToDraw(accept);
      }
    },
    [wsConnected, wsRespondToDraw]
  );

  return {
    gameState,
    displayState,
    queuedState,
    setDisplayState,
    setQueuedState,
    loading,
    error,
    selectedPiece,
    validMoves,
    validAttacks,
    validSkillTargets,
    isSkillMode,
    isMyTurn,
    currentPlayer,
    opponent,
    selectPiece,
    clearSelection,
    executeAction,
    initializeGameplay,
    activateSkillMode,
    resign,
    offerDraw,
    respondToDraw,
    buyItem: wsBuyItem,
    drawOfferReceived,
    setDrawOfferReceived,
    drawOfferSent,
    setDrawOfferSent,
    // WebSocket status
    connected: wsConnected,
    lastUpdate,
  };
};
