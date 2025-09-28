import { GameLogic } from "../game.logic";
import { Chess, Aura, AuraEffect, Debuff } from "../game.schema";
import { ChessObject } from "./chess";

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
    } as Debuff;
  }

  applySpeedBoost(target: ChessObject): boolean {
    const speedBoostDebuff = this.createSpeedBoostDebuff();
    return this.applyDebuff(target, speedBoostDebuff);
  }

  // Override skill method if Janna has special abilities
  skill(position?: any): void {
    if (!this.validateSkill(this.chess.skill, position)) {
      throw new Error("Invalid skill");
    }

    // Add +2 Move Speed to nearby allies for until next turn
    GameLogic.getAdjacentSquares(position).forEach((square) => {
      const targetChess = GameLogic.getChess(
        this.game,
        this.chess.blue,
        square
      );
      if (targetChess) {
        const targetChessObject = new ChessObject(targetChess, this.game);
        this.applySpeedBoost(targetChessObject);
      }
    });
  }
}
