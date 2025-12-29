// Re-export all helper functions from the game engine package
// This maintains backward compatibility with existing imports in the backend
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
} from '@lolchess/game-engine';
