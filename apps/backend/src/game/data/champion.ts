// Re-export champion data from the game engine package
// This maintains backward compatibility with existing imports in the backend
export { champions, ChampionData } from "@lolchess/game-engine";

// Also re-export types that might be needed
export type {
  Aura,
  ChessStats,
  Skill,
  AttackProjectile,
} from "@lolchess/game-engine";
