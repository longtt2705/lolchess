/**
 * GameEngine - Main entry point for the LOL Chess game engine
 *
 * This module provides the public API for:
 * - Creating and initializing games
 * - Processing game actions
 * - Validating moves
 * - Querying game state
 */

import { Game, GameSettings } from "../types/Game";
import { EventPayload } from "../types/Events";
import { Square } from "../types/Square";
import { Chess } from "../types/Chess";
import { GameEngineCallbacks } from "../types/callbacks";

/**
 * Configuration for creating a new game
 */
export interface GameConfig {
  /** Random seed for deterministic gameplay (defaults to Date.now()) */
  seed?: number;
  /** Blue player's champion selections (5 champions) */
  blueChampions?: string[];
  /** Red player's champion selections (5 champions) */
  redChampions?: string[];
  /** Starting gold for each player */
  startingGold?: number;
  /** Blue player ID */
  bluePlayerId?: string;
  /** Red player ID */
  redPlayerId?: string;
  /** Game name */
  name?: string;
}

/**
 * Result of action validation
 */
export interface ValidationResult {
  /** Whether the action is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Result of processing a game action
 */
export interface ProcessResult {
  /** The new game state after processing */
  game: Game;
  /** Whether the action was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Interface for the game engine
 * Implementations should be pure and deterministic given the same inputs
 */
export interface IGameEngine {
  /**
   * Create a new game with initial state
   * @param config - Game configuration options
   * @returns A new game instance ready to play
   */
  createGame(config: GameConfig): Game;

  /**
   * Process a game action and return the new state
   * This should be a pure function - same input always produces same output
   * @param game - Current game state
   * @param event - The action/event to process
   * @returns The new game state after processing
   */
  processAction(game: Game, event: EventPayload): ProcessResult;

  /**
   * Validate an action before executing it
   * @param game - Current game state
   * @param event - The action/event to validate
   * @returns Validation result indicating if the action is valid
   */
  validateAction(game: Game, event: EventPayload): ValidationResult;

  /**
   * Get all valid move positions for a piece
   * @param game - Current game state
   * @param pieceId - ID of the piece to get moves for
   * @returns Array of valid destination squares
   */
  getValidMoves(game: Game, pieceId: string): Square[];

  /**
   * Get all valid attack targets for a piece
   * @param game - Current game state
   * @param pieceId - ID of the piece to get attacks for
   * @returns Array of valid target squares
   */
  getValidAttacks(game: Game, pieceId: string): Square[];

  /**
   * Get all valid skill targets for a piece
   * @param game - Current game state
   * @param pieceId - ID of the piece to get skill targets for
   * @returns Array of valid target squares
   */
  getValidSkillTargets(game: Game, pieceId: string): Square[];

  /**
   * Check if the game is over
   * @param game - Current game state
   * @returns True if the game has ended
   */
  isGameOver(game: Game): boolean;

  /**
   * Get the winner of the game
   * @param game - Current game state
   * @returns Winner player ID, null if draw, undefined if not finished
   */
  getWinner(game: Game): string | null | undefined;

  /**
   * Get a piece by its ID
   * @param game - Current game state
   * @param pieceId - ID of the piece
   * @returns The chess piece or undefined if not found
   */
  getPieceById(game: Game, pieceId: string): Chess | undefined;

  /**
   * Get a piece at a specific position
   * @param game - Current game state
   * @param position - Board position
   * @returns The chess piece at that position or undefined
   */
  getPieceAtPosition(game: Game, position: Square): Chess | undefined;

  /**
   * Check if it's a specific player's turn
   * @param game - Current game state
   * @param playerId - Player ID to check
   * @returns True if it's that player's turn
   */
  isPlayerTurn(game: Game, playerId: string): boolean;

