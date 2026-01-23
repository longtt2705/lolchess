import {
  Chess,
  Game,
  GameEngine,
  Square,
  getPlayerPieces,
  isPathClear,
  champions,
} from "@lolchess/game-engine";
import { BlockedLane, LoSAnalysis, LoSClearingMove } from "../types";

/**
 * Direction vectors for 8-directional movement
 */
const DIRECTIONS = [
  { dx: 0, dy: 1 }, // Up (forward for blue)
  { dx: 0, dy: -1 }, // Down (forward for red)
  { dx: 1, dy: 0 }, // Right
  { dx: -1, dy: 0 }, // Left
  { dx: 1, dy: 1 }, // Diagonal up-right
  { dx: -1, dy: 1 }, // Diagonal up-left
  { dx: 1, dy: -1 }, // Diagonal down-right
  { dx: -1, dy: -1 }, // Diagonal down-left
];

/**
 * Evaluates Line of Sight (LoS) for ranged pieces
 *
 * Key concept: Friendly pieces block ranged attacks, so the bot needs to:
 * 1. Identify when ranged carries have blocked firing lanes
 * 2. Find moves that clear these blocks ("window opening")
 * 3. Avoid creating new blocks when moving
 */
export class LoSEvaluator {
  constructor(private gameEngine: GameEngine) {}

  /**
   * Check if a piece is a ranged carry (attackRange >= 2 and marksman/mage role)
   */
  isRangedCarry(piece: Chess): boolean {
    const range = piece.stats.attackRange?.range || 1;
    if (range < 2) return false;

    // Get champion role from data
    const role = this.getChampionRole(piece.name);
    return role === "marksman" || role === "mage";
  }

  /**
   * Get champion role from champion data
   */
  getChampionRole(championName: string): string | null {
    const champData = champions.find((c) => c.name === championName);
    return champData?.role || null;
  }

  /**
   * Analyze Line of Sight for all ranged carries of a player
   */
  analyzeLoS(game: Game, playerId: string): LoSAnalysis {
    const isBlue = game.bluePlayer === playerId;
    const playerPieces = getPlayerPieces(game, playerId);
    const opponentId = isBlue ? game.redPlayer! : game.bluePlayer!;
    const enemyPieces = getPlayerPieces(game, opponentId);

    const rangedCarries = playerPieces.filter(
      (p) => p.stats.hp > 0 && this.isRangedCarry(p)
    );

    const blockedLanes: BlockedLane[] = [];
    let clearLaneScore = 0;
    let blockedLaneScore = 0;

    for (const carry of rangedCarries) {
      const carryAnalysis = this.analyzeCarryLoS(
        game,
        carry,
        playerPieces,
        enemyPieces,
        isBlue
      );

      blockedLanes.push(...carryAnalysis.blockedLanes);
      clearLaneScore += carryAnalysis.clearLaneScore;
      blockedLaneScore += carryAnalysis.blockedLaneScore;
    }

    return {
      rangedCarries,
      blockedLanes,
      clearLaneScore,
      blockedLaneScore,
      totalScore: clearLaneScore - blockedLaneScore,
    };
  }

  /**
   * Analyze LoS for a single ranged carry
   */
  private analyzeCarryLoS(
    game: Game,
    carry: Chess,
    allies: Chess[],
    enemies: Chess[],
    isBlue: boolean
  ): {
    blockedLanes: BlockedLane[];
    clearLaneScore: number;
    blockedLaneScore: number;
  } {
    const blockedLanes: BlockedLane[] = [];
    let clearLaneScore = 0;
    let blockedLaneScore = 0;

    const range = carry.stats.attackRange?.range || 2;
    const attackRange = carry.stats.attackRange;

    for (const dir of DIRECTIONS) {
      // Check if this direction is valid for the piece's attack pattern
      if (!this.canAttackInDirection(attackRange, dir)) {
        continue;
      }

      // Look for enemies in this direction within range
      const enemyInLane = this.findFirstPieceInDirection(
        game,
        carry.position,
        dir,
        range,
        enemies
      );

      if (enemyInLane) {
        // Check if there's a blocker between carry and enemy
        const blocker = this.findBlocker(
          game,
          carry.position,
          enemyInLane.position,
          allies
        );

        if (blocker) {
          // Lane is blocked
          const targetValue = this.calculateTargetValue(enemyInLane);
          blockedLanes.push({
            carry,
            blocker,
            target: enemyInLane,
            direction: dir,
            targetValue,
          });
          blockedLaneScore += targetValue;
        } else {
          // Lane is clear - carry can attack this enemy
          clearLaneScore += this.calculateTargetValue(enemyInLane);
        }
      }
    }

    return { blockedLanes, clearLaneScore, blockedLaneScore };
  }

  /**
   * Check if a piece can attack in a given direction based on attackRange
   */
  private canAttackInDirection(
    attackRange: Chess["stats"]["attackRange"],
    dir: { dx: number; dy: number }
  ): boolean {
    if (!attackRange) return false;

    const isHorizontal = dir.dy === 0 && dir.dx !== 0;
    const isVertical = dir.dx === 0 && dir.dy !== 0;
    const isDiagonal = dir.dx !== 0 && dir.dy !== 0;

    if (isHorizontal && !attackRange.horizontal) return false;
    if (isVertical && !attackRange.vertical) return false;
    if (isDiagonal && !attackRange.diagonal) return false;

    return true;
  }

