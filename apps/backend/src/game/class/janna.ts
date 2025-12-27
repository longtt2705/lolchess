import { Chess, Aura, AuraEffect, Debuff, Square } from "../types";
import { ChessObject } from "./chess";
import { ChessFactory } from "./chessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../utils/helpers";

export class Janna extends ChessObject {
  constructor(chess: Chess, game: any) {
    super(chess, game);
  }

  createSpeedBoostDebuff(): Debuff {
    return {
      id: "speed_boost",
      name: "Speed Boost",
      description: "Increases speed by 2",
      duration: 2,
      maxDuration: 2,
      effects: [
        {
          stat: "speed",
          modifier: 2,
          type: "add",
        },
      ],
      damagePerTurn: 0,
      damageType: "physical",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
    } as Debuff;
  }

  applySpeedBoost(target: ChessObject): boolean {
    const speedBoostDebuff = this.createSpeedBoostDebuff();
    return this.applyDebuff(target, speedBoostDebuff);
  }

  // Override skill method if Janna has special abilities
  skill(position?: Square): void {
    // Add +2 Move Speed to nearby allies for 2 turns (does not stack with aura)
    getAdjacentSquares(this.chess.position).forEach((square) => {
      const targetChess = getChessAtPosition(
        this.game,
        this.chess.blue,
        square
      );
      if (targetChess) {
        const targetChessObject = ChessFactory.createChess(
          targetChess,
          this.game
        );
        // Only apply if the target doesn't already have the speed boost
        const hasSpeedBoost = targetChess.debuffs.some(
          (d) => d.id === "speed_boost"
        );
        if (!hasSpeedBoost) {
          this.applySpeedBoost(targetChessObject);
        }

        targetChessObject.applyShield(20 + this.ap * 1, 2, `janna_shield_${targetChessObject.chess.id}`);
      }
    });
  }
}
