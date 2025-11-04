import { GameLogic } from "../game.logic";
import { Debuff, Square } from "../game.schema";
import { ChessObject } from "./chess";
import { ChessFactory } from "./chessFactory";

export class Ezreal extends ChessObject {
  skill(position?: Square): void {
    // Store original position for animation
    const originalPosition = { ...this.chess.position };

    // Teleport Ezreal to the target position
    this.chess.position = position;

    // Calculate sunder buff amount
    const sunderBonus = 5 + this.ap * 0.1;

    // Apply sunder buff to Ezreal for 3 turns
    this.applyDebuff(this, {
      id: "arcane_shift_sunder",
      name: "Arcane Shift",
      description: `Increases sunder by ${Math.floor(sunderBonus)} for 3 turns.`,
      duration: 3,
      maxDuration: 3,
      effects: [
        {
          stat: "sunder",
          modifier: sunderBonus,
          type: "add",
        },
      ],
      damagePerTurn: 0,
      damageType: "magic",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
      currentStacks: 0,
      maximumStacks: 1,
    } as Debuff);

    // Track affected enemy for animation
    const affectedEnemies: Array<{
      targetId: string;
      targetPosition: Square;
    }> = [];

    // Find all adjacent squares and get all adjacent enemies
    const adjacentSquares = GameLogic.getAdjacentSquares(position);
    const adjacentEnemies: Array<{
      chess: any;
      chessObject: ChessObject;
    }> = [];

    adjacentSquares.forEach((square) => {
      const targetChess = GameLogic.getChess(
        this.game,
        !this.chess.blue,
        square
      );
      if (targetChess) {
        const targetChessObject = ChessFactory.createChess(
          targetChess,
          this.game
        );
        adjacentEnemies.push({
          chess: targetChess,
          chessObject: targetChessObject,
        });
      }
    });

    // Find the lowest health adjacent enemy
    if (adjacentEnemies.length > 0) {
      const lowestHealthEnemy = adjacentEnemies.reduce((lowest, current) => {
        return current.chess.stats.hp < lowest.chess.stats.hp
          ? current
          : lowest;
      });

      // Deal (10 + 40% AP + 10% AD) magic damage to the lowest health enemy
      this.activeSkillDamage(
        lowestHealthEnemy.chessObject,
        10 + this.ap * 0.4 + this.ad * 0.1,
        "magic",
        this,
        this.sunder
      );

      // Track this enemy for animation
      affectedEnemies.push({
        targetId: lowestHealthEnemy.chess.id,
        targetPosition: { ...lowestHealthEnemy.chess.position },
      });
    }

    // Store payload data for animation
    if (this.chess.skill) {
      if (!this.chess.skill.payload) {
        this.chess.skill.payload = {};
      }
      this.chess.skill.payload.originalPosition = originalPosition;
      this.chess.skill.payload.landingPosition = position;
      this.chess.skill.payload.affectedEnemies = affectedEnemies;
    }
  }
}

