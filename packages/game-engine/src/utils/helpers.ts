/**
 * Pure utility functions for game logic
 * These functions have no side effects and are framework-agnostic
 */

import { Square, Chess, Game } from "../types";

/**
 * Get all adjacent squares (8-directional) from a given position
 * Filters to only include valid board positions
 */
export function getAdjacentSquares(square: Square): Square[] {
  return [
    { x: square.x - 1, y: square.y - 1 }, // Northwest
    { x: square.x - 1, y: square.y }, // West
    { x: square.x - 1, y: square.y + 1 }, // Southwest
    { x: square.x, y: square.y - 1 }, // North
    { x: square.x, y: square.y + 1 }, // South
    { x: square.x + 1, y: square.y - 1 }, // Northeast
    { x: square.x + 1, y: square.y }, // East
    { x: square.x + 1, y: square.y + 1 }, // Southeast
  ].filter((s) => isValidBoardPosition(s.x, s.y));
}

/**
 * Calculate Chebyshev distance between two squares
 * This is the maximum of horizontal and vertical distances
 * (diagonals count as 1 distance)
 */
export function calculateDistance(from: Square, to: Square): number {
  const deltaX = Math.abs(from.x - to.x);
  const deltaY = Math.abs(from.y - to.y);
  return Math.max(deltaX, deltaY);
}

/**
 * Check if a position is valid on the board
 * Main board: 0-7 for both x and y
 * Special positions: (-1, 4) for Baron, (8, 3) for Drake
 */
export function isValidBoardPosition(x: number, y: number): boolean {
  const isMainBoard = x >= 0 && x <= 7 && y >= 0 && y <= 7;
  const isBlueBase = x === -1 && y === 4;
  const isRedBase = x === 8 && y === 3;
  return isMainBoard || isBlueBase || isRedBase;
}

/**
 * Get a chess piece at a specific position for a specific team
 * Returns null if no piece found or piece is dead or wrong team
 */
export function getChessAtPosition(
  game: Game,
  isBlue: boolean,
  square: Square
): Chess | null {
  const chess = game.board.find(
    (chess) =>
      chess.position.x === square.x &&
      chess.position.y === square.y &&
      chess.stats.hp > 0
  );
  if (!chess) {
    return null;
  }
  if (chess.blue !== isBlue) {
    return null;
  }
  return chess;
}

/**
 * Get any chess piece at a specific position (regardless of team)
 * Returns null if no piece found or piece is dead
 */
export function getAnyChessAtPosition(game: Game, square: Square): Chess | null {
  return (
    game.board.find(
      (chess) =>
        chess.position.x === square.x &&
        chess.position.y === square.y &&
        chess.stats.hp > 0
    ) || null
  );
}

/**
 * Check if a path between two squares is clear of pieces
 * Used for ranged attacks and moves
 */
export function isPathClear(game: Game, from: Square, to: Square): boolean {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;

  // Determine step direction
  const stepX = deltaX === 0 ? 0 : deltaX / Math.abs(deltaX);
  const stepY = deltaY === 0 ? 0 : deltaY / Math.abs(deltaY);

  // Check each square along the path (excluding start and end)
  let currentX = from.x + stepX;
  let currentY = from.y + stepY;

  while (currentX !== to.x || currentY !== to.y) {
    // Check if there's a piece at this position
    const blockingPiece = game.board.find(
      (piece) =>
        piece.position.x === currentX &&
        piece.position.y === currentY &&
        piece.stats.hp > 0
    );

    if (blockingPiece) {
      return false; // Path is blocked
    }

    currentX += stepX;
    currentY += stepY;
  }

  return true; // Path is clear
}

/**
 * Get all enemy pieces adjacent to a position
 */
export function getAdjacentEnemies(
  game: Game,
  position: Square,
  isBlue: boolean
): Chess[] {
  const adjacentSquares = getAdjacentSquares(position);
  const enemies: Chess[] = [];

  for (const square of adjacentSquares) {
    const enemy = getChessAtPosition(game, !isBlue, square);
    if (enemy && enemy.stats.hp > 0) {
      enemies.push(enemy);
    }
  }

  return enemies;
}

/**
 * Get all ally pieces adjacent to a position
 */
export function getAdjacentAllies(
  game: Game,
  position: Square,
  isBlue: boolean
): Chess[] {
  const adjacentSquares = getAdjacentSquares(position);
  const allies: Chess[] = [];

  for (const square of adjacentSquares) {
    const ally = getChessAtPosition(game, isBlue, square);
    if (ally && ally.stats.hp > 0) {
      allies.push(ally);
    }
  }

  return allies;
}

/**
 * Find all pieces in a straight line from a position
 * @param direction - 'horizontal', 'vertical', 'diagonal', or 'all'
 */
export function getPiecesInLine(
  game: Game,
  from: Square,
  direction: "horizontal" | "vertical" | "diagonal" | "all",
  maxRange?: number
): Chess[] {
  const pieces: Chess[] = [];
  const directions: Array<{ dx: number; dy: number }> = [];

  if (direction === "horizontal" || direction === "all") {
    directions.push({ dx: 1, dy: 0 }, { dx: -1, dy: 0 });
  }
  if (direction === "vertical" || direction === "all") {
    directions.push({ dx: 0, dy: 1 }, { dx: 0, dy: -1 });
  }
  if (direction === "diagonal" || direction === "all") {
    directions.push(
      { dx: 1, dy: 1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: -1 }
    );
  }

  for (const dir of directions) {
    let x = from.x + dir.dx;
    let y = from.y + dir.dy;
    let distance = 1;

    while (isValidBoardPosition(x, y) && (!maxRange || distance <= maxRange)) {
      const piece = game.board.find(
        (p) => p.position.x === x && p.position.y === y && p.stats.hp > 0
      );
      if (piece) {
        pieces.push(piece);
      }
      x += dir.dx;
      y += dir.dy;
      distance++;
    }
  }

  return pieces;
}

