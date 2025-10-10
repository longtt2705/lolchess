import { GameLogic } from "../game.logic";
import { Chess, Debuff, Game, Square } from "../game.schema";
import { ChessObject } from "./chess";

export class Ahri extends ChessObject {
  // Create the Spirit Rush debuff
  createSpiritRushDebuff(casterPlayerId: string): Debuff {
    return {
      id: "spirit_rush",
      name: "Spirit Rush",
      description:
        "Reduces speed by 1 and deals 10 + 50% AP magic damage each turn",
      duration: 2,
      maxDuration: 2,
      effects: [
        {
          stat: "speed",
          modifier: -1,
          type: "add",
        },
      ],
      damagePerTurn: 10 + this.ap * 0.5, // Adjust damage as needed
      damageType: "magic",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: casterPlayerId,
    } as Debuff;
  }

  // Apply Spirit Rush debuff to target
  applySpiritRush(target: ChessObject, casterPlayerId: string): boolean {
    const spiritRushDebuff = this.createSpiritRushDebuff(casterPlayerId);
    return this.applyDebuff(target, spiritRushDebuff);
  }

  skill(position?: Square): void {
    this.move(position);

    // Deal damage and apply Spirit Rush debuff to any piece at or adjacent to the target square
    GameLogic.getAdjacentSquares(position).forEach((square) => {
      const targetChess = GameLogic.getChess(
        this.game,
        !this.chess.blue,
        square
      );
      if (targetChess) {
        const targetChessObject = new ChessObject(targetChess, this.game);
        // Deal damage
        this.damage(
          targetChessObject,
          10 + this.ap * 0.5,
          "magic",
          this,
          this.sunder
        ); // Adjust damage as needed

        // Apply Spirit Rush debuff
        const wasApplied = this.applySpiritRush(
          targetChessObject,
          this.chess.ownerId
        );
        if (wasApplied) {
          console.log(
            `Spirit Rush debuff applied to ${targetChess.name} by ${this.chess.name}`
          );
        } else {
          console.log(
            `Spirit Rush debuff already exists on ${targetChess.name}`
          );
        }
      }
    });
  }
}
