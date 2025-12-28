/**
 * Core game engine exports
 */

export {
  // Interface and types
  IGameEngine,
  GameConfig,
  ValidationResult,
  ProcessResult,
  // Concrete implementation
  GameEngine,
  gameEngine,
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
} from "./GameEngine";

// Export GameLogic for direct access (backward compatibility)
export {
  GameLogic,
  setDevelopmentMode,
  isDevelopmentMode,
} from "./GameLogic";

