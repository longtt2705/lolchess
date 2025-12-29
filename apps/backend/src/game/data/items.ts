// Re-export item data and functions from the game engine package
// This maintains backward compatibility with existing imports in the backend
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
} from "@lolchess/game-engine";

// Export types
export type {
  ItemData,
  ItemEffect,
  ItemConditionContext,
} from "@lolchess/game-engine";

// Also re-export ChessStats for the applyItemStats function
export type { ChessStats } from "@lolchess/game-engine";
