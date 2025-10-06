import { GameLogic } from "../game.logic";
import { Square } from "../game.schema";
import { ChessObject } from "./chess";

export class Nasus extends ChessObject {
  skill(position?: Square): void {
    if (!this.validateSkill(this.chess.skill, position)) {
      throw new Error("Invalid skill");
    }

    // Find the target enemy chess piece
    const targetChess = GameLogic.getChess(
      this.game,
      !this.chess.blue,
      position
    );

    if (targetChess) {
      const targetChessObject = new ChessObject(targetChess, this.game);

      // Deal enhanced damage
      const damage = this.ad + 20;
      this.damage(targetChessObject, damage, "physical", this.sunder);

      // If target dies, increase future Siphoning Strike damage
      if (targetChess.stats.hp <= 0) {
        this.chess.stats.ad += 3;
      }
    }

    // Set skill on cooldown
    this.chess.skill.currentCooldown = this.skillCooldown;
  }
}
