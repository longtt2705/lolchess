// Re-export SeededRandom and related functions from the game engine package
// This maintains backward compatibility with existing imports in the backend
export {
  SeededRandom,
  getGameRng,
  setGameRng,
  clearGameRng,
} from "@lolchess/game-engine";
