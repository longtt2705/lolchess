import { AttackRange, Debuff, Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";

export class Zed extends ChessObject {
  // Create Death Mark debuff
  private createDeathMarkDebuff(targetId: string): Debuff {
    return {
      id: `death_mark_${this.chess.id}_${targetId}`,
      name: "Death Mark",
      description:
        "Marked for death. Zed can attack from any position and will teleport on hit.",
      duration: 3,
      maxDuration: 3,
      effects: [],
      damagePerTurn: 0,
      damageType: "physical",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
      currentStacks: 1,
      maximumStacks: 1,
    } as Debuff;
  }

  skill(position?: Square): void {
    // Find the target enemy chess piece
    const targetChess = getChessAtPosition(
      this.game,
      !this.chess.blue,
      position
    );

    if (!targetChess) {
      return;
    }

    const targetChessObject = ChessFactory.createChess(targetChess, this.game);

    // Apply Death Mark debuff to target
    const deathMarkDebuff = this.createDeathMarkDebuff(targetChess.id);
    this.applyDebuff(targetChessObject, deathMarkDebuff);
  }

  // Override validateAttack to allow attacks on marked targets from any position
  validateAttack(position: Square, attackRange: AttackRange): boolean {
    // Find if there's a chess piece at the target position
    const targetChess = getChessAtPosition(
      this.game,
      !this.chess.blue,
      position
    );

    // Check if target has Death Mark from this Zed
    if (targetChess) {
      const deathMarkId = `death_mark_${this.chess.id}_${targetChess.id}`;
      const hasDeathMark = targetChess.debuffs.some(
        (debuff) => debuff.id === deathMarkId
      );

      // If target has Death Mark, allow attack from any position
      if (hasDeathMark) {
        // Only check that we're not attacking ourselves
        if (
          this.chess.position.x === position.x &&
          this.chess.position.y === position.y
        ) {
          return false;
        }
        return true;
      }
    }

    // Otherwise, use normal attack validation
    return super.validateAttack(position, attackRange);
  }

  // Find nearest adjacent empty square to target
  private findNearestAdjacentSquare(targetPosition: Square): Square | null {
    const adjacentSquares = getAdjacentSquares(targetPosition);
    const emptySquares: Square[] = [];

    // Filter for empty squares
    for (const square of adjacentSquares) {
      const occupyingChess = this.game.board.find(
        (piece) =>
          piece.position.x === square.x &&
          piece.position.y === square.y &&
          piece.stats.hp > 0
      );

      if (!occupyingChess) {
        emptySquares.push(square);
      }
    }

    if (emptySquares.length === 0) {
      return null; // No empty adjacent squares
    }

    // Find the closest empty square to Zed's current position
    let closestSquare = emptySquares[0];
    let minDistance = this.getDistance(this.chess.position, closestSquare);

    for (const square of emptySquares) {
      const distance = this.getDistance(this.chess.position, square);
      if (distance < minDistance) {
        minDistance = distance;
        closestSquare = square;
      }
    }

    return closestSquare;
  }

  // Calculate distance between two squares
  private getDistance(pos1: Square, pos2: Square): number {
    const deltaX = Math.abs(pos1.x - pos2.x);
    const deltaY = Math.abs(pos1.y - pos2.y);
    return Math.max(deltaX, deltaY); // Chebyshev distance
  }

  attack(chess: ChessObject): number {
    // Check if target has Death Mark from this Zed
    const deathMarkId = `death_mark_${this.chess.id}_${chess.chess.id}`;
    const deathMarkIndex = chess.chess.debuffs.findIndex(
      (debuff) => debuff.id === deathMarkId
    );
    const hasDeathMark = deathMarkIndex !== -1;

    // Call parent attack for normal damage
    const baseDamage = super.attack(chess);

    // If target has Death Mark, trigger special effects
    if (hasDeathMark) {
      // Deal bonus physical damage: 10 + 15% AD + 30% AP
      const bonusDamage = 10 + this.ad * 0.15 + this.ap * 0.3;
      this.damage(chess, bonusDamage, "physical", this, this.sunder);

      // Find nearest adjacent empty square to target
      const adjacentSquare = this.findNearestAdjacentSquare(
        chess.chess.position
      );

      // Teleport Zed to adjacent square (if available)
      if (adjacentSquare) {
        this.chess.position = adjacentSquare;
      }

      // Remove the Death Mark debuff (consumed)
      chess.chess.debuffs.splice(deathMarkIndex, 1);
    }

    return baseDamage;
  }

  protected getAttackPotential(): number {
    if (this.chess.skill.currentCooldown > 0) {
      return super.getAttackPotential() + +10 + this.ad * 0.15 + this.ap * 0.3;
    }
    return super.getAttackPotential();
  }
}
