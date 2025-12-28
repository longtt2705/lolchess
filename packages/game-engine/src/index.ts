/**
 * @lolchess/game-engine
 *
 * Pure, framework-agnostic game engine for LOL Chess
 *
 * This package contains:
 * - Pure TypeScript types (no framework dependencies)
 * - Core engine interface and helper functions
 * - Utility functions for game logic
 * - Seeded random number generator for deterministic replays
 * - Champion and item data
 * - Entity classes (ChessObject, ChessFactory, all champions)
 */

// Core engine
export {
  // Interface and types
  IGameEngine,
  GameConfig,
  ValidationResult,
  ProcessResult,
  // Concrete implementation
  GameEngine,
  gameEngine,
  // GameLogic for direct access
  GameLogic,
  setDevelopmentMode,
  isDevelopmentMode,
  // Helper functions
  createEmptyGame,
  cloneGameState,
  getCurrentPlayerId,
  isPlayerTurn,
  isGameOver,
  getWinner,
  getPieceById,
  getPieceAtPosition,
  getPlayerPieces,
  getLivingPieces,
  // Constants
  SHOP_ITEMS_COUNT,
  SHOP_REFRESH_INTERVAL,
} from "./core";

// Types
export * from "./types";

// Utils
export { SeededRandom, getGameRng, setGameRng, clearGameRng } from "./utils/SeededRandom";
export {
  getAdjacentSquares,
  calculateDistance,
  isValidBoardPosition,
  getChessAtPosition,
  getAnyChessAtPosition,
  isPathClear,
  getAdjacentEnemies,
  getAdjacentAllies,
  getPiecesInLine,
} from "./utils/helpers";

// Data
export { champions, ChampionData } from "./data/champions";
export {
  basicItems,
  combinedItems,
  viktorModules,
  allItems,
  getItemById,
  findCombinedItem,
  canCombineItems,
  applyItemStats,
  getViktorModuleById,
  getViktorModuleByIndex,
  getViktorModulesCount,
  ItemData,
  ItemEffect,
  ItemConditionContext,
} from "./data/items";

// Entities
export {
  ChessObject,
  ChessFactory,
  IChessFactory,
  chessFactory,
} from "./entities";
export * from "./entities/champions";