  /**
   * Find the first piece in a direction within range
   */
  private findFirstPieceInDirection(
    game: Game,
    from: Square,
    dir: { dx: number; dy: number },
    maxRange: number,
    pieces: Chess[]
  ): Chess | null {
    for (let dist = 1; dist <= maxRange; dist++) {
      const x = from.x + dir.dx * dist;
      const y = from.y + dir.dy * dist;

      // Check board bounds
      if (x < 0 || x > 7 || y < 0 || y > 7) break;

      const piece = pieces.find(
        (p) => p.position.x === x && p.position.y === y && p.stats.hp > 0
      );
      if (piece) return piece;
    }
    return null;
  }

  /**
   * Find a blocking ally between carry and target
   */
  private findBlocker(
    game: Game,
    from: Square,
    to: Square,
    allies: Chess[]
  ): Chess | null {
    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;

    // Determine step direction
    const stepX = deltaX === 0 ? 0 : deltaX / Math.abs(deltaX);
    const stepY = deltaY === 0 ? 0 : deltaY / Math.abs(deltaY);

    // Check each square along the path (excluding start and end)
    let currentX = from.x + stepX;
    let currentY = from.y + stepY;

    while (currentX !== to.x || currentY !== to.y) {
      const blocker = allies.find(
        (p) =>
          p.position.x === currentX &&
          p.position.y === currentY &&
          p.stats.hp > 0
      );

      if (blocker) return blocker;

      currentX += stepX;
      currentY += stepY;
    }

    return null;
  }

  /**
   * Calculate the tactical value of a target
   */
  private calculateTargetValue(target: Chess): number {
    let value = 0;

    // Base gold value
    value += target.stats.goldValue || 20;

    // HP factor - low HP targets are more valuable to have LoS on
    const hpPercent = target.stats.hp / target.stats.maxHp;
    value += (1 - hpPercent) * 30;

    // Poro is extremely valuable to have LoS on
    if (target.name === "Poro") {
      value += 200;
    }

    // Champions are more valuable than minions
    const isMinion = [
      "Melee Minion",
      "Caster Minion",
      "Siege Minion",
      "Super Minion",
    ].includes(target.name);
    if (!isMinion && target.name !== "Poro") {
      value += 30;
    }

    return value;
  }

  /**
   * Get moves that would clear blocked lanes
   * Returns moves for blocking pieces that would unblock ranged carries
   */
  getLoSClearingMoves(game: Game, playerId: string): LoSClearingMove[] {
    const analysis = this.analyzeLoS(game, playerId);
    const clearingMoves: LoSClearingMove[] = [];

    for (const blockedLane of analysis.blockedLanes) {
      const blocker = blockedLane.blocker;

      // Get valid moves for the blocker
      const validMoves = this.gameEngine.getValidMoves(game, blocker.id);

      for (const move of validMoves) {
        // Check if this move would clear the lane
        if (this.wouldClearLane(blockedLane, move)) {
          clearingMoves.push({
            blocker,
            carry: blockedLane.carry,
            target: blockedLane.target,
            moveFrom: blocker.position,
            moveTo: move,
            targetValue: blockedLane.targetValue,
          });
        }
      }
    }

    // Sort by target value (highest first)
    return clearingMoves.sort((a, b) => b.targetValue - a.targetValue);
  }

  /**
   * Check if moving blocker to new position would clear the lane
   */
  private wouldClearLane(
    blockedLane: BlockedLane,
    newBlockerPosition: Square
  ): boolean {
    const { carry, target } = blockedLane;

    // Check if new position is still on the path between carry and target
    const isOnPath = this.isOnPath(
      carry.position,
      target.position,
      newBlockerPosition
    );

    // Lane is cleared if blocker moves off the path
    return !isOnPath;
  }

  /**
   * Check if a position is on the path between two squares
   */
  private isOnPath(from: Square, to: Square, check: Square): boolean {
    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;

    // Same position as start or end is not "on path"
    if (
      (check.x === from.x && check.y === from.y) ||
      (check.x === to.x && check.y === to.y)
    ) {
      return false;
    }

    // Determine step direction
    const stepX = deltaX === 0 ? 0 : deltaX / Math.abs(deltaX);
    const stepY = deltaY === 0 ? 0 : deltaY / Math.abs(deltaY);

    // Check each square along the path
    let currentX = from.x + stepX;
    let currentY = from.y + stepY;

    while (currentX !== to.x || currentY !== to.y) {
      if (currentX === check.x && currentY === check.y) {
        return true;
      }
      currentX += stepX;
      currentY += stepY;
    }

    return false;
  }

  /**
   * Evaluate the LoS score for position evaluation
   * Positive = good LoS, negative = blocked LoS
   */
  evaluateLoS(game: Game, playerId: string): number {
    const analysis = this.analyzeLoS(game, playerId);
    return analysis.totalScore;
  }
}
