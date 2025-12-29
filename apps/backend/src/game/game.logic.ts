/**
 * Re-export GameLogic from the game engine package
 *
 * This file maintains backward compatibility while delegating all
 * game logic to the @lolchess/game-engine package.
 */

export {
  GameLogic,
  SHOP_ITEMS_COUNT,
  SHOP_REFRESH_INTERVAL,
  setDevelopmentMode,
  isDevelopmentMode,
} from "@lolchess/game-engine";