  /**
   * Get the current player (whose turn it is)
   * @param game - Current game state
   * @returns Player ID of current player
   */
  getCurrentPlayer(game: Game): string | undefined;
}

/**
 * Create an empty game template with default values
 * @param seed - Random seed for the game
 * @returns Empty game state
 */
export function createEmptyGame(seed: number): Game {
  return {
    name: "Game",
    status: "waiting",
    phase: "gameplay",
    players: [],
    maxPlayers: 2,
    currentRound: 1,
    board: [],
    rngSeed: seed,
    rngState: seed,
    shopItems: [],
    shopRefreshRound: 0,
    hasBoughtItemThisTurn: false,
    hasUsedSummonerSpellThisTurn: false,
    hasPerformedActionThisTurn: false,
    gameSettings: {
      roundTime: 60,
      startingGold: 0,
    },
    // Dragon Soul System - 6 drake types, only 4 will spawn per game
    drakePool: [
      "Infernal",
      "Cloud",
      "Mountain",
      "Hextech",
      "Ocean",
      "Chemtech",
    ],
    drakesKilled: 0,
    elderDrakeKillerTeam: null,
  };
}

/**
 * Deep clone a game state
 * Use this before processing to ensure immutability
 * @param game - Game state to clone
 * @returns Deep copy of the game state
 */
export function cloneGameState(game: Game): Game {
  return structuredClone(game);
}

/**
 * Determine whose turn it is based on round number
 * Blue player moves on odd rounds, Red on even rounds
 * @param game - Current game state
 * @returns Player ID of current player
 */
export function getCurrentPlayerId(game: Game): string | undefined {
  if (!game.bluePlayer || !game.redPlayer) {
    return undefined;
  }
  // Blue moves on odd rounds (1, 3, 5...), Red on even (2, 4, 6...)
  const isBlueTurn = game.currentRound % 2 !== 0;
  return isBlueTurn ? game.bluePlayer : game.redPlayer;
}

/**
 * Check if it's a specific player's turn
 * @param game - Current game state
 * @param playerId - Player ID to check
 * @returns True if it's that player's turn
 */
export function isPlayerTurn(game: Game, playerId: string): boolean {
  return getCurrentPlayerId(game) === playerId;
}

/**
 * Check if the game has ended
 * @param game - Current game state
 * @returns True if game status is "finished"
 */
export function isGameOver(game: Game): boolean {
  return game.status === "finished";
}

/**
 * Get the winner of a finished game
 * @param game - Current game state
 * @returns Winner player ID, null if draw, undefined if not finished
 */
export function getWinner(game: Game): string | null | undefined {
  if (!isGameOver(game)) {
    return undefined;
  }
  return game.winner ?? null;
}

/**
 * Find a piece by its ID
 * @param game - Current game state
 * @param pieceId - ID of the piece
 * @returns The chess piece or undefined
 */
export function getPieceById(game: Game, pieceId: string): Chess | undefined {
  return game.board.find((p) => p.id === pieceId);
}

/**
 * Find a piece at a specific position
 * @param game - Current game state
 * @param position - Board position
 * @returns The chess piece at that position or undefined
 */
export function getPieceAtPosition(
  game: Game,
  position: Square
): Chess | undefined {
  return game.board.find(
    (p) =>
      p.position.x === position.x &&
      p.position.y === position.y &&
      p.stats.hp > 0
  );
}

/**
 * Get all living pieces belonging to a player
 * @param game - Current game state
 * @param playerId - Player ID
 * @returns Array of living chess pieces
 */
export function getPlayerPieces(game: Game, playerId: string): Chess[] {
  return game.board.filter((p) => p.ownerId === playerId && p.stats.hp > 0);
}

/**
 * Get all living pieces on the board
 * @param game - Current game state
 * @returns Array of all living chess pieces
 */
export function getLivingPieces(game: Game): Chess[] {
  return game.board.filter((p) => p.stats.hp > 0);
}

// Re-export shop constants from GameLogic for backward compatibility
export { SHOP_ITEMS_COUNT, SHOP_REFRESH_INTERVAL } from "./GameLogic";

// Import GameLogic for concrete implementation
import { GameLogic, setDevelopmentMode } from "./GameLogic";
import { ChessFactory } from "../entities/ChessFactory";
import { SeededRandom, setGameRng, clearGameRng } from "../utils/SeededRandom";

/**
 * Concrete implementation of the game engine
 * Wraps GameLogic to provide a clean, stateless API
 */
export class GameEngine implements IGameEngine {
  private callbacks?: GameEngineCallbacks;

