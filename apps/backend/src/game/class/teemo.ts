import { ChessObject } from "./chess";
import { Debuff } from "../game.schema";

export class Teemo extends ChessObject {
  // Create the Toxic Shot debuff
  createToxicShotDebuff(casterPlayerId: string): Debuff {
    return {
      id: "toxic_shot",
      name: "Toxic Shot",
      description: "Poisoned by Teemo's toxic darts, taking damage each turn",
      duration: 3,
      maxDuration: 3,
      effects: [],
      damagePerTurn: 8 + this.ap * 0.3,
      damageType: "magic",
      healPerTurn: 0,
      unique: false, // Multiple toxic shots can stack
      appliedAt: Date.now(),
      casterPlayerId: casterPlayerId,
    } as Debuff;
  }

  // Apply Toxic Shot debuff to target
  applyToxicShot(target: ChessObject, casterPlayerId: string): boolean {
    const toxicShotDebuff = this.createToxicShotDebuff(casterPlayerId);
    return this.applyDebuff(target, toxicShotDebuff);
  }

  attack(chess: ChessObject): void {
    super.attack(chess);

    // Apply Toxic Shot debuff on every basic attack
    this.applyToxicShot(chess, this.chess.ownerId);
  }
}
