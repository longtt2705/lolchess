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

    const bonusDamage = this.chess.skill.payload?.bonusDamage || 0;

    if (targetChess) {
      const targetChessObject = new ChessObject(targetChess, this.game);

      // Deal enhanced damage
      const damage = 20 + this.ap * 0.4 + bonusDamage;
      this.damage(targetChessObject, damage, "physical", this, this.sunder);

      // If target dies, increase future Siphoning Strike damage
      if (targetChess.stats.hp <= 0) {
        this.chess.skill.payload.bonusDamage = bonusDamage + 15;
      }
    }

    // Set skill on cooldown
    this.chess.skill.currentCooldown = this.skillCooldown;
  }
}