  constructor(callbacks?: GameEngineCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Enable or disable development mode
   * In development mode, players start with 1000 gold
   */
  static setDevelopmentMode(isDev: boolean): void {
    setDevelopmentMode(isDev);
  }

  /**
   * Create a new game with initial state
   */
  createGame(config: GameConfig): Game {
    const seed = config.seed ?? Date.now();

    // Create base game state
    const game = createEmptyGame(seed);
    game.name = config.name ?? "Game";

    // Set up players if provided
    if (config.bluePlayerId && config.redPlayerId) {
      game.bluePlayer = config.bluePlayerId;
      game.redPlayer = config.redPlayerId;
      game.players = [
        {
          userId: config.bluePlayerId,
          username: "Blue Player",
          gold: config.startingGold ?? 0,
          side: "blue",
          selectedChampions: config.blueChampions ?? [],
          bannedChampions: [],
          itemsBought: 0,
          baseItemCost: 25,
          inflationStep: 15,
        },
        {
          userId: config.redPlayerId,
          username: "Red Player",
          gold: config.startingGold ?? 0,
          side: "red",
          selectedChampions: config.redChampions ?? [],
          bannedChampions: [],
          itemsBought: 0,
          baseItemCost: 25,
          inflationStep: 15,
        },
      ] as any;

      // Initialize RNG context for GameLogic.initGame
      const rng = new SeededRandom(seed);
      setGameRng(rng);

      try {
        // Initialize the game board
        GameLogic.initGame(game, config.blueChampions, config.redChampions);
        game.rngState = rng.getSeed();
      } finally {
        clearGameRng();
      }
    }

    return game;
  }

  /**
   * Process a game action and return the new state
   * Creates a deep clone before processing to ensure immutability
   */
  processAction(game: Game, event: EventPayload): ProcessResult {
    try {
      // Clone state before processing
      const newState = cloneGameState(game);

      // Process the action
      GameLogic.processGame(newState, event);

      return {
        game: newState,
        success: true,
      };
    } catch (error: any) {
      return {
        game,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate an action before executing it
   * Runs the action on a clone and checks for errors
   */
  validateAction(game: Game, event: EventPayload): ValidationResult {
    try {
      // Clone state and attempt to process
      const testState = cloneGameState(game);
      GameLogic.processGame(testState, event);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get all valid move positions for a piece
   * TODO: Implement full move validation logic
   */
  getValidMoves(game: Game, pieceId: string): Square[] {
    const piece = getPieceById(game, pieceId);
    if (!piece || piece.stats.hp <= 0) {
      return [];
    }

    // Basic implementation: return empty squares within movement range
    // Full implementation would check piece-specific movement rules
    const validMoves: Square[] = [];
    const speed = piece.stats.speed ?? 1;

    if (speed === 0) {
      return [];
    }

    return validMoves;
  }

  /**
   * Get all valid attack targets for a piece
   * TODO: Implement full attack range validation logic
   */
  getValidAttacks(game: Game, pieceId: string): Square[] {
    const piece = getPieceById(game, pieceId);
    if (!piece || piece.stats.hp <= 0 || piece.cannotAttack) {
      return [];
    }

    // Basic implementation: return enemy pieces within attack range
    const validAttacks: Square[] = [];
    const range = piece.stats.attackRange?.range || 1;

    for (const target of game.board) {
      if (target.stats.hp <= 0) continue;
      if (target.blue === piece.blue && target.ownerId !== "neutral") continue; // Same team

      const dx = Math.abs(target.position.x - piece.position.x);
      const dy = Math.abs(target.position.y - piece.position.y);
      const distance = Math.max(dx, dy);

      if (distance <= range && distance > 0) {
        validAttacks.push({ x: target.position.x, y: target.position.y });
      }
    }

    return validAttacks;
  }

  /**
   * Get all valid skill targets for a piece
   * TODO: Implement skill-specific targeting logic
   */
  getValidSkillTargets(game: Game, pieceId: string): Square[] {
    const piece = getPieceById(game, pieceId);
    if (!piece || piece.stats.hp <= 0 || !piece.skill) {
      return [];
    }

    // Basic implementation based on skill's attack range
    const validTargets: Square[] = [];
    const skillRange = piece.skill.attackRange?.range || 1;
    const targetTypes = piece.skill.targetTypes || "enemy";

    // If skill requires no target, return empty array (self-cast)
    if (targetTypes === "none") {
      return [];
    }

    // For "square" or "squareInRange", return all valid squares
    if (targetTypes === "square" || targetTypes === "squareInRange") {
      for (let x = 0; x <= 7; x++) {
        for (let y = 0; y <= 7; y++) {
          const dx = Math.abs(x - piece.position.x);
          const dy = Math.abs(y - piece.position.y);
          const distance = Math.max(dx, dy);

          if (distance <= skillRange && distance > 0) {
            validTargets.push({ x, y });
          }
        }
      }
      return validTargets;
    }

    for (const target of game.board) {
      if (target.stats.hp <= 0) continue;

      const dx = Math.abs(target.position.x - piece.position.x);
      const dy = Math.abs(target.position.y - piece.position.y);
      const distance = Math.max(dx, dy);

      if (distance > skillRange) continue;

      // Check target type
      const isEnemy =
        target.blue !== piece.blue || target.ownerId === "neutral";
      const isAlly = target.blue === piece.blue && target.ownerId !== "neutral";
      const isAllyMinion =
        isAlly && (target.name.includes("Minion") || target.name === "Poro");

      if (targetTypes === "enemy" && isEnemy) {
        validTargets.push({ x: target.position.x, y: target.position.y });
      } else if (targetTypes === "ally" && isAlly) {
        validTargets.push({ x: target.position.x, y: target.position.y });
      } else if (targetTypes === "allyMinion" && isAllyMinion) {
        validTargets.push({ x: target.position.x, y: target.position.y });
      }
    }

    return validTargets;
  }

  /**
   * Check if the game is over
   */
  isGameOver(game: Game): boolean {
    return isGameOver(game);
  }

  /**
   * Get the winner of the game
   */
  getWinner(game: Game): string | null | undefined {
    return getWinner(game);
  }

  /**
   * Get a piece by its ID
   */
  getPieceById(game: Game, pieceId: string): Chess | undefined {
    return getPieceById(game, pieceId);
  }

  /**
   * Get a piece at a specific position
   */
  getPieceAtPosition(game: Game, position: Square): Chess | undefined {
    return getPieceAtPosition(game, position);
  }

  /**
   * Check if it's a specific player's turn
   */
  isPlayerTurn(game: Game, playerId: string): boolean {
    return isPlayerTurn(game, playerId);
  }

  /**
   * Get the current player (whose turn it is)
   */
  getCurrentPlayer(game: Game): string | undefined {
    return getCurrentPlayerId(game);
  }
}

// Export a default engine instance for convenience
export const gameEngine = new GameEngine();
