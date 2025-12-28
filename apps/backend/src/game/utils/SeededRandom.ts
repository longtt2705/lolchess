/**
 * SeededRandom - A deterministic random number generator
 *
 * Uses a Linear Congruential Generator (LCG) algorithm to produce
 * reproducible random sequences from a given seed. This enables:
 * - Deterministic game replays
 * - Predictable testing
 * - AI simulation
 *
 * @example
 * const rng = new SeededRandom(12345);
 * rng.next();        // Returns 0-1
 * rng.nextInt(0, 10); // Returns 0-9
 * rng.chance(50);    // Returns true ~50% of the time
 * rng.shuffle([1,2,3]); // Shuffles array deterministically
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0; // Ensure unsigned 32-bit integer
  }

  /**
   * Returns a random number between 0 (inclusive) and 1 (exclusive)
   * Uses constants from Numerical Recipes (LCG algorithm)
   */
  next(): number {
    // Constants from Numerical Recipes
    this.seed = ((this.seed * 1664525 + 1013904223) >>> 0) % 4294967296;
    return this.seed / 4294967296;
  }

  /**
   * Returns a random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Returns true with the given probability (0-100)
   * @param probability Percentage chance (0-100)
   */
  chance(probability: number): boolean {
    return this.next() * 100 < probability;
  }

  /**
   * Shuffles an array in place using Fisher-Yates algorithm
   * Returns a new shuffled array (does not mutate original)
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length)];
  }

  /**
   * Generate a random ID string
   * @param length Length of the ID string (default: 9)
   */
  nextId(length: number = 9): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[this.nextInt(0, chars.length)];
    }
    return result;
  }

  /**
   * Get the current seed (useful for saving game state)
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Set the seed (useful for loading game state)
   */
  setSeed(seed: number): void {
    this.seed = seed >>> 0;
  }

  /**
   * Create a clone of this RNG with the same state
   */
  clone(): SeededRandom {
    return new SeededRandom(this.seed);
  }
}

/**
 * Global RNG instance for the current game context
 * This is set at the start of each processGame call
 */
let currentGameRng: SeededRandom | null = null;

/**
 * Get the current game's RNG instance
 * Falls back to a new random seed if no context is set (for backward compatibility)
 */
export function getGameRng(): SeededRandom {
  if (!currentGameRng) {
    // Fallback for backward compatibility - use current timestamp
    currentGameRng = new SeededRandom(Date.now());
  }
  return currentGameRng;
}

/**
 * Set the current game's RNG instance
 * Called at the start of processGame
 */
export function setGameRng(rng: SeededRandom): void {
  currentGameRng = rng;
}

/**
 * Clear the current game's RNG instance
 * Called after processGame completes
 */
export function clearGameRng(): void {
  currentGameRng = null;
}
