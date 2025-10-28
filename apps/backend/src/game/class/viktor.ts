import { GameLogic } from "../game.logic";
import { Square, Debuff } from "../game.schema";
import { ChessObject } from "./chess";
import { ChessFactory } from "./chessFactory";

export class Viktor extends ChessObject {
  // Create empowered attack debuff
  createEmpoweredAttackDebuff(): Debuff {
    return {
      id: "viktor_empowered",
      name: "Empowered Attack",
      description:
        "Viktor's next attack deals bonus (15 + 50% of AP) magic damage",
      duration: 3,
      maxDuration: 3,
      effects: [
        {
          stat: "ad",
          modifier: 15 + this.ap * 0.5,
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
    } as Debuff;
  }

  skill(position?: Square): void {
    // Find the target enemy chess piece
    const targetChess = GameLogic.getChess(
      this.game,
      !this.chess.blue,
      position
    );

    if (targetChess) {
      const targetChessObject = ChessFactory.createChess(
        targetChess,
        this.game
      );

      // Deal magic damage
      const damage = 20 + this.ap * 0.8;
      this.activeSkillDamage(
        targetChessObject,
        damage,
        "magic",
        this,
        this.sunder
      );

      // Empower next basic attack
      const empowermentDebuff = this.createEmpoweredAttackDebuff();
      this.applyDebuff(this, empowermentDebuff);

      // Store empowerment state in skill payload
      if (!this.chess.skill.payload) {
        this.chess.skill.payload = {};
      }
      this.chess.skill.payload.nextAttackEmpowered = true;
    }
  }

  attack(chess: ChessObject): number {
    const baseDamage = super.attack(chess);

    // Reset empowerment after attack
    if (this.chess.skill?.payload?.nextAttackEmpowered) {
      this.chess.skill.payload.nextAttackEmpowered = false;
      this.removeDebuff(this, "viktor_empowered");
    }
    return baseDamage;
  }
}
